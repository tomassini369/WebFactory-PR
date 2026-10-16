# Interactive training verification

Validation date: 2026-10-16. Scope: the training addition on the existing unified
workspace PR #116. Production publishing is excluded.

## Executed checks

| Check | Actual result |
| --- | --- |
| `npm test` (Node 24.19.0) | 554 passed, 0 failed, 0 skipped |
| Entire suite on CI-compatible Node 22.23.3 | 554 passed, 0 failed, 0 skipped |
| New transport/curriculum suites on Node 22.23.3 | 40 passed, 0 failed, 0 skipped |
| `npm run build` | Passed, including TypeScript checking |
| Training Chromium | Passed 28 matrix cases plus 33 detailed checks |
| Training touch WebKit | Passed 28 matrix cases plus 33 detailed checks |
| Existing POS smoke, Chromium | Passed all seven widths, ES/EN, Light/Dark and retry/payment-state cases |
| Existing Workforce smoke, Chromium | Passed responsive matrix and identity/break/review/recovery cases |
| Existing workspace/Builder smoke, Chromium | Passed responsive matrix, navigation, contrast and saved-draft checks |
| Existing Customer Display smoke, Chromium | Passed 28 cases plus two-device cart, backend-confirmed receipt, stale hiding and revocation |
| Existing kiosk smoke, Chromium | Passed 28 matrix cases plus isolated checkout/retry/privacy, admin and long-cart checks |
| Impeccable, new training sources | Passed: 0 findings |
| Impeccable 4.1.0, full `src/` | 20 existing advisories, exit 2 (findings, not execution failure) |
| Repeated native Builder pointer reproduction, Chromium | 12 consecutive passes after the scroll repair |
| Guide target-readiness reproduction, Chromium | 32 completed activities (8 guides repeated 4 times) after the CI correction |
| Detailed Training after target-readiness correction | 33 checks passed in each engine |
| `git diff --check` | Passed |

There is no lint script in this project. A separate lint run is not claimed.
The full-source detector still recommends changes to legacy fonts, decorative
surfaces and animations. Those are outside this training change and sometimes
conflict with the approved native-font and existing glass-surface contract.
The new training sources have no deterministic detector findings.

## Browser coverage and click-through record

The full training matrix runs 320, 375, 390, 430, 768, 1024 and 1440px with both
languages and themes, reduced motion, and realistic mobile viewport heights.
Each engine executes 28 matrix cases plus the following detailed workflows.
The fixtures block unexpected application writes, even outside Netlify routes.
Cross-origin Netlify review frames are not application fixtures or financial
requests. No real tenant data, payments, invitations or attendance are used.

- Library search filters authorized activities; selecting an activity opens
  the actual tool with the guide. Empty searches show an explicit empty state.
- POS search finds the sample product; Add and quantity change the cart;
  sample cash produces a DEMO receipt; the actual receipt history shows it.
  Completion persists after reload, and normal Tab can leave the spotlight.
- Catalog Add, name, price and Save create a fixture product. Leaving midway
  and reloading restores the in-progress form and matching guide step.
- Inventory adjustment updates fixture stock and movement history.
- Public-address Edit and Save update only the sample slug.
- Team edits and service assignments save the sample employee.
- Clock-in, Start Break, End Break and Clock-out follow the required sequence.
- Orders update their sample status; locations save a sample branch.
- Payment-link creation yields an example.invalid address; accounting creates
  a sample expense and renders the existing report without NaN values.
- POS settings toggle the sample module; kiosk pairing opens the existing
  kiosk, which submits a sample order with payment still due.
- Customer-display pairing opens the existing display with sample totals,
  without employee, administrator or personal records.
- Builder edits the sample name, selects mobile and opens its actual preview;
  the live saved draft, draft ID and saved step remain unchanged.
- Booking filters change the sample calendar; Cancel updates the sample booking.
- All eight reference activities acknowledge their actual target; sensitive
  integrations, billing and security explain their exclusions explicitly.
- Employee/cashier role filters remove unauthorized activities; restaurant
  kitchen practice follows the sample order; disabled modules stay absent.
- An existing live-fixture POS cart survives practice. A pending live payment
  prevents entry without clearing or replacing its attempt.
- Pause/Resume, Restart, next activity and return to the library work. Storage
  failures show a message while allowing session-only practice.

## Modified files

- Training library/guide: `src/PortalTraining.tsx`, `src/portal-training.css`,
  and `src/training/` (curriculum, isolated transport, scoped providers,
  progress, recovery and nonmodal indication).
