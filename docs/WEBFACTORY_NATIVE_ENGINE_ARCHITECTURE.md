# WebFactory Business Engine — Architecture and implementation roadmap

**Status:** Approved product direction; planning baseline only. Not deployed, not provisioned, not production-ready.
**Development branch:** `feat/webfactory-native-business-engine`
**Base:** PR #120 commit `ac09faf7d615f33ee984d64771d5523a8712936f`
**Production:** `main` / `https://webfactorypr.com` — do not change without explicit owner authorization.

## Product decision

Build a proprietary native administrative engine using Netlify Functions and a transactional PostgreSQL database. Do **not** host, install, or depend on ERPNext, Frappe, HRMS or the `webfactory_bridge` application.

Reuse the sound work in PR #120: Accounting Access, invitations, identity-bound grants, approval separation, revocation, financial redaction, audit, optional modules, current Workforce, fixes and tests. Preserve WebFactory storefront/Builder, subscriptions, POS, bookings, employees, inventory, CRM, OAuth, MCP, public routes, ES/EN, light/dark, mobile/PWA and tenant design.

“Equivalent functions” means prioritized independent modules, **not** a claim of instant 1:1 ERPNext parity. No statutory PR payroll/filing functionality may be declared compliant without professional validation.

## Hosting/topology

- Existing Netlify site `webfactorypr`: frontend, authenticated UI, existing Netlify Identity and current commerce/booking/attendance APIs.
- **Separate Netlify project**, proposed name `webfactory-business-engine`, in a directory such as `apps/business-engine/` of the same repository, with its own build/configuration/deploys.
- Business-engine Functions are called server-to-server by WebFactory's existing authenticated backend. No browser access to engine secrets; no second login experience and no duplicated dashboard.
- **Authoritative transactional financial database:** one PostgreSQL instance managed under the engine Netlify project, with all data tenant-scoped. Prefer Netlify Database *only if account/team is verified to be on a Credit-based plan*.
- **Important billing blocker:** existing Netlify team was created May 2025 and currently reports Pro; likely a Legacy Pro plan. Netlify Database currently requires Credit-based plans. Confirm from Netlify Usage & Billing. **Never migrate the existing team/plan without explicit approval because the switch is irreversible.** Prefer a new separate Credit-based Free team if eligible, leaving the existing WebFactory site in its present team. Do not promise perpetual $0 or provision billable resources without owner approval.
- PR/Deploy Preview data must be isolated from production. Database preview branches (if Netlify Database is available) and entirely fictional data for finance/HR tests.
- Netlify Scheduled/Background Functions may process short bounded jobs but are not persistent processes; use durable DB job records, leases, idempotency and reconciliation. No in-memory queues as a source of truth.

## Ownership / no duplications

| Domain | Authoritative system |
| --- | --- |
| Identity, MFA, tenant membership, Accounting Access grants | WebFactory existing backend |
| Customer sales/refunds, POS, bookings, commercial catalog, stock quantities, employees for bookings, attendance clock events | WebFactory existing backend |
| General ledger, financial periods/accounts, journals, trial balance, reconciliation, approved financial reports, accounting classification | Business Engine PostgreSQL |
| Labor schedules/shifts (NOT appointment availability), leave policy and optional HR administration | Business Engine when module active |
| Wage computation/deductions/payslip/payroll period/audit | Business Engine when module active and professionally configured |
| WebFactory existing gross-cost ledger | Retained for history/compatibility, with migration/reconciliation plan; never run two independent sources of definitive GL |

Never duplicate real employee/business accounts, reorder bookings, or let a module OFF flag disable existing appointment scheduling.

## Security

- WebFactory backend authenticates Netlify Identity user and MFA, reloads canonical current tenant membership/grants *for every request*, and checks appropriate capability.
- Internal service-to-service assertions must be short-lived, signed, audience/scope/siteId/immutable actor ID bound, server-generated, replay resistant and rotated. Do not expose internal token to frontend.
- Business Engine independently validates signature/claims, allowed capability, site/company binding, and tenant scope on every request.
- Finance actions require explicit capability, actor-subject attribution, immutable audit, least privilege, strict validation, rate limits, idempotency keys, full authorization denial tests.
- Segregation of duties: preparer cannot approve own financial drafts or own payroll. Salary rate/PII must be redacted unless explicitly permitted.
- Tenant isolation: every financial/HR table includes immutable `site_id` and tenant-scoped identifiers; enforce tenant isolation in database queries and preferably PostgreSQL RLS as defense in depth; test malicious cross-tenant references.
- Posted journal entries cannot be edited/deleted: use reversal documents. Closed periods lock ordinary postings. Maintain professional approval gates.

