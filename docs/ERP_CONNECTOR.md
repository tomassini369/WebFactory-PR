# ERPNext / Frappe HR integration — staging required

No ERP endpoint or credentials exist in this environment. The owner does not
know of a staging instance. Docker is available, but its vfs layer copies filled
the 32 GB workspace during the official image download/run attempt. No container
or Frappe site started. The downloaded image/layers were removed, recovering
26 GB. The bridge below is prepared, NOT verified against live Frappe.

## Compatible versions and licensing

Official tagged metadata checked October 20, 2026:
- ERPNext 15.123.0 requires Frappe >=15.111.0,<16.
- Frappe 15.123.1 fits that range.
- HRMS 15.64.5 requires Frappe and ERPNext >=15,<16.
- Image frappe/erpnext:v15.123.0 resolved to digest
  sha256:33f97d0f061d92367cc73032a20e237d938b8f5309978ac40882bf8ea2bcfbd8.

ERPNext/HRMS GPL-3.0 and Frappe MIT are separate upstream dependencies. No
upstream server code/assets are bundled into commercial WebFactory templates.
Review license obligations before redistributing server modifications/templates.

## Tenant isolation and credentials

Default: one Frappe site per WebFactory siteId; one fixed company per binding.
A shared multi-company instance has not been proven to isolate every API.
Install integrations/frappe/webfactory_bridge on an isolated staging site.
Create a non-Administrator service user with WebFactory Connector and a Company
User Permission for that company. No submit/cancel, System Manager, bank or
payroll privileges. Review custom DocPerm and transaction behavior in staging.

Frappe private site_config.json needs webfactory_site_id, webfactory_company,
and webfactory_accounts with settlement/revenue/tax/tips mapped to reviewed USD
accounts. Identity, role, company and Account permissions are checked per call.
The bridge prepares drafts only; it never submits or pays anything.

Configure Netlify secrets per deploy context, never in Git or chat:
- WEBFACTORY_ERP_ALLOWED_ORIGINS: explicit comma-separated HTTPS origins.
- WEBFACTORY_ERP_BINDINGS_JSON: JSON keyed by siteId, with origin, company,
  apiKey, apiSecret and syncEnabled (default false) per binding.

No browser request selects an ERP URL, company or DocType. Credentials are not
stored in business/member JSON or returned in errors. Redirects are disabled;
requests and response sizes are bounded. Secrets remain in Netlify's existing
environment infrastructure. A deploy preview must use an isolated staging site.

## Authority, durability and current limits

WebFactory owns original sales, physical stock, catalog, bookings, customers and
clock events. ERPNext will own formal GL after approved posting; HRMS work
schedules/payroll after separately configured and validated workflows.

The protected reconciliation endpoint scans canonical settled sales into the
existing Commerce store. Source scanning repairs a crash between sale save and
enqueue without changing checkout or stock. Customer data and private PINs are
excluded. Immutable hashes, CAS claims, five bounded retries and dead letters
protect delivery. A lost response needs remote idempotence: the Frappe unique
receipt and draft journal must commit together. A header alone is insufficient.
That database guarantee still requires the live concurrency/rollback tests.

GET client-erp-integration checks health when configured. POST needs
accounting.reconcile and explicit syncEnabled, processing at most ten events.
No scheduler or automatic activation is added. The scanner refuses more than
1,000 records; add a durable cursor before enabling larger businesses.

Refund component allocation, stock valuation/adjustment, definitive posting,
period closing, AP/AR/purchases/formal statements, HRMS schedules/leave and fiscal
payroll are NOT operational in this slice. Existing refund estimates cannot
become formal reversals. No invented split is sent to ERP. Scheduling/payroll
remain unavailable in the UI/backend until implemented and validated.

## Staging acceptance and rollback

Run live health; one draft per sale under concurrent requests; replay after a
lost response; changed-payload rejection; foreign site/company rejection; expired
or unauthorized credentials; and receipt+journal rollback on validation failure.
HRMS installed alone does not validate legal/tax payroll rules.

Stop sync with syncEnabled=false, retaining outbox/receipts. Reconcile financial
documents through accounting approval; never delete originals as rollback.