- Existing tool adapters/targets: `ClientAdminPage.tsx`, `ClientAdminV3Panels.tsx`,
  `PosWorkspace.tsx`, `PosCustomerDisplay.tsx`, `PosOperationsSettings.tsx`,
  `WorkforcePanel.tsx`, `BookingCalendar.tsx`, `BusinessAccountingPanel.tsx`,
  `BusinessQrPanel.tsx`, `InventoryHealthStatus.tsx`, `AthConnection.tsx`,
  `StripeConnection.tsx`, `WebFactoryBuilder.tsx`, `BuilderAiAssistant.tsx`,
  `Kiosk.tsx`, `KioskBookingPanel.tsx`, `KioskSettings.tsx`, `kiosk-api.ts`,
  `CustomerDisplay.tsx`, `PortalPanel.tsx`, `UploadedSidebar.tsx`, and
  `uploaded-sidebar-integration.css` under `src/`.
- Verification: the two `netlify/lib/training-*.test.mjs` suites,
  `scripts/browser-training-smoke.mjs`, CI and its error reporter.
- Contract/license: `AGENTS.md`, `docs/design/DESIGN-PORTALS.md`,
  `docs/design/INTERACTIVE-TRAINING.md`, this report, the MIT notice,
  and the package/lock entry for Driver.js 1.9.0.

No operational backend function, database schema or production configuration is
changed. Unit tests under netlify/lib exercise the browser's local adapter.

## Defects found and corrected

1. The old training banner/safety class names picked up legacy gradient and
   yellow backgrounds. Unique scoped names restore legible Light/Dark surfaces.
2. The dark primary button did not have a 3:1 boundary against its surrounding
   surface. Theme-aware fill/foreground pairs now preserve both text and control
   contrast. Browser assertions check 4.5:1 text, 3:1 button boundaries and 44px
   targets in the new library/guide.
3. A global FAQ rule rotated and enlarged sidebar summary labels. A scoped
   navigation rule retains ordinary text in open sidebar groups.
4. PortalPanel discarded the training target attribute; it now forwards the
   explicit data-training prop without changing its panel controls.
5. Receipt navigation from the POS's own controls was missing the guide event.
   Navigation now emits after the component state commits.
6. WebKit exposed an intermittent wait at Builder device selection. The guide
   subscription has a stable layout-effect lifetime and the Builder checkpoints
   the selection after React commits it. Repeated pointer traces then isolated a
   separate cause: delayed target highlighting scrolled the preview under the
   pointer, so the desktop click landed in the storefront frame. Automatic
   target discovery now only outlines; explicit Show the control owns scrolling.
   Partly visible targets bypass Driver auto-scroll and use the CSS ring.
7. Driver 1.9 installs a keyboard trap even with keyboard controls disabled.
   The scoped nonmodal adapter removes only its own listener, restores ARIA
   attributes and falls back to a CSS ring if its pinned hook changes.
8. Practice upload/malformed requests now return explicit errors. The sample
   public-address editor reuses the real 64-character slug validator. Kiosk
   presentation derives from existing business capabilities.

9. The full remote verifier exposed a transition where a read acknowledgment
   could briefly retain the previous step's availability before becoming
   disabled for the hidden navigation target. Target readiness now updates in
   the layout effect before paint and resets on every step. Acknowledgment
   rechecks the current target. Browser read steps explicitly reveal their
   target before confirming, instead of making a stale one-time enabled check.

## Design and Anti-Slop delivery review

Design read: teach a task inside an existing business workspace. The focal point
is the current action, with a bounded guide, a quiet activity list and the
business's existing operating surfaces. ENERGY 1 / RHYTHM 2 / MOTION 1.
Blue identifies guidance; tenant colors identify the practice business. No new
hero, font, illustration, decorative gradient or animation engine is added.
The existing sidebar glass belongs to the approved workspace design.

The following delivery gate applies to the new training surfaces and scoped
sidebar repair. It is not a claim that every legacy page was redesigned.
Screenshots inspected: 390px Light ES library, 1440px Dark EN library, and
390px Dark ES WebKit POS guide. The final images confirm that the old banner
backgrounds and rotated sidebar labels are gone.