## First native domain: accounting foundation

Schema (iterate with additive migrations): tenant_settings, chart_accounts, accounting_periods, journal_headers, journal_lines, finance_drafts, approval_events, idempotency_receipts, inbound_commerce_events, sync_checkpoints, reconciliation_issues, audit_events, outbox_jobs. For payroll/scheduling, add separate schemas only after the accounting core is validated.

- Money stored exactly in integer USD cents or audited fixed-precision numeric; no binary floats in persisted financial math.
- Each journal must have at least two lines, positive debits/credits, same tenant/company/currency, and balanced totals before posting. Enforce with atomic DB transaction (and DB-level constraints/triggers where feasible).
- Immutable source event ID + payload hash + tenant unique constraint. Duplicate delivery returns identical recorded outcome; conflicting reuse fails safely.
- Create test chart of accounts per fictional tenant, configurable by authorized accountant/owner.
- Source commerce events can be replayed/reconciled after partial failure; no false "paid" or "posted" on timeout. Refunds/partial refunds require explicit tested reversal logic before live import.
- Operations: draft → review → approve → post → reconcile → close. Never automatically post financial transactions until accountant-approved rules are validated.

## Independent optional modules

Attendance: keep PR #120 and existing Workforce CAS journal authoritative. Enabled state persists, historical events remain, no new engine clock machine.

Scheduling: separate labor roster with roles, assignments, breaks, time-off/leave approvals, timezone, location rules, conflicts, reports. Must not replace booking-calendar availability. OFF by default.

Payroll: secure profiles, salary structure, earning/deduction components, pay periods, draft calculations, independent approval, pay slips, accounting accruals, audit. OFF by default, no deposits, Stripe Payroll, ACH, banking, payout API or money movement. No invented Puerto Rico payroll tax/withholding/statutory rules; configure with accountant/CPA review before any real use.

## UI

Keep the existing WebFactory portal/sidebar. Add Accounting (only allowed), accountant approval inbox, period reconciliation, optional Scheduling and Payroll when implemented + configured. Preserve Accounting Access UI, independent attendance controls, and global module flags. All UI capabilities must have working server endpoints and persistence; no fake KPI widgets or dead buttons.

## Development sequence / acceptance gates

1. Preserve PR #120 foundation in this branch and identify Frappe-specific code/config/docs to deactivate/remove safely. Do not break Accounting Access.
2. Scaffold separate `apps/business-engine` Netlify application with tests and env templates. No deployment required until eligible team/db configured.
3. Add transactional PostgreSQL schema/migrations + local/CI ephemeral DB integration tests. Cross-tenant, concurrency, double-entry, reversal, audit, backup/restore and idempotency must pass.
4. Add strict WebFactory ↔ Engine signed server-to-server integration with tenant/actor-bound credentials and revocation.
5. Build first **complete** vertical slice: a fictional business sale → accepted event → mapped draft financial journal → independent approval → definitive posting → reconciliation/report. Include reversal/refund cases before enabling for live businesses.
6. Add secure financial UI and exports in existing portal. Preserve historic ledger/attendance records.
7. Build scheduling with real CRUD, policies, approval and reports; independent feature gating.
8. Build payroll with CPA-reviewed Puerto Rico configurations, deductions, payslips, approvals, and GL postings; no payout rails.
9. Isolated preview/CI tests Chromium, WebKit, ES/EN, Light/Dark, mobile/desktop, core commerce POS booking regressions. Staging with test tenant only; no real staff or customers.
10. Deployment: draft PR and Netlify Deploy Preview; documented rollback, DB migration compatibility, metrics, alerts, backup and restore rehearsal. **No merge/publish/plan change/paid service without owner's explicit permission.**

## Existing PR #120 adaptation

Base PR #120 remains open/draft. Use a new branch founded on its head; do not merge it automatically. Keep Accounting Access and optional module improvements. Mark existing `netlify/lib/erp-connector.mjs`, `netlify/lib/erp-outbox.mjs`, `netlify/functions/client-erp-integration.mjs`, and `integrations/frappe/` as legacy preparatory work until a tested native replacement exists; do not permit Frappe synchronization to turn on. Avoid deleting test/evidence records merely to make a clean diff.

## Evidence required from Codex

For each milestone provide files changed, passing/failing tests, CI URLs, branch SHA, Deploy Preview URL if available, data source-of-truth mapping, migration status, non-production test results, risk/rollback notes and actual outstanding external prerequisites. Never call a mock or Python syntax check a live accounting/HR integration.
