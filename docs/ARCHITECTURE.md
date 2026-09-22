# WebFactory PR V2 — Technical Architecture

WebFactory is a multi-tenant subscription platform. The existing logo and navy/blue/white identity remain fixed. New customers use a 48-hour trial followed by $30 monthly or $350 annual billing. Service + Employee + Time, Stripe Connect, ATH Móvil architecture and Google Calendar remain core capabilities. The older $300 checkout and Production Package exist only for grandfathered compatibility.

## Frontend
- React 19 + TypeScript.
- Vite 8 for development and production builds.
- Mobile-first responsive component system.
- Builder preview state may live in the browser, but authoritative commerce, booking and payment state must live on the backend.

## Hosting and backend
- Netlify for deployment and CDN delivery.
- Netlify Functions for secure APIs, Stripe/ATH webhooks, booking availability, Google Calendar operations, Production Package triggers and signed private downloads.
- No secret keys, payment credentials, Google OAuth tokens or authoritative prices in frontend code.

## Data and storage
- PostgreSQL through Supabase for Business, Employee, Service, ServiceEmployee, Product, Booking, Order, temporary holds and provider event records.
- Supabase Storage for customer logos, images, uploaded project files and generated Production Packages.
- Signed temporary URLs for private package downloads.

### Current client runtime

The deployed first-party client runtime uses site-scoped Netlify Blobs with strong consistency for tenant configuration, member indexes, commerce records, booking holds, idempotency records, OAuth state and uploaded images. The storage API is isolated behind Netlify Functions so a later PostgreSQL migration does not change the public portal or storefront contracts.

Each tenant is keyed by `siteId`; membership indexes are keyed by a one-way normalized email hash. Public storefront responses are explicitly filtered and never return connected-account IDs, OAuth tokens, member lists or internal order data.

## Payments
- Stripe Checkout is created server-side using database prices.
- Stripe webhooks are authoritative for Stripe payment confirmation.
- ATH Móvil uses per-business credentials server-side and backend transaction verification.
- Provider transaction IDs are persisted for idempotency.

## Booking engine
- Core availability unit: Service + Employee + Time.
- Inputs include eligible employees, selected employee, working hours, overrides, duration, buffer, existing bookings, Google Calendar busy periods, breaks, vacations, blocks, minimum notice, booking window and daily limits.
- Temporary holds protect slots during checkout.
- Availability is revalidated immediately before confirmation.

## Google Calendar
- OAuth tokens are stored encrypted at rest.
- Calendar mapping is primarily per employee, with support for one business Google account containing multiple calendars.
- Backend reads free/busy and creates, updates, cancels and reschedules events.
- OAuth refresh/access tokens are encrypted with AES-256-GCM before storage. The encryption key exists only as a Netlify secret.

## Client administration

- Netlify Identity provides authentication through `@netlify/identity`.
- Portal accounts can be provisioned from a server-validated Builder request or by the platform administrator. Public Netlify Identity signup remains disabled.
- Builder-created tenants remain hidden until the verified owner starts the 48-hour trial from the portal.
- Server-side membership checks protect every tenant mutation.
- The client can update business content, catalog, inventory, services, employees, schedules, payment rules and calendar mapping without a deploy.
- Stripe identity, bank, tax and mandatory security remediation remain on Stripe-hosted screens.
- Google consent and security reauthorization remain on Google-hosted screens.

## Client commerce

- Public checkout submits catalog IDs and quantities only.
- The server reloads canonical prices and inventory from the tenant record.
- Stripe-hosted Checkout Sessions are created as direct charges on the connected account.
- Dynamic payment methods are enabled by omitting `payment_method_types`.
- Client-sale webhooks use a separate signing secret and idempotency store from WebFactory subscription billing and the grandfathered order webhook.
- The success URL never marks a transaction paid.
- Paid bookings generate Google Calendar events and separate customer/business emails.
- An hourly retry function resumes email/calendar delivery and removes expired booking holds.

## Production Package
- Triggered only when Stripe reports a verified paid Checkout Session through the signed webhook.
- Order moves through PAID -> PACKAGE_GENERATING -> PACKAGE_READY -> EMAIL_SENT -> IN_PRODUCTION.
- Netlify Blobs persists the pre-checkout order, uploaded assets and generated ZIP package.
- Package includes order-summary.pdf, order-data.json, AI build prompt, client requirements, revision prompt, branding, images, catalog, team, booking settings and business files when supplied.
- Packages small enough for Gmail are attached; larger packages use an expiring token-protected download link.
- Administrative delivery uses persistent sent flags and a dispatch lock to reduce duplicate delivery.

## Email
- Gmail SMTP is used server-side.
- Administrator destination is read from WEBFACTORY_ORDER_EMAIL.
- Customer receives a separate confirmation without internal prompts, credentials or backend information.
- Live checkout is not enabled unless Stripe, webhook and Gmail SMTP readiness checks all pass.
- Mailjet is the primary outbound transport through `MAILJET_API_KEY` and `MAILJET_SECRET_KEY`; Gmail variables remain a temporary fallback. Corporate sender addresses are selected by message category and all secrets live only in Netlify.

## Delivery phases
1. Homepage + visual system + responsive foundation.
2. WebFactory Builder + Live Preview.
3. Database + project storage.
4. Products + Services + unified Catalog.
5. Cart + Stripe + ATH architecture.
6. Employees + ServiceEmployee.
7. Booking Engine + availability + temporary holds.
8. Google Calendar.
9. Payment confirmation + verified webhooks + idempotency.
10. Production Package generator.
11. Administrative + customer emails.
12. Security hardening + testing + production deployment.

## Phase 1 rules
- Reuse the existing WebFactory PR logo asset unchanged.
- Brand colors: #0B1529, #3C86F6, #4D96F3, #F3F6FB, #FFFFFF and #DCE8F7.
- Homepage order: Header, Hero, Value Proposition, Templates entry point, What You Get, Commerce, Services, Booking, Employees, Google Calendar, WebFactory Builder, Payments, How It Works, Trust, FAQ, Final CTA, Footer.
- Builder shown in Phase 1 is visual scaffolding only. Functional Builder state begins in Phase 2.
- Current production site remains unchanged until V2 is reviewed and deliberately deployed.
