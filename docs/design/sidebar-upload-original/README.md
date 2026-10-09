# Uploaded sidebar integration

`Sidebar.jsx` and `Sidebar.css` are unchanged copies from the user's `sidebar ui .zip`.

`src/UploadedSidebar.tsx` is a source-derived React/TypeScript adapter. It retains the ten original SVG icon fragments, glass decoration, brand/profile transitions, search reveal, 74/240 px widths, divider widths, 380/32/.8 expansion spring and 420/24 dock spring. Dock magnification remains 1.25 / 1.12 / 1.04.

Approved integration changes: actual WebFactory branding, account identity (initials instead of the demo avatar), capability-filtered portal menus, active route, real navigation/logout callbacks and section search. Fake notification counts and movie content are not imported. Language, theme, feedback preferences and business switching remain available in a separate toolbar even when collapsed. Existing unsaved-draft confirmation and session tab persistence are retained.

`src/uploaded-sidebar.css` preserves source declarations, scopes selectors to `.wf-sidebar-frame`, and changes red/neutral palette values to platform blue/navy. `src/uploaded-sidebar-integration.css` handles viewport layout, long-menu scrolling, mobile overlay, readable dark backing, real profile truncation, keyboard focus and relocated original-style tooltips (otherwise clipped by scrolling). The archive's demo background and global reset are deliberately not imported.

No auth endpoints, commerce data, payment processing, chart calculations, permissions or dependencies change. Reduced-motion users do not receive dock magnification; Escape collapses the menu. Production is unchanged; this work targets the existing draft preview branch.

Follow-up destination repair: the existing `LocationEditor` is now mounted for the `locations` tab and saves the selected site's business locations through the existing business endpoint, preserving its other fields. The `redesign` tab now presents the existing site-specific Builder entry and the same active-plan gate as Overview; it does not introduce another redesign engine or bypass subscription checks. No sidebar visuals change.

`scripts/browser-portal-menu-destinations-smoke.mjs` exercises eight viewport/theme/language combinations with isolated writes: location form, unsaved-draft cancellation, save payload/feedback, selected-tab state, actual Builder navigation and inactive-plan gating. It is included in CI.

The earlier remote CI run exposed obsolete `.template-catalog-preview` selectors in the browser template workspace test after restoration of the original carousel. Those assertions now target `.template-highlights`, retain item-count and demo/Builder style parity checks, and pass all 36 local library and demo/Builder cases. The application carousel code is unchanged by this test repair.

The glass browser smoke now checks the actual `.template-spatial-stage` region and original `.glass-card-inner` corners, rather than the removed outer card. All 16 composition cases and all 16 Chromium spatial-carousel cases pass locally. The functional test checks that highlights do not duplicate purchase/booking controls and captures catalog scroll position at the actual activation event, after Playwright's automatic button visibility adjustment. WebKit and the complete remote CI suite remain subject to CI verification.

QA uses isolated accounts and stubbed requests, never real credentials or business mutations. The workspace smoke checks both dashboards, five screen sizes (including short landscape), two themes, languages, 74/240 widths, search, original blur/nav height, draft cancellation/acceptance, section persistence, magnification/tooltips and logout failure/success. Original receipt/cart regression smoke is retained.
