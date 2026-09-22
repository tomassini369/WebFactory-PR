# WebFactory PR V2

Official WebFactory PR product and production website.

## Official product

**WebFactory Commerce Platform — subscription SaaS**

- 48-hour free trial with no card.
- $30 USD monthly or $350 USD yearly.
- Multi-tenant business website plus private administration portal.
- Products/services, employees, bookings, Stripe Connect, ATH Móvil architecture, Google Calendar and live content updates.
- No WebFactory commission on the client's commerce sales.

The former $300 one-time product remains only as a grandfathered compatibility path for existing paid customers. It is not the public offer and new SaaS customers are never routed into that checkout.

## Stripe

Production Stripe Billing uses dedicated monthly and annual recurring prices. Client commerce remains separated through Stripe Connect.

Netlify environment variables:

- `STRIPE_SECRET_KEY` — Stripe secret key, stored only in Netlify.
- `STRIPE_PRICE_WEBFACTORY_MONTHLY` — official $30 monthly recurring Price ID.
- `STRIPE_PRICE_WEBFACTORY_ANNUAL` — official $350 annual recurring Price ID.
- `STRIPE_PRICE_WEBFACTORY_PREMIUM` — legacy $300 Price ID retained for grandfathered records only.
- `STRIPE_WEBHOOK_SECRET` — signing secret for the production Stripe webhook.
- `WEBFACTORY_ORDER_EMAIL` — administrative order recipient.
- `WEBFACTORY_GMAIL_USER` — Gmail account used for transactional delivery.
- `WEBFACTORY_GMAIL_APP_PASSWORD` — Gmail App Password stored as a Netlify secret.

Subscription Checkout never trusts a frontend price. The browser sends only `siteId` and `monthly|annual`; the server selects the authorized Price ID.

## Checkout safety

The server creates Stripe Checkout Sessions. Payment confirmation must come from Stripe verification/webhooks, never from a success-page redirect alone.

The Builder creates a hidden tenant and sends secure portal access. The owner starts the 48-hour trial from the portal; no card or charge is created by the Builder.

Client storefront data is loaded once per visit and refreshed when a visitor returns to a visible tab after at least one minute. Public tenant responses use revision ETags and short Netlify CDN caching, so administrative changes become available quickly without continuous 20-second polling or unnecessary Function invocations.

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


## SaaS activation

1. Customer completes the Builder and chooses a preferred `/sites/:slug` link.
2. The server validates the configuration, stores assets and creates a hidden tenant.
3. Netlify Identity sends secure password setup access.
4. The owner starts the exact 48-hour trial from `/client-admin`.
5. The website becomes public and remains editable through the portal.
6. The owner selects $30 monthly or $350 annual.
7. Stripe's signed webhook activates the subscription and preserves public entitlement.

The signed $300 checkout, Production Package and email workflow remain deployed only for legacy compatibility.

## WebFactory AI

WebFactory AI runs inside the existing multi-tenant Builder and uses Anthropic Claude through Netlify AI Gateway.

- AI never creates a separate customer Netlify site, repository, deployment, branch, or domain.
- Customer websites remain tenants rendered at `/sites/:slug` inside the same WebFactory runtime.
- The browser calls the protected Netlify Function at `/api/builder-ai`; provider credentials are available only to Netlify compute.
- Claude may propose Template/Custom selection, layout, palette, bilingual copy, features, starter catalog items, and team roles.
- Payment configuration, authentication, webhooks, secrets, contact credentials, deployment infrastructure, and integrations are outside the AI write surface.
- AI responses are server-validated JSON and require explicit **Apply to Builder** action before changing the local Builder draft.
- The function is rate-limited per IP to reduce abuse and AI credit consumption.
- Default model: `claude-sonnet-5`, overridable with `WEBFACTORY_AI_MODEL`.

## Client website runtime

Every SaaS customer receives an isolated tenant in the shared multi-tenant runtime.

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

Subscription readiness is evaluated server-side and requires the Stripe key, both recurring Price IDs, the signed webhook secret and `WEBFACTORY_SUBSCRIPTION_ENABLED=true`. The legacy checkout has a separate readiness endpoint and does not control the public Builder.

<!-- deploy-trigger: gallery-update-2026-09-22 -->
