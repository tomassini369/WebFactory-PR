# WebFactory Kiosk Skin Engine

Base audited: `main` commit `79d82cf286efcac1fa69dbb567054a4215542ffb` (2026-10-24).
Production's published deployment was ready when inspected. This work belongs
only to `feat/kiosk-skin-engine` and its PR preview; no production activation.

## Audit of the existing implementation

| Surface | Existing implementation / contract |
| --- | --- |
| Cashier, customer screen, self service | Separate operational surfaces; this change is limited to `/kiosk` and its settings. |
| Kiosk lifecycle | `src/Kiosk.tsx`, `src/kiosk-api.ts`, `netlify/functions/client-kiosk.mjs`: owner-authorized pairing, dedicated device cookie, eight-hour device lifetime, revocation, five-second view polling. |
| Tenant configuration | `${siteId}/pos-kiosk/config.json` in the existing commerce store; conditional writes through `mutateKiosk`. Device records and sale state are separate. |
| Catalog/cart | `netlify/lib/kiosk.mjs` supplies active nonappointment items and available inventory. `src/pos-domain.ts` supplies shared names, quantity bounds, contrast pairs and estimated totals. Cart has a 20-line bound. Server calculates the final amounts. |
| Payments | Kiosk uses `checkout-attempt.mjs` and `create-client-checkout.mjs`. Existing Stripe, ATH Móvil and in-person selection depends on tenant configuration. Frozen requests and attempt IDs protect uncertain retries. Provider return does not prove payment. |
| Appointments | `KioskBookingPanel.tsx`, `kiosk-bookings.mjs` and existing availability/checkout actions. New appointment selects service, professional/any professional, time and customer. Existing appointment uses code/PIN, arrival and supported balance payment. |
| Receipts/reset | `kioskSaleView` only exposes confirmed receipts after server reconciliation. Kiosk prints via `window.print`; physical printer compatibility remains the browser/OS printer contract. Successful/due results can reset; screen clears after 45 seconds. Idle cart/customer data clears after one minute. |
| Branding/capabilities | Existing business logo, `site.design.primary/secondary`, profile copy and `posCapabilities`; categories and enabled booking/payment actions derive from the current view, never from skin identity. |
| Shared dependencies | Tenant settings portal, practice context/transport, theme, catalog, checkout, inventory, booking engine and receipt data. No OAuth/Google permission changes are required. |

The original component combined state/effects and JSX, but its state could be
extracted without changing operations. The new hook retains the original timers,
handlers, guards and contracts. `KioskBookingPanel` remains shared rather than
being reimplemented by each skin. No second POS, database or payment service.

## Architecture and extension contract

1. **POS Core:** `src/useKioskCore.ts` owns cart, sale, provider, pairing, request,
   booking mode, poll, reset, idle cleanup and totals. `src/Kiosk.tsx` mounts it
   once; a skin update does not key or replace the core.
2. **Skin Engine:** `netlify/lib/kiosk-skins.mjs` is a data-only versioned registry
   and shared allowlist validator. `KioskSkinSurface.tsx` resolves tokens, safe
   business colors, contrast-aware button ink and bundled layouts. Unknown or
   corrupt stored configurations resolve to the original Classic defaults.
3. **Renderer:** `src/KioskRenderer.tsx` consumes the core's typed return contract.
   `KioskSkinSurface` and scoped `skins.css` provide presentation only. The DOM,
   accessible labels and all operational callbacks are shared.

Theme choices: native/humanist/rounded local system fonts, primary canvas tint,
secondary action color, button/card shape, branded/neutral background, subtle/off
motion. Layout choices: original grid, glass composition, photographic menu,
service list and compact retail grid. Full skins combine the registered layout
and presentation tokens; future bundled renderers must consume the same core
contract and never implement their own operational endpoints. Registry entries
declare core version and supported capabilities. All five initial skins support
every current kiosk capability; vertical names never activate business features.

Classic with defaults keeps the original CSS and business colors. Its root gains
data attributes only. Glass is restricted to header and order panel. Touch sizes,
theme toggle, reduced motion, print and forced-colors behavior remain available.
No new animation engine, external fonts or runtime code-loading mechanism.

## Save and preview

`Apariencia del Kiosco` is inside existing POS kiosk settings. Draft selection and
the read-only visual preview do not save. Preview shows current available catalog
and logo. Save calls the existing `client-kiosk` handler with action `appearance`.
Restore saves the complete original Classic configuration, including inherited
business colors. Saving appearance does not enable the kiosk or change booking
modes, devices, orders, payment rules or other POS modes. Paired devices receive
the new configuration on their normal poll, retaining the active sale/cart.

The preview-only demo is `/design-preview/kiosk/preview/kiosk-skins.html`. It uses
the actual configurator, core and renderer with the existing in-memory practice
transport and explicitly labeled sample data. It has no network fallback and no
real payment providers. `build-design-preview.mjs` excludes the whole demo from
production builds. This demo is separate from the user's live training session;
live training leaves appearance controls disabled and its transport unchanged.

## Security

- Same settings capability and canonical membership checks as current kiosk
  administration; no new permission. Employee, foreign business and paired-device
  writes are rejected by the same backend authorization boundary.
