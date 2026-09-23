# WebFactory V3 — Release Checklist

Status: pre-production checklist for PR #36  
Branch: `feature/webfactory-v3-business-platform`

## Scope decision

The dedicated WebFactory iOS app is deferred. Native Stripe Terminal/Tap to Pay backend primitives remain available for a future phase, but native iOS UI, App Store distribution and NFC collection are not release blockers for V3 web/PWA.

## Required before merge to main

### Build and deployment
- [x] Netlify Deploy Preview is green for the validated V3 branch state.
- [x] TypeScript/Vite production build passes in GitHub Actions.
- [x] Netlify Deploy Preview function bundle completes without errors.
- [x] Netlify secret scan reports no exposed credentials.
- [x] Scheduled functions are present where expected.

### Automated verification
- [x] `npm ci` passes in clean GitHub Actions runner.
- [x] `npm test` passes.
- [x] `npm run build` passes.

### Subscription and publishing
- [x] New trials use 7 days with no card.
- [x] Existing already-started trials preserve their original `trialEndsAt`.
- [x] Complimentary access remains public until explicitly revoked.
- [x] Revoked complimentary access requires paid subscription.
- [x] Legacy paid one-time customers remain grandfathered.
- [x] Past-due Stripe subscriptions remain public only during Stripe retry lifecycle.
- [x] Production Stripe monthly and annual Price IDs are present in Netlify configuration.
- [x] Production subscription webhook secret is present in Netlify configuration.
- [x] Confirmed `WEBFACTORY_SUBSCRIPTION_ENABLED=true` in dev, branch deploy, deploy preview and production.

### Complimentary access
- [x] Email-only complimentary invitation flow is implemented.
- [x] Invitation opens a private Builder link instead of creating a placeholder business.
- [x] Invitee creates the business, slug, design and content in the Builder.
- [x] Backend validates and redeems the signed random token against the invited email.
- [x] Created site receives complimentary entitlement automatically.
- [x] Owner account/password setup is provisioned after the site is created.
- [x] Complimentary access can still be revoked later without deleting site data.

### Client portal and permissions
- [x] Role model supports Owner, Manager, Employee and Cashier.
- [x] Legacy Staff remains compatible.
- [x] Navigation is filtered by capabilities.
- [x] Sensitive backend actions enforce capabilities.
- [x] Owner can invite portal members.
- [x] Owner can change member roles.
- [x] Owner can revoke one business without deleting the user account.
- [x] Automated capability tests cover Owner, Manager, Employee and Cashier boundaries. Manual browser role smoke test remains recommended before merge. Automated role-capability boundary tests now cover Owner, Manager, Employee, Cashier and unknown-role fallback.

### Commerce
- [x] Orders and Bookings are separated.
- [x] Customers/CRM records are created from paid transactions.
- [x] Receipts are normalized and printable as PDF.
- [x] Receipts can be resent by email.
- [x] Payment Links are server-authoritative.
- [x] QR is available for Payment Links.
- [x] Stripe payouts are visible without exposing bank data.
- [x] Full refunds reconcile receipt and inventory.
- [ ] Manually test a Stripe test-mode storefront purchase end-to-end.
- [ ] Manually test a Payment Link purchase end-to-end.
- [x] Refund policy tests verify cumulative full refunds, remaining balance limits and one-time full-refund inventory restore logic. Backend cumulative refund math and tracked-inventory restore logic are covered by automated tests/build validation.
- [x] Partial refund policy is cumulative; partial refunds do not restore inventory and the portal keeps refund action available until the refundable balance reaches zero. Portal now supports refund amount + reason and repeated partial refunds up to the remaining balance.

### Puerto Rico IVU
- [x] Site tax configuration exists.
- [x] Item taxable override exists.
- [x] Storefront checkout calculates tax server-side.
- [x] Payment Link checkout calculates tax server-side.
- [x] POS calculates tax server-side.
- [x] Receipts store tax separately.
- [x] Verified against Puerto Rico Hacienda sources: basic IVU is 11.5% total (10.5% state + 1% municipal); certain professional/B2B services may use the special 4% rate with no municipal IVU. Portal now exposes Basic 11.5%, Special 4%, Exempt, and manual/custom options.
- [x] Automated tax tests cover standard 11.5% tax-exclusive pricing and tax-inclusive pricing preserving the customer total.

