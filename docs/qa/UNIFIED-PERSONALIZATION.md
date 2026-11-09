# Unified personalization — PR #125

## Existing systems preserved

Portal and POS/Cashier already share a private appearance provider. Kiosk appearance is business-scoped and owner-managed. Both keep their original handlers, identity checks, conditional writes, image privacy, renderer and existing operational components. No payment, booking, OAuth, MFA, tenant, subscription or production changes are included. No additional package was installed.

## One location per setting

The existing Personalization entry keeps its area selector. Each appearance editor now has:

1. One Design selector, including My designs where saved configurations exist.
2. Colors: the existing 23-palette catalogue in a disclosure, plus custom colors.
3. Background: one thumbnail/image catalogue, existing uploads/downloads and contextual positioning/overlay controls.
4. Components and glass: glass type, distortion, opacity and blur; advanced component and optical controls are folded.
5. One Undo/Redo/Restore/Save action bar. Restore stages a draft and Save explicitly activates it. Deleting a personal background remains a separate, labeled destructive action; it preserves saved designs.

The website area continues to open the existing Builder; it does not duplicate its controls.

| Before | After |
| --- | --- |
| Wallpaper thumbnails plus a second wallpaper select | One thumbnail catalogue; kiosk Color only is a distinct option |
| POS aggregate Flat/Soft/3D selector plus individual depth controls | One depth control each for cards/buttons |
| Kiosk aggregate Glassy buttons plus depth controls | Same shared depth component; independent values remain available |
| Kiosk recipes and skin buttons as two catalogues | One Design selector with stable existing IDs and descriptive ES/EN labels |
| Separate My designs section | Saved configurations are choices in the Design selector; administration is a disclosure there |
| Different Fluid glass names | Classic glass / Fluid glass in both editors |
| Ambiguous Blur / Background names | Background blur, Glass blur, Wallpaper dim and Surface color identify their function |

Shared designs have the same names: Original, Flat, Raised 3D, Fluid glass. Kiosk-only layouts remain available: Glass panels, Photo menu, Service list, Compact catalog, Matte services, Gloss menu, Gradient glass, Metallic catalog, Natural waves. Their underlying skin/recipe IDs and bundled CSS remain stable; changing a label is not a data migration. Context-specific layouts do not appear as empty controls in Portal/POS.

Saved snapshots are compared by their values, including nested optical properties, independent of JSON key order. New saves of an identical snapshot or duplicate name are disabled; identical existing snapshots are not repeated as selector options. Existing saved records are preserved and remain administrable. A native color swatch and its hexadecimal field remain one composite color control, not separate competing settings.

## Optical controls

A shared whitelist and shared React editor expose the installed MIT `simple-liquid-glass@5.4.0` API. Missing `glassOptics` is `{}` and preserves the original optical values: material clear, lens profile material, strength 10%, blur 2, frost .08 and white tint opacity .08. The existing distortion control remains 0–50%. Existing CSS opacity/blur controls remain unique; no duplicate optical opacity/blur sliders were added.

Advanced options include depth, curvature, edge bend/width, sheen intensity/width/falloff/angle, specular gain, inner glow/spread/falloff, lighting veil, frost, tint/intensity, saturation, chromatic dispersion/intensity, material and quality. Animation modes ripple/flow/wobble, speed and amplitude are available only when an actual active SVG renderer supports them.

Compatibility is based on actual renderer diagnostics, not an assumption about device names. The installed renderer uses WebGL for WebKit: static refraction remains, while unsupported SVG animation controls are hidden. Speed/amplitude require an enabled animation. Chromatic controls require explicitly selected Standard/High/Extreme quality because the library disables the chromatic pass at Low quality. Automatic quality and accessible fallbacks remain library-managed. Reduced motion suppresses optical animation; reduced transparency retains the existing fallback.

The renderer's deprecated no-op properties (`mirror`, `mirrorScale`, `track`) are deliberately not exposed. Technical capture selectors, internal renderer switching, developer callbacks and text-color forcing are not business personalization controls.

## Persistence and compatibility

- Portal/POS: private existing appearance record, user/business/platform scope, existing version guard and CAS. Saved designs (max 8, names max 50) are stored in this same record. Saving/deleting a snapshot updates its version without discarding the current unsaved appearance draft. Older PUTs lacking advanced optics preserve them; explicit current-client Restore can reset them.
- Kiosk: existing owner-authorized appearance/preset actions, existing storage and paired presentation. Advanced optics are strictly whitelisted, finite, bounded and reject arbitrary CSS/URLs/keys.
- `X-WF-Kiosk-Optics` visual protocol: version 0 receives the legacy shape; version 1 receives distortion; version 2 additionally receives advanced optics. Older writes preserve missing current properties inside the existing CAS mutation, including changes after the initial read. This header never grants authorization.
- JSON request size remains bounded (16,000 bytes), allowing up to eight optical snapshots. Image bounds and private serving remain intact.

## Evidence

Unit suite: 850 passing. Includes scalar bounds, unsafe input rejection, actual library-prop mapping, user/tenant scope, presets, legacy 0/1/2 responses, stale revisions, concurrent legacy preservation and canonical duplicate detection. Build passes. Impeccable 4.1.0: exit 2, 20 existing recommendations (18 warnings, 2 advisories), none in the new personalization files. No global restyling was applied.

Browser evidence:

- Layout/regression matrices: Portal (both client/platform) and kiosk, Chromium/WebKit, 320/375/390/430/768/1024/1440, ES/EN, Light/Dark: passed.
- Both five-base-skin settings regressions at 390/1440, dark ES: passed, including catalogue/cart behavior, validation and explicit restoration/save.
- Final compatibility/duplicate guards retested at 390 in both engines: supported optical ranges, one control per property, snapshots without discarding the draft, reload, stale revisions, image deletion and employee navigation: passed.
- Confirmed scrolling diagnosis: SVG lenses report `paused` offscreen. The editor retains a previously observed SVG capability rather than hiding motion controls on scroll; an observed WebGL renderer disables those controls. Unit regression and browser checks pass.
- Real SVG `feTurbulence.baseFrequency` changes over time under no-preference, and the turbulence stage disappears with reduced motion. WebKit correctly hides SVG-only animation controls. SVG optical-map changes are also checked; no WebGL pixel-difference assertion is claimed.

Deployment evidence is finalized in the PR after Netlify builds this change. Browser tests use fixtures and isolated handlers; they do not modify real tenant records or run commerce operations. Device dimensions are emulation, not a physical iPhone test. Prop/configuration checks and SVG map/animation checks do not claim a WebGL pixel comparison for every slider.

Official logo SHA-256 unchanged:

- `assets/webfactory-pr-logo.png`: `1e92a89ec7e3771875bd1e30326478e6f4fdcd9aee2400bb0305d56ae7dd6f8a`
- `assets/webfactory-pr-logo-dark.png`: `2ae86e259775cb27f71757479a8e0fa620901aa6bc3cf837d785bbdec8ac270b`
