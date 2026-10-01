# ATH Móvil merchant connections

WebFactory does not need a platform ATH Business account. Each business owner saves its own public/private tokens in Payments or Integrations. The private token is encrypted with AES-256-GCM and authenticated to the business ID, in the existing private OAuth store. `WEBFACTORY_TOKEN_ENCRYPTION_KEY` must be present in the Functions environment. Tokens never enter the client site object, public configuration, transaction responses, or logs. Managers and cashiers cannot save or disconnect tokens.

## Connection states

- A legacy public pATH alone is manual recording, not an API connection.
- Saving valid-format tokens enables the checkout and displays **Credentials saved · First payment pending**. It does not validate the account or charge money.
- A real completed payment verified by the server changes the connection to **ATH Móvil connected · Payment verified**. Replacing credentials resets this state.
- Disconnect disables new ATH checkouts and deletes the saved merchant credentials. Previously issued checkout sessions retain encrypted credentials only for verification of in-flight payments; completed sessions remove their credential copy. Site deletion removes ATH credentials, sessions, and session indexes.

## Checkout and verification

Storefront orders/bookings and payment links offer Stripe and ATH separately. Prices, tax and booking deposits are computed server-side before creating an opaque ATH session. The dedicated checkout uses Evertec's official `athmovil_base.js` button, isolated from the React application's SDK globals. Its CSP permits the SDK's documented/current production dependencies, including Google Firebase modules and realtime database connections, on this endpoint only.

The SDK processes buyer authorization. WebFactory does not accept a browser callback as proof: it queries the official read-only `searchTransaction` service using the merchant's tokens and checks `ECOMMERCE`, `COMPLETED`, exact cents, reference, random per-order metadata and business metadata. Refunded or mismatched payments fail closed. Reference claims and fulfillment locks use conditional writes to prevent duplicate application. Verified orders update receipts, inventory, customers and booking calendar events; partial fulfillment failures remain visible and flagged for business review rather than replaying side effects.

Checkout starts expire after 30 minutes; server verification remains available for seven days. API-created payments must be between $1 and $1,500 USD. Live token configuration and payments are disabled in non-production contexts. Training remains a separate simulation.

ATH refunds are managed in ATH Business. The Stripe refund endpoint and UI do not process ATH transactions. Manual POS ATH records remain explicitly manual and never establish an API connection. Stripe payouts, credentials and connected accounts remain independent.

## Validation required before claiming live end-to-end readiness

Automated tests cover merchant access, encryption binding, provider separation, forged callbacks, mismatched payments, fulfillment and retries. The production encryption configuration has been checked without exposing its value. **A real merchant account and a separate buyer account must still test successful, cancelled and expired payments on mobile and desktop. No live ATH payment has been executed during implementation.** Evertec's current documentation states that there is no testing environment.

Official references:
- https://github.com/evertec/athmovil-javascript-api
- https://github.com/evertec/ATHM-Payment-Button-API
- https://ath.business/botondepago
