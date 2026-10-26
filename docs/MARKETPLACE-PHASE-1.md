> Current Preview update: following, moderated public reviews and sandbox sponsored-purchase code are now implemented. Approved advertising price/duration/terms remain unconfigured. See [MARKETPLACE-SOCIAL-ADS.md](MARKETPLACE-SOCIAL-ADS.md). Earlier phase descriptions below are historical, not current feature status.

# Marketplace: reference design and consumer access

Branch: `feat/marketplace-phase-1`, PR #123. Based on current main including
Google Limited Use changes from PR #124. Preview only; no production publication.
This revision supersedes the original presentation-only phase-one specification.

## User-approved scope

Match the owner's October 23 desktop/mobile reference using the original logo,
real public WebFactory content, consumer sign-in/registration, and a dedicated
Marketplace return icon in the business landing and website Builder headers.
The original PNGs, commercial Hero video, interactive tour, catalog/booking/
checkout, pricing, portals, roles, Identity/MFA, tenant stores and APIs are reused.
Stitch Design Taste and vendored Anti-Slop instructions inform the reference
contract in DESIGN.md. No Stitch/21st provider generation was executed; those
private provider tools were not advertised. WebFactory/Admin connection verified.
Graph context was attempted twice, first correcting its 1600-token input limit;
its second response failed. Dependency review continued through current source.

## Shipped in this branch

- Panoramic real Puerto Rico photo, white integrated search, local-support aside,
  capsule categories, public business cards, creation banner and mobile bottom nav.
  The existing licensed Pedro Colon photograph is retained; the conceptual
  reference's invented businesses, offers, ratings and logo are not reused.
- `/cuenta` and `/cuenta?modo=crear`: consumer login and registration, explicit
  Terms/Privacy acceptance, profile name/municipality and persisted favorites.
  Business administration remains at `/client-admin`, explicitly labeled.
- Existing Identity, primary HttpOnly session, MFA policy/enrollment, password
  recovery, logout and revocation are reused. Registration does not assign roles,
  create a business, change memberships or change provider configuration.
- Signup checks the provider's current registration setting on client and server.
  If invite-only/disabled or unavailable, the page explains that registration is
  unavailable and does not enable it. Enabling Identity registration is a separate
  configuration decision. No real consumer account/email was created during QA.
- Confirmation links are removed from browser history and submitted by an explicit
  account confirmation action. Verification calls the fixed Identity API endpoint,
  discards returned tokens and requires password login afterward. It avoids the
  SDK's shared browser-style confirmation user on concurrent server requests.
- `/negocios/:slug` presents the public business photograph, gallery, catalog and
  actual prices. Saving routes to consumer access. Book/purchase actions enter
  the existing `/sites/:slug` flow to select service/employee/time or cart items.
  No booking or payment engine is duplicated. Canonical is the existing tenant site.
- A labeled Store icon in `/crear` and `/builder` returns to `/`; the official logo
  remains unchanged. The business landing's original video/scroll are preserved.
- Privacy ES/EN discloses the new consumer profile/favorites storage and deletion
  request path. Existing Google Limited Use statements remain intact.

## Public data and security boundaries

`marketplace-directory` scans only canonical `sites/` keys in the existing scoped
site store. It returns a strict display allowlist: slug, public names/descriptions,
category, public photos, active catalog entries and active public locations.
Only active/trial sites with current public subscription entitlement are listed.
Preview, setup, suspended, expired and deleted sites are excluded. No members,
Identity records, employee private data, orders/customers, OAuth, provider secrets,
payment settings, billing configuration or private ledger are returned.

The scan is bounded to 250 site records and six seconds between bounded batches,
with ten parallel reads per batch. A `truncated` flag is visible in the UI; filters
apply to the loaded subset, not an asserted full-platform result. CDN TTL is 30s,
browser TTL 15s. This is a bounded first directory, not a large-scale search index.
A dedicated publication index with stable cursors remains future scaling work.
Municipalities are matched only from published active location addresses. The UI
never guesses the visitor's location or claims distance ordering.

Consumer data lives under a separate `marketplace/consumers/<hash-of-Identity-ID>`
namespace in the existing scoped store. The authenticated immutable subject is
always authoritative; request userId/email/roles/siteId cannot select another
profile. Confirmed email and the existing second-factor rules are required.
Profile responses are no-store. POSTs require exact same origin, JSON and a bounded
body. Revision/ETag CAS rejects stale/concurrent saves without automatic replay.
Favorites are bounded to 100 slugs and additions recheck public entitlement.
Preview data uses the existing deploy-scoped isolation, never production stores.