### Inventory
- [x] SKU fields supported.
- [x] Track Inventory supported.
- [x] Low-stock threshold supported.
- [x] Backorder behavior supported.
- [x] Inventory movements are recorded.
- [x] Manual adjustments are audited.
- [x] POS cash/manual sales decrement tracked inventory.
- [x] Remote card sales decrement only after verified payment.
- [ ] Test simultaneous checkout behavior before high-volume rollout.
- [ ] Decide whether atomic inventory should move from Netlify Blobs to PostgreSQL/Supabase before larger client scale.

### Reviews automation
- [x] Business can enable/disable review automation.
- [x] Delay can be configured.
- [x] Google review URL can be configured.
- [x] Completed eligible transactions queue review requests.
- [x] Hourly processor sends due review requests.
- [x] POS completed sales can queue review requests.
- [ ] Test actual transactional email delivery in production provider configuration. Gmail fallback is currently configured; Mailjet keys are not present under the expected names. Admin-only transactional email test button is implemented under Resources.
- [ ] Add rate/duplicate safeguards if production testing reveals retries from external email failures.

### POS reliability
- [x] Remote POS checkout rejects zero-value totals.
- [x] Remote POS checkout retries reuse a stable sale attempt ID and Stripe idempotency key.
- [x] Future Terminal PaymentIntent creation rejects zero-value totals.
- [ ] Direct in-person POS still relies on Netlify Blobs for stock mutation; full atomic inventory concurrency remains a scale-up item.

### WebFactory POS
- [x] Remote POS retry idempotency uses a stable sale attempt ID and Stripe idempotency key.
- [x] Remote card checkout rejects zero-value totals.
- [x] Future Terminal PaymentIntent endpoint rejects zero-value totals.
- [x] Browser/PWA POS exists.
- [x] Shared catalog/cart.
- [x] Customer optional for in-person payment.
- [x] Discount and tip.
- [x] Server-authoritative total and IVU.
- [x] Cash/manual ATH/other in-person payment.
- [x] Remote Stripe Checkout.
- [x] Copy payment link.
- [x] QR for remote POS checkout.
- [x] Payment status verification.
- [x] Receipt/CRM/inventory/analytics integration.
- [ ] Test POS on iPhone Safari/Home Screen.
- [ ] Test POS on desktop/tablet viewport.
- [ ] Test abandoned remote checkout to ensure inventory remains unchanged.

### Live Stripe webhook verification
- [x] Subscription webhook endpoint is enabled with checkout, subscription created/updated/deleted, invoice paid and invoice payment failed events.
- [x] Stripe Connect webhook is enabled with `checkout.session.completed` and `checkout.session.async_payment_succeeded` for current web commerce.
- [ ] `payment_intent.succeeded` is not currently subscribed on the Connect webhook; this is deferred with native iOS/Tap to Pay and is not a V3 web release blocker.

### Stripe Terminal / Tap to Pay
- [x] Backend connection-token endpoint prepared.
- [x] Backend card-present PaymentIntent endpoint prepared.
- [x] Connected-account scoping prepared.
- [x] Terminal PaymentIntent success can enter commerce finalization pipeline.
- [ ] Native WebFactory iOS app — DEFERRED.
- [ ] Native Stripe Terminal SDK integration — DEFERRED.
- [ ] Tap to Pay NFC collection — DEFERRED.

### Data compatibility
- [x] Shared multi-tenant runtime preserved.
- [x] Existing client site URLs preserved.
- [x] Existing orders/bookings storage remains compatible.
- [x] Existing Stripe Connect account references remain compatible.
- [x] Existing Google Calendar mappings remain compatible.
- [x] Factory AI boundaries remain unchanged.
- [ ] Backup/export current production tenant data before final V3 merge.
- [x] Subscription tests confirm legacy trials preserve their stored `trialEndsAt`; only newly created V3 trials receive the 7-day policy.

## Recommended release sequence

1. Finish all unchecked validation items that can be done in Deploy Preview/test mode.
2. Verify `/.netlify/functions/v3-release-readiness` reports production readiness without exposing secret values.
3. Back up/export production tenant data.
4. Mark PR #36 ready for review.
5. Merge to `main`.
6. Observe first production deploy.
7. Run smoke checks for homepage, Builder, client portal, one public tenant, Stripe Billing readiness and client commerce readiness.
8. Keep native iOS work deferred until the web V3 release is stable.
