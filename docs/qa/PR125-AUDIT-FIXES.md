# PR #125 — corrections from the platform audit

Base: `a530a9eca9b8e82f97c37bee22d4979df79add43` on
`feat/kiosk-skin-engine`. Preview only; no main merge or production deployment.

## Confirmed defects and changes

| Finding | Before | Correction / regression evidence |
| --- | --- | --- |
| Catalog numeric validation | `not-a-number` / `1e309` accepted; JSON serialization produced null prices | Finite numeric validation and safe cent bounds; regression rejects malformed price, stock, duration, buffer, tax and threshold values. Numeric strings, optional inventory and legitimate free items remain supported. |
| Invalid legacy prices at sale time | `Number(null)` became zero | Shared server price conversion in storefront booking/order checkout and both POS paths fails with 409 requiring owner review. A fixture test confirms no receipt or stock decrement on invalid legacy prices; an intentional zero-price sale still works. |
| Time zone validation | Settings accepted `Not/A_Timezone`; booking conversion then threw RangeError | Validate the effective zone with Intl before saving; retain valid existing zone when omitted. Regression also converts a valid saved New York zone. |
| Blocked browser storage | ThemeProvider read failed before rendering; login forms also read storage directly, and optional preference writes could prevent login | Theme fallback and email preference memory fallback. Browser tests deny getItem/setItem/removeItem, render both portals, change theme/language, attempt fully mocked authentication and reload. No changes to identity, MFA, permissions or OAuth. |
| Panel keyboard CI | Overlapping fixture buttons intercepted clicks; old test expected a removed Hide menu | Give isolated fixture panels normal content spacing; test the existing direct expand/close control, focus trap, Enter, Escape and focus restoration. Recovery safety/retry assertions remain. Both Chromium and WebKit run in CI. |
| Login visibility test | Nearest-edge scroll left 1.0625px of the button beyond the viewport although its center was clickable | Center the control in the fixture before asserting full visibility. No production layout or scrolling changes. |
| Carousel without a photo | React emitted two empty-src errors on a preserved Builder draft, and the details dialog had the same unsafe image contract | Render the card image, dock thumbnail and dialog image only when a photo exists. Source styles, frame dimensions, metadata and controls remain intact. New regression covers a photo-less card and dialog in every carousel test combination. |
| Kiosk chunk fetch failure in earlier CI | Dynamic import failed for an asset subsequently returning HTTP 200 | Capture actual failed asset paths, HTTP status and Netlify request ID in test diagnostics. No speculative retry/catch or application change; published recheck required. |

The precise storage reproduction found an earlier root cause than the initial audit's
login-only attribution: `ThemeProvider.getSavedTheme` failed before login mounted.
Both the theme access and the later email preference reads/writes are now covered.

No stored tenant data is migrated or repriced. Invalid historical prices require
owner review; existing financial history is preserved.

## Dependency updates

| Package | Before | Installed after |
| --- | --- | --- |
| sharp | 0.34.5 | 0.35.5 |
| zod | 4.6.5 | 4.6.7 |
| nodemailer | 10.0.10 | 10.3.1 |
| vite | 8.3.0 | 8.3.5 |
| body-parser | 2.3.0 | 2.4.0 |
| source-map-js | 1.2.1 | 1.2.2 |
| fast-uri | 3.1.8 | 3.1.9 |
| ip-address | 10.7.3 | 10.7.5 |
| qs | 6.16.0 | 6.17.1 |

`npm audit --json`: nine affected packages (five high, four moderate) before;
zero known advisories after. This is an advisory inventory, not proof of absence
of all security vulnerabilities. Updates use supported Node 22; transitive updates
stay within parent ranges. No forced dependency overrides.

## Validation recorded locally

- New validation regressions were run before the fix and failed as expected.
- `npm test`: **827 passed, zero failed/skipped** after all backend corrections.
- `WF_DESIGN_PREVIEW=1 npm run build`: passed TypeScript/build with existing large-chunk warnings.
- `browser-accessibility-smoke.mjs`: passed Chromium and WebKit, 390/1280px, including recovery form safety.
- `browser-login-layout-smoke.mjs`: passed Chromium and WebKit, both portals,
  seven viewports, Light/Dark, plus denied storage/theme/language/mocked login/reload.
- `browser-workforce-smoke.mjs`: retirement and Owner/Employee browser regression
  passed Chromium across seven widths, ES/EN, Light/Dark, Owner/Employee (56 cases).
- A first commercial browser attempt overlapped a local rebuild and lost a CSS
  chunk. The stable-build rerun passed; it is not classified as an application defect.

Further validation completed:

- Official Anthropic webapp-testing Python route matrix: **124/124 locally and
  124/124 on the 7fa5506 preview**, covering five routes, three viewports,
  ES/EN, Light/Dark and both engines, plus storage-denied portal cases.
