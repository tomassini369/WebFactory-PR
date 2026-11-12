# WebFactory memberships

The plan catalog in `shared/membership-plans.mjs` supplies the landing page, the business billing portal and the server-side checkout amounts. Prices are USD.

| Tier | Monthly | Annual |
| --- | ---: | ---: |
| Basic | 30 | 300 |
| Standard | 49 | 490 |
| Premium | 79 | 790 |

With tiered billing enabled, new trials grant Premium for 14 days without a card. The owner chooses a tier and billing interval after the trial, accepts the displayed renewal terms and completes Stripe Checkout. The signed webhook reconciles the Stripe subscription and its Price ID before assigning the paid tier. Stripe Connect and merchant customer payments remain separate from the WebFactory subscription.

## Deploy Preview and release

- Use a separate Stripe sandbox for the Deploy Preview and leave the existing production keys and prices unchanged during verification.
- Create six distinct active recurring USD Prices matching the table. Set the variables below in the correct Netlify deploy context. The existing subscription billing enable switch, Stripe key, and signed webhook configuration are also required.
  - `STRIPE_PRICE_WEBFACTORY_BASIC_MONTHLY` and `STRIPE_PRICE_WEBFACTORY_BASIC_ANNUAL`
  - `STRIPE_PRICE_WEBFACTORY_STANDARD_MONTHLY` and `STRIPE_PRICE_WEBFACTORY_STANDARD_ANNUAL`
  - `STRIPE_PRICE_WEBFACTORY_PREMIUM_MONTHLY` and `STRIPE_PRICE_WEBFACTORY_PREMIUM_ANNUAL`
- Set `WEBFACTORY_TIERED_PLANS_ENABLED=true` for Functions and `VITE_WEBFACTORY_TIERED_PLANS_ENABLED=true` for the site build once the six prices and webhook are configured. Unconfigured Deploy Previews show the comparison for review.
- Verify a new 14-day trial, expiration, selection and recorded consent for the exact interval and amount, duplicate checkout recovery, signed webhook activation and cancellation. Verify direct endpoint access for each tier as well as the portal and storefront.
- Existing legacy subscriptions retain their current prices and access. This release does not add a self-service paid-plan change or per-location Stripe add-on. Confirm the supported scope before marketing either feature.
