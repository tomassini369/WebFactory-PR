# WebFactory V2 — Live Demo Showcase

The public demo system is part of the approved WebFactory V2 product experience.

## Rules
- Demo businesses are fictional and are clearly identified as demos.
- Demo phone numbers and business details are fictional.
- Demos must not imply endorsement by people, brands or businesses shown in stock imagery.
- Images are referenced from Pexels-hosted photography selected for the appropriate industry.
- Each demo uses the reusable WebFactory demo engine but has its own data, palette, content, catalog and enabled functions.
- Demo payments, carts and bookings are simulations only. They never create a real charge, booking or calendar event.

## Routes and concepts

| Route | Business | Industry | Primary product capabilities demonstrated |
|---|---|---|---|
| /demos/brisa-cocina | Brisa Cocina | Restaurant | Menu catalog, cart, online ordering, table reservation |
| /demos/velocity-auto | Velocity Auto Care | Automotive | Service booking, technicians, deposits, products |
| /demos/northline-barber | Northline Barber Studio | Barber | Service + employee + time, deposits, retail |
| /demos/aura-beauty | Aura Beauty Lab | Beauty | Specialist booking, service gallery, deposits, shop |
| /demos/balance-wellness | Balance Wellness Room | Wellness | Group capacity, classes, massage appointments, shop |
| /demos/luna-market | Luna Market Boutique | Retail | Product detail, global cart, checkout |
| /demos/summit-advisory | Summit Advisory Group | Professional Services | Consultations, team assignment, scheduling |
| /demos/isla-living | Isla Living Realty | Real Estate | Listings, detail views, agents, viewing appointments |
| /demos/atelier-nueve | Atelier Nueve | Other / Creative | Products, workshops, group capacity, cart |

## Interactive demo engine
Every demo can enable the following from configuration:
- Catalog cards
- Product/service/listing detail modal
- Cart drawer
- Stripe / ATH Móvil checkout preview
- Employee profiles
- Service-to-employee eligibility
- Booking date and time selection
- Busy slot example
- Temporary 10-minute booking hold preview
- Deposit information
- Group capacity
- Simulated booking confirmation
- Gallery
- Contact / hours / location presentation
- Mobile responsive navigation

## Deployment architecture
The demos are first deployed as deep routes inside the WebFactory Netlify application. Netlify SPA fallback resolves direct visits to each route.

This gives every demo a direct Netlify-hosted URL while keeping one reusable codebase and one source of truth. The same config/components can later be exported into independent Netlify projects or custom demo subdomains without rebuilding the page design from scratch.

## Image sourcing
The current demo photography is sourced through Pexels image URLs. Keep stock imagery separate from fictional brand identity and never use depicted logos as the demo's brand.
