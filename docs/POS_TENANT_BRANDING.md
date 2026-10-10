# POS tenant backgrounds

The cashier POS uses the existing business `design.primary` for its screen canvas, sidebar, catalog and order surfaces. `design.secondary` remains the action accent through the existing contrast-safe `posBrandPair`. Nothing writes back to the business design or changes checkout data.

Light mode blends the primary color with white; dark mode blends it with dark operational surfaces. Text remains readable instead of placing text directly over unrestricted brand colors. Input boundaries meet 3:1 contrast and body/secondary text meet 4.5:1 in the browser palette checks. Solid backgrounds replace the global portal wallpaper only while POS is open. Other portal modules retain their approved visual identity.

Primary colors are restricted to six-digit hexadecimal values, matching the existing business color controls. Missing or invalid values fall back to WebFactory navy. No images, gradients, extra dependencies or background animation are introduced.

## Verification

`browser-pos-v2-smoke.mjs` exercises seven different primary colors across the existing seven resolutions, ES/EN and Light/Dark. It measures rendered text and input-boundary contrast, verifies that backgrounds actually differ between tenants, checks invalid-color fallback and retains checkout, permissions, retry and mobile navigation regression checks. All API responses and transactions are isolated fixtures; no customer data or real payments are used.

The same script supports `QA_ORIGIN` for preview or production assets, with all function requests intercepted. `QA_BUILT=1` uses the existing build without rebuilding during browser QA.
