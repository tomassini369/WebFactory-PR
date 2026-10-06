# Design System: WebFactory PR — Factory AI

> Status: design-system source of truth for Stitch-oriented UI work.
> Baseline reviewed: `main` at `b1b7c347d43befe909ae6feb8ce0c06814d1a49e` on 2026-10-06.
> Scope: marketing homepage, Business Control Center, Builder, Client Admin, WebFactory Admin, authentication and platform-owned public utility screens.
> Safety: this document governs presentation only. It must not change tenant isolation, auth/OAuth, MCP permissions, billing, bookings, payment logic, data models, APIs, or client storefront brand palettes.

## 1. Visual Theme & Atmosphere

WebFactory PR should feel like a premium operational product built for real businesses: calm, exact, capable and modern without looking like a generic AI landing page.

- Density: **5/10 — Daily App Balanced**
- Variance: **6/10 — Offset Asymmetric**
- Motion: **5/10 — Fluid, restrained and purposeful**
- Primary mood: dark editorial software, confident whitespace, precise borders, crisp operational data.
- Avoid decorative complexity that competes with the business workflow.
- Preserve the existing split/asymmetric homepage hero and the approved hero video-behind-copy composition.
- Dashboards should feel more like an instrument panel than a marketing card wall.
- Marketing surfaces may be expressive; operational surfaces must remain calm and scannable.

### Product hierarchy

1. **Marketing website** — expressive, asymmetric, editorial SaaS presentation.
2. **Business Control Center** — operational clarity, dense enough for daily work.
3. **Builder** — guided creation with strong progress and preview hierarchy.
4. **Admin** — highest information density, conservative motion, explicit system state.
5. **Client storefronts/templates** — keep each client/template palette independent from the WebFactory platform theme.

## 2. Color Palette & Roles

Use one brand accent family. Semantic success, warning and error colors are functional states, not additional brand accents.

### Dark platform palette

- **Midnight Canvas** (`#0A0D12`) — main platform background.
- **Deep Surface** (`#111720`) — navigation, cards and primary panels.
- **Raised Surface** (`#18212C`) — selected/raised controls, nested panels.
- **Charcoal Ink** (`#F5F7FA`) — primary text on dark surfaces.
- **Muted Steel** (`#9AA6B5`) — secondary text, captions and metadata.
- **Structural Line** (`#263241`) — dividers and borders.
- **Factory Blue** (`#4E88D8`) — the single brand accent: primary CTA, active state, focus ring, selected navigation.
- **Factory Blue Pressed** (`#356FBF`) — pressed/strong interaction state.

### Light platform palette

- **Cloud Canvas** (`#F6F8FB`) — main background.
- **Pure Surface** (`#FFFFFF`) — panels and forms.
- **Soft Surface** (`#EEF2F7`) — nested/selected surfaces.
- **Navy Ink** (`#152033`) — primary text.
- **Slate Copy** (`#5F6E82`) — secondary text.
- **Structural Light Line** (`#D9E0E9`) — dividers and borders.
- **Factory Blue** (`#356FBF`) — primary CTA, active state and focus ring.

### Semantic states

- Success: `#4EA98F` on dark, `#237A66` on light.
- Warning: `#D1A14C` on dark, `#946B1E` on light.
- Error: `#D26B78` on dark, `#B83E50` on light.

Semantic state colors must never become decorative gradients, ambient glows or general accents.

### Color rules

- Never use pure black (`#000000`) for platform surfaces.
- No purple/blue neon glow treatment.
- No multi-accent rainbow UI.
- No large gradient text blocks.
- Brand blue may appear as a subtle tint in shadows or focus states, not as outer neon.
- Hero video may retain its own imagery; use a dark neutral scrim to protect contrast.

## 3. Typography Rules

### Platform typography

- **Display / headings:** `Geist`, then `Avenir Next`, then `ui-sans-serif`, system fallback.
- **Body / controls:** `Geist`, then `Avenir Next`, then `ui-sans-serif`, system fallback.
- **Data / IDs / timestamps / dense metrics:** `Geist Mono`, then `SFMono-Regular`, `ui-monospace`, monospace.

### Hierarchy

- Hero headline: `clamp(2.75rem, 5vw, 4.5rem)`, line-height 0.98–1.05, tracking -0.04em.
- Section title: `clamp(2rem, 3.4vw, 3rem)`, line-height 1.08–1.15, tracking -0.03em.
- Panel title: 1.125rem–1.375rem, weight 600.
- Body: 1rem minimum, relaxed 1.6–1.75 line-height.
- Metadata: 0.75rem–0.875rem, never lighter than accessible contrast.
- Body copy max-width: 65ch.

### Typography bans

- Do not introduce `Inter` in new premium WebFactory UI.
- No generic serif fonts in software/dashboard surfaces.
- No oversized headline purely for spectacle.
- Numbers in high-density operational tables should use the mono stack.

## 4. Component Stylings

### Buttons

