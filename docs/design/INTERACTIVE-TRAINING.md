# Interactive platform training

The portal now teaches tasks using the existing operational components, rather
than a separate set of simplified tutorial forms. Enter through **Learn and
practice / Aprender y practicar**, or **Show me how / Enséñame** in an authorized
workspace. A completed activity offers the next available activity, so the user
can follow a continuous, role-aware learning path or choose a specific task.

## Coverage

The curriculum defines 24 activities. The actual list depends on the member's
backend-provided capabilities, role, cashier/display settings and business
profile. For example, a retail owner with both POS screens enabled sees 23;
kitchen practice is reserved for food businesses. Employees never receive the
owner's accounting or configuration activities.

| Activity type | Existing tools used |
| --- | --- |
| Hands-on practice | Catalog, inventory adjustment, POS and receipt history, public address editor, orders, booking calendar/cancellation, kitchen, team/service assignments, clock-in/break/clock-out, locations, sample payment links, accounting expense, POS settings, kiosk and customer-display pairing, Builder |
| Reference guides | Overview, customers, analytics, marketing, sharing, integrations, personal account security and subscription billing |

The reference guides label themselves explicitly. Real provider connections,
credentials, 2FA, subscription changes, refunds and outgoing messages are not
practice exercises. They are never presented as successful live operations.

## Isolation and architecture

- `ClientAdminPage` renders the same panels in live and practice contexts.
  The live workspace stays mounted, hidden and inert during training, retaining
  a prepared POS cart. Its kitchen/workforce polling and customer-display sync
  pause. Entry is blocked while a live POS payment attempt needs verification.
- `workspace-services.tsx` provides the ordinary browser transport by default.
  Only the explicitly mounted practice tree receives `practice-runtime.mjs`.
  There is no global fetch patch, second server, database, OAuth session or
  provider SDK for training.
- The practice adapter contains a finite list of local actions. Unknown methods,
  routes, external URLs and foreign business IDs fail closed with no network
  fallback. The real backend, authentication, authorization and tenant checks
  remain in force and are unchanged.
- Practice uses a new `wf-practice-*` site ID, an example employee and sample
  records. Only the current business's presentation colors, category, enabled
  POS settings and authorized capability names configure the exercise. Real
  catalog items, customers, wages and transactions are not copied.
- Actual component state emits events after React commits. A successful local
  action emits its result; the curriculum validates the current step. There is
  no unchecked Next button for hands-on steps. Reading steps use a clearly
  labeled acknowledgment and require their target to exist.
- The practice clock is a demonstration clock. It is not the official server
  clock or an attendance audit. Sample orders/receipts are clearly DEMO records;
  kiosk practice leaves the sample payment due. Practice payroll payments and
  live card/ATH checkout are blocked.
- The existing pure `accountingReport` helper renders the sample accounting
  report. A sample expense never marks payroll paid. Inventory adjustments and
  retries alter only fixture state.
- External links and native form submissions are contained by the practice
  host. Shared addresses use `example.invalid`; public QR generation and native
  sharing are disabled in practice. The Builder's ordinary saved draft,
  draft ID and current step are never read, overwritten or cleared by practice.

## Progress and recovery

Progress and fixture checkpoints are saved locally under a versioned key scoped
to the real user, business and role. This provides pause/resume and per-activity
continuation on this browser. It does **not** synchronize training across devices
or certify an employee's competency. No credentials or real customer records
belong in these checkpoints.

Unavailable storage produces an explicit message without blocking practice.
Restart clears only the current practice attempt. Malformed checkpoints have a
recovery boundary with Restart and Return controls. Restoring a checkpoint never
restores authority, a real site ID, payment-provider accounts or live images.

## Interaction and accessibility

The guide occupies its own bounded area above the actual workspace. Instructions
can collapse to leave more room on an iPhone; the workspace retains its own
scrolling. The sidebar measures its available space when the workspace resizes,
so it does not cover the guide. Exit and Pause remain explicit controls.

Driver.js **1.9.0** is pinned and loaded with the training session. Its MIT notice
is in `docs/licenses/driver.js-MIT.txt`. Source: https://github.com/nilbuild/driver.js.
The scoped adapter in `nonmodal-spotlight.ts` keeps the visual indication without
Driver's modal CSS. Version 1.9 installs a Tab trap even when keyboard navigation
is disabled; the adapter removes only that instance's keyboard listener,
preserves original ARIA attributes and retains normal portal keyboard behavior.
If the version-specific hook changes, it destroys the instance and keeps the
scoped CSS indication. Partially visible targets use that ring directly because
Driver otherwise scrolls them during highlighting. Only the explicit Show the
control action scrolls the workspace, so a delayed target discovery cannot move
a control under an active pointer. Verify keyboard and pointer behavior before
upgrading the dependency.

The guide follows the native type and blue/navy design system. Practice POS
surfaces retain the business colors and existing contrast helpers. New controls
have 44px targets, visible focus, legible themes, no external fonts and no
continuous motion. The guide uses no decorative imagery or fabricated claims.
Design dials: energy 1, rhythm 2, motion 1. The single learner task determines the
hierarchy; the activity list and progress use actual local state.

## Verification

- `npm test` includes the practice transport and curriculum suites.
- `npm run build` includes TypeScript checking.
- `node scripts/browser-training-smoke.mjs` exercises the built application.
  It supports the existing `QA_ENGINE`, `QA_WIDTHS`, `QA_LANGS`, `QA_THEMES`,
  `QA_ORIGIN`, browser-path and port settings. `QA_TRAINING_DETAILS=0` limits a
  run to the POS/library matrix; `QA_TRAINING_MATRIX=0` runs detailed activities.
- Browser fixtures intercept unexpected writes, including routes outside Netlify
  functions. No live financial, attendance or customer-data operations are used.
- CI runs both browser engines, uploads screenshot/log evidence and checks the
  matching Netlify preview with isolated fixtures. Existing platform regressions
  continue to run.

See `TRAINING-QA.md` for executed results, fixed defects and review limitations.
