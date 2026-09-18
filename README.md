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


## Production runtime readiness

Checkout readiness is evaluated server-side. A production deploy must have the Stripe secret, official Stripe price, Stripe webhook signing secret, order destination email, Gmail sender account and Gmail App Password available to Netlify Functions before the Builder enables the live $300 checkout.