- Appearance is written under the authorized tenant's configuration key, using
  conditional writes; no read/modify/write of transaction or device records.
- Only known keys, skin/version pairs, six-digit hex colors and finite enum values
  are accepted. URLs, CSS, scripts, provider options and sensitive fields are
  rejected. Stored invalid values fall back to Classic on reads.
- No OAuth, scopes, Calendar, Gmail, Stripe or ATH credentials are changed.
- Preview deployments may share configured backend storage. Do not save visual
  preferences for real tenants during QA; automated tests use isolated stores or
  the local practice transport. Never run a real financial transaction for QA.

## Visual customizer expansion

The existing engine now includes six original ready-made compositions (Classic,
Studio Matte, Bistro Gloss, Aurora Glass, Boutique Copper and Garden Waves), six
color palettes and native visual color selectors alongside optional HEX inputs.
No third-party editor, paid templates, AI generation or new package is required.

Finish (original/matte/gloss/glass/metallic), background mode
(solid/gradient/pattern/image) and layout are independent. Owners can adjust two
gradient colors and angle, choose three patterns, customize header/card/cart
colors with automatic foreground contrast, set typography/buttons/cards/spacing,
and add optional banner/hero welcome text. Operational controls still depend on
business capabilities, never on a composition. Classic defaults remain unchanged.

The editor includes bounded draft undo/redo, a live preview beside the controls
when space permits, a mobile preview jump, and up to eight named saved designs.
Applying a recipe or a named design edits a draft; only Save appearance activates
it on paired devices. Saved designs use the same allowlisted schema and backend
tenant authorization as the active appearance.

### Background lifecycle and resource bounds

- `POST client-kiosk-visual-assets?siteId=…`: same-origin, canonical owner/settings
  authorization before reading a bounded multipart body. The browser optimizes
  JPG/PNG/WebP sources up to 12 MB; the server independently limits its file input
  to 4 MB and decoding to 24 million pixels. Animated images and MIME mismatches
  are rejected. Sharp rotates, strips metadata and re-encodes to WebP, at most
  1920×1920 and 1 MB. Existing `sharp` dependency and Netlify externalization are
  reused.
- At most eight background files per business. Conditional configuration writes
  reserve upload slots; pending files cannot be activated. Successful storage
  marks them ready; failed uploads release the slot. Stale reservations expire
  after ten minutes.
- Appearance/preset writes require background keys from that business's ready
  registry. No arbitrary URLs, CSS, HTML or scripts are accepted. The existing
  asset endpoint serves them with the existing public/private entitlement check.
  Unique immutable public backgrounds receive a one-year browser-cache policy;
  other asset cache policies are unchanged. Files are processed once on upload,
  not on each view poll.
- `DELETE` uses the same owner authorization, rejects foreign keys, and refuses
  deletion while the active appearance or a saved design references the file.
  Uploading does not activate an image. Owners can crop visually using fit and
  horizontal/vertical position, blur and overlay controls without duplicate files.
- Text/control surfaces remain readable over photos and gradients. Background
  layers cannot intercept touch; print and reduced-transparency fallbacks apply.

The preview-only sample supports these controls and image uploads using local
object URLs and in-memory records only. Images are revoked on deletion/unmount;
there is no operational network fallback or real tenant upload during demo QA.

## Verification and limits

Baseline existing suite: 640 passing. Expanded unit/integration suite: 663 passing.
Tests include all skin round trips, corrupt/future configuration fallback,
authorization, cross-tenant rejection and preservation of pending sale/device data.
TypeScript and production/preview build passed during implementation.

Browser suites accept `QA_SKIN`: `browser-kiosk-smoke.mjs` checks pairing, catalog,
cart add/remove/quantity limits, totals, simulated checkout/provider return,
server-confirmed receipt, reset, offline/revocation recovery, keyboard focus,
contrast, touch targets and overflow. `browser-kiosk-bookings-smoke.mjs` checks
professional selection, appointment creation, lookup/PIN privacy, arrival, balance,
result, receipt and reset. `browser-kiosk-skins-settings-smoke.mjs` checks five skin
previews, persistence, tokens, validation, restore and no operational network calls.
The CI matrix runs all five skins on Chromium/WebKit and seven widths with both
languages/themes, and uploads screenshots. See `KIOSK-SKIN-QA.md` for actual runs.

Physical printer hardware, native iPhone keyboard and live provider sandboxes are
not certified by isolated browser fixtures. No real charge is needed or allowed.
Impeccable baseline: 20 existing findings, none in kiosk files; recommendations
outside this change do not justify unrelated visual edits.

### Glass panels over photographs

The Glass finish (or Glass Premium with Original finish) makes the header,
welcome, catalog, cart and footer translucent. `glassOpacity` is validated as
an integer 70–95 (default 76); `glassBlur` is 0–12 px (default 8). Lower opacity
reveals more of the background. Zone colors become a 15% tint in the theme's
neutral surface to keep foreground contrast predictable over arbitrary photos.
Fields remain opaque; nested product cards have no extra backdrop filter.
Reduced transparency, forced colors, unsupported backdrop filters and print
use solid surfaces. Classic with its default finish is unchanged.
