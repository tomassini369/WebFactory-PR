# Design System: WebFactory PR / Factory AI

## 1. Visual Theme & Atmosphere
Evolve the approved interface instead of rebuilding it. Balanced software density (5), controlled asymmetry (5), restrained interactive motion (4). Preserve the original hero video behind its copy and the native scroll-driven tour. Never overlay another dashboard on the hero. Client template designs and all business behavior remain intact.

## 2. Color Palette & Roles
- Deep Navy (#070D1A): dark canvas, retaining the WebFactory identity.
- Raised Navy (#0E1829): dark functional surfaces.
- Soft White (#F6F9FE): light canvas; White (#FFFFFF): raised light surface.
- Pale Ink (#EEF4FF) and Navy Ink (#0F1F36): theme-specific primary text.
- Steel (#9FB1CA) and Slate (#52647C): theme-specific secondary text.
- Calibrated Blue (#78A7E4 dark, #285FA6 light): one brand accent, adapted for contrast; flat CTA fill #285FA6 with white text.
- Borders (#22324A dark, #D9E3F0 light): structural separation. Avoid neon glows. Status colors remain reserved for functional success and error feedback.

## 3. Typography Rules
Use the existing native sans-serif stack to avoid additional font downloads. This continuity and performance choice overrides the skill's new-font preference. Headings use controlled clamp scales, 1.08–1.2 line-height and tight tracking; body uses 1rem with 1.65–1.7 line-height and a maximum 65ch. No serif software interface typography. Tabular figures for accounting. Preserve branded client template typography.

## 4. Component Stylings
Buttons: minimum 44px touch targets, 48px primary actions, flat accent, visible keyboard focus, restrained active feedback. Cards: 14–18px corners, elevation only where hierarchy requires it. Forms: labels above fields, inline errors, legible 16px input text. Loading and empty states must describe actual system state; never invent metrics, clients or transactions.

## 5. Layout Principles
Grid-first, minmax(0,1fr) containment, maximum 1240px public content. Below 768px use one content column. At narrow phone widths place language and theme controls on a second navigation row rather than shrinking touch targets. Keep hero copy left-aligned, with one primary action and the existing template navigation. No extra hero imagery or inline photos over the approved video. Remove desktop minimum heights from every mobile tour step. Native page scrolling remains unblocked.

## 6. Motion & Interaction
Keep the existing scroll tour and passive requestAnimationFrame scheduling. Select its active step by proximity to the viewport midpoint. Use only transform and opacity for visual motion, with the existing cubic-bezier(.22,.8,.24,1). Avoid continuous loops that consume mobile power. Respect reduced motion, reduced transparency, Save-Data, autoplay refusal and video pause off-screen. These accessibility and user-approved behaviors override decorative animation recommendations.

## 7. Anti-Patterns (Banned)
No dashboard covering the hero video; no replacement of operational architecture; no neon glows or oversized gradient headlines; no equal three-column feature rows; no decorative fake numbers; no overlapping controls; no horizontal page overflow; no tiny touch targets; no changes to tenant isolation, payments, booking rules, auth or API contracts for visual reasons.

## Validation
Verify 320/375/390/430px mobile and 768/1024/1440px desktop/tablet; ES/EN, Light/Dark, menu, FAQ, demo tabs/cart/booking simulation, tour state, keyboard focus and reduced motion. Check Builder, Templates and both portal login layouts for regressions. Deploy only to a PR preview until the owner explicitly authorizes production.
