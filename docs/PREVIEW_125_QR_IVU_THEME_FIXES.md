# Preview 125 · QR, IVU and inherited portal colors

Scope: existing `feat/kiosk-skin-engine` / PR 125 only. No production merge.

## Changes

- Nested customer, inventory, analytics, marketing and danger-action cards now use the current Glassy surface, text and border tokens. Account security and business sharing panels also adopt that material. Locale controls no longer inherit the retired navy theme. The QR itself keeps an opaque white background and dark business name for readability.
- Business QR generation uses the existing local `qrcode` and `sharp` dependencies instead of the remote QuickChart POST. Existing authentication, membership/platform checks, tenant asset prefix validation and private/no-store headers remain. The target matches the request origin and stored business slug, so preview QR and copied link agree. Optional missing/damaged logos do not prevent generation. The component exposes a retry action.
- Selecting Exempt disables collection while retaining the configured rates. Re-enabling Calculate IVU restores 10.5% + 1% only when both saved rates are zero, including the zero-rate state produced by the old Exempt action. A nonzero configured rate, including 4%, survives disable/re-enable. Saving remains explicit; no tenant settings are modified by this code update. Explicit item exemptions, overrides and included-tax rules are preserved.

## Validation

- `npm test`: 810 passed, including exact QR-module/quiet-zone checks, valid/damaged logo rendering and authenticated/private response coverage.
- `npm run build`: passed, including TypeScript.
- `browser-glassy-regressions-smoke.mjs`: Chromium 320/375/390/430/768/1024/1440, ES/EN, Light/Dark; zero-rate enable/save, 4% retention, cashier estimates, visible QR, nested customer/analytics material, danger action labels/contrast, and no horizontal page overflow.
- Existing cashier and kiosk smokes: 390/1440, ES/EN, Light/Dark. Kiosk now explicitly checks tax settings refreshing on an already paired screen while preserving its cart; disabled tax on $10 yields $10, enabled 11.5% yields $1.15 IVU / $11.15 total. Existing pending/server-confirmation, receipt/reset, privacy, permissions and revocation checks pass with isolated fixtures.
- Reviewed mobile screenshots of Danger Zone and QR in both themes. The deterministic Impeccable detector reports 21 existing recommendations; none require unrelated design changes.
- New browser regression added to the existing Chromium/WebKit CI entry point. Local WebKit/physical-device scanning and authenticated production-tenant acceptance are not claimed. No real sale, payment, email, tax-setting write or destructive action was performed.
