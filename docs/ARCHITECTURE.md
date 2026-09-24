# WebFactory PR V3 — Technical Architecture

WebFactory is a multi-tenant subscription business platform. The fixed brand identity remains the existing WebFactory PR logo with navy, blue and white. The current commercial model is a 7-day no-card trial followed by $30 monthly or $350 annual billing, with optional complimentary access granted by the platform administrator.

## Frontend

- React 19 + TypeScript.
- Vite 8.
- Responsive web/PWA experience.
- Shared runtime for homepage, Templates, Builder, client websites, client portal, WebFactory Admin, payment links and POS.

## Hosting and backend

- Netlify for deployment and CDN delivery.
- Netlify Functions for authenticated APIs, Stripe Billing, Stripe Connect, bookings, payment links, POS, receipts, refunds, reviews, Google Calendar and administrative operations.
- Secrets remain server-side only.

## Data and storage

The current runtime uses site-scoped Netlify Blobs with strong consistency in production.

Logical data areas include:

- tenant/site configuration
- member indexes
- catalog and employees
- orders and bookings
- customers/CRM
- receipts
- payment links
- inventory movements
- review requests
- analytics records
- OAuth state/tokens
- uploaded client assets

Every tenant record is scoped by `siteId`.

## Subscription entitlement

Supported entitlement types:

- 7-day active trial
- active Stripe subscription
- complimentary access

A site with no supported entitlement remains private.

## Payments

### WebFactory subscription

Stripe Billing handles $30 monthly and $350 annual recurring subscriptions. The server chooses the configured recurring Price ID.

### Client commerce

Stripe Connect routes eligible customer card payments through the business's connected Stripe account. ATH Móvil and in-person methods remain business-controlled payment methods.

Server-authoritative calculation covers prices, discounts, Puerto Rico IVU, tips, totals and refund limits.

## Booking engine

Core availability unit: **Service + Employee + Time**.

Availability can consider:

- eligible employee
- selected employee
- service duration
- buffers
- business hours
- employee schedules
- breaks and time off
- daily limits
- booking window and minimum notice
- stored bookings
- temporary holds
- Google Calendar conflicts

Availability is revalidated before confirmation.

## Google Calendar

- OAuth tokens are encrypted at rest.
- Calendar mapping can be per employee.
- Backend reads free/busy and can create, update, cancel and reschedule events.

## Client Portal

Current V3 navigation targets:

- Overview
- Website
- Orders
- Bookings
- Customers
- Catalog
- Employees
- Payments
- Marketing
- Analytics
- Integrations
- Settings
- WebFactory Plan

Portal authorization validates both the authenticated user and tenant membership.

## Commerce operating core

V3 includes:

- storefront orders
- bookings
- payment links
- QR payments
- receipts
- CRM
- inventory
- refunds
- payouts visibility where Stripe allows
- review automation
- browser/PWA POS
- role/capability-based portal access

## Factory AI

Factory AI operates only inside the Builder. It can propose structure, Template selection, design, bilingual content, catalog and team configuration. It cannot change payment secrets, authentication, webhooks, repositories or deployment infrastructure.

## Email

Transactional email is backend-only. Production delivery has been validated through the configured Gmail transport. Other providers can be enabled through Netlify secrets without changing the application contract.

## Current release boundary

The dedicated native iOS app and Tap to Pay NFC UI are deferred. V3 release targets the web/PWA platform.
