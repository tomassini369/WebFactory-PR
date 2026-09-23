# WebFactory V3 — Release Checklist

Status: pre-production checklist for PR #36  
Branch: `feature/webfactory-v3-business-platform`

## Scope decision

The dedicated WebFactory iOS app is deferred. Native Stripe Terminal/Tap to Pay backend primitives remain available for a future phase, but native iOS UI, App Store distribution and NFC collection are not release blockers for V3 web/PWA.

## Required before merge to main

### Build and deployment
- [ ] Latest Netlify Deploy Preview is green on the final commit.
- [ ] TypeScript build passes.
- [ ] Netlify Function bundle completes without errors.
- [ ] Secret scan reports no exposed credentials.
- [ ] Scheduled functions are present where expected.

### Subscription and publishing
- [x] New trials use 7 days with no card.
- [x] Existing already-started trials preserve their original `trialEndsAt`.
- [x] Complimentary access remains public until explicitly revoked.
- [x] Revoked complimentary access requires paid subscription.
- [x] Legacy paid one-time customers remain grandfathered.
- [x] Past-due Stripe subscriptions remain public only during Stripe retry lifecycle.
- [ ] Confirm production Stripe monthly and annual Price IDs are configured.
- [ ] Confirm subscription webhook secret is configured.
- [ ] Confirm `WEBFACTORY_SUBSCRIPTION_ENABLED=true` in production before enabling the new public policy.

### Client portal and permissions
- [x] Role model supports Owner, Manager, Employee and Cashier.
- [x] Legacy Staff remains compatible.
- [x] Navigation is filtered by capabilities.
- [x] Sensitive backend actions enforce capabilities.
- [x] Owner can invite portal members.
- [x] Owner can change member roles.
- [x] Owner can revoke one business without deleting the user account.
- [ ] Manually test one account for each role in Deploy Preview.

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
- [ ] Manually test a full refund against a tracked product.
- [ ] Manually test a partial refund and confirm inventory is not auto-restocked.

### Puerto Rico IVU
- [x] Site tax configuration exists.
- [x] Item taxable override exists.
- [x] Storefront checkout calculates tax server-side.
- [x] Payment Link checkout calculates tax server-side.
- [x] POS calculates tax server-side.
- [x] Receipts store tax separately.
- [ ] Verify configured default IVU values with current Puerto Rico requirements before final production enablement.
- [ ] Test tax-inclusive and tax-exclusive pricing with representative products.

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
- [ ] Test actual transactional email delivery in production provider configuration.
- [ ] Add rate/duplicate safeguards if production testing reveals retries from external email failures.

### WebFactory POS
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
- [ ] Confirm no migration script rewrites existing trial end dates.

## Recommended release sequence

1. Finish all unchecked validation items that can be done in Deploy Preview/test mode.
2. Verify production environment readiness without exposing secret values.
3. Back up/export production tenant data.
4. Mark PR #36 ready for review.
5. Merge to `main`.
6. Observe first production deploy.
7. Run smoke checks for homepage, Builder, client portal, one public tenant, Stripe Billing readiness and client commerce readiness.
8. Keep native iOS work deferred until the web V3 release is stable.
