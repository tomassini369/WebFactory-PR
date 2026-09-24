# WebFactory V3 — Production Activation

## Current commercial model

- 7-day free trial with no card.
- $30 USD monthly.
- $350 USD annual.
- $10 annual savings versus 12 monthly payments.
- Complimentary access is supported when granted by the WebFactory administrator.
- A site without an active trial, active subscription or complimentary entitlement is not publicly available.

## Required Netlify configuration

### Stripe Billing

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_WEBFACTORY_MONTHLY`
- `STRIPE_PRICE_WEBFACTORY_ANNUAL`
- `STRIPE_WEBHOOK_SECRET`
- `WEBFACTORY_SUBSCRIPTION_ENABLED=true`

### Stripe Connect

- `STRIPE_CONNECT_WEBHOOK_SECRET`

### Google Calendar

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `WEBFACTORY_TOKEN_ENCRYPTION_KEY`

### Optional Control Center telemetry

- `NETLIFY_API_TOKEN`
- `NETLIFY_SITE_ID`
- `NETLIFY_ACCOUNT_ID`

Never expose secret values in frontend code, logs or screenshots.

## Stripe recurring prices

- Monthly: USD 30.00 recurring monthly.
- Annual: USD 350.00 recurring yearly.

## Subscription webhook events

At minimum:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

## Acceptance tests

### 7-day trial

- Start a new trial.
- Confirm no card is required.
- Confirm the site becomes public.
- Confirm `trialEndsAt` is exactly seven days after `trialStartedAt`.
- Confirm expiration hides the site when no subscription exists.

### Monthly subscription

- Select $30/month.
- Complete Stripe Checkout in the intended environment.
- Confirm the signed webhook activates the correct site.
- Confirm the site remains public.

### Annual subscription

- Select $350/year.
- Confirm the same activation behavior.
- Confirm the UI shows the $10 annual saving accurately.

### Failed payment

- Test `invoice.payment_failed`.
- Confirm the site enters the expected Stripe retry/past-due state.
- Confirm Control Center reports the billing issue.

### Cancellation

- Cancel a test subscription.
- Confirm Stripe lifecycle events update WebFactory.
- Confirm entitlement follows the current cancellation state.

### Client commerce

- Complete Storefront and Payment Link tests through a properly onboarded Stripe Connect account.
- Confirm receipt, CRM, inventory and analytics updates.
- Validate POS on iPhone Safari/Home Screen and desktop/tablet.

## Final success criteria

WebFactory V3 is production-ready when:

- build and Deploy Preview are green
- no secrets are exposed
- subscription Billing readiness is green
- 7-day trial behavior is verified
- monthly and annual subscription flows are verified
- transactional email delivery is verified
- Stripe Connect merchant onboarding is complete for live payment testing
- Storefront, Payment Link and POS E2E checks are complete
- production backup is current
