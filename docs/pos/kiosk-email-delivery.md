# Kiosk booking confirmation delivery

## Incident and evidence

The reported Gmail message is a Google Calendar invitation. The owner confirmed
that this was the only message received, that Calendar and Business email both
showed Connected, and that the booking displayed “Customer confirmation NOT sent”.
That establishes a failed confirmation attempt, not the exact Gmail rejection.
The live booking record and provider response were not accessible from this cloud
session. Do not label a missing scope, disabled API or expired grant as the
confirmed cause for this particular customer without that evidence.

The business confirmation is separate from the optional Calendar invitation.
Its existing customer HTML and plain text contain the Booking ID, six-digit
private kiosk PIN and manage-booking link. Keep the PIN out of Calendar events,
ICS exports, business notification copies and public reference-only lookups.
No customer email or appointment was sent/created during verification.

## Confirmed implementation defects and corrections

- The business-email OAuth callback accepted a verified email without checking
  that Google granted permission to send mail. It now checks the granted scopes
  before replacing credentials or marking a new connection active. The existing
  requested scope remains gmail.send; existing Gmail compose/modify/full-mail
  grants that legitimately authorize sending are also accepted. Declining a
  renewal preserves the previous stored credential.
- Every Gmail 403 used the same authorization message. Only bounded reason
  codes are now retained: API disabled, Workspace policy, sending limit, or
  authorization required. Provider text, project identifiers and tokens are
  never copied into booking diagnostics.
- Missing/revoked business-mail credentials returned 409 and were treated as
  ordinary temporary mail errors. They now require action. Google token-service
  429/5xx failures remain temporary and do not request unnecessary reauthorization.
- A successful Gmail HTTP response without a message ID is no longer marked sent.
  Accepted by Gmail still does not prove placement in the recipient inbox.
- The kiosk promised the PIN would be in an email even when sending failed. It
  now reports sent, pending or action required from the canonical booking, with
  tenant/location/sale checks. The transaction mirror remains the source of the
  existing sale/payment behavior. No provider diagnostics or customer address
  are exposed to the public device. Code/PIN display and auto-clearing remain.
- Offline email-gallery fixtures now use a valid demo code/token shape so the
  existing PIN renderer appears in the review gallery. These values are never
  written to tenant storage and all recipients remain example.invalid.
- Owners can renew Gmail through the existing authorized OAuth endpoint without
  first disconnecting. Booking notices distinguish API/policy/quota failures.
  The portal explains that Calendar and email authorization are separate.

No database, new MCP, payment flow, retry job, mail provider, endpoint or OAuth
scope request was added. Existing confirmation/retry flags, booking rules,
Calendar sync, private PIN derivation and tenant permissions are reused.

## Operator recovery

| Saved reason | Appropriate action |
| --- | --- |
| connection_required | Connect the business mailbox under Connected apps. |
| authorization_required | Review/renew the business Gmail sending permission. |
| gmail_api_disabled | The Google integration administrator must enable Gmail API for the existing project. Calendar may still work. |
| workspace_policy | The Google Workspace administrator must review the sending policy. |
| rate_limited | Allow the existing scheduled retry after the sending limit clears. |
| delivery_failed | Review a subsequent bounded delivery result; do not infer disconnected credentials. |

An existing generic warning cannot retrospectively reveal a provider response
that was discarded. After deployment, the existing hourly commerce retry can
record the new safe reason for eligible unsent future appointments. Do not create
another appointment or payment to repair a notification. Already-sent recipient
flags prevent normal retries from replaying a delivered confirmation.

The live owner can use Bookings → Preview confirmation to inspect the original
code/PIN without sending a message. The Google Calendar invitation does not
replace the business confirmation. Live Google consent and end-to-end recipient
delivery remain outside the isolated checks below.

## Verification actually executed

- npm test: 580 passed, zero failed/skipped. Includes rejected/sufficient Gmail
  scopes, preserving a credential on declined renewal, token refresh, provider
  error shapes, retained booking/payment state and tenant-bound delivery status.
- npm run build: passed with Node 22, including TypeScript and Vite.
- Initial kiosk and workspace regression matrices: 28 cases per surface per
  engine at 320/375/390/430/768/1024/1440 px, ES/EN and Light/Dark, in Chromium
  and WebKit. Final diagnostic and contrast checks: 12 cases per surface per
  engine at 320/390/1440 px, both languages/themes, on the final application.
