# Mobile scroll, readable glass and optional palette tint

Owner request: October 30, 2026. Scope: `feat/kiosk-skin-engine`, PR #125 only.

The supplied iPhone recording shows small controls, a tall header, sliders mixed
into the scrolling surface and dark text over transparent glass. The viewport
meta was already correct. We do not attribute the recording's miniature scale
to a browser preference without physical-device measurements, force document
zoom, or disable pinch zoom.

## Changes and reasons

- The phone header uses two bounded rows and keeps 44 px targets. At 390 px,
  the measured header is 125.625 to 141.625 px depending on portal/language,
  leaving 636.359 to 652.359 px for content in an 844 px viewport.
- Native vertical scrolling remains in the existing content track; the dock
  retains its separate track and cannot intercept Save. Range controls defer a
  touch edit until horizontal intent or a completed tap. Vertical gestures,
  pointer cancellation and pinch zoom remain native. Mouse/keyboard keep the
  native range input behavior. Slider labels and values have separate columns.
- Touch devices use the MIT `simple-liquid-glass` package's documented blur
  rendering mode. This avoids moving WebGL refraction while scrolling. Desktop
  optics remain available; decorative layers never receive pointer events.
  Entry transforms are skipped for coarse pointers.
- The optical layer no longer replaces the readable tint with an almost clear
  white layer. Opacity/blur controls affect the material. Neutral photographic
  glass keeps white ink on smoked fill. Colored glass keeps the exact selected
  palette RGB and chooses black or white ink against that color; opacity is
  raised only as needed for contrast over a black or white photograph. There
  is no fixed charcoal blend. Fields/options use solid, matching surfaces.
- **Apply palette to glass / Aplicar paleta a los cristales** selects palette
  tint or neutral glass in both dashboard portals, cashier and kiosk. Defaults
  preserve the former palette-enabled behavior; an explicit false persists.
  Contrast is evaluated independently for each of the 23 palette colors.
  Actions and product cards retain their independently calculated foregrounds.
- Kiosk palette identity is independent of background mode. A natural/uploaded
  photo can stay in place while selecting a palette; natural images receive no
  inset tint. Explicit custom zone colors still take precedence. Use the Glass
  finish to see the transparent material rather than an opaque matte finish.

No new rendering library, public image endpoint, role, payment, booking,
authentication or OAuth change. Chart code/styles and official logos are
unchanged. Personal dashboard preferences and shared kiosk configuration keep
their existing distinct authorization/storage boundaries.

## Validation

All browser operations use intercepted or isolated fixture transports. They do
not authenticate a real account, change a business, create a charge, send email
or modify Google settings.

- `npm test`: 825 passed, zero failed. Updated the kiosk boundary test that still
  expected the retired 70% opacity/12 px blur limits; current limits are 25% and
  24 px. Added save/reload and strict-boolean checks for the new preference.
  The two additional tests verify unmodified palette RGB, contrast over five
  photo brightness levels at five opacities, and adaptive black/white ink.
- `CONTEXT=deploy-preview npm run build`: TypeScript and application/isolated
  preview builds passed. Existing chunk-size recommendations remain.
- New touch/contrast smoke: 320/375/390/430/768/1024/1440, ES/EN, light/dark,
  both portals. Confirms viewport/client widths, scale 1, no page overflow,
  real CDP touch swipes, unchanged slider value during vertical scroll,
  horizontal adjustment, keyboard adjustment, Save hit-testing, persistence,
  expansion and Escape. Additional compiled Chromium and WebKit runs cover
  390/1440 and 390 respectively. WebKit checks geometry, contrast, controls and
  persistence; CDP touch injection is Chromium-only.
- Worst-case text contrast is computed over black and white backdrops. The
  focused 390 px cases also inspect all 23 palette fills at minimum opacity.
