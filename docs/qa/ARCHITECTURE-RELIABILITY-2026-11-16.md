# Architecture reliability corrections — November 16, 2026

Base: production/main `8af80706572fd7f0291b502f7287b3e583636276`.
The thirteen audit findings are addressed without replacing the platform UI or
changing business colors, logos, legal text, authorization, billing rates or
provider settlement rules. No real payments, invitations or tenant records are
used as fixtures.

| Audit finding | Implementation and regression protection |
| --- | --- |
| Lost updates from stale edits | All generic client-admin sections pass the supplied safe-integer revision to the existing CAS path. Missing/stale revisions fail without overwriting data. |
| Late responses from another business | Invalidate pending workspace loads on business/account change; cancel effect reads and check workspace identity, auth epoch and request generation before publishing results. Clear commerce, calendar and billing presentation when opening a new business. Initial session observation also ignores an older read after a newer login/logout notification. |
| Repeated writes after lost responses | Opaque retry callbacks default to one attempt. Shared JSON requests classify the effective HTTP method, including Request objects, and never automatically repeat writes. Read retries require opt-in. |
| Unverified payment success | Payment links issue the existing short-lived receipt capability, retain its hash on the transaction, and use the existing public-buyer-receipt verifier. Return query flags cannot assert paid or unpaid. Pending/refunded/unverified states stay distinct. |
| Duplicate Stripe merchant checks | Payment links import the same supported merchant verifier used by storefront checkout and integration status. |
| Different calendar/booking schedules | Shared pure business-hours functions resolve Spanish-first aliases, intersect business/branch/professional hours and combine breaks. Both the calendar and booking engine consume them. |
| Duplicated HTTP parsing | Common requestJson validates object responses, preserves status/code, reports malformed JSON/HTML safely and supports injected Training transport with no network fallback. Marketplace, portal auth, workspace, redesign, campaigns and moderation consume it. |
| No request deadline | Shared transport covers request and response-body deadlines and caller cancellation. Ordinary JSON requests use 12 seconds; image uploads allow 60 seconds. Auth submissions remain single attempt. |
| Redesign load dead end | Explicit retry and portal return controls recover from an initial load failure. |
| Silent consumer directory failure | Directory state/error/retry is independent of consumer eligibility and saved favorites. |
| Unbounded repeated record reads | Ordered V3 references and hashed token pointers select canonical records. Pagination preserves newest-first results and validates tenant, timestamp and token. Warm pages read bounded batches rather than every record body. |
| Synchronous draft save per keystroke | Debounced writer coalesces changes, retains the image exclusion, and synchronously flushes on page hide, unload, backgrounding and component exit. Training never touches the real draft. |
| Redundant directory filtering | Memoize normalized search text by entries and results by applied filters, independently of the search-input draft. |

## Compatibility and recovery

V3 references are written before canonical writes. Stale/orphaned references
from failed CAS operations never override a canonical row; readers verify each
reference. New references contain no customer/contact or payment data. Token
pointers are tenant scoped, hashed and verified against the original link.

Legacy collections are backfilled in batches of eight with a five-second budget
and CAS-protected progress. A large initial collection can return a temporary
503 asking the user to retry; the next request resumes progress. Once ready,
queries avoid repeating the canonical-record scan. Key enumeration remains
proportional to index size; this change does not claim constant-time collection
listing. Old records, identifiers and latest-first ordering are preserved.

Payment links use the existing persisted checkout-attempt protocol when the
browser supplies its 256-bit Idempotency-Key. The header and body attempt must
agree. Unknown outcomes keep the same attempt and lock its input values; they do
not authorize another provider operation. Legacy return URLs without a receipt
capability show an unverified state and direct the user to the business, rather
than claiming success. Existing settled records remain authoritative.

## Validation

- Backend suites include strict revision conflicts, single-attempt writes,
  malformed/null bodies, request/body deadlines, cancellation, bounded index
  reads, legacy backfill, tenant isolation, stale references, shared schedules,
  coalesced draft flush and a mocked end-to-end payment-link/receipt flow.
- Native Python Playwright regressions cover seven widths, ES/EN, Light/Dark,
  both browser engines, query-only success/cancel states, trusted receipts,
  pending/refunded states, malformed response recovery, unchanged checkout
  retries, redesign recovery, directory recovery and switching businesses with a
  deliberately delayed response.
- Existing access/hours, Builder, consumer, commerce and Training regressions
  remain required. A dedicated architecture job is included in the existing required verify gate. CI runs the new fault suite against both the local compiled
  production variant and the actual Deploy Preview; no assertions are skipped.
- Impeccable baseline and corrected tree each report 21 recommendations. No
  stylesheet or original logo change is introduced.

Final command results, head SHA and Deploy Preview evidence are recorded in the
release PR. Browser sizes are emulation, not physical-device acceptance. Passing
fixtures do not certify live provider credentials or guarantee that future bugs
cannot occur.

## Additional failures exposed by the complete CI run

The agenda's index-status panel now validates status and progress before setting
render state. Missing state or a malformed counter shows a local error with a
read-only retry; it cannot take down the booking workspace. The native fault
suite covers both malformed variants and recovery on Chromium and WebKit.

Existing smoke fixtures are aligned with the actual three-plan membership UI
and current social-link editor. Pricing assertions use the canonical shared
monthly/annual amounts; responsive containment remains checked for all cards.
Commercial-access fixtures explicitly simulate the owner's calendar read and
reject that read for employees. Login CI now annotates failed subtest logs so
individual failures remain diagnosable when hosted raw logs are unavailable.

The template-rendering fixture explicitly opts into custom colors/styles, and
professional-booking checks navigate the current team carousel before booking.
Consumer navigation waits for the real email field before measuring the ready
form; the shared card also exists in the inert loading placeholder. Dedicated
chunk/session/loading tests retain their cold-state coverage. Overflow checks
still fail on excess page width and now retain a single-frame layout diagnostic
with query/fragment-free link details and hosted screenshot artifacts.

Template rendering, library/Builder parity, glass, carousel, per-template
functions and related UI integrations run in the `experience-templates` matrix
entry. The existing required `verify` gate waits for every matrix entry and
architecture regressions. All scripts, viewport/locale/theme matrices and
assertions are retained; this separates long serial checks within the existing
35-minute per-job budget.

Functional template journeys use the compiled production bundle, while a
middleware-only Vite instance supplies template metadata. This avoids client
dependency-optimizer/HMR reloads during assertions. The default run still
requires every template/language combination; an explicit local diagnostic
slug is validated and cannot silently match zero templates.

The existing-draft fixture is seeded before Builder mounts, so an earlier
empty Builder instance cannot flush over the fixture during navigation. The
assertions still verify preservation of business, feature, catalog and team data.
