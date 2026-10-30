# Next: integrated exploration revision

This revision replaces the flat experimental presentation with the original Glassy material system inside the Next shell. It is not production-ready and does not complete the original master brief.

## Implemented and checked

- Removed overrides that flattened official panels and hid the wallpaper; restored rims, translucent surfaces, elevation, original charts, profile and calendar panels. Next adds photographic Marketplace cards, category controls, a shared glass header and responsive navigation. Official logo files unchanged.
- Original commercial homepage, template library, individual templates, Builder, business storefront, client portal and administrator are mounted. Legacy links route within Next; section anchors remain within their current page. Template selection carries into Builder. Template/storefront language follows the global header.
- Original administrator displays only synthetic local business data. Its native tab navigation remains available. No real administrative authority is created.
- Builder changes update the local business/storefront. Profile and dashboard appearance can save locally, with revision conflict detection. Operational saves verify persistence before acknowledging success; quota/storage failure returns an error.
- New sample appointments feed the original calendar and transaction list, persist across reload, support cancellation, and reject overlapping local intervals. Wall times use the business timezone, including invalid DST times. This is not cross-device or server concurrency protection.
- Cash sample checkout preserves original totals/idempotency, produces a sample receipt and clears the cart. Customer display reads a local shared snapshot. Kiosk appearance/preset edits use local state. Integration toggles are explicitly simulated; provider configuration remains disconnected.
- Template photographs are the existing cached official application assets, populated by its original cache script. No paid visual services or new provider credentials.

## Browser evidence

Protected Netlify origin: https://webfactory-pr-next-experiment.netlify.app/

Chromium checks performed on deployed revisions: Marketplace renders; category/municipality controls; original Glassy dashboard; administrator overview and clients tabs; profile save followed by reload; new appointment NEXT-0001 appears in original agenda and remains after reload; Builder business-name change appears in storefront; template Brisa Cocina opens and loads its images, then selects itself in Builder; sample cash product12.00 + IVU1.38 =13.38, confirmation creates DEMO-1 and clears the cart. Source navigation bug discovered by browser testing was corrected. Font and palette save/readback verified in earlier deployed checks.

Local checks:817 inherited tests,22 Next tests, TypeScript and experimental build. Detector:25 recommendations, with Next font-face findings retained under the owner's approved free-font direction. No complete WCAG/performance acceptance is claimed.

## Outstanding master-brief requirements

- Isolated server authentication, tenant authorization, durable data and booking concurrency. Current identities are fixture identities, never server credentials.
- Stripe Test QR and complete payment failure/cancel/refund paths; provider-backed Gmail/Calendar/WhatsApp and actual subscription/account lifecycle behavior. Real providers remain blocked.
- Advanced booking waitlist, recurring bookings, attendance and optimization retain Training restrictions; they are not complete in this edition.
- Consumer registration, reviews/moderation/promotions parity; local listings/following are examples.
- Complete mobile/WebKit/Android/physical touch acceptance, full keyboard/screen reader audit, performance/memory benchmarks, and a cross-module design acceptance pass. Current browser evidence is desktop Chromium.
- Some original operational modules retain their native presentation and finite practice behavior. This revision must not be described as the fully finished official platform or a production-ready replacement.

Original PR125, main, production site, OAuth and real data/providers remain excluded. Delete only the experimental branch/project if explicitly instructed to discard it.