- Primary: solid Factory Blue, white text, 10–12px radius.
- No gradient fill on primary buttons.
- No outer glow.
- Hover: slightly lighter border/tint and `translateY(-1px)`.
- Active: `translateY(1px)` with reduced shadow.
- Minimum touch target: 44×44px.
- Destructive actions must never share the primary blue treatment.

### Cards and panels

- Use elevation only when it communicates hierarchy.
- Default dashboard structure: border + spacing before shadow.
- Marketing panel radius: 18–24px.
- Operational panel radius: 14–18px.
- Shadows must be restrained and tinted toward the canvas hue.
- Avoid three identical promotional cards in one row.
- Dense lists should prefer dividers/rows over stacked cards.

### Inputs and forms

- Label above field.
- Helper text below label or field.
- Inline error below the field.
- 44px minimum height for touch controls.
- No floating labels.
- Focus ring uses Factory Blue with sufficient contrast.
- Placeholder text must remain legible in both themes.

### Navigation

- Current location must be explicit by color + surface/border, never color alone.
- Desktop: horizontal marketing navigation; side/rail navigation for operational portals.
- Mobile: one clean menu layer; avoid duplicated theme/language controls.
- Theme and EN/ES controls must remain synchronized with the existing platform state.

### Tables

- Keep column hierarchy strong with alignment, whitespace and mono numerals.
- Avoid unnecessary container cards around tables.
- Sticky headers allowed when useful.
- Status pills must use semantic colors only.

### Loading / empty / error

- Loading: layout-matched skeletons, not generic circular spinners.
- Empty state: explain the next useful action.
- Error state: clear inline message, recovery action when possible.
- Never hide failures behind silent UI.

## 5. Homepage Rules

The existing hero video-behind-copy structure is an approved WebFactory-specific exception to generic Stitch hero recipes and must be preserved unless explicitly changed by the owner.

- Hero remains asymmetric/split in composition.
- Maximum one dominant CTA per visual cluster.
- Secondary navigation/action may be text or restrained outline.
- Hide generic scroll arrows/cues in new designs.
- Avoid decorative AI sparkles, glowing orbs and purple gradients.
- Use the hero video as the main visual punctuation instead of adding unrelated stock imagery.
- Keep the Business Control Center visualization grounded in actual product capabilities.
- Pricing, FAQ and MCP/ChatGPT setup content must inherit the same system.
- Do not create fictional product statistics or fake social proof.

## 6. Business Control Center Rules

- Prioritize today's work: sales, bookings, payments, customers, employees and quick actions.
- Use asymmetric composition only where it improves hierarchy; do not sacrifice scan speed.
- Financial and operational metrics must be easy to compare.
- Quick actions should be recognizable without relying on decorative icons.
- Training Mode must be visually distinct from live operation.
- Demo/training data must always be labeled as sample/demo.
- Light/Dark must preserve readable text on every nested surface.

## 7. Builder Rules

Existing flow remains:
`NEGOCIO → DISEÑO → FUNCIONES → CATÁLOGO → EQUIPO → HORARIOS → PREVIEW`.

- Keep the step sequence and underlying architecture unchanged.
- Step progress should be visible at all times on desktop and recoverable on mobile.
- Editing controls belong to the platform theme.
- Client website preview belongs to the client's/template's own palette.
- Never let platform Light/Dark overwrite the customer preview colors.
- Template selection should emphasize visual differences, not equal repetitive cards.
- Preview must remain available before payment/publication.
- Factory AI suggestions should appear as proposals, not irreversible actions.

## 8. Admin Rules

- Highest density of the product family.
- Sans-serif only.
- Mono for IDs, timestamps, technical state and numeric tables.
- Motion limited to state transitions and feedback.
- Security/access/billing actions require explicit visual separation from ordinary actions.
- Destructive controls must never sit adjacent to primary creation actions without spacing/grouping.
- Never expose secrets, tokens or credentials in UI states or examples.

## 9. Layout Principles

- CSS Grid first for primary page structure.
- Max-width containment: 1240–1400px depending on surface.
- No absolute-position stacking for essential content.
- No overlapping text and images.
- Marketing sections may alternate 5/7 and 7/5 column weight.
- Avoid repeated equal 3-column feature rows.
- Use negative space and border rhythm to establish hierarchy.
- Full-height experiences use `min-height: 100dvh`, never `100vh` as the only mobile height rule.

## 10. Responsive Rules

### Under 768px

- Multi-column content collapses to one column unless it is a compact control group.
- No horizontal page scroll.
- Interactive targets minimum 44px.
- Header controls must not duplicate.
- Text must not be obscured by fixed theme/language buttons.
- Hero content remains readable over the video with a stronger mobile scrim.
- Builder and portals favor task sequence over side-by-side comparison.

### 768–1100px

- Use 2-column only when content remains legible.
- Navigation may collapse before content becomes cramped.
- Tables may use controlled horizontal scrolling inside their own region only.

## 11. Motion & Interaction

