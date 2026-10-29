# Vaso liquid glass in the operating dashboards

This initial selective implementation is superseded by [complete coverage](PREVIEW_125_LIQUID_COVERAGE.md).

## Scope and purpose

The owner approved using Vaso to enhance the existing dashboard. The current
Glassy composition, original charts, brand, ES/EN, themes, panel expansion,
preferences and business handlers are retained. The effect identifies navigable
and raised operating surfaces; the existing solid fields and nested data rows
preserve reading hierarchy. No public-page, login, Builder, kiosk skin, payment,
booking, authorization or OAuth redesign is included.

`vaso` is pinned to **1.1.1**, with its npm integrity recorded in the lockfile.
Upstream: https://github.com/huozhi/vaso, author `huozhi`, MIT license as declared
by the package and repository. There is no new service, API key, generation
credit or runtime dependency beyond the existing React peer dependency.
The earlier inspected 1.0.2 package lacked the new interaction API; 1.1.1
provides `vaso/core`, pressable glass, ripples and pointer lighting.

## Implementation

- Shared `PortalPanel` surfaces, the existing dock and primary navigation pills
  use the same adapter in both operating portals. Nested data rows remain simple.
- The shader changes decorative wallpaper only. Safari/WebKit copies a small
  wallpaper subtree containing no controls or business records. Material tint
  sits outside that source to avoid applying opacity twice.
- Layers are aria-hidden, inert and pointer-transparent. A passive listener
  forwards only pointer coordinates to the decorative lens; the original event
  and existing operational handler continue normally. Inputs are excluded.
- The engine is dynamically imported. This build emits a separate core chunk
  of about **26.2 KB / 10.3 KB gzip**. No engine request is needed for public
  pages or when effects are disabled before mounting.
- Only intersecting hosts are initialized. Filters are destroyed offscreen,
  in hidden tabs and during expanded-card isolation. Surfaces over 450,000 CSS
  square pixels retain their prior material. This is a bounded implementation,
  not a measured guarantee about GPU time, battery use or device frame rate.
- `liquidGlass` is a boolean in existing per-user/per-portal preferences, enabled
  by default and controlled in Customize dashboard. It uses the existing
  conditional save and authorization. Motion=0, reduced motion/transparency,
  forced colors, Save-Data and unsupported backdrop filters keep the fallback.
  Blur 0–40 maps to Vaso blur 0–10; opacity, dim, accent and wallpaper retain
  their existing controls. Expanded cards retain their original scrollport
  material and the same mounted form/chart state.

## Verification

All API-backed browser checks use isolated fixtures and the real appearance
handler with in-memory storage. They do not charge, email, invite, alter real
preferences or use customer credentials. Browser evidence is generated under
`/tmp/liquid-glass-qa/` and retained by the experience CI job.

Validation:

- `npm test`: **812 passed**; TypeScript and the full production-style build pass.
- New Vaso smoke: Chromium **28 combinations** (320/375/390/430/768/1024/1440,
  both languages and themes), each through both portals; WebKit 26.5 **8
  combinations** (390/1440, both languages and themes), also through both portals.
  The checks exercise actual displacement-map changes on a press, persistence
  across reload, decorative-copy isolation, reduced motion, forced colors,
  expanded-card state and unchanged geometry. Mobile contexts enable touch and
  the mobile viewport. The final focused check also covers offscreen teardown,
  restoration and the keyboard-operated animation slider.
- Existing dashboard smoke: **28 combinations**, both portals, including private
  image upload/deletion, conditional conflicts and employee navigation.
- Existing cashier smoke: **28 responsive combinations** plus permissions,
  retry, reload protection, pending/server-confirmed payment and new-sale cases.
- Existing isolated-card/save-hit regression: **4 combinations** at 390/1440,
  both themes, including a rejected save, successful save and focus/Escape.
- Settings/QR/IVU/nested-material regressions: **8 combinations** at 390/1440,
  both languages/themes. Training: **41 logged passing checks**, including its
  eight responsive combinations and contextual/role/cart/pause/restart cases.
- Material contrast is computed over black and white wallpaper bounds, with
  the actual dim/tint/ink composition, in focused Chromium and WebKit checks.
- The existing appearance range inputs now have explicit accessible labels;
  their preceding `output` element otherwise captured the implicit label.
- Impeccable: **20 recommendations**, none in the new visual adapter/styles.
  `git diff --check` passes. The original chart stylesheet is unchanged.

Automated WebKit is not acceptance on a physical iPhone; device battery, heat
and sustained frame rate remain unmeasured. CI includes the new built-artifact
checks on Chromium and WebKit; its remote result is reported separately.

## Design review

Anti-Slop After/audit mode follows AGENTS.md; this owner's explicit approval
authorizes the scoped Vaso changes. No unrelated detector finding is edited.
Glass beyond the skill's generic dose recommendation follows the owner's
explicit dashboard direction and the existing approved Glassy system.
Native fonts, spacing, icons, logos and the chart composition are retained.

Scoped delivery gate:

| Checks | Result and evidence |
| --- | --- |
| R-02, R-17, R-18, R-23, R-28, R-36, R-38 | PASS: no new marketing claims, sample product data, assets, testimonials or navigation; technical limits are explicit. |
| R-03, R-34, R-35 | PASS: build and browser matrices above; both themes/languages, contained scrolling and unchanged surface dimensions. |
| R-24, R-26, R-27 | PASS: existing navigation/handlers retained; shader failures keep the prior material; new switch saves through the real isolated handler with existing load/error states. |
| R-25, R-32 | PASS: computed material contrast, unchanged chart contrast, keyboard slider, native focus/Escape and noninteractive aria-hidden layers. |
| R-33, R-37 | PASS: source implementation with the owner's explicit Vaso direction and the updated portal design contract. |
| Purpose gate | PASS: glass expresses the approved operating material; motion signals a press, elevation separates cards and the existing icons continue to identify actual destinations. No new decorative assets or animation library beyond authorized Vaso. |
| Liveliness / C-1 to C-5 | PASS for this change: ENERGY 2 / RHYTHM 2 / MOTION 2, original focal points and spacing retained, working preference and fallbacks, measured checks and stated limitations. |

Logo SHA-256 before/after:

- `webfactory-pr-logo.png`: `1e92a89ec7e3771875bd1e30326478e6f4fdcd9aee2400bb0305d56ae7dd6f8a`
- `webfactory-pr-logo-dark.png`: `2ae86e259775cb27f71757479a8e0fa620901aa6bc3cf837d785bbdec8ac270b`

All work targets the existing **PR #125 / feat/kiosk-skin-engine** preview.
The production deploy observed before work was `6adb4386324a7b400c696775`;
no merge or production deployment is authorized by this task.
