# WebFactory PR V3

Official WebFactory PR business platform.

## Current product

**WebFactory Business Platform — subscription SaaS**

- 7-day free trial with no card.
- $30 USD monthly or $350 USD yearly.
- Multi-tenant business website plus private administration portal.
- Products and services, bookings, employees, CRM, receipts, inventory, analytics, payment links, QR payments and browser/PWA POS.
- Stripe Billing for WebFactory subscriptions.
- Stripe Connect for client-business card payments.
- ATH Móvil architecture for supported business payment flows.
- Google Calendar integration by employee/calendar.
- Factory AI inside the Builder.
- No WebFactory percentage commission on client commerce sales.
- Complimentary access can be granted and revoked by the platform administrator.

Only the current subscription and complimentary-access models are supported.

## Trial and publishing

The Builder can create and preview a business before payment. A new business remains private until the owner starts the 7-day free trial or receives complimentary access.

After the trial, continued public availability requires an active WebFactory subscription.

## Pricing

- Monthly: $30 USD.
- Annual: $350 USD.
- Annual savings versus 12 monthly payments: $10 USD.

The browser never supplies an authoritative subscription price. The server selects the configured Stripe Price ID.

## Main routes

- `/` — WebFactory homepage.
- `/templates` — Templates library.
- `/templates/:templateSlug` — Template preview.
- `/builder` — WebFactory Builder + Factory AI.
- `/client-admin` — authenticated client portal.
- `/webfactory-admin` — platform administrator Control Center.
- `/sites/:slug` — public client website.
- `/pay/:siteSlug/:paymentLinkToken` — public payment link.
- `/password` — password recovery.

## Production stack

- React + TypeScript + Vite.
- Netlify + Netlify Functions.
- Netlify Identity.
- Netlify Blobs for current tenant/runtime records and assets.
- Stripe Billing.
- Stripe Connect.
- Google Calendar OAuth.
- Factory AI through Netlify AI Gateway.
- Web/PWA POS.

## Subscription environment variables

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_WEBFACTORY_MONTHLY`
- `STRIPE_PRICE_WEBFACTORY_ANNUAL`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CONNECT_WEBHOOK_SECRET`
- `WEBFACTORY_SUBSCRIPTION_ENABLED=true`

## Google Calendar

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `WEBFACTORY_TOKEN_ENCRYPTION_KEY`
- optional `GOOGLE_OAUTH_REDIRECT_URI`

## Transactional email

Transactional email is sent only from backend Functions. The currently validated production transport is the configured Gmail fallback. Mailjet can be enabled when its production credentials are configured.

Corporate sender identities:

- `team@webfactorypr.com`
- `support@webfactorypr.com`
- `billing@webfactorypr.com`
- `info@webfactorypr.com`

Never commit credentials or secret values.

## Security rules

- Server-authoritative prices, taxes and entitlement.
- Signed Stripe webhooks are authoritative for payment state.
- Tenant authorization is validated server-side.
- Connected-account ownership is checked on privileged payment operations.
- Google OAuth tokens are encrypted at rest.
- Payment credentials, banking data and secret keys are never exposed to client-side code.

## Booking

Availability is based on **Service + Employee + Time** and can include duration, buffers, business/employee schedules, breaks, time off, daily limits, stored bookings, temporary holds and Google Calendar conflicts.

## Current V3 scope

V3 includes the Web/PWA business platform and POS. A dedicated native iOS app and Tap to Pay NFC UI are deferred to a separate future phase.
