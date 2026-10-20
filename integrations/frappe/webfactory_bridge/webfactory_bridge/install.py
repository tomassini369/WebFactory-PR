import frappe


def after_install():
    if not frappe.db.exists("Role", "WebFactory Connector"):
        frappe.get_doc({"doctype": "Role", "role_name": "WebFactory Connector", "desk_access": 0}).insert()
    if not frappe.db.exists("DocType", "WebFactory Sync Receipt"):
        frappe.get_doc({
            "doctype": "DocType", "name": "WebFactory Sync Receipt", "module": "Custom", "custom": 1,
            "autoname": "field:external_key", "track_changes": 1,
            "fields": [
                {"fieldname": "external_key", "label": "External key", "fieldtype": "Data", "unique": 1, "reqd": 1},
                {"fieldname": "site_id", "label": "WebFactory site", "fieldtype": "Data", "reqd": 1},
                {"fieldname": "external_id", "label": "External event", "fieldtype": "Data", "reqd": 1},
                {"fieldname": "payload_hash", "label": "Payload hash", "fieldtype": "Data", "reqd": 1},
                {"fieldname": "document_name", "label": "Draft journal", "fieldtype": "Link", "options": "Journal Entry"},
            ],
            "permissions": [{"role": "WebFactory Connector", "read": 1, "create": 1, "write": 1}],
        }).insert()
    for doctype in ["Journal Entry", "Company", "Account"]:
        if not frappe.db.exists("Custom DocPerm", {"parent": doctype, "role": "WebFactory Connector"}):
            frappe.get_doc({"doctype": "Custom DocPerm", "parent": doctype, "parenttype": "DocType", "parentfield": "permissions", "role": "WebFactory Connector", "read": 1, "create": int(doctype == "Journal Entry"), "write": int(doctype == "Journal Entry")}).insert()
    frappe.clear_cache()
