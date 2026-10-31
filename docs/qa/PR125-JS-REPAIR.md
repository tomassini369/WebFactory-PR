# PR 125: confirmed runtime and verification repairs

Baseline: `00de844a6da43804e3dbfec99b3dd9ca05f118e5`, after the requested revert.
No reverted scrolling, palette, navigation or contrast changes are restored.

## Reproduced and corrected

- In WebKit, after saving kiosk appearance and returning to the live catalog,
  the cart grid retained old inherited optical values: root blur 24px / opacity
  70%, grid/cart blur 8px and transparent cart. The existing customizer smoke
  failed on its rendered-panel assertions. Synchronize saved blur, opacity,
  custom cart color and its contrast pair at the grid boundary on each commit,
  including grids mounted after loading/result views. Keep palette variables
  inherited so their existing animation remains authoritative.
- WebKit retained screen backdrop filters in print. Add a scoped print override
  and complete the existing prefixed reduced-transparency/forced-colors rules.
  Screen colors, presets, geometry and navigation are unchanged.
- Unit tests still rejected opacity 69 and blur 13, although the shipped controls
  and validator support opacity 25–95 and blur 0–24. Check out-of-range values
  24/96 and -1/25, retaining wrong-type/security checks and adding accepted edges.
- The customizer test selected solid/color-only after a palette cleared its
  wallpaper, then required an optical renderer that needs a backdrop. Select the
  actual bundled wallpaper first; explicitly select opacity 70 and verify the
  current maximum blur 24 instead of assuming obsolete slider endpoints.
- Portal smoke fixtures omitted profile reads/automatic preference writes and
  display keepalive. Add only these isolated operations with method/action
  assertions. No network fallback to real tenant data.
- Dashboard appearance has two fieldsets and a select whose accessible label
  includes its option text. Disambiguate the wallpaper fieldset and combobox;
  wait for the asynchronous optical renderer without dropping assertions.
- URL contrast QA treated transparent backgrounds as black. Composite ancestor
  backgrounds and alpha before checking actual text/input/border contrast;
  retain 4.5:1 text and 3:1 border requirements. Do not require a transparent
  input when the current approved design supplies a themed input surface.
- Chromium matrix jobs explicitly invoked WebKit without installing it. Install
  that dependency and pin the kiosk runner to Ubuntu 24.04, matching other jobs.

## Validation executed locally

- `npm test`: 822 passed, zero failed/skipped (baseline: 821 passed, one failed).
- `WF_DESIGN_PREVIEW=1 npm run build`: passed, including application TypeScript.
- Customizer Chromium: 390/768/1440, ES/EN, Light/Dark passed before the targeted
  WebKit repair; final cross-engine reruns tracked in the task evidence.
- Customizer WebKit: the formerly failing 390/light/ES case now passes through
  panel styles, cart, forced colors, print, saved configuration and restoration.
- Commercial access Chromium390: Owner/Employee × ES/EN × Light/Dark passed.
- Public URL Chromium390: ES/EN × Light/Dark, conflicts, lost responses,
  aliases, accessibility, Owner/Employee and navigation protections passed.
- Glassy dashboard Chromium390: both portals × ES/EN × Light/Dark plus private
  upload/deletion, conflicts and employee navigation passed.
- Kiosk keyboard Chromium: ES/EN × Light/Dark, text/email/phone/hex/PIN,
  caret/physical keys, disabled keyboard, mobile/iPad native fallbacks, cleanup
  and opt-out passed. Fixtures only, no real payments/bookings/emails.
- YAML parsed; `git diff --check` passed. No npm lint script exists. Standalone
  actionlint was unavailable in this instance and is not claimed as executed.
- Impeccable 4.1.0 reported 20 existing findings, not an execution failure.
- Browser tests use automation/emulation, not a physical iPhone.

## Published investigation and limits

Baseline Netlify deployment `6ae5304d38428cc0f06890c7` was ready and matched
`00de844`. The five requested published routes were exercised in Chromium and
WebKit at 1440×900, 768×1024 and 390×844, with listeners installed before
navigation. A separate anonymous-session matrix covered 18 login cases, and
six published kiosk fixture cases selected the five skins.

One transient WebKit exception was captured during navigation:
`Unable to preload CSS for .../assets/kiosk-BggIyyt3.css`, beginning at
`assets/index-C4w-pkL0.js:10:74662`. That request was cancelled with other assets
of the outgoing page. The CSS returned HTTP200; four isolated repetitions with
form-readiness waits did not reproduce the exception. No speculative catch,
error suppression or automatic session reload was added.

The Netlify collaboration iframe at `app.netlify.com` is blocked by the existing
CSP from `/.netlify/scripts/cdp`. It is preview tooling, separate from WebFactory
runtime exceptions. Do not weaken CSP to silence that console message.

These findings do not establish the cause of Bugsense's 64/100 alert without
its exact message/stack and reproduction steps. Authenticated operational
portals need their own isolated fixtures; anonymous login checks are not proof
of all private operations. New commit CI/deployment and published reruns must
be checked independently; local passes are not a claim of remote success.
