# WebFactory PR V2 — Technical Architecture

This document follows the WebFactory PR master specification. The existing logo, navy/blue/white identity, single $299.99 product, Service + Employee + Time booking model, Stripe + ATH Móvil payments, and post-payment Production Package are fixed product requirements unless explicitly changed by the owner.

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

## Production Package
- Triggered only when payment_status becomes PAID from a verified provider event.
- Order moves through PACKAGE_GENERATING to PACKAGE_READY.
- Package can contain order summary, JSON data, build prompt, revision prompt, branding, images, catalog, team, booking and business files when supplied.
- Administrative delivery is idempotent using production_package_sent, production_package_sent_at and package_version.

## Email
- Transactional email is connected server-side in Phase 11.
- Administrator receives project summary and production files/private link only after verified payment and package generation.
- Customer receives a separate confirmation without internal prompts, credentials or backend information.

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
- Homepage order: Header, Hero, Value Proposition, Demos, What You Get, Commerce, Services, Booking, Employees, Google Calendar, WebFactory Builder, Payments, How It Works, Trust, FAQ, Final CTA, Footer.
- Builder shown in Phase 1 is visual scaffolding only. Functional Builder state begins in Phase 2.
- Current production site remains unchanged until V2 is reviewed and deliberately deployed.
