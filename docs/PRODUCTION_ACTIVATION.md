# WebFactory Production Activation Handoff

This document is the final production activation checklist for the WebFactory subscription runtime.

## Current commercial model

- Existing/grandfathered clients keep the original one-time $300 model.
- New SaaS clients receive a 48-hour free trial.
- Monthly plan: $30 USD.
- Annual plan: $350 USD.
- Annual savings versus 12 monthly payments: $10 USD.
- A trial that expires without an active subscription must no longer be publicly accessible until billing is activated.

## Required Netlify environment variables

The subscription runtime must remain disabled until all of these are configured in production:

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_WEBFACTORY_MONTHLY` — Stripe Price ID for $30/month.
- `STRIPE_PRICE_WEBFACTORY_ANNUAL` — Stripe Price ID for $350/year.
- `STRIPE_WEBHOOK_SECRET` — signing secret for the production webhook.
- `WEBFACTORY_SUBSCRIPTION_ENABLED=true` — set this only after the items above are confirmed.

The existing one-time checkout also continues to use:

- `STRIPE_PRICE_WEBFACTORY_PREMIUM` — existing $300 one-time price.

Do not replace or reuse the one-time Price ID for either subscription plan.

## Stripe product/price setup

Create or confirm recurring Stripe prices that exactly match:

- Monthly: USD 30.00, recurring monthly.
- Annual: USD 350.00, recurring yearly.

Copy the resulting `price_...` IDs into the corresponding Netlify environment variables.

## Production webhook

Use the existing WebFactory Stripe webhook endpoint and subscribe it to at least:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Copy the production webhook signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.

## Activation order

1. Configure monthly and annual Stripe prices.
2. Configure the production webhook and signing secret.
3. Confirm `STRIPE_SECRET_KEY` is present in production.
4. Deploy the current `main` branch.
5. Open WebFactory Control Center and verify all Billing readiness checks are green.
6. Only then set `WEBFACTORY_SUBSCRIPTION_ENABLED=true`.
7. Trigger a new production deploy if Netlify requires it for the environment change.

## End-to-end acceptance tests

Run all tests with a dedicated test client/site before accepting live SaaS customers.

### Trial

- Start a new 48-hour trial.
- Confirm the client site is public during the trial.
- Confirm no card is requested to start the trial.

### Monthly subscription

- Select $30/month.
- Complete Stripe Checkout.
- Confirm the webhook updates the site to an active subscription.
- Confirm the site remains public.
- Confirm Control Center reflects the active subscription.

### Annual subscription

- Select $350/year.
- Complete Stripe Checkout.
- Confirm the same activation behavior as monthly.
- Confirm the UI displays the $10 annual saving accurately.

### Expired trial

- Use a controlled test record with an expired trial.
- Run/confirm the scheduled trial enforcement function.
- Confirm the site becomes unavailable to the public.
- Confirm the private client portal still allows the owner to select a paid plan.
- Complete payment and confirm the site becomes public again.

### Payment failure

- Test `invoice.payment_failed`.
- Confirm the site/service enters the expected past-due state.
- Confirm Control Center reports the billing problem.

### Cancellation

- Cancel a test subscription.
- Confirm `customer.subscription.deleted` updates the WebFactory site state.
- Confirm public entitlement follows the configured cancellation behavior.

## Do not change during activation

- Existing $300 one-time product and checkout.
- Existing grandfathered client records.
- WebFactory logo/brand assets.
- Production Package flow for one-time purchases.
- Stripe Connect logic used by client businesses to receive their own customer payments.

## Final success criteria

WebFactory SaaS is production-ready only when:

- Control Center reports subscription Billing as ready.
- Both recurring Price IDs are production values.
- The signed production webhook is receiving events successfully.
- Trial expiration hides unpaid sites.
- Monthly and annual Checkout both activate the correct site.
- Failed/canceled subscriptions update site entitlement correctly.
- Existing $300 customers remain unaffected.
