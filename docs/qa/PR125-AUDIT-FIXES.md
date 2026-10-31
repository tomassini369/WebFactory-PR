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

Broader browser matrix, kiosk regressions, published validation and CI results are
recorded in the follow-up validation section when complete. No real charges,
bookings, emails, MFA resets or provider connections are executed by fixtures.

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
