# Glisse controls evaluation

Date: 2026-11-06. Baseline: PR #125, `094d21f8f92d76fe35c21760ffe7d2bfcb5b876c`.
Branch: `feat/glisse-controls-preview`. This trial is separate from the kiosk engine work.

## Package and scope

Official repository: https://github.com/0kzh/glisse. Installed the complete npm
package `glisse@0.5.0`, pinned in package.json and package-lock.json (MIT, Kelvin
Zhang). Peer dependencies are React/react-dom >=18; no additional runtime
package dependency was added. The installed package carries its MIT notice.

`/glisse-preview/` loads the library lazily, only when `__WF_PREVIEW_REVIEW__`
is enabled. The existing production build sets that flag false. The static
preview entry has noindex metadata and Netlify no-store/noindex headers.
Personalization contains a preview-only link to the same route. No second
sidebar, business editor, payment handler, identity layer or PWA was introduced.

All nine public components are available. Their interactions are real UI state,
not new commerce or administrative services:

| Component | Behavior under test | Persistence / authority |
| --- | --- | --- |
| Button | Apply local form; native required validation; disabled state | Local application counter |
| Glass | Render the entered title and selected layout/radius/content | Local sample only |
| Input | Controlled, labeled title input, maxlength and required | Local sample only |
| SearchField | Filter nine component names; clear and zero-result states | Local sample only |
| Menu | Open, Escape/focus restoration, reset local sample, disabled item | Local sample only |
| SegmentedControl | Choose cards/list by pointer or arrow keys | Local sample layout |
| Slider | Set 0–32 px radius; keyboard bounds; pointer drag | Local sample radius |
| Switch | Change the existing WebFactory theme; disabled example | Existing theme provider and localStorage |
| TabBar | Select controls/result content in the local sample | Local content selection |

The theme switch uses the real ThemeProvider, and survives reload. Reset sample
does not reset the user's theme or locale. All other trial state deliberately
resets on reload; there is no pretend Save-to-business action. Linking those
controls to individual operational modules is a subsequent scoped integration.

## Theme, localization and accessibility

The local wrapper mirrors WebFactory's existing theme to `data-theme` for
Glisse without changing the root theme protocol. Existing official PNGs and
AdaptiveLogo remain intact. Colors, native fonts and content layout follow the
current WebFactory navy/blue contract. The upstream hardcoded SearchField clear
label is localized on this instance only, without modifying node_modules.

The trial adds visible focus, labeled controls and disabled examples, 44 px
control targets, 16 px input text, responsive containment, reduced-transparency
and forced-colors fallbacks. Glisse's spring engine checks reduced motion and
its CSS includes reduced-motion rules. Reduced-motion and normal-motion runs
are separate. Safari uses a different refraction fallback from Chromium;
identical optical rendering on every browser is not claimed.

Visual inspection identified and fixed a duplicate floating theme button and
the selected tab's dark-theme accent contrast. The global theme button remains
unchanged on other routes. Device zoom, scroll and logo rendering are preserved.

## Validation

- `npm test`: 836 passed, zero failed/skipped.
- `npm run build`: passed, including TypeScript and the static preview entry.
- `scripts/browser-glisse-preview.py`: 56 development cases passed, Chromium
  and WebKit; 320/375/390/430/768/1024/1440 px, ES/EN, Light/Dark, reduced motion.
- Two additional built-preview cases passed with normal motion and slider drag
  (Chromium/WebKit, 390 px, ES, Dark).
- Existing `browser-portal-menu-destinations-smoke.mjs`: eight cases passed,
  including isolated save, draft cancellation and the redesign plan gate.
- Local production Vite compilation passed with `CONTEXT=production`; no Glisse
  preview JS/CSS chunk or library stylesheet marker was emitted. This was a
  local build, not a production deployment.
- Impeccable 4.1.0 detector: exit 2, 20 recommendations in existing files, none
  in the new Glisse files. No automatic restyling was applied.

The browser test registers console/pageerror/network/rejection capture before
navigation and blocks all Netlify Functions. Passing cases contain no API calls,
JavaScript errors, HTTP errors, failed requests or horizontal page overflow.
It tests form validation, keyboard, controlled state, theme persistence,
search/clear/empty results, menu Escape and reset, slider bounds and selection.
Screenshots and JSON results are written outside the repository under `/tmp`.
Tests use desktop and touch-enabled mobile emulation, not physical devices.
No claim is made that every upstream option or every OS/device has been tested.

Reproduce with Vite running:

```sh
python scripts/browser-glisse-preview.py --base http://127.0.0.1:5173
python scripts/browser-glisse-preview.py --quick --motion no-preference
```

Use CHROMIUM_PATH/WEBKIT_PATH for installed browser executables as needed.
The cloud WebKit binary needs its environment-specific shared-library path.

## Official logo integrity

SHA-256 before and after source changes, identical:

- `assets/webfactory-pr-logo.png`:
  `1e92a89ec7e3771875bd1e30326478e6f4fdcd9aee2400bb0305d56ae7dd6f8a`
- `assets/webfactory-pr-logo-dark.png`:
  `2ae86e259775cb27f71757479a8e0fa620901aa6bc3cf837d785bbdec8ac270b`

No financial/customer records, credentials, permissions, OAuth scopes or
production configuration were changed. The three existing untracked generated
PWA icon files are outside this change.
