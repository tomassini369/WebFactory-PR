# Self-service kiosk

## Open and enable

Business owner or manager: open Client Admin → Business settings / Ajustes del negocio → POS · Self-service kiosk / Kiosco de autoservicio. Kiosks are disabled by default. Enable the module, name the screen, select its location, then copy the one-use pairing link to a dedicated customer device or browser profile without an administrative login. Confirm pairing on that device. Simply opening `/kiosk` without pairing grants no catalog, checkout or portal access.

Links expire after ten minutes. The device cookie is HttpOnly, Secure, SameSite=Strict and host-only; pairing lasts eight hours. Secrets are removed from the URL before application effects. The administrator can disable the module or revoke individual screens. Up to 20 active devices are registered atomically. Device names distinguish screens sharing a location. Configuration, creation, pairing and revocation retain server timestamps and verified administrator identifiers.

## Existing platform reuse

The same business siteId, catalog, photos, location, inventory, tax calculation, commerce store, transactions and checkout are used. `performCheckout` retains the existing storefront contract; only the trusted kiosk caller selects the `/kiosk` provider return on the same origin, preserving the paired cookie and keeping preview checkout returns off production. Stripe Connect reservations and idempotency, ATH Móvil production restrictions, server settlement, in-person orders and existing kitchen/receipt workflows remain authoritative. No NFC or Terminal simulation is introduced.

Cashier POS, Customer Display, Workforce, Builder, portals and PR #101 remain separate. The new screen uses `pos-domain` for catalog labels, quantity limits, estimated totals and accessible business accent colors. Tenant primary colors tint the light/dark canvas and surfaces. No new database or UI dependency is introduced. On phones and tablets a cart jump control avoids scrolling through a long catalog to reach checkout; it hides when the existing order panel is in view. Up to 20 distinct cart lines match the server contract. On this public ordering route, the Netlify preview collaboration drawer is hidden so it cannot cover customer controls.

## Checkout safety

Each paired screen has one server-generated sale ID. Atomic ETag writes freeze a canonical request and a server-generated 256-bit idempotency key before invoking the existing checkout-attempt guard. Client tenant IDs, branch IDs, prices and payment-confirmed flags never determine the order. Repeated or concurrent submissions cannot create another checkout for the active sale. Reload and resume retain the same attempt. Server time limits each device to 20 new orders per minute; exact resumes and polling do not consume another order slot. Completed attempts retain their response; personal request data is removed from the device record after response commit.

The screen polls server transaction state. Only a settled payment with completed inventory, a receipt and no fulfillment review unlocks a paid confirmation. Unpaid in-person orders explicitly remain due and are sent to the existing administrative order flow. They can finish the kiosk session without pretending payment occurred. Restaurant queue references come from existing server settlement, including the staff-confirmed in-person flow.

A provider return is not proof of payment. Pending, expired, cancelled, disputed and uncertain attempts cannot silently start another purchase. A paid order with incomplete fulfillment cannot offer another payment link. Authorized staff must reconcile its original order using existing operational controls. Revoking a device does not cancel or refund an already-created order.

Only cookie-bound public presentation fields are returned; no customer contact information, employees, wages, administrative configuration, provider account IDs or cashier tokens. Personal form state clears after inactivity or submission. Completed order details clear automatically after 45 seconds; explicit New order resets the server sale ID and rejects stale submissions. Detecting a changed server sale ID also clears the local cart and customer form when the reset response was lost.

## Scope and operational limits

Products and non-appointment services are available; appointment services continue through the existing booking website. Categories follow the existing catalog types. Additional priced modifiers/extras are pending because the current catalog does not provide that schema. Unified business capability configuration is the next stage. Individual open attempts requiring manual reconciliation deliberately block this screen; device re-pairing is not permission to charge again. Expired device records are inaccessible and the active registry is bounded; automated archival is pending.

Production payment credentials and third-party hardware were not exercised during QA. ATH remains unavailable for live operations on previews. Use a dedicated kiosk browser profile: kiosk pairing grants no administrative privileges, but it does not log out an unrelated administrative session already present in that profile.

## Validation

Run `npm test`, `npm run build`, then `node scripts/browser-kiosk-smoke.mjs`. WebKit: `QA_ENGINE=webkit QA_PORT=5227 node scripts/browser-kiosk-smoke.mjs`. Local installed browsers can be selected with QA_CHROMIUM_PATH and QA_WEBKIT_PATH. QA_ORIGIN supports a matching Deploy Preview, with all backend calls intercepted by isolated fixtures and a mocked provider page. No client records, transactions, payments or attendance are created in a real store.

Unit/integration checks cover administrator and branch authorization, single-use pairing, expiration, CSRF, redacted catalog, server pricing, concurrent submits/resumes, authoritative receipts, unpaid orders, uncertain outcomes, failed response persistence, fulfillment review and registry bounds. Browser QA covers seven widths, ES/EN, Light/Dark, seven tenant palettes, actual rendered contrast, control sizes, keyboard focus, reduced motion, language persistence, pairing/reload, checkout return, receipt/queue, privacy reset, disconnect, revocation and administrator setup. CI includes both engines and the kiosk route. After Netlify is ready, a second job checks the deployed route/privacy/authentication boundaries and runs both browser engines directly against the matching preview with isolated backend fixtures. This avoids relying on a local environment proxy for remote UI verification.

Anti-Slop After follows AGENTS.md and the existing design contracts. Impeccable 4.1.0 reported the 20 existing findings and none in the new kiosk files; these recommendations do not justify replacing unrelated Builder, sidebar or template behavior.
