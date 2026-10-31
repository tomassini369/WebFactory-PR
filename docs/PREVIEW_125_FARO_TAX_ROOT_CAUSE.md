# Preview 125 · Faro Norte IVU root cause and remaining materials

## Report and cause

The owner reported 11.5% enabled in Settings while a $120 cashier cart still showed $0 tax. The prior regression used a synthetic taxable product and missed the actual Faro Norte catalog. `scripts/seed-preview-barber.mjs` had explicitly assigned `taxable:false` to every service and `defaultTaxable:false`. The shared estimate and server calculations correctly honored those exemptions even with global tax enabled.

## Correction

- The gated fictional Faro Norte recipe now enables the owner-requested IVU test baseline at 10.5% state + 1% municipal and inherits taxability from each draft item (`taxable !== false`). This applies only to the existing PR 125 deploy-scoped test seed. Production and existing merchant exemption data are untouched. The existing new-deploy reseed behavior remains unchanged.
- The catalog editor exposes the existing per-item taxable flag and optional rate override. Blank means the business rate; numeric zero remains a deliberate zero rate. New items honor the business's existing default-taxable choice. Saving remains explicit through the current authorized/versioned catalog endpoint.
- Settings explains when enabled tax has exempt or zero-rate catalog items. Global activation does not silently override deliberate item exemptions.
- ChatGPT's existing connection section now uses PortalPanel, so it has the same Glassy panel and expansion controls. Its link, nested Stripe status, customer-display controls and terminal disclosure use the current neutral surface/text/border tokens. Provider handlers, scopes, capabilities and tenant accent colors are preserved.

## Validation

- 811 Node tests and the complete TypeScript/build command pass.
- The new unit regression reproduces the former zero-tax catalog, then uses the exact Faro Norte seed in cashier estimates, kioskView and server calculateTax. Its four walk-in services total $120; existing per-line rounding yields $13.82 tax / $133.82 total. Explicit exemptions still produce zero tax.
- `scripts/browser-faro-tax-smoke.mjs` uses the seed recipe rather than a substitute product: Chromium 320/375/390/430/768/1024/1440, ES/EN, Light/Dark; cashier and paired kiosk totals, catalog taxable/zero/blank controls and persistence, settings explanation, real integration components, responsive containment. No checkout is submitted. Screenshots verify matching totals and neutral ChatGPT/Stripe materials.
- Existing POS and Glassy regressions pass at 390/1440, both languages/themes, including pending/server-confirmation and draft behavior. The deterministic detector retains 21 recommendations.
- The exact-seed browser regression is included in the existing Chromium/WebKit CI step. Local WebKit and physical iPhone acceptance are not claimed. No real tax configuration, payment, email, provider connection or destructive action was performed.
