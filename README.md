# WebFactory PR V2

Official WebFactory PR product and production website.

## Official product

**WebFactory Premium Commerce Website — $300 USD one-time**

Includes the WebFactory V2 experience for business website, commerce, products/services, employees, bookings, Stripe/ATH Móvil architecture, Google Calendar architecture, responsive preview and initial publishing workflow.

There are no active Basic, Professional, Payments or monthly-support packages in the current V2 product model.

## Stripe

Production Stripe uses one active product and one active one-time price.

Netlify environment variables:

- `STRIPE_SECRET_KEY` — Stripe secret key, stored only in Netlify.
- `STRIPE_PRICE_WEBFACTORY_PREMIUM` — official Stripe Price ID for the $300 one-time WebFactory Premium product.
- `STRIPE_WEBHOOK_SECRET` — signing secret for the production Stripe webhook.
- `WEBFACTORY_ORDER_EMAIL` — administrative order recipient.
- `WEBFACTORY_GMAIL_USER` — Gmail account used for transactional delivery.
- `WEBFACTORY_GMAIL_APP_PASSWORD` — Gmail App Password stored as a Netlify secret.

The checkout function never trusts a frontend price. It always reads the official Stripe Price ID from the Netlify environment.

## Checkout safety

The server creates Stripe Checkout Sessions. Payment confirmation must come from Stripe verification/webhooks, never from a success-page redirect alone.

The V2 Builder checks backend readiness before enabling the final checkout. The button remains disabled until Stripe, the verified webhook and Gmail SMTP delivery are all configured.

## Current V2 stack

- React + TypeScript + Vite
- Netlify + Netlify Functions
- Stripe
- Planned PostgreSQL/Supabase + Storage
- Netlify Identity for invitation-only client portal access
- Netlify Blobs for tenant configuration, commerce records and client assets
- Service + Employee + Time booking model
- Google Calendar per employee/calendar
- Up to 100 products/services per website
- Real Google Maps location links
- PWA/Home Screen support as WebFactoryPR

## Production

Official site: https://webfactorypr.netlify.app

Production branch: `main`


## Paid-order automation

1. Customer completes the Builder.
2. Uploaded images are persisted before payment.
3. Server stores an authoritative order and creates Stripe Checkout for exactly $300.
4. Stripe signed webhook confirms payment.
5. WebFactory generates the Production Package.
6. Administrative package is sent to the configured WebFactory order email.
7. Customer receives a separate payment/project confirmation.
8. Order moves to IN_PRODUCTION.

## Client website runtime

Paid projects now receive a separate multi-tenant runtime. This does not alter the $300 WebFactory purchase checkout.

- `/client-admin` is the authenticated client portal.
- `/sites/:slug` is the dynamic bilingual client website runtime.
- Catalog prices are loaded and validated server-side; browsers never provide authoritative prices.
- Stripe Connect uses direct charges on the client's connected account after the v2 `card_payments` capability is active.
- The connected-account webhook is authoritative for client sales and bookings.
- Booking availability uses Service + Employee + Time, temporary holds, stored bookings and Google Calendar free/busy.
- Products, services, inventory, employees, hours, payment rules and calendar mappings update without a deploy.
- The catalog limit remains 100 products/services per client website.

Additional production secrets/configuration:

- `STRIPE_CONNECT_WEBHOOK_SECRET` — signing secret for connected-account Checkout events.
- `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` — Google Calendar OAuth application.
- `WEBFACTORY_TOKEN_ENCRYPTION_KEY` — secret used to encrypt Google OAuth tokens at rest.
- Optional `GOOGLE_OAUTH_REDIRECT_URI` — defaults to the production callback URL.

`/.netlify/functions/client-runtime-readiness` reports only boolean readiness and never exposes secret values.


## Production runtime readiness

Checkout readiness is evaluated server-side. A production deploy must have the Stripe secret, official Stripe price, Stripe webhook signing secret, order destination email, Gmail sender account and Gmail App Password available to Netlify Functions before the Builder enables the live $300 checkout.
