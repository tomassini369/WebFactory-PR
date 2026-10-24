# Kiosk Skin Engine QA

2026-10-24. Implementation branch only; no merge or production deployment.

- `npm test`: 663/663 passing, including skin security, active-sale preservation,
  Stripe/ATH/in-person simulated checkout/receipt/reset contracts for every skin,
  and suppression of public new-booking links when bookings are disabled.
- `npm run build`: passed; `WF_DESIGN_PREVIEW=1 npm run build`: passed.
- Classic Chromium at 390/1440, ES/EN, Light/Dark: passed existing commerce,
  accessibility, settings, receipt, retry, reset, recovery and long catalog checks.
- All five skins, Chromium: seven widths (320/375/390/430/768/1024/1440), both
  languages/themes passed catalog, cart, totals, checkout, return, receipt,
  recovery, quantity limits, keyboard focus, contrast, touch bounds and overflow.
- All five skins, Chromium booking flows: 390/1440, both languages/themes passed
  service/professional selection, appointment creation, code/PIN lookup, arrival,
  balance payment, receipt, privacy and reset. CI also passed the full seven-width
  Chromium booking matrix for each skin on initial PR commit `f107de0`.
- Appearance configurator, Chromium: all seven widths, both languages/themes
  passed five selections/previews, save, colors/font/buttons/cards/background/
  motion, rejection of invalid input, restoration and absence of operational
  network calls. Custom soft-card rendering is checked by computed border radius.
- Shared POS, customer display and practice training: 390/1440, both languages/
  themes passed their existing isolated Chromium regressions.
- Initial PR CI run: https://github.com/tomassini369/WebFactory-PR/actions/runs/40112979190
  WebKit skin checks are running; final revision status is reported in the PR.
- The actual Netlify preview demo was opened and visually inspected. A field
  layout/contrast issue in the standalone demo was corrected. Text contrast is
  15.25:1 light / 14.60:1 dark; input borders are 4.72:1 / 6.98:1; action text 6.41:1.
- Impeccable: 20 baseline and final findings, zero kiosk findings or additions.
- Physical printer/iPhone hardware and real provider transactions: not performed.

Standard Playwright browser download failed twice with corrupt/empty archives.
Local Chromium verification uses an isolated npm-delivered Chromium executable,
without adding a product dependency. WebKit verification remains assigned to CI.

## Customizer expansion — October 24

- Expanded suite: 669/669 passing. New tests verify strict theme/preset data,
  MIME/decode/size/metadata processing, owner and tenant boundaries, registered
  image references, active/preset deletion protection, atomic eight-file quotas,
  pending-upload exclusion and storage-failure reservation cleanup.
- Preview build and TypeScript pass. Impeccable stays at 20 findings, zero kiosk
  findings. No new dependency or paid service was introduced.
- Chromium customizer matrix: 320/375/390/430/768/1024/1440, ES/EN and Light/Dark,
  passed recipes, palettes, color controls, finishes, gradients, patterns, custom
  surfaces, welcome/layout changes, undo/redo, persistence and restoration.
- At 390/1440, image upload/optimization, positioning, blur, named presets and
  referenced-image protection/deletion were exercised using in-memory demo data.
  Final verification also checks image activation in the actual kiosk renderer.
- Existing Chromium kiosk checkout/print/receipt/recovery checks passed at
  390/1440, both languages/themes. Booking regression verification is retained.
- Full detailed training exercises passed, including kiosk pairing, unpaid
  practice checkout, Builder state, role isolation and blocked network writes.
  An old positional selector had selected appearance controls before the location
  selector rendered. The location now has an explicit accessible name and the
  test waits for that control; no practice transport or role permission changed.
- Prior commit `3210d82` passed all ten skin/browser CI jobs and deployed-preview
  checks. Its core CI failure came from that training selector; this expansion
  fixes it. Expanded WebKit/deployed verification runs in the updated PR checks.

`scripts/browser-kiosk-customizer-smoke.mjs` is added to both browser CI jobs.
Screenshots are saved under `/tmp/webfactory-kiosk-customizer/` and uploaded
alongside existing skin evidence. Actual printer/iPhone hardware and real
financial transactions are outside isolated QA; none were executed.

Evidence is emitted into `/tmp/webfactory-kiosk/<skin>/` and
`/tmp/webfactory-kiosk-skins/`, and the GitHub Actions `kiosk-skins-*` artifacts.

The deployed HTTP probe caught Netlify treating the original upload filename
as an asynchronous background function (202 without a response body). The
endpoint is now `client-kiosk-visual-assets`, synchronously returning the
authorization result and upload metadata. The probe verifies its 401/403/405
boundaries on the actual Deploy Preview; fixture tests cover valid uploads.

Glass follow-up adds schema bounds/legacy hydration checks and browser
assertions for translucent header/welcome/catalog/cart backgrounds, independent
blur, opaque text (element opacity remains 1), nested cards without blur,
saved controls, cart interaction, forced-color and print fallbacks. The same
seven-width ES/EN Light/Dark matrix is retained. Impeccable reports the same
20 existing findings, with none in the kiosk files.
