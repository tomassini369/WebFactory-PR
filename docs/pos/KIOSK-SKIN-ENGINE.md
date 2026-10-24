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

## Verification and limits

Baseline existing suite: 640 passing. Expanded unit/integration suite: 647 passing.
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