- Default timing: 180–320ms for direct UI feedback.
- Marketing reveal: 500–800ms maximum.
- Default spring reference: stiffness 100, damping 20.
- Animate only `transform` and `opacity` for continuous/reveal motion.
- Do not animate layout dimensions during routine interactions.
- List entrances may use subtle stagger, 40–80ms between items.
- No perpetual animation on every component; reserve looping motion for genuinely active system states.
- Respect `prefers-reduced-motion` everywhere.
- Haptic/sound settings, where supported by the existing product, must remain user-controllable.

## 12. Accessibility

- WCAG-conscious contrast in both themes.
- Visible keyboard focus.
- Semantic headings.
- Form labels connected to inputs.
- No information conveyed by color alone.
- Icons require accessible labels when the meaning is not already present in text.
- Touch targets minimum 44px.
- Preserve browser zoom; do not disable user scaling.
- Reduced-motion mode must remove nonessential transforms/animations.

## 13. Platform Boundaries

These design rules must not modify or bypass:

- Tenant isolation or authorization.
- OAuth / PKCE / MCP permissions and confirmation rules.
- Client membership or role checks.
- Payment routing, Stripe Connect or ATH Móvil ownership.
- Booking availability/conflict logic.
- Email transport isolation.
- Database schema or business data.
- Customer storefront palettes/templates unless the user explicitly edits that business design.
- Production deployment without explicit authorization.

## 14. Anti-Patterns — NEVER DO

- No pure black platform canvas.
- No purple/neon AI aesthetic.
- No decorative outer glow buttons.
- No generic three-equal-card marketing rows.
- No overlapping text/images.
- No custom mouse cursors.
- No emojis as product UI icons.
- No generic placeholder names such as “John Doe” or “Acme”.
- No fake round-number metrics or fabricated testimonials.
- No filler UI such as “Scroll to explore”, bouncing arrows or chevrons.
- No “Elevate”, “Unleash”, “Next-Gen” or similar generic AI marketing copy.
- No duplicate Light/Dark or EN/ES controls on mobile.
- No card-on-card-on-card nesting unless hierarchy truly requires it.
- No global theme rule that recolors client storefront/template previews.
- No visual redesign that removes an existing WebFactory capability.

## 15. Implementation Sequence

When applying this system to WebFactory PR:

1. Prototype in the isolated design preview.
2. Compare dark/light and desktop/mobile.
3. Validate homepage, Builder and portal contrast.
4. Run tests and production build.
5. Review deploy preview.
6. Only after owner approval, port approved tokens/components into shared production styles.
7. Publish to `main` only when explicitly authorized.


## 16. StitchDesign V2 Screen Composition

This composition is the approved **preview direction** for evaluating a visibly stronger redesign before any production adoption.

### Homepage V2

### Owner-preserved interaction constraints

- The homepage scroll-driven interactive tour is a defining WebFactory behavior and must be preserved in redesigns.
- Scroll position continues to drive the active product step, visual build-up and progress rail.
- On desktop, the Control Center visualization belongs in the sticky scroll-tour stage below the hero.
- On mobile, the existing inline per-step visualization remains the fallback.
- The hero video must remain visible and unobstructed by dashboard mockups or floating operational cards.


- Navigation floats inside a constrained translucent rail instead of blending into the page edge.
- Hero remains video-backed by owner preference and must stay visually unobstructed: editorial copy is confined to the left visual zone while the video owns the remaining canvas. Do not place dashboards, cards or command surfaces over the hero video.
- Operational/dashboard storytelling begins below the hero inside the existing scroll-driven product tour, with explicitly labeled sample data.
- Product modules use an irregular 2-row CSS Grid rather than equal feature cards.
- The setup-to-operation story is rendered as a vertical numbered operating sequence, not a generic 3-card row.
- Customer-side storefront and business-side operations are shown as two distinct spatial zones with no overlap.
- Pricing is one focused plan surface with one primary action.
- FAQ uses divider-based disclosure rows instead of cards.

### Business Control Center V2

- Use a narrow operational rail with clear active state and a sticky top bar.
- The overview begins with one dominant revenue KPI plus three subordinate operational KPIs.
- Daily bookings use a timeline treatment so time order is visually primary.
- Quick actions are a compact 2×2 task block rather than a promotional card grid.
- Sales pulse, active work queue and team load occupy unequal dashboard regions to create hierarchy.
- Training Mode is visibly distinct from live operation.
- On mobile, the left rail becomes a bottom task navigation so the working surface remains single-column and thumb reachable.

### V2 Motion

- Live system indicators may pulse continuously.
- Charts animate from their baseline on mount using transform only.
- Operating sequence rows reveal with subtle stagger.
- Ordinary cards remain still; no decorative perpetual floating or neon effects.

### V2 Reversibility

- The V2 components remain inside the isolated `preview/` bundle until explicitly approved.
- Production components, routes and business logic must not import V2 preview components.
- Rejection of this direction is handled by discarding/reverting the preview branch or PR; no production rollback should be necessary.
