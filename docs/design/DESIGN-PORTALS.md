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

## Owner-supplied Glassy references · October 8, 2026

This approved reference update supersedes the earlier slate palette and prohibition on purple on authentication surfaces. Use the supplied purple landscape (optimized WebP) with a split desktop welcome area, a frosted pill-input login card, and the same stable mobile loading/login/MFA geometry. Preserve native password types and autofill, password visibility, recovery, remember-email, locale and theme controls. No reference social-login buttons or fake registration flows.

The operating dashboards use the supplied black/gold wave background, softly layered glass cards and gold active sidebar accents. Light mode uses readable white glass over a subdued background. Keep real navigation and data, mobile menus, scrolling, panel tools and tenant brand actions. Do not copy the reference's fake task/chat/calendar/integration records.

Receipt presentation uses a lightweight thermal-printer slot, emerging paper, crease texture, sawtooth edge and monospaced amounts. Display stored receipt items, discounts, taxes, tips, total, status and business timezone. Never synthesize receipt IDs, verified QR/barcodes or recalculate server totals. Existing tenant-scoped PDF and email resend remain functional. No audio, 3D dependency or printer polling.

The cart thumbnail flies in a 700ms transform/opacity arc from the clicked product to the newly opened cart. Cart updates happen immediately; animation cannot defer checkout or quantity changes. Bound decorative actors, cancel them on unmount and skip flight for reduced motion or unavailable images. Shared demo and live storefront behavior also covers Builder previews.

## Unified operating experience · October 14, 2026

The owner approved simplifying the existing dashboards and POS with a modern
blue/navy direction and one complete PR review. This revision supersedes the
black/gold operating-dashboard background above. Authentication keeps its
approved purple landscape and stable loading/login/MFA geometry.

Operating roots use the scoped `wf-experience` layer: calm opaque light/navy
surfaces, readable native type, restrained elevation and no backdrop blur on
opaque navigation or nested operational panels. Existing roles determine every
visible destination. Keep Overview, POS, Bookings, Team and Website editing
as client primary destinations when authorized; group remaining destinations
by Sales, Schedule, Team, Business and Settings. Admin retains its four existing
primary destinations. Search must also find destinations inside disclosures.

Show confirmed revenue and the existing metrics before attendance. Follow-up
counts use only the currently loaded commerce history and label that scope;
do not claim an exhaustive queue or create transactions. Keep chart filters,
empty/error/test-mode states and accessible data details. Panel tools live in
one labeled 44px options disclosure; Hide/Show, internal scrolling and Expand
remain available. Escape first closes an open options menu, then leaves the
expanded panel, preserving focus and the existing dialog trap.

POS canvas, catalog, sidebar and active controls derive from the business's
saved colors and existing contrast helpers in both themes. Invalid saved
colors retain the established safe fallback. Desktop keeps the order beside
the catalog. Narrow layouts reuse the existing sale-summary control as a
safe-area-aware bottom bar that leads to the same order; no duplicate checkout
or payment state is introduced. History and operational tools stay available
in a labeled disclosure. Touch controls remain at least 44px, inputs 16px,
and reduced motion disables operating transitions. Preserve the original
checkout, stock, retry, receipt and server-confirmation handlers.

## Interactive training · October 16, 2026

Training reuses the current operational screens with isolated sample state.
Use a bounded, persistent guide above the workspace, native collapsible
instructions, explicit Pause/Exit and a restrained nonmodal target indication.
Keep a complete role-aware learning path and optional activity selection.
Preserve real POS drafts while practice is open; never show real transactions,
credentials or payroll in an exercise. Practice and reference guides must be
distinguishable. Use the existing native typography and blue/navy help chrome;
the practice POS retains the business colors. No mandatory first-run tour,
decorative scenes, long modal sequence, keyboard trap or continuous animation.


## Owner-supplied Glassy Dashboard v5 · October 27, 2026

The owner explicitly replaces the operating portal appearance with the supplied
Glassy Dashboard v5 reference, without mixing the retired portal styles.
This revision supersedes the earlier operating-shell/sidebar direction. It does
not change authentication surfaces, public storefronts, Marketplace, Builder,
kiosk skins, or customer display layouts.

