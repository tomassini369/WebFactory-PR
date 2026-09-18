# WebFactory V2 — Phase 2 Builder

## Goal
Convert the Phase 1 visual Builder shell into a real interactive simulator while preserving the approved WebFactory V2 product model.

## Functional steps
1. Business
2. Design
3. Features
4. Catalog
5. Team
6. Hours
7. Preview

## Implemented behavior
- Business name, category, description, phone, WhatsApp, email, address and Instagram
- Customer logo upload for local preview
- Modern, Luxury, Minimal and Bold visual styles
- Primary and secondary color controls
- Feature toggles with fixed $299.99 pricing
- Unified product/service catalog editor
- Up to 100 total products/services in the Builder catalog
- Product/service image upload for preview
- Compact catalog library with hidden item editor windows
- Customer-facing catalog opens in a hidden modal window instead of rendering the full catalog inline
- Service duration and appointment requirement
- Employee editor
- Service-to-employee mapping
- General business hours
- Desktop/tablet/mobile Live Preview
- Instant preview updates
- Local browser draft persistence
- Review screen

## Important boundaries
This phase does not persist to the production database yet. Browser localStorage is used only to make the simulator useful before Phase 3. To support catalogs up to 100 items safely, uploaded image data is not persisted to localStorage; images remain in the active session until Storage is implemented.

Checkout is intentionally disabled until the payment architecture is implemented. No frontend state can mark an order paid.

Real booking availability, temporary holds, Google Calendar conflict checks and webhooks remain future approved phases.


## Google Maps location
The Business step now uses a real Google Maps URL instead of a manually typed address.

Accepted examples include google.com/maps links and maps.app.goo.gl share links. The Builder validates that the URL belongs to Google Maps. The Live Preview links directly to the supplied real location. When the URL exposes coordinates or an embeddable query, the preview also renders an embedded Google map. Short share links remain clickable and open the exact Google Maps destination.