- R-02 PASS: new learner copy uses ordinary punctuation, with no em dashes.
- R-03 PASS: both engines pass all seven widths without horizontal page overflow.
- R-17 PASS: progress counts come from completed activity IDs in local state.
- R-18 PASS: no testimonials or customer claims are added.
- R-23 PASS: no visual assets are generated; authorized fixtures say Practice/DEMO.
- R-24 PASS: activity buttons resolve to authorized existing tools; practice exits are contained.
- R-25 PASS: computed new library/guide text is at least 4.5:1 in both themes.
- R-26 PASS: course, progress and session controls have real handlers; excluded operations say why.
- R-27 PASS: lazy loading, empty search, storage failure and recovery boundary are implemented.
- R-28 PASS: no FAQ or filler questions are added.
- R-32 PASS: visible focus and normal Tab movement are verified; spotlight does not trap focus.
- R-33 PASS: feature behavior and styles are committed source, not external runtime patches.
- R-34 PASS: Light/Dark matrix passes in both browser engines.
- R-35 PASS: build and the recorded action workflows ran against the built application.
- R-36 PASS: no invented compliance, customer or measured-performance claims.
- R-37 PASS: existing portal design direction and the declared low-motion dials guide the work.
- R-38 PASS: fixture records are explicitly labeled examples; no fictional production evidence.
- R-01 PASS: new training surfaces have no decorative gradient or glow.
- R-04 PASS: existing icons mean learning, search, completion, pause, resume, target and exit.
- R-06 PASS: native fonts follow DESIGN.md; no new display font or tracked headline.
- R-07 PASS: no grid, blueprint or decorative dot background.
- R-08 PASS: no decorative arrows are added to the training actions.
- R-09 PASS: completion is a state label, not a promotional badge.
- R-10 PASS: guide/library are opaque; existing sidebar glass follows the approved workspace.
- R-12 PASS: list rows use separators, not repeated elevated shadows.
- R-13 PASS: the target outline identifies the current real control; no glow decoration.
- R-14 PASS: the list follows task content and separates practice from reference.
- R-19 PASS: spotlight animation is disabled and transitions honor reduced motion.
- R-22 PASS: no generic illustrations.
- Liveliness dials PASS: ENERGY 1 / RHYTHM 2 / MOTION 1 match the guide and activity list.
- Liveliness focus PASS: the current task title and indicated control establish a focal point.
- Liveliness whitespace PASS: borders and spacing distinguish safety, search and task groups.
- Liveliness accent PASS: guidance uses one blue accent; practice retains business colors.
- Liveliness identity PASS: the native portal typography and task/result structure repeat.
- Liveliness design-read PASS: refine the existing workspace for practical learning; no new app.
- C-1 PASS: guide placement preserves workspace space; purpose is documented above.
- C-2 PASS: controls perform local actions or explicitly explain excluded live operations.
- C-3 PASS: each activity maps to an existing platform resource.
- C-4 PASS: responsive themes, keyboard escape from spotlight, restart and unavailable storage are checked.
- C-5 PASS: only executed tests and clearly labeled demo state support the claims.
- R-05 PASS: no landing-page template or decorative card mosaic is added.
- R-11 PASS: guide panels, list separators and controls retain different structural shapes.
- R-15 PASS: actions identify the task, pause, restart, acknowledge or leave the guide.
- R-16 PASS: no promotional AI filler copy.
- R-20 PASS: role, business profile and existing WebFactory tools determine the curriculum.
- R-21 PASS: both existing theme choices remain available; no forced theme.
- R-29 PASS: blue/navy/native surfaces and tenant accents follow the current palette.
- R-30 PASS: existing WebFactory panels are reused, with no copied third-party POS layout.
- R-31 PASS: the architecture document explains typography, layout, color and motion choices.

## Review limits

Progress is local to this browser, business, user and role; it is not a
cross-device LMS, payroll audit or employee certification. There are 16 practical
activities and 8 reference activities, filtered by actual access and business
profile. Provider authorization, MFA, subscriptions, refunds, outgoing messages,
real attendance and real payments are intentionally excluded from practice.
No physical iPhone, NFC or payment terminal test is claimed. WebKit here is an
automated touch-browser check, not a physical-device certification.

The test counts above cover this change, not every possible action in every
existing portal. Browser errors mean uncaught page errors; unrelated console
warnings and the Netlify review UI are not claimed to be absent. The WebFactory
MCP/Graphify connection was not exposed to this Codex session; code inspection,
GitHub CLI, Node tests, browsers and the existing Netlify integration are the
verification tools used here. No MCP repair or successful MCP call is claimed.