- Kiosk checks cover creation, three delivery states, at least 4.5:1 contrast on
  the delivery message, code/PIN visibility, privacy, arrival, balance and reset.
- Portal checks cover distinct API/policy/quota notices, existing navigation,
  renewal focus/keyboard activation, intercepted OAuth destination, role
  restrictions and preservation of Builder draft/preview state.
- Impeccable 4.1.0: 20 existing advisories, exactly identical to the previous
  baseline. Exit 2 indicates findings, not an execution failure. No CSS changed.
- Six offline customer-email render checks passed at 320/390/1440 px in ES/EN,
  with matching Booking ID/PIN in HTML and plain text and no overflow. The local
  browser blocks file://; the check used an isolated loopback static server with
  all nonlocal network requests blocked. The gallery smoke now checks both fields.
- git diff --check passed. No npm lint script exists; no lint success is claimed.

The browser harness initially needed its existing locale selection reapplied
following reload, the real View appointments menu label, and a static intercepted
OAuth response because WebKit cannot fulfill a mocked HTTP 302. These harness
issues were corrected and the relevant matrices rerun successfully.

## Scoped Anti-Slop delivery gate

After/audit mode follows AGENTS.md. Direction: existing tenant colors, native
text, status-first recovery; ENERGY 3, RHYTHM 2, MOTION 1. No new visual system,
assets, animations or dependencies. This gate applies to the changed notices and
renewal control, not a claim that legacy application styling has been redesigned.

- R-01 PASS: no new gradient/glow; existing business surfaces retained.
- R-02 PASS: new product copy uses ordinary sentences, no decorative em dashes.
- R-03 PASS: browser matrices assert no horizontal overflow at the stated sizes.
- R-04 PASS: no new icons or decorative symbols.
- R-05 PASS: no template section or generic composition added.
- R-06 PASS: existing native typography and private code presentation retained.
- R-07 PASS: no pattern/background introduced.
- R-08 PASS: renewal uses a descriptive label without decorative arrows.
- R-09 PASS: no new badge or capsule label.
- R-10 PASS: no glass/blur layer introduced.
- R-11 PASS: existing control shapes retained.
- R-12 PASS: no shadow added.
- R-13 PASS: no glow, pulse or status dot added.
- R-14 PASS: existing Connected services row reused.
- R-15 PASS: Renew Gmail authorization names the action.
- R-16 PASS: new copy describes actual delivery errors without marketing claims.
- R-17 PASS: no fabricated product metrics.
- R-18 PASS: no testimonials or customer examples added to the product.
- R-19 PASS: no new motion; tests use reduced motion.
- R-20 PASS: business identity, booking code/PIN and existing workflows retained.
- R-21 PASS: both existing themes exercised.
- R-22 PASS: no illustration added.
- R-23 PASS: no asset or navigation structure created.
- R-24 PASS: renewal targets the existing tenant-scoped OAuth endpoint.
- R-25 PASS: final kiosk checks calculate message contrast >=4.5:1 in both themes.
- R-26 PASS: keyboard renewal activation reaches the intercepted existing endpoint.
- R-27 PASS: sent, pending and action-required messages use server state.
- R-28 PASS: no FAQ added or changed.
- R-29 PASS: no palette changes.
- R-30 PASS: existing interface retained; no third-party interface copied.
- R-31 PASS: notice changes prevent a false delivery promise; renewal supports repair.
- R-32 PASS: renewal Tab/Shift+Tab, focus outline and activation checked.
- R-33 PASS: direct component/server changes; no runtime source injection.
- R-34 PASS: both themes and languages checked with unchanged style contracts.
- R-35 PASS: build and recorded browser click-through completed as described above.
- R-36 PASS: live delivery/root-cause limitations are explicitly stated.
- R-37 PASS: existing DESIGN.md and portal design contract reviewed before edits.
- R-38 PASS: sample records exist only in isolated automated test fixtures.
- Liveliness PASS: existing tenant accent, focal booking reference and spacing retained;
  the changed surfaces communicate a concrete operational decision.
- C-1 PASS: every change addresses a reproduced misleading state or error classification.
- C-2 PASS: the new visible renewal action uses existing authorized behavior.
- C-3 PASS: no unrelated product sections added.
- C-4 PASS: stated sizes, languages, themes, statuses and keyboard checked.
- C-5 PASS: provider acceptance, isolated checks and unverified live delivery are distinct.
