# Complete dashboard liquid glass coverage

This revision completes the owner's card/button request and supersedes the
selective implementation in PREVIEW_125_LIQUID_GLASS.md.

## Behavior

- Both operating portals share a scoped surface registry. Existing portal panels,
  all semantic articles, nested metric/activity/settings cards, native dialogs,
  operating containers and buttons receive the material, including lazy modules.
- Each button owns its feedback. The registry forwards visual pointer coordinates
  into its own Vaso lens, never into a parent card. Keyboard presses keep native
  activation. Disabled controls retain their existing behavior.
- Large and expanded panels are included. Their lens is bounded to 512 × 384 CSS
  pixels around the interaction; the complete card material remains visible.
  Expanded material follows its scrollport. No prior 450,000-pixel exclusion.
- Native positioning, action colors, labels, state and business handlers remain.
  Custom decorative tags avoid taking the place of span/div-first-of-type rules.
  React text changes can replace a button's decoration; the registry repairs
  that layer without remounting the button or adding another business handler.
- All decoration is inert, aria-hidden and pointer-transparent. Safari only copies
  a wallpaper subtree, never customer records or controls. Up to four lenses
  run concurrently and release after feedback; offscreen/hidden/inert/disabled
  surfaces release them too. Accessibility and opt-out retain the native fallback.
- No new packages, API calls, OAuth permissions, billing or operational contracts.

## Validation

The coverage smoke now detects missing cards/buttons and duplicated decorations,
exercises independent real Vaso lenses, expanded-card interaction after scrolling,
preference save/opt-out, reduced motion and forced colors in both portals.
Browser fixtures reject unrequested operational writes. Final matrix and preview
verification are recorded in the PR; a physical iPhone is not claimed.

The final 812 Node tests and TypeScript/build pass. Visual review caught and
corrected positioning and transparent-action contrast before publication. The
existing chart stylesheet and both logo hashes are unchanged.

Design gate is scoped to this revision: preserve native fonts, real content,
existing hierarchy and touch/focus behavior; the explicit owner request authorizes
uniform glass. The performance policy limits active lenses, not surface coverage.
No production merge/deployment is authorized.

Chart selection buttons preserve their transparent resting surface and the
original columns/labels; their own brief press feedback remains available.

## Results

- Chromium: 28 responsive/theme/language combinations in both portals; WebKit:
  8 combinations at 390/1440 in both portals. No missing registered cards or
  buttons, duplicate decorations or operational controls inside shader copies.
- A separate module walk checks 25 client/admin destinations with isolated data,
  including billing, security, connections, POS and settings.
- Native dashboard regression: 8 combinations plus private image upload, stale
  tab protection, reset/deletion and employee navigation.
- Cashier regression: all 28 responsive combinations plus permissions, retry,
  pending/server-confirmed payment, reload protection and new-sale scenarios.
- Reduced-motion/forced-colors controls and expanded-panel/button reaction are
  exercised in the coverage smoke. Chart CSS is unchanged; both logos keep their
  prior SHA-256. Impeccable reports 20 recommendations, without new findings in
  the liquid adapter. No real tenant preferences, transactions or messages are
  written by these fixtures.

Scoped delivery gate: PASS for retained native layout/colors/handlers, no fake
product content or assets, real visual engine checks, keyboard/accessibility
controls and documented limits. Physical iPhone/battery/frame-rate acceptance
remains unmeasured. Deploy identity and final hosted checks are recorded in PR #125.

The decorative tree uses an open ShadowRoot, so backdrop discovery cannot climb
from its wallpaper into operational ancestors. The coverage assertion inspects
that shadow tree for controls. Lens dimensions use the decorative plane's inner
bounds, excluding the host's border. Translucent buttons select a readable
neutral fill from their own foreground, rather than assuming that light theme
always implies dark button text; opaque brand/action fills remain exact. The
opacity is chosen against both black and white background bounds at 4.5:1.
