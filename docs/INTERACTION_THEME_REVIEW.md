# Interaction and theme review — 2026-10-05

Prepared on `feat/premium-interactions-theme-audit`, based on current main
`d53642d` plus the previously prepared storefront removal fix `545cf75`.
Uploaded through the GitHub connector as PR #78 after explicit user authorization.
Netlify preview: https://deploy-preview-78--webfactorypr.netlify.app
Production remains unchanged.

## Implemented

- Storefront cart removal, immediate totals, empty-cart checkout guard, eight-second
  Undo and a browse-products empty-state action. The Builder iframe renders the
  same ClientStorefront component, so the behavior is shared with real websites.
- Template demonstration carts also support Undo.
- Subtle press feedback, keyboard focus, reduced-motion support; sounds default off
  while respecting explicit saved preferences.
- Copy buttons in payment links/POS, storefront tracking and tracking page report
  actual success or failure. Failures offer retry/manual-copy guidance.
- Unsaved-change protection for business details, locations, catalog, team, hours,
  payments/calendar assignments, settings, review automation and redesign. Leaving
  through links, navigation, site switching or sign-out asks to discard; cancelling
  keeps the draft. Reload/close uses the browser's native warning.
- Builder local drafts retain a truthful saved status, report storage failures,
  warn on unload if storage failed, remember the last step within the session,
  keep status visible on phones, and confirm catalog/team removal and reset.
- Client portal remembers safe sections per business in session storage and checks
  current capabilities before restoring them.
- Paired input surfaces/text in ChatGPT, accounting and redesign; tracking surface
  styling; deeper small-text colors in Builder light mode, keeping its layout.

## Verification

- `npm test`: 350 existing tests passed, zero failed.
- `npm run build`: passed, including TypeScript.
- Live published Builder: reviewed all eight steps in light and dark using computed
  text contrast. Light-mode secondary labels included ratios around 3:1; prepared
  targeted corrections. No sub-3:1 solid-background text found in the eight dark
  steps inspected. This does not cover imagery/translucency or every modal state.
- Private client portal presented a sign-in screen, so authenticated screens were
  inspected in source only; they have NOT received a complete visual audit.
- Added `scripts/browser-interactions-smoke.mjs` and its CI gate to test draft
  cancellation/save, Builder iframe removal/Undo, empty-cart blocking and reduced
  motion at 390px and 1280px. This new browser test has NOT run here: Chromium
  installation returned invalid downloads and the cloud browser cannot open the
  local development address.

## Preview validation and remaining work

- User authorized uploading this branch and a Netlify preview on October 5.
- Verified cart removal/Undo manually inside the actual Builder iframe: $20 → $0 → $20.
- Reviewed all Builder steps in both themes, plus templates and privacy. Fixed the
  selected step number in dark mode and paired header color transitions.
- CI passed the 350 tests, build, and Home FAQ desktop/mobile theme/language tests.
- New interaction test exposed a mobile line-break assertion and coordinate click
  instability in the scaled fixture. It now normalizes visible whitespace and
  verifies keyboard cart activation; pointer behavior was separately checked in
  the deployed Builder. Await the latest complete CI result before publication.
- Complete authenticated portal/module visual checks after secure user sign-in.
  The full-platform visual review remains pending; do not report it complete.
