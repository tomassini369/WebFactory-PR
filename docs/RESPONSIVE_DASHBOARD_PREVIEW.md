# Responsive Business Control Center — review preview

The client portal overview adapts the supplied dashboard v8 design to WebFactory's existing React/TypeScript application. The second dashboard provides matte cards, a blue calendar and lime selection accents; translucent details are limited to the existing portal shell. No standalone Smart Home or health backend is introduced.

## Integrated behavior

- Existing authenticated commerce data drives seven-day sales, order and booking trends, loaded-history totals, upcoming bookings and filtered recent activity.
- Sales use paidAt where available, otherwise createdAt, and subtract refunds. Cards explicitly describe the loaded-history scope; they are not an all-time financial ledger.
- The month calendar uses the business time zone, handles leap years and six-week months, marks booked days and lets the user inspect a selected day. Open links to the full existing booking view.
- Quick actions retain the existing membership capability checks and open the current POS, bookings, orders, payments, website, catalog, team and QR panels.
- Business information, plan and Builder remain available in a collapsible section below the overview.
- Existing Training and panel Hide / Scroll / Expand controls remain active. English/Spanish, theme switching and the original WebFactory logo are preserved.
- The dashboard handles loading, failed loads and empty histories separately. Switching businesses resets the calendar and clears old commerce data while the new history loads.

## Preview isolation

Netlify Deploy Previews build `/design-preview/portal/preview.html` from the actual ClientAdminPage component. This separate bundle uses a preview-only portal-auth alias and labeled synthetic data. It never sends requests to real functions and rejects writes. Use Training for editable exercises. Normal `/client-admin/` continues using real authentication and data.

The preview auth alias is declared only in preview.config.ts; production compilation does not use it. The production build removes the design-preview directory. Preview URL parameters `?caps=orders,bookings`, `?state=empty` and `?state=error` support capability/empty/error review.

## Validation

- 5 data tests: leap years/month boundaries, business time zone, confirmed receipt/refund accounting, cancelled/invalid bookings and empty history.
- Existing backend tests preserved; combined suite has 311 tests.
- TypeScript and production/preview builds.
- Chromium visual/behavior smoke: 320×568, 390×844, 430×932, 768×1024, 844×390, 1024×768, 1440×1000, dark/light, English/Spanish; no horizontal overflow, reachable last card and viewport-contained workspace.
- Calendar navigation/day selection, activity filters, Hide/Scroll/Expand/Escape, Training entry/exit, booking navigation, capability-filtered shortcuts, empty/error states and no outgoing backend requests from isolated review.

This is browser viewport emulation, not acceptance on a physical iPhone/Safari. Payment, login/MFA and external integrations are preserved code paths, not newly certified end-to-end flows.

Production publication is intentionally pending the user's review of the preview.
