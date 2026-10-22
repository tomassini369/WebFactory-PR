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
- Browser testing is automated/emulated. No physical iPhone is claimed.

The English All category initially measured 39px and was raised to the 44px
minimum. Moving the form over a dark Hero exposed inherited white labels in
Light mode; explicit form text tokens corrected that contrast failure. QA also
separates skip-link fragment navigation from clean-route SPA checks and counts
only the five commercial platform cards, keeping the independent MCP cards.

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
