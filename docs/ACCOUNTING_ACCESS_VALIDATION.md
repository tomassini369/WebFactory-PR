# Accounting Access / optional modules validation

Branch: feat/accounting-access-erpnext-frappe-hr
Base: origin/main 6c65ab928bfbe29ceb6e7d37715a97e1c12c63b7
PR: https://github.com/tomassini369/WebFactory-PR/pull/120
Preview: https://deploy-preview-120--webfactorypr.netlify.app

## Executed locally

- npm test: 639 passed; no skipped tests.
- npm run build: passed with Node 22, including application TypeScript check.
- Chromium Accounting Access: 28 viewport/theme/language combinations, plus
  authenticated same-email invitation review/acceptance, read-only mutation
  denial, existing-session revocation and independent Attendance enable/disable.
- WebKit Accounting Access: the same 28 combinations and functional scenarios.
- Viewports: 320,375,390,430,768,1024,1440; ES/EN; Light/Dark; reduced motion.
- Workforce Chromium: 28 combinations; clock/break/out/approval, correction review,
  member settings, server recovery and restricted employee access passed.
- POS Chromium: 390/1440, ES/EN, Light/Dark passed with isolated catalog/cart.
- Kiosk regression: Chromium 390/1440 and WebKit 390, ES/EN and Light/Dark;
  pairing, cart, isolated provider return, recovery, privacy reset, administrator
  enablement and device revocation passed after the response-validation fix.
- Training Chromium: 390, English/Dark plus the complete functional course set,
  checkpoint recovery, role filtering, safe activity restart and preservation of
  the live cart. The accounting lesson now targets Accounting and migrates its
  old Analytics checkpoint without touching real data.
- Python AST syntax: four Frappe bridge Python files passed. This is not a
  Frappe runtime or database test.
- Impeccable detector: 20 existing advisories, no findings in the new financial
  panel files. Exit 2 denotes advisories, not a failed invocation.
- Portal navigation: all 20 client/admin viewport/theme scenarios passed locally;
  eight mobile/desktop ES/EN Light/Dark destination, draft-save and plan-gate
  scenarios passed with isolated records.
- actionlint 1.7.12: updated workflow passed; official release hash verified.
- git diff --check: passed. No npm lint script exists; none was claimed as run.

## Errors found and corrected

- Stale membership index could list revoked businesses: canonical active-member
  revalidation plus CAS projections/tombstones now prevent disclosure.
- A grant could commit before index refresh failed: pre-commit inert projection
  keeps accepted memberships discoverable without granting access prematurely.
  Only changed memberships refresh their index; catalog/design edits do not
  generate per-member projection reads/writes.
- Independent CPA review compares both Identity subject and email, so changing
  an email cannot turn the same account into its own credential reviewer.
- CI log redaction covers invitation credentials following any query/fragment
  separator, including the second fragment parameter.
- Legacy member forms could erase financial fields: server-owned protection and
  dedicated audited grant mutations preserve authorization.
- Wage data could be inferred through summaries/CSV: JSON and CSV redact rates,
  hours, wage totals, derived result and payroll histories unless separately
  authorized. Read-only permission does not grant mutation or export.
- Draft entries and retry identifiers needed stronger rules: separate approvers,
  effective-record filtering, payload fingerprints and CAS prevent silent reuse.
- Moving accounting out of Analytics broke its practice lesson: course target,
  owner navigation and old checkpoint migration now match the live destination.
- Async module confirmation made an immediate checkbox check unreliable: QA now
  waits for the server-confirmed state. Attendance activation is central; the
  employee settings smoke retains its paid-break-policy assertion.
- Docker vfs copies filled the 32 GB environment before ERP could run: only
  task-created image/layers were removed, recovering 26 GB. No site was created.
- ERP health responses are allowlisted; refunded sources require reconciliation;
  delivery leases have an ownership identifier in addition to CAS metadata.
- Remote kiosk QA exposed a malformed-success response that could crash the new
  financial panels and blank Settings. Both panels now validate their response
  contract and show independent retry/error states. A browser test verifies
  malformed financial responses leave kiosk settings accessible; Chromium and
  WebKit kiosk regressions passed. No default configuration or permissions are
  invented when validation fails.

- Preview Accounting Access QA exposed test initialization writing storage in
  sandboxed frames with opaque origins. Fixture setup now requires the main
  application document and its exact origin. A sandboxed-frame regression keeps
  error detection enabled; service workers are blocked only in isolated QA.

## CI and deployment evidence

The PR repeats unit/build, Chromium/WebKit Accounting Access and existing
Workforce/Training/POS/kiosk/auth/Builder checks. The preview job loads the actual
deployed app using isolated handlers, and accounting-access-http-smoke.mjs tests
the real protected Netlify endpoints without credentials or mutations.

A later full-suite portal-navigation check failed with a generic CI exit code;
its complete local rerun passed all 20 client/admin viewport/theme scenarios.
No product defect was inferred without a reproducible error. The workflow now
captures safe failure context and runs the same checks in independent core,
commerce and experience groups; the required verify check aggregates all three.
No assertion or test was removed. Consult current PR checks for the exact final SHA and their conclusions; earlier
failed runs are retained and must not be presented as passing. Direct preview
HTTP access from this execution environment is blocked by its network proxy, so
deployed-browser/authentication evidence is collected by GitHub Actions. Netlify
deploy state and commit identity can also be read through its public status API.

## Not verified / not activated

No live email was sent, no Identity account was created, and no customer,
attendance, payment or financial production record was changed during QA.
Existing Identity provisioning/password recovery is reused but its new invite
workflow still needs a real staging-account delivery test. CPA evidence tests
do not verify any real professional's license.

No configured persistent ERPNext/Frappe HR instance exists here. Live Frappe
permissions, database concurrency/rollback, journal validation, refunds, stock
valuation, scheduling, leave and payroll remain blocked/pending. Scheduling and
payroll cannot be enabled. Formal statements and period closing are not exposed
as operational. See ERP_CONNECTOR.md for infrastructure and activation gates.

Main/production remain unchanged; this PR requires owner review before merging.
