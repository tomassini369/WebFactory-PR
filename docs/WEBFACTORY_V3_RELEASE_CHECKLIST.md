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

### Client integration disconnect controls
- [x] Clients can disconnect Google Calendar from the portal; OAuth token is revoked/deleted and employee calendar mappings are cleared.
- [x] Owners can disconnect Stripe from a site without deleting the external Stripe account.
- [x] Stripe can be reconnected directly from the Client Portal after disconnection, including creation of a new Accounts v2 onboarding when no account is attached.
- [x] Clients can disconnect ATH Móvil configuration from a site.
- [x] Disconnecting an integration does not delete the WebFactory site or account.

### Client account lifecycle
- [x] Owners can permanently delete a single page after typing `DELETE PAGE`.
- [x] Site deletion cancels the WebFactory Stripe subscription when one exists, revokes Google Calendar, deletes site commerce/V3 records/assets/member pointers/slug pointer, and removes the tenant.
- [x] Identity site membership references are removed from remaining portal users when a page is deleted.
- [x] Owners can permanently delete their WebFactory account after typing `DELETE ACCOUNT`.
- [x] Billing webhooks arriving after site deletion are safely ignored instead of generating retry failures.
- [x] Account deletion deletes sites owned by the user, removes memberships from other businesses, then deletes the Netlify Identity user.
- [x] Destructive actions are isolated in a portal Danger Zone and are not available to non-owner roles.

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
- [ ] Current live Connect account is not charge-enabled (`charges_enabled=false`, `payouts_enabled=false`, onboarding incomplete). Complete merchant onboarding before any live end-to-end payment test.
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
- [x] Netlify Blobs is not being treated as an atomic inventory database; current idempotency and server-side stock validation are release safeguards, while true transactional concurrency is deferred to the PostgreSQL/Supabase scale-up phase.
- [x] Architecture decision: keep Netlify Blobs for the initial V3 release. Move inventory/order mutation to PostgreSQL/Supabase before high-volume rollout, multiple simultaneous checkout lanes, or merchants whose operations require strict transactional stock guarantees.

### Reviews automation
- [x] Business can enable/disable review automation.
- [x] Delay can be configured.
- [x] Google review URL can be configured.
- [x] Completed eligible transactions queue review requests.
- [x] Hourly processor sends due review requests.
- [x] POS completed sales can queue review requests.
- [ ] Test actual transactional email delivery in production provider configuration. Gmail fallback is currently configured; Mailjet keys are not present under the expected names. Admin-only transactional email test button is implemented under Resources.
- [x] Webhook retry guards prevent duplicate inventory/receipt/email side effects: `paymentStatus`, `v3ArtifactsCreatedAt`, `customerEmailSent`, `businessEmailSent`, plus Stripe event dedupe.

### POS reliability
- [x] Remote POS checkout rejects zero-value totals.
- [x] Remote POS checkout retries reuse a stable sale attempt ID and Stripe idempotency key.
- [x] Future Terminal PaymentIntent creation rejects zero-value totals.
- [x] Direct in-person POS now uses a stable sale attempt ID and an idempotent wrapper to prevent accidental duplicate submissions. Full atomic inventory concurrency across simultaneous independent sales remains a scale-up item.

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
- [x] Verified remote checkout creation only writes a `payment_pending` transaction; inventory mutation occurs only after a paid Stripe webhook, so abandoned checkout leaves stock unchanged.

### Stripe Connect onboarding controls
- [x] Incomplete Stripe onboarding can be removed from WebFactory and reset to `not_started` so the merchant can begin again.
- [x] The removal action is hidden once Stripe capability is active/completed.

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
