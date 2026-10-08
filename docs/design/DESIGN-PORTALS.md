# Design System: WebFactory PR portals

## 1. Visual Theme & Atmosphere
Glass extends the approved templates into the authentication and operating workspaces. Density 6, variance 3, motion 3: restrained software UI with clear labels and uninterrupted work. Preserve existing navigation, tenant identity, brand accents and every operational control. No decorative hero inside a login form. Apple-inspired depth comes from a clear edge, translucent fill and layered shadow, without changing WebFactory branding.

## 2. Color Palette & Roles
- Slate canvas (#EDF2F7 light / #0D1522 dark): calm workspace backdrop.
- Glass surface (rgba(255,255,255,.88) / rgba(23,35,52,.9)): elevated login and panel surfaces.
- Solid input (#FFFFFF / #132033): readable form background.
- Ink (#17263B / #F2F6FC): primary text.
- Secondary ink (#52647A / #B8C6D9): descriptive text.
- Blue accent (#2867B2): focus, active navigation and actions. Existing tenant brand buttons retain their configured colors and calculated contrast.
- Structural border (#C2CEDC / #41536C): edges and field boundaries.
- Semantic success/error colors are preserved; they never function as decoration.

## 3. Typography Rules
Use an available local sans-serif stack: ui-sans-serif, system-ui, sans-serif. Do not introduce external font downloads. Labels 14px, fields 16px minimum, headings clamp(26px, 3vw, 40px). Tabular numerals for metrics. No serif, neon, massive headings or gradient text.

## 4. Component Stylings
Glass cards use 24px corners, fine borders and a restrained slate shadow. Apply blur to a small number of surfaces, never each nested row. Forms and tables remain solid enough to read. Return home is a real type=button control, 44px minimum, navigates to /. The same ES/EN component serves client and administrative login, recovery, invitation and empty-account states. Preserve password visibility, recovery, remember-email, theme and locale controls. Focus-visible is explicit. Retain the existing accessible panel expand/collapse controls and focus trapping.

## 5. Layout Principles
Desktop sidebar remains stable with grouped navigation. Mobile preserves the existing expandable menus and floating glass authentication card inside the full-screen shell; avoid a large identity area above the work. Keep safe-area padding and a stable 100svh authentication shell. Loading, login and MFA share the same mobile card geometry. Only keyboard-sized visual viewport changes resize that shell; keep the logo, heading, spacing and controls intact and permit inner scrolling instead of compacting/hiding content. Single-column form and workspace grids below 768px. Data tables scroll inside their own container. Never hide operational controls to simplify the appearance.

## 6. Motion & Interaction
History navigation preserves the current page until the next route is ready, with real URLs and modified-link behavior. Desktop card entry uses restrained opacity only; mobile authentication does not animate its geometry or restart an entrance on each loading/MFA handoff. Use 150ms button transitions and tactile 1px presses only on buttons. No perpetual animation on operating dashboards: users need to read and act on data. Reduced-motion disables transitions. Reduced-transparency and unsupported backdrop-filter use opaque fallback surfaces; forced-colors keeps system focus and borders.

## 7. Anti-Patterns
No neon glows, purple gradients, invented metrics, replacement logos, floating form labels, new icon libraries, external fonts, overlapping controls or auth/data changes. Avoid hiding recovery or duplicating language/theme controls. No changes to homepage, Builder, storefront, OAuth, MFA, role checks or tenant isolation.
