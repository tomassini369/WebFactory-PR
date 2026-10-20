# Accounting Access and ERP integration audit

Base: main `6c65ab928bfbe29ceb6e7d37715a97e1c12c63b7`, inspected 2026-10-20.
Development branch: `feat/accounting-access-erpnext-frappe-hr`. Production is not
changed by this audit or the prepared implementation.

## Observed architecture and coverage

| Function | Verified baseline | Reuse / planned change | Backend / source of truth |
|---|---|---|---|
| Identity and MFA | Netlify Identity, MFA on live requests | Keep existing authentication | client-auth, mfa-security |
| Tenant authorization | Canonical members checked per API | Check current active status; separate financial grants | siteId and client site record |
| Business selector | Email index trusted after loading site | Revalidate canonical membership; repair projections | client-store |
| Member access | Owner invite/revoke; revision/ETag writes | Preserve roles; prevent stale grants and concurrent overwrites | client-member-access |
| Professional roles | Absent | Explicit capabilities, role labels without implicit powers | financial-permissions |
| Accounting invitation acceptance | Absent; legacy access is immediate | Expiring, identity-bound, single-use acceptance | Accounting Access API |
| CPA accreditation | Absent | Pending credentials, separate audited review; no self-verification | Server-owned accreditation |
| Basic accounting | Owner-only wage/cost estimate ledger | Keep ledger; permission-specific views and actions | business-accounting |
| Approval / correction | Append-only work approvals and voids | Separate preparer/approver for delegated changes | Existing ledger |
| POS, sales, CRM, catalog | Implemented | Retain operational authority and identifiers | WebFactory |
| Inventory | CAS/idempotent movements and reservations | WebFactory owns quantities; ERP valuation is a projection | WebFactory operational inventory |
| Attendance | Disabled by default; server clock, CAS, audit, approvals | Keep state machine and historical preferences | workforce/state.json |
| Work schedules | Booking availability only | Separate optional Frappe HR capability, never replace booking hours | Frappe HR when operational |
| Payroll | Gross manual records, no tax/net payroll engine | Separate optional Frappe HR module; no bank/payment rail | Frappe HR when configured/validated |
| Module switches | Attendance independent, POS/kiosk existing | Central administrative view of independent modules | Existing tenant configuration |
| Formal general ledger | Absent | Adapter and formal ERP posting after validated setup | ERPNext |
| ERP synchronization | Absent | Durable event IDs, bounded retries and reconciliation | Existing Blobs plus ERP receipt transaction |
| Navigation | Existing role/capability groups | Extend existing sidebar, show implemented/available destinations | ClientAdminPage / UploadedSidebar |

This is a baseline/implementation plan, not a completed-feature assertion. The PR
coverage record must identify actual checks, pending checks and infrastructure
limits separately.

## Confirmed defects and constraints

- `sitesForEmail` loaded indexed sites without rechecking current membership.
  Canonical API authorization prevents ordinary direct tenant access, but stale
  selector references can expose names and retain invalid relationships.
- `saveClientSite` writes member projections but does not remove old ones. Identity
  metadata and member indexes must remain advisory; revocation checks the current
  canonical member on every request, including existing sessions and OAuth use.
- Generic member normalization drops fields outside legacy roles. Professional
  grants and their audit must be server-owned and protected from generic edits.
- The wage/cost ledger is not a full general ledger, tax filing or professional
  payroll. Its inventory value and refund allocations remain explicitly estimated.
- No ERPNext/Frappe endpoint, credentials or deployed integration was found. The
  owner does not know whether staging exists. Do not infer a working connection.
- Docker 28.4.0 and Compose 2.40.3 are available after the normal permission check;
  there are no cached images. A local container test is not persistent hosting.
- Official latest release results do not all share one major: ERPNext v16.51.1,
  Frappe v15.123.1 and HRMS v15.64.5. ERPNext v15.123.0 exists. Evaluate a common
  v15 stack and verify installed versions before declaring interoperability.

## Integration boundaries

Choose a separate Frappe site per WebFactory tenant as the initial isolation model.
A shared multi-company site needs additional company/employee/document permission
proof and is not a safe implicit default. A tenant binding fixes siteId, HTTPS
origin, ERP company and scoped service identity. Never accept an arbitrary ERP
URL, DocType or company from a browser to proxy credentials.

WebFactory remains authoritative for catalog, customers, original sales/refunds,
reservations, physical stock quantities and attendance. ERPNext owns validated
financial accounts, definitive journal entries and financial statements. Frappe
HR owns work schedules and payroll calculations only when those independent
modules are configured, implemented and tested. Booking hours remain independent.

Source records are retained. Event IDs identify the original transaction and
revision/refund operation; retries must not create duplicate ERP entries. A remote
idempotency receipt and financial write must commit in the same ERP transaction.
Reconciliation discovers missed source events after partial failures. No claim
that an HTTP Idempotency-Key alone makes native Frappe REST writes idempotent.

## Infrastructure and activation

Netlify Functions host the authorization/integration layer, not Frappe workers,
database, Redis, scheduler or persistent files. External staging needs HTTPS,
persistent MariaDB/files, worker/queue/scheduler, backups, tested restore and
supported updates. A managed per-site deployment simplifies operations; self-hosted
multi-site infrastructure trades hosting cost for maintenance and recovery duties.
No provider quote or paid server is assumed or provisioned without authorization.

Attendance, Scheduling and Payroll default off for new businesses. Keep historic
Attendance activation. Disabled modules retain authorized history and refuse new
operations. Activation requires a real dependency and an implemented/tested UI;
pending ERP modules stay unavailable. Payroll must never initiate Stripe, ACH,
bank deposits or transfers. Puerto Rico payroll rules require professional setup
and validation; no default legal/tax calculation is represented as approved.

## Commit plan

1. Current-membership/index repair, granular financial permissions and regression tests.
2. Owner Accounting Access invitations, acceptance, changes/revocation, immutable audit,
   safe professional portal access and permissions on existing accounting APIs.
3. Central optional module control preserving Attendance and historical operations.
4. Strict ERP adapter, durable synchronization/reconciliation and an isolated test
   extension; activate only what actual infrastructure and tests demonstrate.
5. Browser/security/integration regression, coverage matrix, PR and Deploy Preview.

AGENTS.md and the existing visual system remain authoritative. No main merge,
production deploy or real financial/employee transaction is authorized by this task.
