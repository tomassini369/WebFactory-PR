# Fluid glass distortion — PR #125

## Scope and use

Existing Personalization → Portal/POS and Kiosk → Appearance now offer **Glass distortion / Distorsión del cristal**. Choose Fluid glass, adjust the native keyboard-accessible range, and use the existing Apply/Save action. The control is disabled under Classic. Range: integer 0–50%; default 10% preserves the original rendering. Zero removes lens bending; blur/tint remain independent. Personal preferences and business kiosk appearance remain separate and retain their existing authorization/storage.

The value maps directly to `simple-liquid-glass` `lensOptions.strength = glassDistortion / 100`, whose installed supported range is 0–0.5. No new renderer, dependency, Glisse integration or duplicate settings screen was added. Portal preferences normalize invalid/old stored values safely; kiosk API strictly rejects malformed/out-of-range writes. Kiosk presets, preview and actual header/cart lenses use the same value. Existing images, scroll, palettes, contrast and navigation are preserved.

## Original implementation audit

Commit `84d3f3a651ddb89b88a043d9156bfefeef7180b8` introduced the optical wrapper using MIT `simple-liquid-glass@5.4.0`, https://github.com/lucaperullo/simple-liquid-glass. It hardcoded material `clear`, renderer `auto`, lens profile `material`, strength `0.10`, blur `2`, frost `0.08`, white tint opacity `0.08`, and default radius `28`. Reduced-transparency preferences suppress the optical layer; the original surface remains available. Commit `0f4f46f` later reused this renderer for the scoped kiosk header/cart backdrop. Distortion was not an exposed control.

The installed library additionally supports these API options; this does **not** mean WebFactory previously exposed or enabled them all:

| API group | Available options |
| --- | --- |
| Lens geometry | strength, depth, curvature, bend, bendWidth |
| Lighting | sheen, sheenWidth/falloff/angle, specular, glow/spread/falloff, brightness |
| Materials/rendering | clear/frosted/smoked/subtle; auto/SVG/WebGL strategies; quality levels |
| Other effects | tint, blur, radius, saturation, dispersion/aberration; ripple/flow/wobble modes with speed/amplitude |

Only strength is newly exposed here. Existing blur/opacity, wallpaper, Classic/Fluid, animation and depth settings are reused. The unrelated reverted Glisse integration remains reverted.

## Rolling-client compatibility

Previously shipped kiosk clients reject unknown appearance keys. The current kiosk transport sends `X-WF-Kiosk-Optics: 1`; the server projects the old wire shape for clients without that capability, including presets and paired-device presentation. This is an appearance capability only, never an authorization signal. Legacy writes preserve the current stored distortion inside the existing CAS mutation, including concurrent updates. Explicit invalid values still fail validation. No sessions, credentials, transaction identifiers, cart state or payment operations change.

## Validation

- `npm test`: **842 passed** (including normalization, owner-only writes, private preference persistence, stale revisions, paired presentation, presets, legacy wire shape and concurrent legacy writes).
- `CONTEXT=deploy-preview npm run build`: passed.
- `browser-glassy-dashboard-smoke.mjs`: Chromium and WebKit passed at 320/375/390/430/768/1024/1440, ES/EN, Light/Dark. Both client and platform portals; slider 0/50, save/reload, private images, stale-tab conflict and employee navigation.
- `browser-kiosk-customizer-smoke.mjs`: Chromium and WebKit passed the same 28 combinations per engine. Slider 0/50, actual lens properties, existing recipes/palettes/presets/restore/cart regression and no operational network requests.
- Chromium SVG optical fingerprint (`feImage` plus `feDisplacementMap` scale) changes with strength. WebKit selected WebGL: configuration and UI verified, no WebGL pixel-difference proof claimed.
- Native range Home/End keyboard operation and disabled Classic state checked. Browser dimensions are automation, not a physical iPhone test. Real tenant writes/payments were not performed.
- Impeccable 4.1.0 detector: exit 2, 20 existing recommendations (18 warnings, 2 advisories), none in the changed UI files. No unrelated restyling.
- `git diff --check`: passed.

## Official logos

SHA-256 matches the pre-change baseline:

- `assets/webfactory-pr-logo.png`: `1e92a89ec7e3771875bd1e30326478e6f4fdcd9aee2400bb0305d56ae7dd6f8a`
- `assets/webfactory-pr-logo-dark.png`: `2ae86e259775cb27f71757479a8e0fa620901aa6bc3cf837d785bbdec8ac270b`

Deployment evidence is recorded in the PR after Netlify publishes its Deploy Preview. Main and production are outside this change.
