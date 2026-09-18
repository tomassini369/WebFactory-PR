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
- Up to 10 initially configured items
- Product/service image upload for preview
- Service duration and appointment requirement
- Employee editor
- Service-to-employee mapping
- General business hours
- Desktop/tablet/mobile Live Preview
- Instant preview updates
- Local browser draft persistence
- Review screen

## Important boundaries
This phase does not persist to the production database yet. Browser localStorage is used only to make the simulator useful before Phase 3.

Checkout is intentionally disabled until the payment architecture is implemented. No frontend state can mark an order paid.

Real booking availability, temporary holds, Google Calendar conflict checks and webhooks remain future approved phases.
