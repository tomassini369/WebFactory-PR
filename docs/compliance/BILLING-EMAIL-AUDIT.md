# Billing and email audit — preview draft, 2026-10-25

No real charges, cancellations, refunds, mail, Google configuration or credentials were used or changed. This report describes code controls, not legal certification.

## Corrected risks

| Evidence | Severity | Correction / acceptance evidence |
|---|---|---|
| `subscription-billing.mjs` previously applied each signed event directly without source ordering or existing subscription comparison | High | Tenant checkout lock serializes billing changes. Older Stripe-created timestamps cannot overwrite newer recorded events. Events for another established customer/subscription are ignored outside authorized Checkout establishment. Courtesy/legacy/non-subscription plans are not converted by delayed billing events. Pure state tests cover these cases. |
| `create-subscription-checkout.mjs` previously persisted the checkout pointer only after provider success, generating new consent and idempotency identities after uncertain failure | High | `subscription-checkout.mjs` persists exact Checkout request and acceptance ID before provider invocation. Lost provider response/storage acknowledgment retries identical parameters and idempotency key. Interval change resolves and expires the previous open Checkout before replacement. Completed Checkout blocks another charge. Unknown recovery older than 23 hours fails closed for reconciliation rather than risk reuse beyond provider idempotency retention. Tests use isolated fake provider/store only. |

The original timestamp-only guard could not order distinct events in the same second. The continuation now retrieves the canonical Stripe subscription for tied timestamps under the existing tenant lock and verifies subscription, customer and site ownership before applying state. Failed provider reads leave the webhook uncompleted for retry; they do not guess paid status. Once a plan enters canonical reconciliation, subsequent signed snapshots keep using current provider state so a later delivered historical snapshot cannot undo it. Other ordinary plans retain the guarded path. Operational reconciliation and Dashboard review remain necessary for unidentified old Checkout attempts. Prepared records contain checkout metadata and existing owner email, no payment instrument, provider credentials or access tokens.

## Existing controls retained

- Seven-day trial has no card requirement in `createTrialServicePlan`; expiry removes public entitlement. Courtesy plan is separate. Past-due currently remains public during retry; unpaid/canceled do not. Legacy and courtesy behavior is not changed by this audit.
- `subscriptionConsent` requires explicit true acceptance and exact version, stores server date, authorized owner, USD amount and interval. $30/month or $350/year are verified against the configured Stripe Price currency/amount/recurring interval before Checkout. No forced plan pricing configuration changes.
- Owner-only same-origin subscription cancellation verifies stored subscription/customer/site against Stripe and schedules end-of-period cancellation. Access/renewal state comes from signed webhook; no actual cancellation was performed.
- Stripe webhook validates HMAC with timing-safe comparison and five-minute timestamp limit; completed-event markers deduplicate deliveries. Root audit additionally sanitizes errors.
- Platform Resend/Gmail SMTP and tenant Gmail OAuth transports are separate. Tenant Gmail requires connected tenant identity and uses send scope without reading the mailbox. No credentials/scopes/redirects changed.
- Review-request mail already requires explicit customer review opt-in, a configured tenant postal address, and suppression lookup. It carries unsubscribe headers and URL; the processor rechecks eligibility before sending, uses a batch lock, bounded budget, per-site/request limits and uncertain-delivery states to avoid blind repeats.
- Marketing suppression is tenant/email-hash scoped. Unsubscribe token is random and stored hashed. It suppresses review requests, independently of legitimate booking/receipt messages. It does not claim a global Marketplace campaign subscription feature exists.
- Receipt, contact, booking confirmations/reminders and invitations are existing operational send paths; Marketplace campaigns and ad delivery are not activated by this work.

## Tests

- Focused billing/consent, marketing preference, review processing, Gmail tenant boundary, provider and Resend tests: 56 passed before checkout retry hardening.
- Billing state, consent and Checkout lost-response/storage/interval/old-attempt suite: 16 passed after hardening (includes four new Checkout cases).
- Parent integration runs the combined repository suite/build. These figures overlap; do not sum them as unique tests.

## Owner/legal follow-up

- Verify real sender and tenant postal addresses before commercial messages; a nonempty string is an operational configuration check, not verification that an address is legally valid.
- Confirm the real supported jurisdictions, required renewal reminders, refund exceptions and cancellation disclosures with counsel. Current plan code does not establish geographic restriction or state-by-state renewal notice automation.
- Confirm platform identity/address and support handling in legal documents. Do not fabricate these.
- Review production billing reminder configuration in Stripe separately; audit did not change account settings or send emails. No automatic campaigns, marketing permission migration or unsubscribed reactivation was added.
- Document and operate manual reconciliation for unknown Checkout attempts outside the safe retry window. This code deliberately blocks rather than silently starting a new subscription.


## Continuation — operational billing verification

- `GET /.netlify/functions/subscription-reconciliation?siteId=...` is owner-only and read-only. It compares the stored subscription/renewal status against an authenticated Stripe retrieval and inspects only the tenant's protected Checkout ID. Provider ownership is verified before output. Courtesy/non-subscription plans do not contact Stripe. Preview requires the existing safe test-key runtime guard. No create/update/expire/list provider action is available.
- The Plan panel's bilingual verification control explicitly runs this query. It displays mismatch or unresolved Checkout status and instructs against another charge; it neither changes access nor cancels/restarts a subscription. Practice cannot invoke it. Canonical customer/contact details, Checkout parameters, provider credentials and URLs are not returned.
- An old protected attempt without a known Checkout ID remains review-only. The status inquiry never recreates it, including after the safe23hour window. A person must identify the original operation in Stripe before an intentional supported recovery; no unsafe reset shortcut is added.
- Same-second signed-event canonical reads, followed by canonical reads for subsequent snapshots of that plan, close the previous timestamp ambiguity for entitlement and cancel-at-period-end state. Source: Stripe official snapshot-event guidance https://docs.stripe.com/events/how-events-work and delivery-order guidance https://docs.stripe.com/webhooks. This does not alter webhook signing, scopes, provider configuration or real data during tests.
- Focused regression22tests pass:14billing state (including four new canonical reconciliation tests), four protected Checkout retry cases and four owner read-only reconciliation security cases. TypeScript passed. Fixtures only; no real provider request, charge, cancellation or email was made.