- Complete kiosk suite: passed Chromium and WebKit locally across seven widths,
  and on the 7fa5506 published preview across 390/768/1440px, ES/EN, Light/Dark.
  Isolated provider return, receipt, stock, disconnect, reset and revocation passed.
  The earlier transient asset-fetch failure was not reproduced; its original
  network cause remains unconfirmed. Diagnostic capture remains enabled.
- Complete template functions: **46 template/language cases passed**; the old
  CI team-selection timeout did not reproduce. This run discovered the empty-src
  warning subsequently covered by the new targeted regression.
- Empty-photo reproduction: before, the preserved Builder draft emitted two
  React errors; after the guard, the same Python Playwright reproduction emitted
  **zero console errors**.
- Spatial carousel regression: **32 engine/width/theme/locale cases passed**,
  including empty-photo card/dock/dialog, 0/1/2/3 items, pointer/touch/keyboard,
  reduced motion, favorites, menus, slideshow and business branding.
- Final TypeScript/build with the image guard passed.
- Impeccable 4.1.0: **20 recommendations before and after, zero new findings**.
  These pre-existing CSS recommendations are not confirmed JavaScript defects;
  no bulk style, palette or navigation changes were applied.

No real charges, bookings, emails, MFA resets or provider connections are executed
by fixtures. Physical devices were not used.

## Preserved visual and operational contract

No reverted scroll, contrast, palette or navigation changes are restored.
No changes to active subscriptions, prices, permissions, OAuth scopes or secrets.
Only invalid catalog values are rejected; intentional zero-valued items are valid.
The logo component retains its original assets and rendering.

Official logo SHA-256 (unchanged from the parent commit):

- `assets/webfactory-pr-logo.png`: `1e92a89ec7e3771875bd1e30326478e6f4fdcd9aee2400bb0305d56ae7dd6f8a`
- `assets/webfactory-pr-logo-dark.png`: `2ae86e259775cb27f71757479a8e0fa620901aa6bc3cf837d785bbdec8ac270b`

Browser engines are automated/emulated; no physical iPhone claim. The official
Anthropic `webapp-testing` skill is used via Python Playwright for the route matrix.

CI on the prior tested runtime commit `7fa5506`: completed / success. https://github.com/tomassini369/WebFactory-PR/actions/runs/41176874799
The empty-photo follow-up triggers its own CI and preview; see the PR checks for the final commit.

## Confirmed intermittent asset failure and explicit recovery

A further 124-case published run on `05b198f` recorded **123 healthy cases and
one HTTP 500**, loading `/assets/WebFactoryAdminPage-DqQLAP5v.css` in Chromium,
768×1024, EN/Light. React's lazy route rejected with `Unable to preload CSS` and
left the route blank. Three subsequent GETs returned 200. The origin of the
intermittent 500 (upstream/CDN/proxy) is not established and is not claimed fixed.
The failed run is retained, not relabeled as a clean pass.

`RouteErrorBoundary` now preserves the diagnostic in console and renders an
ES/EN error with a deliberate retry action, using the existing loading styles.
There are no automatic retries. On a user retry, at most four failed same-origin
`/assets/*.js` or `*.css` resources are refreshed with GET/cache reload and a
10-second shared timeout, then the page reloads without changing route/query/hash.
No authentication submission, payment or business write is repeated by this code.
Persistent failure aborts remaining reads and leaves the retry available.

This targeted refresh is necessary in the tested WebKit: ordinary reload and
fresh document URLs retained the rejected JavaScript module without another
request. Resource timing identified the failed module with zero decoded bytes;
refreshing that static resource before reload restored the route. The abandoned
URL-change experiment is not part of the implementation.

Regression: `scripts/browser-route-failure-smoke.mjs` deliberately fails portal
CSS and kiosk JavaScript. **36 cases passed**, across Chromium/WebKit,
390/768/1440px and ES/EN, including persistent-failure behavior, retained console
diagnostics, no uncaught route errors, preserved query/fragment and no password,
payment or other business writes. Added to the existing CI navigation suite.
The before-fix regression failed because no recovery UI existed. Final build and
TypeScript pass; the backend suite remains 827/827. The Impeccable scan remains
20 pre-existing recommendations, zero additions.

The original 46 template/language cases were also rerun after the photo guard:
all passed, and no empty-src warning appeared in the output.

### Recovery accessibility follow-up

The new error action initially inherited the global primary gradient. Its text
contrast was insufficient. Only this new control now uses the existing secondary
button class; no global palette, CSS rules or existing buttons are changed.
The recovery regression now checks both Light/Dark plus ES/EN and measures
composited text contrast >=4.5:1 and a >=44px target. **72/72 local cases pass**.
The preceding 36-case published recovery matrix on `6cdc457` also passed.
The formerly failing deployed login/MFA contrast suite was repeated with isolated
sessions on both engines and is tracked in the PR verification results.
