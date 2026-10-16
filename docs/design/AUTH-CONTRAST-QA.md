# Login and MFA contrast repair

## Confirmed failure

The light-theme **Set up Authenticator / Configurar Authenticator** button
could appear blank after the password login screen. Its secondary surface
was almost white while the password form's generic button rule supplied
white text. The same account-security screen opened directly did not load
all the password form CSS, which hid the defect from initial-state checks.

The public deployment reproduced this with a fully intercepted fixture login:
white text against approximately RGB(254.7, 254.8, 254.9), **1.0019:1** contrast.
No real login, enrollment, credentials or account changes were performed.
The primary password/passkey/Authenticator actions also measured **3.54:1**.

## Implementation

Only `src/portal-glass.css` changes application presentation:

- Primary login and MFA actions pair white text with #285fa6.
- Secondary MFA actions explicitly pair the existing theme's solid surface
  and accent ink, overriding the inherited white button text.
- Disabled MFA action labels remain opaque and readable on neutral surfaces.
  Their disabled attributes and actual authorization behavior are unchanged.
- Card headings, labels, descriptions, text fields, placeholders and recovery
  links explicitly follow the card's existing light/dark tokens. WebKit text
  fill and caret colors follow those same tokens; native autofill is retained.
- The login shell switches its background immediately with the theme. A
  background-only transition had briefly left desktop welcome text over the
  previous theme's canvas, even with the global 0.01ms reduced-motion rule.
- Forced-colors uses system button/text colors and text-fill overrides.

No JavaScript authentication, MFA, WebAuthn, OAuth, permission, payment, tenant,
Builder or training behavior is modified. No dependency or visual asset is added.
The existing cards, geometry, logos, scrolling and return/language controls stay.

## Verification

| Check | Result |
| --- | --- |
| `npm test` | 554 passed, 0 failed, 0 skipped |
| TypeScript and `npm run build` | Passed |
| Existing authentication usability smoke | Passed: initial controls, ES/EN, recovery failure/retry and return-home handoff |
| Existing authentication stability smoke | Passed 6 cases: 320/390/430px, both themes, loading/login/MFA/logout, keyboard viewport and Home media |
| New Chromium contrast matrix | 56 passed: 28 Client + 28 Admin scenarios |
| New touch WebKit contrast matrix | 56 passed: 28 Client + 28 Admin scenarios |
| Pinned full-source Impeccable detector | 20 existing advisories, exit 2 (findings) |
| Impeccable on the changed CSS | 0 findings |
| `git diff --check` | Passed |

There is no lint script in this repository. Existing static advisories concern
legacy surfaces/fonts/motion; this repair does not claim a clean platform-wide
design audit. An early dev-server stability attempt overlapped a CSS HMR update
and failed locale retention; rerunning with frozen source passed all six cases.
No authentication logic was changed to make that check pass.

`scripts/browser-auth-contrast-smoke.mjs` runs against the built application.
Both portals are exercised at 320, 375, 390, 430, 768, 1024 and 1440px in ES/EN
and Light/Dark: 56 scenarios per engine. Each scenario covers password login,
its actual transition into MFA, enrollment, disabled and entered-code states,
a mock invalid-code error, cancellation, restored passkey/Authenticator/recovery
controls, visible keyboard focus and a theme switch preserving the typed code.
Computed text contrast is at least 4.5:1, including disabled MFA labels.

All auth endpoints are fixture responses. The test never invokes a real passkey
ceremony, confirms MFA, contacts a payment provider or modifies real accounts.
Unrecognized writes are blocked; the only business lookup is a read-only empty
fixture; unverified Admin overview reads are denied with a fixture 403. A physical iPhone, real OS autofill and real provider verification are
not claimed. Browser theme state, text fill and touch WebKit are exercised.

The new CI checks run both engines locally and against the same PR's deployed
preview at 390/1440px. Screenshots/logs are uploaded as auth-contrast evidence.
Changes to `.github/workflows/v3-ci.yml` and `scripts/report-kiosk-ci-error.mjs`
add these checks and expose their failures through check-run annotations.

## Scoped Anti-Slop delivery gate

Design read: repair legibility on the existing login/MFA screens. Preserve the
approved geometry and native typography; use the current blue/navy theme pairs.
ENERGY 1 / RHYTHM 1 / MOTION 1. There is no new composition or marketing copy.

- R-02 PASS: no new learner or marketing copy.
- R-03 PASS: matrix checks horizontal overflow at all required widths.
- R-17 PASS: no statistics or business data added.
- R-18 PASS: no testimonials.
- R-23 PASS: no product assets or fictional identity; QA uses labeled fixtures.
- R-24 PASS: existing destinations/handlers are retained.
- R-25 PASS: repaired controls use measured theme pairs and a 4.5:1 assertion.
- R-26 PASS: buttons retain their existing handlers and disabled states.
- R-27 PASS: disabled, entered-code and invalid-code states are exercised.
- R-28 PASS: no FAQ changes.
- R-32 PASS: real Tab navigation checks keyboard focus on Authenticator setup.
- R-33 PASS: the repair is source CSS, not a runtime production patch.
- R-34 PASS: both themes and in-session switching are verified by the matrix.
- R-35 PASS: build, unit tests and recorded login/MFA workflows execute.
- R-36 PASS: no fabricated security or performance claims.
- R-37 PASS: the owner requested the login contrast repair; direction is scoped.
- R-38 PASS: fixture codes never represent real security verification.
- R-01 PASS: no gradient or glow added.
- R-04 PASS: no icon change.
- R-06 PASS: preserve native fonts and existing heading hierarchy.
- R-07 PASS: no decorative background pattern.
- R-08 PASS: no decorative arrows.
- R-09 PASS: no badge added.
- R-10 PASS: preserve the existing glass card without introducing glass layers.
- R-12 PASS: no repeated elevation added.
- R-13 PASS: secondary controls remove the inherited action shadow.
- R-14 PASS: no new cards or feature grid.
- R-19 PASS: shell colors switch together; no additional animation.
- R-22 PASS: no illustrations.
- Dials PASS: declared restraint matches the existing-surface repair.
- Focus PASS: existing login/security heading and primary action are retained.
- Whitespace PASS: no layout or spacing change.
- Accent PASS: existing blue is calibrated for readable labels.
- Identity PASS: existing WebFactory marks and type stay.
- Design read PASS: legibility and theme consistency determine every change.
- C-1 PASS: color changes address measured failures.
- C-2 PASS: existing actions still execute the fixture workflows.
- C-3 PASS: no filler section.
- C-4 PASS: themes, narrow screens, keyboard and error states are covered.
- C-5 PASS: results distinguish fixtures from real authentication.
- R-05 PASS: no template or composition added.
- R-11 PASS: existing control/card shapes stay.
- R-15 PASS: existing task-specific action labels stay.
- R-16 PASS: no promotional filler.
- R-20 PASS: repair applies to actual WebFactory authentication components.
- R-21 PASS: both theme choices remain.
- R-29 PASS: existing blue/navy and neutral theme tokens are reused.
- R-30 PASS: no third-party interface copied.
- R-31 PASS: each change addresses legibility or synchronized theme paint.