## Routes and real behavior

| Route/control | Behavior |
| --- | --- |
| `/` | Public directory cards, local text/category/municipality filters and URL state |
| `/negocios/:slug` | Allowlisted public profile, Escape-close gallery, real catalog |
| `/cuenta` | Consumer login, profile, favorites and logout, existing MFA as required |
| `/cuenta?modo=crear` | Registration with explicit consent when Identity permits it |
| `/#confirmation_token=…` | Dedicated confirmation screen, token removed from history |
| `/crear` | Complete original business landing with explicit Marketplace header icon |
| `/builder`, `/builder?edit=…` | Existing Builder and authorized edit flow with return icon |
| Business card bookmark | Consumer access and explicit save action for that business |
| Profile Book/catalog actions | Existing tenant storefront; no direct fabricated transaction |
| Promotion Center | Honest empty state; no made-up discount or promotion storage |
| Location links | Actual allowlisted Google Maps URLs from public locations |
| `/client-admin`, `/webfactory-admin` | Existing membership/admin/MFA boundaries |

Favorites and following are different. Following, consumer reviews, promotion
publishing, sponsored placements, interactive map tiles, notifications and verified
badges are not implemented in this revision and are not presented as functioning.

## Brand integrity

| Original PNG | SHA-256 before = after |
| --- | --- |
| `assets/webfactory-pr-logo.png` | `1e92a89ec7e3771875bd1e30326478e6f4fdcd9aee2400bb0305d56ae7dd6f8a` |
| `assets/webfactory-pr-logo-dark.png` | `2ae86e259775cb27f71757479a8e0fa620901aa6bc3cf837d785bbdec8ac270b` |

The real assets retain contain sizing and have no recoloring, crop, filters or
transforms. Native fonts and existing dependencies are used; no new provider,
plan, database, package dependency or paid generation was added.

## Validation and limitations

- Unit/security suites: 651 passed, zero failures or skips. New coverage checks
  public allowlists, entitlement, bounded reads, canonical identity, profile
  isolation/CAS, favorites and registration CSRF/validation/provider-disabled states.
- TypeScript and production build passed. Original logo hashes match.
- The first Netlify preview build failed because the isolated visual-review
  Identity adapter lacked the new getSettings export. Reproduced with
  CONTEXT=deploy-preview; the adapter now returns disabled registration without
  network access. CI builds the exact preview context to catch this dependency.
- Browser checks exercise Marketplace, consumer signup/login/profile/favorites/
  logout, business gallery/catalog, disabled registration and header return routes
  with isolated fixtures. Full results and exact commit are recorded in PR #123.
- Chromium is available locally via a temporary test binary. The usual Playwright
  browser download failed; WebKit and deployed-preview checks run in GitHub Actions.
  No temporary browser package was added to the application or lockfile.
- Pinned Impeccable detector: 20 pre-existing findings, none in Marketplace/Consumer
  files. No source was changed solely to satisfy an unrelated advisory.
- Narrow-view QA found overflowing profile catalog navigation at 320px and desktop
  header density at 1024px. The catalog heading now reflows and mid-size headers
  place navigation on its own row. No overflow is hidden with a page-wide clip.
- Browser accounts, favorites, directory rows and galleries use isolated fixtures;
  no live signup email, Identity account, business mutation, payment or booking.
  Live HTTP smoke reads public data, checks 401/403/400 boundaries and sends only
  rejected registration payloads, never creating an account.
- Emulated browser checks are not a physical iPhone test. Identity delivery and
  confirmation with a real mailbox are not claimed as validated.

## Delivery gate

After/audit-existing-work mode follows AGENTS.md. ENERGY 2 / RHYTHM 2 / MOTION 1.
The preview must pass layout/contrast/44px-target and keyboard tests; root page
motion is reduced-motion safe. The reference defines the photographic hierarchy,
white search focal point and contained card rails. Store, Search, Bookmark,
MapPin, Menu and account icons each identify a real function. Empty/promotions
states contain no fabricated activity. Tests/build and browser evidence, rather
than a successful deployment alone, determine verification status. Review the
current PR check state before authorizing publication.
