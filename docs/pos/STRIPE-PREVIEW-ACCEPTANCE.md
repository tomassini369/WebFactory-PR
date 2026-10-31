# Faro Norte Stripe sandbox acceptance

Preview only. Do not merge or publish while the owner is reviewing the kiosk.
No real transaction is authorized.

## Merchant verification

The existing checkout and portal status used an expanded Accounts v2 merchant
configuration. The connected Stripe sandbox returns a permission error for that
expansion through the connected tool, although the same merchant is visible in
the Accounts v1 view with card_payments active and charges_enabled true. The
first actual preview checkout returned a generic HTTP500 before providing a
Checkout URL; it is not evidence of a paid transaction.

`stripe-merchant-capability.mjs` centralizes the read-only check used by ordinary
checkout, the cashier POS and portal status. It uses Stripe's documented Accounts
v1 compatibility view, supported for both v1 and v2 accounts. It requires a
matching account ID, active card capability and charges_enabled=true. It never
changes accounts, permissions, onboarding or payment logic. The existing preview
guard against live keys remains. Provider responses cannot echo API keys or
merchant details into browser error messages.

Reference: https://docs.stripe.com/connect/accounts-v2 explicitly documents passing
v2 account IDs to Accounts v1 endpoints. Existing account creation remains v2;
only the capability check uses the compatibility view.

## Preview callback isolation

Storefront returns previously preferred the configured production URL even for
preview requests. The checkout return helper now uses the actual request origin
when trusted Netlify metadata says deploy-preview. Production keeps its existing
canonical URL. Kiosk screen/QR return contracts are preserved. Receipt tokens
and session/tracking arguments remain on the intended deployment.

## Checks

New tests cover disabled merchants despite active card capability, missing
capabilities, account mismatches, invalid account IDs, authentication/permission
errors, outage handling, no sensitive provider-message reflection, and refusal
to create a session after merchant verification fails. Callback tests cover
preview isolation and unchanged production returns; all prior return tests stay.
No test uses real keys or real charges. Actual sandbox session creation and
provider settlement must be checked on the deployed build, not inferred from
unit tests. The cloud browser is currently unavailable before page loading, so
manual hosted Checkout completion may be needed. Do not fabricate a paid webhook
or mark an order paid to replace that step.