Use the supplied room wallpaper, smoked translucent panels, floating icon dock,
pill navigation, reference profile/board/calendar composition and materialize
transitions. Retain the official WebFactory logo and ES/EN + Light/Dark controls.
Each destination renders current real data and existing permission-filtered
workflows; never copy the reference's demo projects, invoices, email, calls or
messages into the product. Preserve panel expand/collapse/focus controls.

Operating roots are `gd-client-dashboard` / `gd-admin-dashboard`; old
`ca-dashboard`, `wfa-dashboard` and `wf-experience` classes are absent. Shared
material tokens are scoped to `gd-root`. Existing operational components keep
their data/handler contracts and adopt the new presentation. POS retains its
validated tenant accents and uses the dashboard's neutral readable material.
No global document zoom or global design token mutation.

Personal appearance belongs to the authenticated user and portal. The gallery,
upload and material controls live within the existing portal navigation.
Use local images, bounded raster uploads, server reencoding, private no-store
responses and conditional saves. Respect reduced motion and transparency,
forced colors, readable text and 44px controls. The compact phone navigation
reflows without hiding destinations; the native dialog exposes all modules.

See `GLASSY-DASHBOARD-V5.md` for provenance, security, verification and limits.


### Owner correction: save actions and isolated card expansion

The mobile dock has its own reserved viewport row. It must never cover or
intercept form actions. Only a successful server acknowledgement resets the
appearance draft baseline; failures retain the leave warning.

The owner removes Hide/Show and Scroll from portal cards. One directly labeled
expand/close control remains. Expanded mode hides and makes inert all unrelated
workspace content while retaining the wallpaper and selected card. It restores
visibility, focus and card state on Close/Escape and on unmount. Do not remount
or clone the selected card or mix neighboring cards through its glass surface.


### Owner-approved sales surfaces revision — 2026-10-27

Cashier POS and all kiosk layouts inherit the Glassy material. Their existing editors expose flat, soft and raised 3D treatments with independent card/button depth. Cashier appearance is personal to the signed-in user/business; kiosk appearance is shared by that business's paired screens. Do not share private dashboard images with anonymous customer devices. Safe tenant colors and existing sale/booking/device behavior are preserved. The portal dock occupies a layout track separate from scrollable form content; it must never overlay Apply and save. See GLASSY-DASHBOARD-V5.md for provenance and validation.

### Owner login recording · October 28, 2026

The owner's 14:26 recording is the current commercial login appearance reference.
Retain the frosted card, inset pill email/password surfaces (including the inner
password capsule), locale/theme/home controls and blue pill submit action. Keep
stable loading/form geometry. The three bars beside Checking… / Verificando…
animate only while an authentication request is pending; this is distinct from
the decorative hover shine. Reduced motion retains the readable status and
static bars. Validate using intercepted fixture requests, never real credentials.

### Personal portal profile · October 29, 2026

The owner approves a single My profile destination for personal details/photo,
preferences, existing account security and read-only membership. The overview
avatar opens it; the module menu provides access in both portals. Keep business identity, logo, public contact,
integrations, team grants, subscriptions and POS/kiosk editors in their existing
business modules. Remove duplicate personal editors; Customize remains a shortcut
to the same Preferences view. Header language/theme controls share saved user
preferences; sound/haptics remain honest device settings. Preserve current
wallpapers and account security handlers. Photos are private, optimized raster
images scoped to the authenticated user, never public tenant assets. No Vaso.

### Owner-approved avatar framing correction

Remove the duplicate header account photo. Retain the overview circle at its
existing 80 px desktop / 64 px mobile size; constrain and clip its frame to a
true circle. Profile photo upload uses a temporary circular preview with drag,
horizontal/vertical position, zoom, reset and explicit save/cancel. Match the
saved pixels to that preview. No rotation, filters or additional image engine.

### Owner-approved kiosk touch keyboard

The kiosk may opt into a desktop touch keyboard through its existing settings.
Keep native phone/tablet and date/select controls, physical typing, tenant
backgrounds and the existing checkout/booking handlers. Use a temporary bottom
panel with 44 px keys and a visible active input. Match letters/email, phone,
hexadecimal booking ID and numeric private PIN to the real fields. Never echo
PINs or auto-submit from Next. No new animation or keyboard service dependency.
