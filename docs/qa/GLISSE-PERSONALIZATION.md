# Glisse: real personalization controls

Date: 2026-11-06. Branch: `feat/kiosk-skin-engine`, PR #125.
This supersedes the initial gallery-only evaluation in GLISSE-CONTROLS-PREVIEW.md.
PR #128 is closed and its source branch was removed after preserving its commits.

## What is connected

The existing Personalization hub, dashboard appearance provider and kiosk preset
handler remain authoritative. There is no second settings store or business API.
The complete pinned `glisse@0.5.0` MIT package is reused, without modifications to
node_modules or changes to authentication, tenant roles or financial operations.

| Original component | Integration | Persistence / handler |
| --- | --- | --- |
| TabBar | Portal/POS, Kiosk and Website areas; permission-filtered items | Existing hub state and area handlers |
| SegmentedControl | ES/EN personal language | Existing language store and debounced portal-profile PUT |
| Switch | Personal theme; keep original wallpaper without dimming | Existing ThemeProvider/profile save; existing appearance draft |
| Slider | Wallpaper dim, glass alpha, blur and motion | Existing appearance draft and dashboard-appearance PUT |
| SearchField | Search the three existing wallpaper names in the selected locale | Local filtering of the existing gallery; selection uses the existing appearance draft |
| Input | Name of a saved kiosk appearance | Existing appearance_presets operation, siteId and owner checks |
| Button | Apply/save appearance, save from Glass view, open existing website editor | The same save/onOpenBuilder handlers, including ready/busy checks |
| Menu | Hide/show the live Glass view | Actual local preview visibility; not a fake business operation |
| Glass | Readable live view over the selected existing wallpaper or private uploaded image | Same wallpaper/draft, real save action; text surface alpha has an accessibility floor |

Search and preview visibility are interface state; they do not claim new backend
storage. Kiosk skin rendering, POS, payments and booking logic are unchanged.
No anonymous device receives private dashboard assets: the live Glass scene is
inside the authenticated appearance editor; the public gallery uses only the
three existing public wallpapers.

## Visual presentation

The live Glass view appears near the beginning of the appearance editor, before
the palette catalogue. The public `/glisse-preview/` gallery also puts Glass first
and includes a wallpaper selector using the existing room, violet landscape and
golden waves assets. No external images, fonts, logos or providers were added.
The preview uses a separate backdrop sibling marked with data-glisse-backdrop.

The adapter bridges the local theme to Glisse while retaining data-wf-theme and
the current theme/profile providers. CSS is scoped to the personalization surface;
specific overrides prevent existing important button rules from deforming the
library's tabs and filled buttons. The original PNGs/AdaptiveLogo are intact.
Focus, 44px targets, 16px input text, reduced motion, reduced-transparency and
forced-colors behavior are retained. Native controls remain available if the
optional preview chunk fails to load, with a visible warning in the hub.

The trial remains enabled only in the existing preview build context. A local
CONTEXT=production Vite compilation excludes the library and gallery module and
keeps the established native operational controls. No main merge or production
deployment is authorized by this integration.

## Validation performed

- npm test: 836 passed, zero failed/skipped.
- npm run build: passed, including TypeScript and static route generation.
- Final immutable compiled portal: all 58 cases passed with
  scripts/browser-glisse-personalization.py (29 Chromium, 29 WebKit).
  Owner matrix: 320/375/390/430/768/1024/1440px, ES/EN, Light/Dark;
  one additional employee access case per engine.
- Tests exercise actual components and their unchanged HTTP callbacks with
  isolated fixtures: a failed 409 save retains the draft; successful save and
  page reload restore it; wallpaper filtering/selection, natural-background
  disabling of dim, slider edits, menu visibility, profile language/theme sync,
  kiosk preset naming/save, permission-filtered tabs and the existing Builder
  plan-gated destination are checked.
- The explicit injected 409 is recorded as expected. Other console exceptions,
  failed requests, unexpected HTTP errors, unhandled rejections and unexpected
  mutations fail the test. Employee cases cannot access kiosk controls/APIs.
- Existing portal menu regression: eight cases passed.
- Existing glassy dashboard regression: Chromium and WebKit passed at 390/1440,
  both themes/locales, including private optimized image upload, stale-tab
  conflict/reload, deletion and employee navigation. These tests use the actual
  Netlify handlers with isolated in-memory storage, not live tenant records.
- Existing profile regression passed in Chromium and WebKit at 390/1440,
  both themes/locales. Its selectors follow the new controls and preserve assertions for real handler persistence, photo framing, locale/theme
  synchronization, employee ownership, stale updates and failed-save retries.
- Gallery smoke: both browsers passed with the photograph/Glass section first.
- Production compilation passed; no glisse-styles marker or Glisse gallery
  module was emitted. This was a local build, not a production deployment.
- Impeccable 4.1.0: exit 2, 20 pre-existing recommendations; none in the new
  Glisse files. Existing recommendations were not automatically restyled.

An exploratory development-server matrix had one Missing dashboard context error
while the provider module was being hot-replaced during active edits. The final
immutable compiled matrix above passed all 58 cases without it; it is not hidden
or counted as a passing development run. WebKit full-page lens captures can be
miscomposited; viewport/individual component captures are used for evidence.

Mobile testing uses emulation, not physical iPhone/Android devices. Tests do not
send real emails or create sales, payments, appointments or production settings.
Remote preview verification and current GitHub CI status are recorded in PR #125.
A successful local suite does not claim that the complete CI or every upstream
library option has passed.

## Reproduction

With the compiled app served by Vite preview:

```sh
python scripts/browser-glisse-personalization.py --base http://127.0.0.1:4173
python scripts/browser-glisse-preview.py --quick --base http://127.0.0.1:4173
```

Use --engine chromium or --engine webkit to split independent runs. Screenshots
and JSON logs are written under /tmp by default, outside the repository. The
cloud WebKit executable requires its environment-specific shared-library path.

## Official logo SHA-256

Before/after values are identical:

- assets/webfactory-pr-logo.png:
  1e92a89ec7e3771875bd1e30326478e6f4fdcd9aee2400bb0305d56ae7dd6f8a
- assets/webfactory-pr-logo-dark.png:
  2ae86e259775cb27f71757479a8e0fa620901aa6bc3cf837d785bbdec8ac270b
