# Unified Marketplace and Kiosk preview

The active integration branch is `feat/kiosk-skin-engine`, reviewed in PR #125.
Future work on these features must branch from this integration branch or be
merged back into it. Do not start from the superseded Marketplace PR #123.
Neither PR is authorized for a merge into main or a production deployment.

Combined sources:
- Marketplace: `2c3c925f28e8b5af19a2deb2010e6dffa32a147e` (PR #123).
- Kiosk/Stripe/receipt: `664b6c7f3fd69883e6fb94cc6b0fa51f5f1616f1` (PR #125).
- Production base: `79d82cf286efcac1fa69dbb567054a4215542ffb`.

The merge preserves Marketplace home, consumer accounts, public business
profiles, the original landing at `/crear`, Builder return links, five kiosk
skins, appearance editor, QR checkout, sandbox configuration and receipt print
correction. The only textual conflict was in the kiosk browser smoke test:
retain both Marketplace navigation timeouts and the kiosk print assertion.
Both CI suites and all Netlify routes are retained. No new OAuth, Identity,
provider credentials, database or production settings are introduced.

Shared preview: https://deploy-preview-125--webfactorypr.netlify.app
- `/`: Marketplace
- `/cuenta`: consumer access
- `/crear`: website creation landing
- `/builder`: Builder
- `/client-admin`: business portal
- `/kiosk`: paired kiosk
- `/sites/faro-norte-preview`: isolated barber test business
- `/design-preview/kiosk/preview/kiosk-skins.html`: safe skin demo

The existing PR125 fixture plugin recreates the barber business baseline per
deployment. Previous orders, bookings and receipts remain on their original
deployment and are not copied. No payment or paid booking is fabricated.
The owner confirmed the receipt now saves/prints correctly on their iPhone;
this user confirmation is distinct from automated device/provider verification.

Validation results and any limitations are recorded in the unified PR body.
Marketplace's existing scope limits remain in `MARKETPLACE-PHASE-1.md`.
