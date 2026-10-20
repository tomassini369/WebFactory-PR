"""Receipt and draft journal share Frappe's successful-POST DB transaction.

Do not commit manually or submit journals. This bridge requires live staging
validation before enabling any tenant binding; see docs/ERP_CONNECTOR.md.
"""
import hashlib
import json
import frappe
from frappe.utils import getdate

PROTOCOL = "webfactory.erp.v1"


def binding(site_id):
    if frappe.session.user == "Guest" or "WebFactory Connector" not in frappe.get_roles():
        frappe.throw("Connector authorization required", frappe.PermissionError)
    if not site_id or site_id != frappe.conf.get("webfactory_site_id"):
        frappe.throw("Tenant mismatch", frappe.PermissionError)
    company = frappe.conf.get("webfactory_company")
    if not company or not frappe.has_permission("Company", "read", doc=company):
        frappe.throw("Company authorization required", frappe.PermissionError)
    return company


def envelope(site_id, company, **fields):
    return {"protocol": PROTOCOL, "siteId": site_id, "company": company, **fields}


@frappe.whitelist(methods=["POST"])
def health(site_id):
    company = binding(site_id)
    return envelope(site_id, company, draftJournal=True, payroll=False, scheduling=False,
                    hrmsInstalled="hrms" in frappe.get_installed_apps())


def external_key(site_id, external_id):
    return hashlib.sha256(f"{site_id}:{external_id}".encode()).hexdigest()


def receipt_data(doc, company):
    return envelope(doc.site_id, company, externalId=doc.external_id,
                    payloadHash=doc.payload_hash, documentType="Journal Entry",
                    documentName=doc.document_name, status="draft")


@frappe.whitelist(methods=["POST"])
def receipt(site_id, external_id):
    company = binding(site_id)
    doc = frappe.get_doc("WebFactory Sync Receipt", external_key(site_id, external_id))
    doc.check_permission("read")
    return receipt_data(doc, company)


@frappe.whitelist(methods=["POST"])
def ingest_sale(site_id, event):
    company = binding(site_id)
    event = json.loads(event) if isinstance(event, str) else event
    if not isinstance(event, dict) or event.get("siteId") != site_id or event.get("kind") != "sale.settled" or event.get("currency") != "USD":
        frappe.throw("Unsupported or cross-tenant financial event", frappe.PermissionError)
    external_id = event.get("externalId", "")
    if not external_id.startswith("sale:") or len(external_id) > 140:
        frappe.throw("Invalid external event")
    amounts = [event.get(key) for key in ["totalCents", "revenueCents", "taxCents", "tipCents"]]
    if any(type(value) is not int or value < 0 for value in amounts) or amounts[0] <= 0 or amounts[0] != sum(amounts[1:]):
        frappe.throw("Unbalanced source amounts")
    payload_hash = hashlib.sha256(json.dumps(event, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()
    key = external_key(site_id, external_id)
    if frappe.db.exists("WebFactory Sync Receipt", key):
        existing = frappe.get_doc("WebFactory Sync Receipt", key)
        existing.check_permission("read")
        if existing.payload_hash != payload_hash:
            frappe.throw("Immutable event conflict", frappe.ValidationError)
        return receipt_data(existing, company)
    if not frappe.has_permission("Journal Entry", "create"):
        frappe.throw("Journal preparation required", frappe.PermissionError)
    if frappe.get_cached_value("Company", company, "default_currency") != "USD":
        frappe.throw("USD company configuration required")
    accounts = frappe.conf.get("webfactory_accounts") or {}
    for key_name in ["settlement", "revenue", "tax", "tips"]:
        account = accounts.get(key_name)
        if not account or frappe.get_cached_value("Account", account, "company") != company or not frappe.has_permission("Account", "read", doc=account):
            frappe.throw("Review company account mappings", frappe.PermissionError)
    frappe.db.savepoint("webfactory_receipt")
    try:
        record = frappe.get_doc({"doctype": "WebFactory Sync Receipt", "external_key": key,
                                "site_id": site_id, "external_id": external_id, "payload_hash": payload_hash}).insert()
    except frappe.DuplicateEntryError:
        frappe.db.rollback(save_point="webfactory_receipt")
        winner = frappe.get_doc("WebFactory Sync Receipt", key)
        if winner.payload_hash != payload_hash:
            frappe.throw("Immutable event conflict", frappe.ValidationError)
        return receipt_data(winner, company)
    rows = [{"account": accounts["settlement"], "debit_in_account_currency": amounts[0] / 100}]
    for name, cents in zip(["revenue", "tax", "tips"], amounts[1:]):
        if cents:
            rows.append({"account": accounts[name], "credit_in_account_currency": cents / 100})
    journal = frappe.get_doc({"doctype": "Journal Entry", "company": company,
                             "posting_date": getdate(event.get("postingDate") or event["paidAt"]),
                             "user_remark": f"WebFactory {external_id}", "accounts": rows}).insert()
    record.document_name = journal.name
    record.save()
    return receipt_data(record, company)
