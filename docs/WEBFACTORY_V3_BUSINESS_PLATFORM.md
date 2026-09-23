# WebFactory V3 — Business Platform

Status: official V3 implementation blueprint
Branch: `feature/webfactory-v3-business-platform`

## Product direction

WebFactory evolves from a website/commerce SaaS into a unified business operating platform.

Core promise:

**Build. Sell. Book. Manage. Get Paid.**

V3 preserves the current shared multi-tenant runtime, client portal, Builder, Stripe Billing, Stripe Connect, bookings, employees, Google Calendar, ATH Móvil architecture, Factory AI, and production deployment model. It does not rebuild the platform from scratch.

## Commercial model

Public offer:

- Free Build: customers may create and preview their business setup before subscribing.
- Publishing requires an active subscription or complimentary entitlement.
- Monthly: $30 USD.
- Annual: $350 USD.
- No WebFactory percentage commission on client commerce sales in the core plan.
- Legacy one-time $300 customers remain grandfathered.
- Complimentary access remains supported from the WebFactory admin portal.

Trial migration target:

- New trials use a 7-day no-card trial.
- Existing already-started trials keep their original `trialEndsAt` and are not extended or shortened automatically.
- The V3 branch implements this policy through `createTrialServicePlan()` with `trialPolicyVersion: v3-7d`.

## Client portal information architecture

Target navigation:

1. Overview
2. Website
3. Orders
4. Bookings
5. Customers
6. Catalog
7. Employees
8. Payments
9. Marketing
10. Analytics
11. Integrations
12. Settings
13. WebFactory Plan

The current portal can be migrated incrementally. Existing functionality must remain operational during the transition.

## V3.0 — Commerce operating core

### Payments Center

Retain Stripe Connect as the primary card payment connection. Customers must not paste API keys.

Flow:

Connect Stripe → Stripe-hosted onboarding/login → authorization/KYC → return to WebFactory → connected status.

Display:

- connection state
- charges capability state
- payouts capability state where available
- business/account label
- manage Stripe action
- ATH Móvil connection state
- enabled payment methods

Sensitive Stripe secrets remain server-side only.

### Payment Links

Add merchant-created payment links for products, services, custom amounts, or invoices.

Minimum fields:

- id
- siteId
- title
- description
- catalogItemId optional
- amount
- currency
- quantity behavior
- active
- expiresAt optional
- createdAt
- createdBy
- slug/token

Public route target:

`/pay/:siteSlug/:paymentLinkToken`

Server validates price and merchant ownership. The browser never supplies an authoritative charge amount.

### QR Payments

Each payment link can generate a QR representation that resolves to the public payment route.

No payment information is encoded directly into the QR beyond the public URL/token.

### Taxes / Puerto Rico IVU

Add site-level tax configuration:

- enabled
- stateRate
- municipalRate
- pricesIncludeTax
- defaultTaxable

Add item-level override:

- taxable
- taxRateOverride optional

The calculation engine must be server-authoritative for checkout, POS, receipts, refunds and analytics.

### Receipts

Generate a normalized receipt record after verified payment or manual cash transaction.

Minimum receipt data:

- receiptId
- transactionId
- siteId
- customer
- items
- subtotal
- discounts
- tax
- tip
- total
- paymentMethod
- paymentStatus
- createdAt

Delivery actions:

- email
- SMS-ready provider abstraction
- printable/downloadable view
- resend

### Customers / CRM

Create or attach customer profiles from orders, bookings and payment activity.

Minimum customer model:

- customerId
- siteId
- name
- email
- phone
- tags
- notes
- createdAt
- updatedAt
- totalSpent
- orderCount
- bookingCount
- lastActivityAt

Identity matching starts with authenticated customer/account ID where available, then normalized email/phone. Do not expose raw payment credentials.

### Orders

Unify order sources:

- online storefront
- payment link
- POS
- manual order

Statuses:

- new
- confirmed
- preparing
- ready
- completed
- cancelled
- refunded
- partially_refunded

### Payout visibility

Where Stripe Connect permits it, surface payout/deposit status without exposing private banking data.

Display:

- amount
- expected/arrival date
- status
- related Stripe payout identifier

## V3.1 — Operations expansion

### Reviews automation

After a completed eligible order or service, optionally send a review request.

Configuration:

- enabled
- delay
- Google Business review URL
- eligible transaction types

### Inventory

Extend product inventory:

- sku
- trackInventory
- quantityOnHand
- lowStockThreshold
- allowBackorder
- soldOut behavior

Inventory changes must be atomic and reflected across storefront, admin and future POS.

### Staff roles and permissions

Separate service employees from portal users.

Initial roles:

- Owner
- Manager
- Employee
- Cashier

