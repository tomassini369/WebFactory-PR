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

The checkout function never trusts a frontend price. It always reads the official Stripe Price ID from the Netlify environment.

## Checkout safety

The server creates Stripe Checkout Sessions. Payment confirmation must come from Stripe verification/webhooks, never from a success-page redirect alone.

The V2 Builder currently keeps the final checkout button disabled until the complete order persistence, Production Package and post-payment workflow are connected.

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
