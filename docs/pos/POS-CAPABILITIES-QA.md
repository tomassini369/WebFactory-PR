# POS capability increment: review evidence

Scope: business profile presentation, Cashier POS/Customer Display switches, existing kiosk/workforce settings and protected-sale recovery. Existing main and PR #101 are preserved. QA uses explicitly isolated fixtures, never live business configuration or financial records.

Local unit/integration: 470 tests passed, zero failures/skips. TypeScript and full build passed. Both Chromium and WebKit completed 28 viewport/theme/language cases: 320, 375, 390, 430, 768, 1024 and 1440px × ES/EN × Light/Dark. A final compact module-row refinement is additionally checked at 390px and by the complete CI matrix. The actual PR's CI and deployed preview results are recorded in its description after completion; these local results alone do not assert a remote deploy is verified.

The POS regression checks real cart/stock estimation, cashier permission restrictions, exact retries, persisted attempt IDs, pending vs server-confirmed Stripe state and new-sale IDs. A previously protected attempt survives a subsequent 403, including administrator module disablement. Customer Display regression passed pairing, reload, two-device synchronization, authoritative receipts, stale-data hiding and revocation. No hardware/NFC or live payments were exercised.

Corrected findings: inherited input borders failed non-text contrast (1.70:1); a sticky panel toolbar covered the settings title on mobile; the existing retry UI could discard an uncertain attempt on a later permission error. The regression fixture also changed its simulated Stripe status before the pending request completed; it now waits for the rendered pending response before the confirmed response. None of these failing checks was reported as passing.

Impeccable 4.1.0 executed with exit 2 (findings, not an execution error): 20 inherited findings, zero in the changed POS/kiosk components. These recommendations do not authorize unrelated Builder/template replacement.

## Anti-Slop After delivery gate, changed scope

| Gate | Evidence |
| --- | --- |
| R-03, R-25, R-34 | Both browser engines measure page containment and rendered heading/body/field contrast ≥4.5:1, control borders ≥3:1, seven tenant colors, all widths/themes/languages. |
| R-26, R-27 | Profile selection → server save → POS and kiosk category parity; switches → navigation/display changes; error → retry; conflicting revision → clear error → confirmed reload. Loading and read-only permission states are rendered. |
| R-32 | Native checkbox/select/buttons, visible measured focus, keyboard Tab, existing panel expand/Escape regression; no custom inaccessible interaction model. |
| R-17, R-18, R-23, R-24, R-36, R-38 | No invented metrics, testimonials or assets. Existing category/catalog/logo/employee data supplies labels and capabilities; contextual links target real authorized kitchen/team panels. |
| R-01, R-04, R-06, R-10, R-19, R-31 | Tenant tint preserves identity; the existing font and relevant receipt/scissors icons support selling/navigation. Flat settings surfaces avoid nested blur. No new motion or decorative imagery. |
| R-35, C-2, C-4, C-5 | Build and browser click-through executed. Actual financial handlers reject disabled modules before provider/stock writes. Concurrent administrator/device updates preserve state. Tests distinguish pending/confirmed and preserve uncertain attempts. |
| Liveliness and quality locks | Business operating settings, ENERGY 1 / RHYTHM 2 / MOTION 1. Profile → module rows → save creates a clear decision sequence; tenant color and operational labels provide identity. Existing POS architecture and portal controls remain functional. |

This gate applies to the implemented increment. Pending priced modifiers, tables, dedicated workshop job records and archival are explicitly documented, not shown as built controls.
