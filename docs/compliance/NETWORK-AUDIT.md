# Network/privacy audit — preview review 2026-10-25

This is engineering evidence, not a certification or a new production effective date.
Baseline: main `79d82cf286efcac1fa69dbb567054a4215542ffb`; preview PR125
`99ef8dc89bb30050e6a3cfb8276f4f1243bf16af` before this audit.

## Findings and changes

- No runtime references to Google Fonts, Google Analytics/gtag, Meta Pixel,
  Hotjar, Clarity, PostHog, Sentry, FullStory or LogRocket were found in source,
  CSS or entry HTML. This source result cannot prove absence from every live
  response or provider. No trackers were installed.
- The CSP permits local fonts/data fonts, local styles, Stripe payment frames
  and connections, Google map frames and Pexels images. No third-party font host
  is permitted. `Permissions-Policy` disables geolocation, microphone and camera.
- Google Maps previously loaded an iframe automatically when its lazy surface
  became visible. The shared map now renders the business address and a bilingual
  **Load Google Maps** choice first. Until that action no iframe is inserted.
  The explicit action connects to Google with `referrerPolicy=no-referrer`.
  Mapping remains available; the change is independent of approved Google OAuth.
- Pexels image requests, if used by a template, are third-party content requests,
  not proof of advertising tracking. Templates also use local cached images.
- Browser storage stores language/theme/haptics preferences, optional remembered
  login email, Builder draft state, per-user practice progress, opaque display
  binding ID and protected pending-sale identifiers. These are not all anonymous:
  remembered email and business drafts may contain personal/business data.
  No advertising identifier or behavior-tracking SDK was found. Local storage
  is not an authorization source. POS pending markers exclude customer/payment
  secrets; the paired-device credential is an HttpOnly cookie.
- Payment and receipt capability links require careful handling even where they
  contain no card details: they are access credentials. No full request URLs,
  query values, request bodies, cookie values or storage values are logged by the
  new audit script. It emits only origin/resource-type counts and key names.

## Actual live verification and boundaries

`scripts/audit-privacy-network.mjs ORIGIN` uses clean anonymous browser contexts
at 390/1440 and reads public pages plus signed-out portal shells. It never logs
in, submits account/customer data, starts checkout or makes a real transaction.
Signed-in business/admin, authenticated consumer and native iPhone/Android
traffic are **not** covered by this anonymous capture. Fixture browser tests are
separate evidence and must not be presented as physical-device/live-account QA.

Initial Playwright CDN browser downloads returned truncated archives. Official
Google Chrome stable downloaded successfully but the environment prohibits its
UNIX process-singleton socket. The official Google headless-shell alternative
launched; actual preview navigation then failed TLS trust through the environment
proxy (`net::ERR_CERT_AUTHORITY_INVALID`). No certificate warning or verification
was bypassed. That failed capture is not evidence of a functioning live runtime
or of absence of third-party requests. Further successful capture, if obtained,
is recorded in the final audit report.

Server boundary probes can run with Node's `NODE_USE_ENV_PROXY=1` using the existing
`audit-security-boundaries.mjs`; only anonymous GETs or invalid/unauthorized
requests are submitted. No credential or valid operational request is sent.

## Acceptance evidence

The existing SSR template regression verifies all 46 template/language
combinations and confirms configured maps render an explicit choice without an
iframe. Existing template browser checks now click that choice before checking
map availability. Final build/browser results belong to the consolidated report.

## Other open PRs inspected (read only)

- #120 Accounting/ERP/Frappe integration expands roles and financial access.
  It is outside this audit; the current product retired that expansion. Do not merge.
- #115 booking constraints/public settings/accessibility contains relevant older
  security work. Current canonical source/tests must be assessed independently;
  an old PR description is not evidence of a missing present control.
- #109 MCP diagnostics/scope switching concerns OAuth; do not merge or alter
  approved OAuth as part of this audit.
- #83/#93 template/Builder parity, #92 homepage, #94 portal styles, #88 isolated
  preview and #96 dialog are historical UI branches. They are not incorporated
  automatically and do not authorize resurrection of obsolete architecture.
- PR125 remains the unified Marketplace/POS preview. No other PR was merged.
