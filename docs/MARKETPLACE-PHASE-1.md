# Marketplace Phase 1

Base: `main` at `a097d6e0439a039c5042bb8c6f22632c0afd2fdf` (includes portal/login locale PR #122).
Work branch: `feat/marketplace-phase-1`. Review through its PR and Netlify Deploy Preview.
No merge, production deployment, tenant migration, purchase or real booking is authorized.

## What changed

- `/` is consumer discovery using the existing WebFactory identity, original logo,
  navy/blue palette, native fonts, ES/EN and Light/Dark.
- The owner's supplied conceptual reference guides the panoramic photographic
  Hero, integrated search and compact category chips. Its approximate logo,
  invented businesses, reviews, ratings, offers and account screens are not used.
- The Hero uses a real photograph of Old San Juan by Pedro Colon, not generated
  scenery. Two local WebP sizes (960: 101,320 bytes; 1800: 293,428 bytes) use native
  srcset. There is no runtime Pexels API/CDN dependency. See the [source and license](licenses/marketplace-puerto-rico-photo.md).
- Manual choice of all 78 municipalities; eight local business categories;
  normalized search text. Submitting, category selection and clearing update
  visible criteria, location context and shareable URL parameters on `/`.
- These are presentation filters, not an implemented directory lookup. The page
  states the directory is being prepared and contains no real published entries.
  Featured, community and promotion sections show honest empty states. No real
  businesses are hidden by a fabricated zero-result response.
- The map context is explicitly future functionality with no map tiles, fake pins,
  geolocation request or map provider. It is omitted on narrow phones.
- Business CTAs point to `/crear`. The existing login is explicitly labeled as the
  business portal; consumer sign-up and accounts are not presented as ready.
- `/crear` renders the same `HomePage` with its original video, native scroll tour,
  all demos, prices, CTAs, Factory AI, FAQ, MCP section, footer and legal links.
  Only the reciprocal Marketplace navigation link was added to that component.
  Existing sound/haptic preferences are also reused in the Marketplace footer.
- Both public entries load their page code lazily. Marketplace does not request
  the old landing code, CSS, poster or video. The main entry bundle is smaller than
  the baseline 298.68 kB (exact final sizes are in the build log).
- Initial static `/crear/index.html` shares the Vite application and carries its
  business metadata for link previews before JavaScript. Canonical/title/locale
  metadata also update on browser navigation. `/crear` is in the existing sitemap.

No new library, font, database, provider integration, paid service or Netlify
project was added. Backend auth, membership, tenant separation, prices, commerce,
webhooks, MFA, OAuth, catalog, POS, kiosk, bookings and inventory logic are intact.
The only server-library change adds `/crear` to the existing public sitemap URLs.

## Original logo integrity

These SHA-256 values are identical before and after implementation:

| Original asset | SHA-256 before = after |
| --- | --- |
| `assets/webfactory-pr-logo.png` | `1e92a89ec7e3771875bd1e30326478e6f4fdcd9aee2400bb0305d56ae7dd6f8a` |
| `assets/webfactory-pr-logo-dark.png` | `2ae86e259775cb27f71757479a8e0fa620901aa6bc3cf837d785bbdec8ac270b` |

`AdaptiveLogo` itself is unchanged. Its file only gains `/crear` in the existing
inline-theme-control route list to avoid a duplicate floating toggle. Both
original PNGs are served without conversion, cropping, filters, recoloring or
replacement. Browser QA checks their source URLs, object-fit, filter, clipping
and transforms. Unit tests lock the two approved file digests.

## Route matrix

| Route | Phase 1 behavior |
| --- | --- |
| `/` | Marketplace presentation, manual filters and honest empty sections |
| `/?q=…&municipio=…&categoria=…` | Same Marketplace; normalizes/restores criteria, no private-data query |
| `/crear`, `/crear/` | Complete existing business landing; original Hero, demos, prices and AI |
| `/templates`, `/templates/:slug` | Existing catalog and template previews; current 3D carousel unchanged |
| `/builder`, `/builder?edit=…` | Existing Builder and authorized edit entry |
| `/client-admin`, `/webfactory-admin` | Existing authenticated portals and MFA |
| `/sites/:slug` | Existing public tenant website; server-owned tenant metadata |
| `/pay/:slug/:token` | Existing payment-link flow |
| `/track/:token` | Existing private tracking flow |
| `/kiosk`, `/customer-display` | Existing paired-device flows |
| `/chatgpt` | Existing MCP connection/settings experience |
| `/privacy`, `/terms`, `/refund-policy` | Existing legal pages |
| `/password-recovery`, Identity invite/recovery fragments | Existing identity flows |
| `/buscar`, `/negocios/:id`, `/cuenta`, `/cuenta/favoritos` | Not implemented or linked as available |

Navigation from portals and template previews returns to the Marketplace.
Marketplace → Crear and clean-route returns preserve the existing SPA document;
query/fragment links retain the existing native-navigation safety policy.

## Validation

- Baseline main: 637 tests passed, 0 failed; TypeScript and build passed.
- Phase 1: 642 tests passed, 0 failed, 0 skipped; TypeScript and build passed.
  The full local Marketplace matrix passed: 28 cases per engine (56 total),
  plus history, original landing, video, reduced-motion and image-failure checks.
  A final 390/1440 rerun passed on both engines after the clear-filter focus fix.
  The preserved commercial landing passed its 28-case matrix and eight FAQ cases.
  Existing authentication and portal-navigation smoke tests also passed.
  Remote CI results are recorded in the PR.
- New browser smoke checks seven widths (320/375/390/430/768/1024/1440), two themes
  and two languages on Chromium and touch WebKit. It checks search, municipalities,
  categories, reset/reload, focus, 44px targets, computed text/control contrast,
  original logo rendering, image availability, empty states and zero private
  function requests from the Marketplace.
- Additional checks cover skip link, browser history, cross-navigation, canonical
  changes, complete commercial sections, unchanged demo cart/price, original video,
  reduced motion and a failed photo load with the search still usable.
- Existing auth/login locale, recovery/failure, MFA, viewport, portal navigation
  and FAQ tests follow the new public entry point. Commercial landing tests now
  target `/crear`, retaining their functional assertions.
- Actionlint and `git diff --check` passed. The pinned Impeccable detector
  reported 20 pre-existing findings (18 warnings and two advisories), none in
  the new Marketplace files. No lint script is defined in package.json.
- Local HTTP checks confirmed separate initial metadata for `/` and `/crear/`,
  with the same application entry. The main entry is 243.31 kB (76.24 kB gzip),
  compared with the baseline 298.68 kB (93.73 kB gzip).
- Remote CI repeats Marketplace/Crear against the actual Netlify Deploy Preview.
  The initial remote job timed out during dependency/browser installation and
  its isolated retry failed in the same combined setup step, before this test.
  Preview browser QA now pins Ubuntu 24.04 and separates npm/browser setup with
  individual time limits. The existing error reporter accepts Marketplace phases.
  Detailed original setup logs were inaccessible from Codex; the underlying
  install error is not claimed as diagnosed. Final results are in the PR.
- Browser testing is automated/emulated. No physical iPhone is claimed.

The English All category initially measured 39px and was raised to the 44px
minimum. Moving the form over a dark Hero exposed inherited white labels in
Light mode; explicit form text tokens corrected that contrast failure. QA also
separates skip-link fragment navigation from clean-route SPA checks and counts
only the five commercial platform cards, keeping the independent MCP cards.
The published smoke exposed an overly broad iframe assertion; it now checks
inside the Marketplace container, allowing preview tooling outside the product.
The independent checks for commercial bundle/video requests remain in place.

## Published verification evidence

Netlify Deploy Preview: https://deploy-preview-123--webfactorypr.netlify.app/
Business landing: https://deploy-preview-123--webfactorypr.netlify.app/crear
PR: https://github.com/tomassini369/WebFactory-PR/pull/123

The complete `deploy-preview-smoke` job passed on the deployed application in
[CI attempt 2](https://github.com/tomassini369/WebFactory-PR/actions/runs/39793310690/attempts/2),
job `119893700517`, for application commit `d7fb0db4f97597e8c354c535425358f8774866da`.
The Marketplace/Crear step passed at 14:51:22 UTC on 2026-10-22. Later documentation
changes do not change this application code or its assets.

| Scope | Executed result |
| --- | --- |
| Unit/integration/security suites | 642 passed; no failures or skips |
| TypeScript and production build | Passed |
| Local Marketplace, seven widths × two themes × two languages | 28 cases per engine; 56 total, Chromium + WebKit |
| Published Marketplace/Crear, 390 and 1440, both languages/themes | 16 matrix cases total, both engines; history, original landing/video, reduced motion and image failure passed |
| Preserved commercial landing | 28 responsive cases and eight FAQ cases passed |
| Published portal security and UI | Authentication boundaries, Owner/Employee, phone review, login/MFA contrast and workspaces passed |
| Published operational regressions | Training, booking kiosk, device kiosk, privacy, POS profiles, MCP HTTP boundaries and public URL editor passed |
| Original PNGs | Both baseline SHA-256 digests unchanged; deployed production logos also matched via HTTP |

The global CI state is separate from the passed preview job: the commercial
matrix job was canceled during a WebKit installation in an earlier attempt.
Its initial run passed with the same product code. Attempts to rerun the copied
canceled job subsequently ended in `startup_failure` without creating jobs.
Actionlint passed and the same workflow executed in prior attempts; the precise
startup failure is not established. Current CI status and any remaining blocker
are recorded in the PR rather than represented here as a passed check.

Later remote regressions exposed a 15-second kiosk reload timeout and a
30-second dashboard bootstrap timeout. The two smoke scripts now allow 60
seconds for remote document/bootstrap readiness, while keeping existing control
action limits and every payment, permission, revocation and persistence assertion.
There are no automatic transaction retries. Portal bootstrap failures report
only HTTP status, pathname, document readiness and structural element counts.
Both scripts passed locally on Chromium and WebKit at 390/1440, ES/EN and
Light/Dark, including their isolated operational scenarios, after this change.

## Future backlog, not implemented

1. Efficient public directory/index; `/buscar`, municipality/category filters,
   optional distance, business profiles `/negocios/:id` and a real contextual map.
2. Free consumer `/cuenta`, persisted favorites, following by business/category/
   municipality, Para ti/Siguiendo/Explorar feeds and opt-in alerts.
3. Connect the actual `TemplateHighlights.tsx` and `carousel-original` 3D Glass
   carousel to the full approved catalog without changing its style. One shared,
   persistent favorite for heart/bookmark across views; following remains distinct.
   Reuse each tenant's existing booking and checkout.
4. Real 1–5 reviews with purchase/visit verification, comments, owner replies and
   separate moderation; no invented badges or review counts.
5. Promotion center with validity/expiry, organic posts, labeled sponsored ads,
   paid campaigns and outside advertisers, separated platform Stripe/merchant
   Stripe Connect, attribution and moderation.
6. Extend existing Business/Platform Control Centers using existing commerce
   records and APIs; no duplicate POS, bookings, catalog, stock or private ledger.
