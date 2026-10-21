# Commercial access: Owner / Employee

Base: `origin/main` at `6c65ab928bfbe29ceb6e7d37715a97e1c12c63b7`.
Branch: `feat/owner-employee-commercial-access`. Production is unchanged.

## Audit and transition

| Area | Before | Implemented | Backend / verification |
| --- | --- | --- | --- |
| Commercial roles | Owner, Manager, Employee, Cashier, Staff; admin mixed into role capabilities | Owner and Employee; platform admin requires trusted internal identity | client-auth, commercial-access; real handler and policy tests |
| Legacy roles | Manager had near-owner authority; Cashier had payments, customers and orders; Employee had customers and kitchen by default | Legacy roles grant no commercial authority, even through an old explicit API role allowlist | Owner reviews each existing relationship in Employees → Portal access |
| Migration | No reviewed migration | Explicit confirmation converts to Employee, with six separately selected grants; never promotes to Owner | Revisioned CAS, before/after audit, authenticated actor ID; immediate reversal until the relationship changes again |
| Professional / account | Separate employee list and email membership, no dedicated booking identity binding | Same stable professional IDs; optional owner-authorized link to verified Identity user ID | Invite/configure resolves the actual Identity account; no employee-selected identity |
| Employee data | Full private site; all bookings without branches, otherwise every booking in assigned branches; confirmation preview before scope check | Allowlisted site, own professional appointments and minimum customer context; record scope before previews and actions | Actual client-admin / client-commerce-admin HTTP tests, tenant/branch/identity negatives |
| Collection | mark_paid authorized through bookings; POS implied manual sale | POS and manual collection are independent; no discounts, payment configuration, refunds, billing or global CRM | Central capability check, per-record action policy, POS operator/branch-bound attempts |
| Revocation | Stale membership indexes could expose business selector metadata | Canonical membership and bound identity rechecked every request and selector; CAS/tombstone indexes | member-index concurrency tests; removed members denied with still-valid identity |
| Workforce | Overview, Team and Training clock controls and salary forms | No active clock or salary UI; no new workforce or salary API writes | Historical owner-only GET/export preserved; POST returns 410; pure historical calculation/audit tests retained |
| Operating costs | Embedded with salary controls | Existing ledger and expense persistence reused; commercial results by professional retained as estimates | Owner-only expenses; no financial engine or payroll integration |
| Availability | Employee schedule overrode business/branch hours; timeOff, daily limit and breaks not enforced; Google failure sometimes advertised unchecked slots | Intersect business/branch/individual hours, ES/EN day keys, appointment breaks, inclusive date blocks, daily cap, existing and new buffers | Same rules for daily, monthly and locked hold confirmation; paginated reservations; Google failure → 503 in all required external checks |
| Availability requests | None | Optional employee request, own identity and server time; Owner reviews in the existing Team screen | Existing commerce store, conditional create/review, no duplicate requests or automatic schedule changes |
| Learning | Included workforce lesson | Professional/service tasks, scoped employee appointment practice and operating-expense practice | Same isolated runtime, no network fallback or real operations |

The audit is of code and synthetic fixtures, not a census of production users.
No customer records, real memberships or payroll histories were migrated.
On approval and deployment, each Owner must review quarantined legacy access.
The owner-facing conversion displays the new grants and requires an explicit
confirmation. Reversal restores the original record for audit and rollback;
a restored legacy role remains quarantined and cannot regain broad authority.
Revocation deletes access, not the professional, bookings, history or Identity
account used at another business. Each business grants independently.

## Contracts and historical compatibility

`client-member-access` is the sole portal grant mutation path. It requires the
current site revision. Generic `client-admin` members patches are rejected.
Invitations always create Employee access with independent grants off. Identity
roles, MFA settings and provider app metadata are not overwritten. The optional
professional is selected by the Owner, not the invited user. A missing profile
shows an unlinked state rather than another employee's calendar.

`client-workforce` remains for historical owner-only reads and CSV. New POST
operations return 410. Its state machine, history and audit are preserved for
historical interpretation; they are not part of appointment availability.
`client-business-accounting` retains historical owner reads/export. Only expenses,
commercial allocations and corrections of those records remain writable.
MCP retains its official tools and OAuth. Its advertised write schema removes
salary/hour/payment preparation, and its generic membership replacement is
removed in favor of the existing audited invitation/revocation path.
No ERPNext, Frappe HR, PostgreSQL, payroll or professional financial roles from
PR #120 were included. Only its canonical membership index fixes and CI
execution/diagnostic improvements were selectively reused.

Bookings still use the existing employee/day reservation lock and payment,
Calendar, email, inventory and webhook services. Existing confirmed appointments
are not rewritten when schedule rules change. External calendars are checked
when connected and assigned to the professional; an unassigned calendar is
not represented as externally verified. Calendar errors no longer fail open.

## Validation record

- Node 22: `npm test`: 632 passed, 0 failed at the current checkpoint.
- TypeScript and Vite: `npm run build` passed.
- Chromium initial 390/1440, ES/EN, Light/Dark, Owner/Employee: 16 cases passed.
- Impeccable 4.1.0: exit 2, 20 pre-existing advisories/warnings; none in the
  new CommercialAccessPanel, ProfessionalEditor, EmployeeWorkspace or scoped CSS.
- Workflow YAML: actionlint passed; no npm lint script exists.
- Chromium and WebKit: all seven widths (320/375/390/430/768/1024/1440),
  ES/EN, Light/Dark, Owner/Employee: 56 cases per engine passed.
- Chromium detailed Training: catalog/checkpoint recovery, inventory, public URL,
  professionals, orders, branches, expenses, POS settings, kiosk/display, Builder,
  appointment practice, role filtering and safe isolation passed.
- Remote preview results are recorded against the final commit in PR #121.
  A QA-only localStorage initializer was restricted to the top frame after the
  Netlify review iframe reproduced an opaque-origin SecurityError; the browser
  suite now creates an equivalent isolated iframe as a regression check.

Browser validation is automated/emulated; no physical iPhone test is claimed.
Production deployment and merging require explicit approval.