Permissions should be explicit capabilities, not hard-coded UI assumptions.

### Refunds

Retain current refund capability and normalize it around:

- full refund
- partial refund
- reason
- payment provider result
- receipt adjustment
- inventory adjustment where applicable
- analytics correction

## V3.2 — WebFactory POS

Add a browser/PWA POS surface using the same tenant data.

POS sale flow:

Catalog → quantity → customer optional → discount/tip → tax → payment method → receipt.

Initial methods:

- cash
- external/manual ATH Móvil confirmation where compliant
- Stripe online/card handoff
- payment link

POS writes into the same orders, customers, inventory, receipts and analytics models.

## V3.3 — Tap to Pay

Evaluate and implement provider-supported Tap to Pay through official Stripe Terminal / compatible SDK flows.

This phase may require a native or provider-approved mobile integration. Do not emulate NFC payment collection in the browser.

## Builder and publishing model

### Free Build

Builder creation and preview should be available without charging.

A new tenant can exist in a non-public draft state.

Allowed before subscription:

- business profile
- design
- catalog
- services
- employees
- schedules
- integrations setup
- preview

Publishing requires one of:

- active trial
- active paid subscription
- valid complimentary entitlement
- grandfathered legacy entitlement

## Data architecture

Continue the existing multi-tenant architecture.

Current Netlify Blobs storage remains supported during V3 implementation, but new modules should use clear repository/service abstractions so PostgreSQL/Supabase migration remains possible.

Recommended logical collections:

- sites
- catalog
- employees
- portalUsers
- orders
- bookings
- customers
- receipts
- paymentLinks
- payouts
- inventoryMovements
- reviewRequests
- analyticsEvents

Every record must be scoped by `siteId`.

## Security requirements

- Never trust frontend prices, tax totals or entitlement status.
- Stripe webhook verification remains authoritative for confirmed card payments.
- Connected account ownership must be checked on every privileged payment operation.
- Payment links use unguessable identifiers.
- Portal authorization must validate both authenticated user and tenant access.
- Secrets remain in Netlify environment variables.
- Sensitive operations require server-side auditing.

## Compatibility requirements

V3 must preserve:

- existing public client sites
- current URLs
- current customer data
- complimentary access
- legacy $300 entitlements
- current monthly/annual subscriptions
- current Stripe Connect accounts
- current orders/bookings
- current Google Calendar mappings
- Factory AI boundaries
- bilingual ES/EN behavior

## Implementation order

### Phase A — foundation
- introduce V3 domain types and storage helpers
- add customer, receipt, payment-link and tax models
- extend transaction normalization
- preserve old API contracts

### Phase B — client portal
- reorganize navigation
- add Customers
- split Orders and Bookings
- expand Payments Center
- add Marketing, Analytics, Integrations and Settings
- retain Plan/Billing

### Phase C — payment links + receipts + IVU
- server endpoints
- public pay route
- QR
- receipt generation
- tax engine

### Phase D — CRM + inventory + payout visibility
- customer aggregation
- stock movement
- payout read model
- low-stock alerts

### Phase E — POS
- PWA POS screen
- shared order engine
- cash/manual payment support
- provider-backed card flow

### Phase F — Tap to Pay
- provider/platform feasibility validation
- approved mobile integration

## Definition of done for V3 core

V3 core is complete when a business can:

1. Build and preview its website.
2. Publish through trial/subscription/complimentary entitlement.
3. Sell products online.
4. Sell services with employee-based booking.
5. Create payment links and QR codes.
6. Calculate configured IVU server-side.
7. Receive verified Stripe Connect payments.
8. View orders and bookings separately.
9. Maintain customer profiles.
10. Issue and resend receipts.
11. Track inventory.
12. View business analytics.
13. Manage integrations from one portal.
14. Operate without manually entering API secrets.


## Current scope decision — iOS app deferred

As of September 23, 2026, development of a dedicated **WebFactory iOS app** is intentionally deferred.

The web/PWA Business Platform remains the active implementation target. Stripe Terminal/Tap to Pay server primitives may remain in the repository so a future native iOS client can reuse the same WebFactory POS transactions, catalog, tax, inventory, CRM, receipts and analytics pipeline.

Current V3 scope therefore includes:
- Web/PWA POS
- cash/manual in-person sales
- Stripe remote Checkout links
- QR checkout
- shared orders, CRM, receipts, inventory and analytics
- Terminal-ready backend primitives

Current V3 scope does **not** include:
- native iOS UI
- App Store packaging/distribution
- native Stripe Terminal SDK integration
- Tap to Pay NFC collection inside a WebFactory mobile app

Native development must be treated as a separate future phase and must not block completion or release of the WebFactory web platform.
