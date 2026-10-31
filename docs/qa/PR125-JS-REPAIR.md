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

## Additional completed evidence

The final customizer matrix passed all 24 cases (390/768/1440 × ES/EN ×
Light/Dark × Chromium/WebKit). Published commit60c890e passed six material/print
checks at all three sizes in both engines, with no runtime exceptions or
operational requests. The published consumer smoke independently passed all
16 cases at390/1440 in both engines, both themes and languages; invalid signup
and CSRF HTTP boundaries also passed without creating accounts. Return links
passed published Chromium390/1440. The new CI run still reported a failure in
its combined consumer step; direct reproductions passed and its signed log
host was blocked, so no speculative application fix was made. Add existing
redacted error annotations to that step to make subsequent failures diagnosable.
Consumer/return scripts now honor the configured proxy and retained WebKit
path, permitting the same checks in this managed environment.

## Follow-up after the 65fca4f CI run

Confirmed failures and repairs:

- Training's sticky session toolbar shared the instruction scroller and covered
  the acknowledgement button after the kiosk exercise on mobile. Keep the
  toolbar in a non-scrolling flex row and scroll the bounded instruction body.
  The regression checks real pointer hit-testing before acknowledging; no forced
  click, disabled overlay, global scroll change or practice network fallback.
- Customer Display correctly shows `787-000-0000`; its assertion expected an
  unformatted phone. Check the displayed format and preserved digits. Explicitly
  choose cash before testing a received-payment action: the current POS starts
  on its QR option. No checkout default/provider logic was changed.
- WebKit's intercepted File POST exposes `null` through postDataBuffer. The
  isolated image handler consequently received an empty body and returned400.
  Only for this PNG fixture on WebKit, read the File actually selected in the
  browser input. Keep the real encoder, validators, version checks and storage
  fixture. This validates UI/handler integration, not the actual upload wire
  format in physical Safari. Chromium continues using its intercepted body.
- Add redacted annotations identifying which Experience sub-check fails; none
  of its scripts or assertions were removed.
- The Classic jobs were cancelled at their20-minute deadline and the deployed
  suite at25minutes. Allow35/45minutes respectively to complete the existing
  matrices/setup/deploy wait. Individual action timeouts remain unchanged.

Executed:822 unit tests passed; build/application TypeScript passed. Detailed
Training activities passed in both engines, plus32 responsive cases at
320/390/768/1440 in both themes/languages. Customer Display390 passed both
engines, including real-handler fixture pairing, reload, two-device sale,
backend-confirmed receipt, stale-data hiding and revocation. No real financial
writes. Dashboard WebKit390/1440 passed all theme/language cases plus actual
fixture image encoding, upload, stale-tab conflict, reload and deletion.
Regressions and Faro/IVU smokes passed Chromium320/375/390/430/768/1024 and
WebKit390/1440. Impeccable retained20 existing findings; no automated redesign.

### Separate preview tooling interference

The unmodified published preview was rechecked across30 route/browser/size
combinations:28 completed. Both390px Marketplace navigation cases were blocked
by an iframe titled`Netlify Drawer` from app.netlify.com, not application code.
Its script is`/.netlify/scripts/cdp`; the existing CSP also blocks that frame.
Do not widen CSP, force-click through it, or call these two cases passed.

Official configuration path:
Project configuration → Developer settings → Continuous deployment →
Collaboration tools → Configure → turn off the Netlify Drawer for Deploy
Previews → Save. This is preview collaboration configuration, not production.
Reference: https://docs.netlify.com/deploy/review-deploys/netlify-drawer-for-feedback/overview/

The running environment has no authenticated Netlify administrative binding;
public site/deployment metadata access does not grant configuration changes.
This external setting remains pending rather than being hidden with application
CSS. The original Bugsense alert still cannot be correlated without its exact
message/stack. No merge or production deployment is authorized.

## Final receipt selector and Drawer follow-up

The next commerce check exposed a strict-selector failure in
`browser-reference-styles-smoke.mjs:43`: `.wf-receipt-paper` matches both the
screen receipt and the print copy. Scope the test to the original printer's
`.slot-paper-feed-viewport` without changing receipt data, totals, PDF, status,
resend handling or animations. The complete390/1280 × Light/Dark receipt/cart
script passed all four cases after this one-line test repair.

The owner disabled Netlify Drawer for Deploy Previews. A fresh HTTP response
contained no `/.netlify/scripts/cdp` injection. Fresh Chromium and WebKit390×844
touch sessions confirmed zero Drawer iframes and real clicks through search,
municipality selection, menu/Escape, bottom navigation to Crear and Cuenta,
Back/Forward and reload, with no captured console errors, exceptions or promise
rejections. This resolves the external obstruction previously documented above;
no application CSS workaround or CSP change was used.

CI status must still be read for the current head: a ready Netlify deployment
alone does not establish that every GitHub verification passed. No merge or
production deployment was performed.

The remaining Experience cancellation was confirmed by GitHub's annotation:
`The job has exceeded the maximum execution time of 35m0s`. It ran from
05:04:33 to05:39:48UTC; every reached check passed until the spatial test was
interrupted. Partition the existing Experience commands into two matrix jobs:
retain the dashboard/template checks in`experience` and move eight existing
navigation/login/accessibility/email checks to`experience-navigation`. Every
command is unchanged, all23 Experience commands remain scheduled exactly once,
and the existing required`verify` gate still depends on the whole matrix. This
reduces the critical path instead of deleting coverage or increasing action
wait limits. Receipt/cart four-case QA and buyer receipt/PDF/print eight-case QA
also passed locally, including preserved Builder demo/theme behavior.
