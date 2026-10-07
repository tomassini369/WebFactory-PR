# Template and Builder design direction

## 1. Purpose
Extend the Home's clear, restrained visual language to template selection and editing. Preserve the identity and functions of each storefront.

## 2. Typography
Use the platform sans serif in the library, balanced headings, readable descriptions and a consistent hierarchy. Preserve existing luxury storefront serif treatments. Mobile headings use a controlled clamp and wrap long business names.

## 3. Color
Use neutral platform surfaces and one blue action color. Support the existing light and dark themes. Storefront accent, background and button ink remain driven by each template or saved business configuration.

## 4. Layout
Desktop selection has a compact category rail and a two-column card grid. Below 768px both become a single column. Shared storefront sections stack on phones; headers separate branding/menu from language and business actions.

## 5. Components
Keep category filtering, localized descriptions, demo and Builder links. Controls have at least 44px touch targets and visible keyboard focus. Device buttons expose their selected state. Template demo creation links preserve the selected slug.

## 6. Motion
Use subtle border feedback without moving cards or adding decorative effects. Respect reduced motion. Preserve the existing Home video and interactive scroll, which are outside this change.

## 7. Implementation and validation
TemplateLayout remains the single renderer for demo, Builder iframe and live storefront. StorefrontPreview measures its container before paint and keeps isolated device dimensions. Default Builder device follows the initial screen width; manual switching remains available. Verify layout and data/feature gates across all templates, plus browser checks for narrow screens, localization, template selection and preview sizing. Use a separate branch and Netlify preview for review; do not publish production.

## Storefront visual upgrade
The actual template pages now use a split hero with a separate image, clear brand typography, a real catalog preview, aligned team cards and a calmer image composition in the business story. Modern, luxury, minimal and bold preserve their own color and type treatments. All markup and styles live in TemplateLayout, shared by demo and Builder/live. Catalog highlights use only each renderer's existing catalog data, open the existing catalog and never add sample items to a business. Browser checks compare computed hero and catalog styles between the demo and Builder at identical viewport widths.

## Precise tokens and composition
Canvas: template cream (fallback #F3F6FB); elevated surface #FFFFFF; ink #12202B; secondary ink #52606E. One action accent comes from the saved business secondary color. Primary backgrounds retain the saved business primary color; text ink is chosen by luminance. Never replace client brand colors to satisfy a generic palette.

Desktop hero uses a 1.05fr/0.95fr split with clean separation of photography and copy. Catalog uses a 1.15fr/1fr editorial grid and a featured first item. Below 768px all new grids collapse to one column. Section spacing is 88px on desktop and 56px on phones. Buttons retain 44px minimum targets and focus-visible outlines. Body copy is 1rem with 1.75 leading; headlines use clamp and balanced wrapping. Preserve the approved existing font identities without adding font downloads.

Motion uses brief transform/opacity feedback only, disabled for reduced motion. Avoid perpetual decorative animation, fabricated metrics, neon glows, overlapping text/images and decorative scroll prompts. Keep all catalog, cart and booking handlers and feature gates; featured items are read from the current business catalog. An empty catalog adds no sample items. Browser QA must compare demo and Builder at equal iframe widths, open the catalog, add a product when applicable and open a booking when applicable. Check custom primary color contrast and feature-off states through the shared renderer.

## Functional profiles
New, uncustomized Builder drafts derive product/service, cart, booking and calendar defaults from the selected template. Existing catalog, team and customized feature choices remain intact. Selecting a staff booking passes the employee ID through the shared layout into the existing booking handler. Ineligible staff actions are disabled. Demos show their own declared capabilities rather than universal integration marketing. Contact forms in demos are explicitly simulated and never send messages; client forms retain the existing real transport. Do not advertise group slot capacity, recurring appointment automation or memberships: the current booking engine enforces individual staff availability. Classes and workshops use ordinary appointments until group capacity is implemented end to end.

## Simplified actions and location
Keep one primary booking button and one catalog button in the hero. Featured items remain informational; remove repeated catalog gateways, numbered capability tiles and the booking/commerce promotional panel. Staff availability remains a contextual action tied to that professional. Opening a cart from the catalog hides the catalog without unmounting it, so closing the cart restores the same scroll position and retains its contents. Contact includes a sample map in demos and the configured Google Maps location/address in Builder and live storefronts; maps stay hidden when disabled or no location is configured.

## Approved glass and interaction revision
The client approved a full-width photographic hero with white copy over a charcoal gradient (#090F16 at 58–88% opacity). This supersedes the split hero and the earlier prohibition on text over background photography. The photo remains driven by saved hero media. The metadata row sits below the copy on its own grid row: saved primary color at 82% opacity, 16px backdrop blur and contrasting saved ink. Text must never collide with controls or overflow.

Show at most three existing catalog highlights in a glass card carousel: white surface at 70% opacity, 12px blur, 20px corners, 20px gaps, 4:3 crisp photography, ink #12202B and secondary ink #52606E. Desktop cards use clamp(260px, 35vw, 480px); mobile cards use min(78vw, 340px), deliberately exposing the next card. Viewport units avoid percentage sizing cycles in implicit grid tracks. This approved carousel is an exception to the single-column rule and must scroll only inside its rail, never the document. Use native touch scrolling, scroll snap, labeled 44px arrow buttons, keyboard navigation, focus outlines, and disabled end arrows. Keep the independent five image slots in the story/gallery and the full catalog behind the unique hero button.

Press feedback uses a brief inset accent highlight and scale .98. Active choices preserve their existing selection state. Overlay panels use 200ms opacity/translate transitions, retain content briefly on exit with inert stale controls, and preserve the mounted catalog and its scroll position. Menus use a 160ms fade/translate. Reduced motion disables animation and removes exit delay. No perpetual motion, new font downloads or neon glow. Brand colors and existing functions take priority over generic style constraints.

Demos have no contact form. Only newly initialized Builder drafts default features.form to false. Existing drafts and customer configurations keep their explicit choices; the dashboard's existing form toggle and contact transport remain unchanged. Dashboard catalog, pricing, employee, hours and business edits continue to feed the same renderer. No new dashboard editing mode is introduced.
