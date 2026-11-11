# Background refresh audit

Baseline: `3e0e0d4ed7789acbac3f5db162f5fd286e4985d5` (`main` and published Netlify deploy).

The public Marketplace loaded at 390 px without horizontal overflow. A read-only
Chrome sample saw one successful ads request (161 ms), one directory request
(1,236 ms) and one business image request (1,606 ms). These are single-browser
observations, not production latency targets or a load test.

Controlled Chromium tests used the same scenarios, synthetic records, a virtual
clock and simulated visibility changes. Counts exclude initial loads.

| Scenario | Baseline | Corrected |
| --- | ---: | ---: |
| Tracking requests in 30 seconds hidden | 6 | 0 |
| Customer Display requests in 30 seconds hidden | 6 | 0 |
| Immediate requests when visible again, each screen | 0 | 1 |
| Tracking requests started while a response was held for 12 seconds | 3 | 1 |

Run `node scripts/browser-visible-polling-smoke.mjs` after the build. To test
deployed assets, set `QA_ORIGIN` to the Deploy Preview URL; the script serves
synthetic API responses and does not change live data.

The cashier's display heartbeat and edits now use one serialized path. The
heartbeat remains necessary to hide stale drafts after a disconnect. Kiosk and
pending payment checks still refresh while visible and reconnect on return.
Cocina reads only eligible orders, with the existing kitchen capability, branch
scope and employee projection; it skips booking and POS recovery reads.

The existing architecture does not provide a browser event stream for these
views. A future event-based transport should first prove a material improvement
with concurrent devices and safe reconnect behavior. Separately, measure order
storage reads at realistic volumes before indexing tracking turn numbers or the
kitchen queue: both currently inspect stored orders to derive their view.