- Existing dashboard smoke: both portals at 390/1440, ES/EN and both themes,
  including successful/failed saves, private uploads, stale-tab conflict,
  reload/delete and employee navigation. Existing Glassy regressions also pass
  at 390/1440 in both languages/themes.
- Login paint smoke covers `/cuenta`, `/client-admin`, `/webfactory-admin` at
  320/390/980, both languages/themes, retaining a single correct viewport.
- Kiosk customizer smoke passes at 390/1440, ES/EN, light/dark: neutral/tinted
  glass, natural-photo preservation, palettes, image upload, presets, undo/redo,
  custom zones, opacity/blur limits, save/restore, cart and accessible fallbacks.
- The additional full template/Builder smoke stopped while waiting for an
  animated catalog close button to stabilize. Those public components are
  unchanged by this patch; that default-motion run is not reported as passed.
  With the browser's reduced-motion preference, all 36 template-library and
  demo/Builder cases pass.
- Short-screen dashboard save/expansion regression passes at 320/390/1440 in
  both themes. Chromium also confirms opaque reduced-transparency surfaces,
  removal of optical layers and legible forced-colors fallback.
- Impeccable 4.1.0: 20 existing recommendations. The only dashboard recommendation
  is the pre-existing unused spring token in `material.css`; no new animation
  engine or decorative easing was introduced.

Local evidence: `/tmp/mobile-review/`, `/tmp/portal-touch-scroll-qa/`,
`/tmp/glassy-dashboard-qa/`. CI runs the new smoke with Chromium and WebKit.
This is browser emulation and rendering validation, not physical iPhone or
touch-monitor acceptance. Preview deployment status must be checked separately.

## Follow-up: preset identity and lower dock touches

The owner's screenshot exposed a regression in the previous contrast fix: a
16% palette / 84% charcoal blend made presets almost indistinguishable. That
blend is removed. The shared material calculation never changes palette RGB;
it computes foreground and the smallest contrast-safe opacity instead. Palette
changes still use Anime.js; opacity changes update immediately.

The reported dock failure did not reproduce in the original code under Chromium
or WebKit touch emulation. The dock now also handles a completed primary touch
on pointer-up, with movement/cancellation checks and synthetic-click deduplication.
Its existing navigation/unsaved-draft guard remains in charge. Dragging cannot
navigate; mouse, keyboard and dialog menu keep their click behavior. English
Bookings and Spanish Citas fit without splitting a word.

`QA_DOCK_ONLY=1` tests every visible dock button by screen coordinates before and
after scroll, in both portals. It additionally checks drag cancellation, a
single unsaved-draft prompt, Cancel/Discard, keyboard and mouse after touch.
The fixture now includes the normal payment rules needed to render Bookings.
No booking rule was changed to support the fixture.

## Scoped design audit

Anti-Slop After mode follows `AGENTS.md`; the user approved the three findings:
R-03 (mobile space and touch interaction), R-25 (text over arbitrary photos),
R-26 (working tint preference). Keep the approved Glassy visual identity and
native fonts: ENERGY 2, RHYTHM 2, MOTION 1 on touch devices.

- Hard gate PASS for the changed scope: no invented content/assets, no new
  destinations, no global zoom restriction; recorded touch, keyboard, save,
  palette, modal and error-path behavior; contrast assertions and build/tests.
- Purpose gate PASS: glass is the owner's explicit reference; the bounded tint
  protects reading, compact navigation reserves working space, and removing
  touch refraction/entry transforms keeps the target under the finger.
- Identity/quality PASS: existing logo, wallpaper, typography, palette catalogue,
  chart design, data/handlers and business permissions remain in their owners.

Logo SHA-256, unchanged from the starting commit:

```
webfactory-pr-logo.png      1e92a89ec7e3771875bd1e30326478e6f4fdcd9aee2400bb0305d56ae7dd6f8a
webfactory-pr-logo-dark.png 2ae86e259775cb27f71757479a8e0fa620901aa6bc3cf837d785bbdec8ac270b
```
