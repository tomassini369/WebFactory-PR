# Glassy Dashboard v5 — unified PR125 preview

Owner-approved scope: operating business/employee and platform administration
portals, plus a personal wallpaper/material settings page in the existing
preview. Production publication and a separate preview are excluded.

## Source and integration

Visual source: owner-uploaded `Glassy Dashboard v5.zip` and accompanying video.
The archive supplies React/Vite source, CSS material tokens and `public/image.png`.
No project license file was present in the supplied archive; no third-party
license is invented or applied. The two other gallery entries reuse the already
present violet landscape and gold waves assets. No external image API, tracking,
font request, paid generation or additional runtime package is introduced.

`room-original.jpg` is a high-quality JPEG download of the supplied 1452×1083 image;
`room.webp` is its 207KB display derivative. These are not described as 4K.

Navigation and profile/board/calendar cards use current WebFactory data,
permissions and handlers. New roots deliberately do not activate the retired
operating stylesheet selectors. Public pages, auth cards, templates, Builder,
kiosk/display screens and provider credentials/scopes remain unchanged.

The global document zoom, hash routing, demo data and simulated send/call/chat
operations from the source template are not installed. Entry transitions cancel
on interaction and respect reduced motion. Live POS state remains managed by
its existing implementation. Training starts its cash example in cash; the
real POS retains its approved QR default.

## Personalization

The existing portal has a Personalize/Customize dashboard destination available
to both commercial roles, an entry from owner Settings and a platform admin entry.
Gallery selection previews immediately; Apply and save commits the selected
image/material. Upload and apply performs an explicit save. Restore default
also deletes the currently uploaded custom image. One current custom image is
kept per user and portal; downloads of that image remain authenticated.

Preferences are server-side rather than browser-local: opening the same preview
host with the same user on a second device restores them. Separate businesses,
users and platform administration have separate hashed keys. Preview host storage
survives deployments, and is separate from production storage. A permalink host
and the stable PR alias are different preview scopes; use the stable PR125 URL.

`dashboard-appearance` authorizes every read/write/image through the existing
MFA-aware requireSiteAccess / requirePlatformAdmin checks. No owner permissions
are granted by the customization UI. Writes require same Origin and If-Match;
backend conditional Blob writes reject concurrent overwrites. No caller supplies
an identity, storage key, external URL or credential. Settings JSON excludes image
bytes. All private responses use no-store, nosniff and Vary: Cookie.

Uploads accept only static JPEG/PNG/WebP up to 4MB; Sharp validates/limits pixels,
rotates, strips metadata, resizes within 2560×1600 and outputs WebP up to 2MB.
SVG/HTML, animation, oversized input and invalid bytes are rejected. The gallery
assets load locally and private images are never copied to a public tenant asset
store. Reset explicitly removes the stored custom image. Existing broader
account/backup retention procedures still require their separate review.

Transparency/dimming are bounded for legibility. Light surfaces increase the
material opacity; forced-colors and reduced transparency have opaque fallbacks.
Device reduced motion overrides the personal animation setting. Error/reload
states and stale-device conflicts are visible; an unsuccessful save is not
reported as saved. Practice does not issue appearance API requests or persist
appearance settings.

## Verification

Evidence is updated with the final verified commit/deployment in PR125.
The new API has tests for canonical authorization, user/business separation,
origin checks, conditional updates, private image encoding/deletion, active SVG
rejection, limits and invalid settings. Browser fixtures call the actual new
handler with an isolated in-memory Blob adapter; no live operational writes,
charges, emails, invitations or external provider acceptance are performed.

The design detector retains 20 earlier advisories and flags one unused spring
curve copied from the reference token set. Runtime entry uses a decelerating
curve, not that spring token. A detector warning is not a browser acceptance.

Physical iPhone/Android and live authenticated upload acceptance are separate
from simulated viewport/browser checks. No production release is authorized.

Local validation: 804 Node tests passed, including eight new API cases; full
deploy-preview build and TypeScript passed. Chromium checked both portal
roots at 320/375/390/430/768/1024/1440 plus 1280, ES/EN and Light/Dark,
preference save/reload/reset and the actual isolated raster handler through the UI.
Two tabs verified stale-save conflict recovery; custom image deletion passed.
Owner/Employee navigation, permission migration, POS responsive/checkout/retry/
backend-confirmed reset, 390px Spanish/dark Training cash activity and admin
revenue/expanded-panel navigation regressions passed with isolated fixtures.
The previous required suites retain their entry points and now target the new
workspace roots and native navigation. The new full appearance suite is added
to CI for Chromium and WebKit; local WebKit/physical devices are not claimed.


## Save/expand correction

The owner reported that clicking Apply and save reached the leave-draft warning.
The screenshot also showed the dock Overview tooltip over the save area. The
mobile dock now occupies a reserved row below the independently scrolling
workspace, preventing pointer interception. Successful reload/save/upload/reset
acknowledgements advance a saved revision separate from response ETag headers;
server conditional-write authorization is unchanged. Failed saves keep drafts.

Hide and Scroll are removed. The single expand button hides/inerts unrelated
DOM siblings while explicitly retaining the wallpaper/shade; ancestor stage
transforms are disabled during expansion. The same mounted card is used, and
Close/Escape restores previous visibility, focus, input/filter state and scroll.

Six Chromium pointer-coordinate checks passed at 390/768/1440 in both themes:
the save center hits the intended button; saving and subsequent navigation do
not show a leave warning; simulated failed saves retain it. The selected expanded
card is the only visible portal card, background remains visible, navigation is
hidden, keyboard focus stays inside, and Escape restores the filter and cards.


## Cashier and kiosk material revision — 2026-10-27

Owner approved extending the same Glassy material to cashier POS and self-service kiosk, including editable 3D card/button treatments. `sales-material.css` reuses native typography, 30px panels, bounded glass and source-derived inset rims/shadows. No checkout, booking, payment, inventory, device pairing or authorization behavior changes.

Cashier: Edit POS design offers Flat Glassy, Soft Glassy, Glassy 3D, independent card/button depths and the personal dashboard wallpaper selector. It uses the existing authenticated personal appearance API, conditional ETag save, and draft guard. Dashboard personalization exposes the same values. Preferences remain scoped by user and business; this does not publish a user's private wallpaper to a customer kiosk.

Kiosk: existing owner appearance editor adds the three design treatments, separate depth selectors and bundled downloadable wallpapers. Values use the existing kiosk appearance/preset storage and paired-screen refresh; older saved designs hydrate with soft depth and the supplied room wallpaper. Existing layouts, tenant uploads, safe colors, contrast pairs, catalog and sales handlers are retained. The source visual material is applied to every bundled kiosk layout. No remote CSS or image-provider account is added.

3D is restrained static elevation and optional hover/press feedback, without loops or new animation dependencies. Reduced motion disables transforms; off remains editable. Reduced transparency and forced colors retain readable controls.

Save protection: the navigation dock now occupies its own CSS grid track at every viewport width. The content scrolls in a separate track; dock and form controls cannot share hit-testing space even at tablet/desktop breakpoints. Entry motion no longer scales content toward the dock. Draft registration updates during layout commit and acknowledges only successful server responses. Failed/stale saves continue to warn.

Local verification for this revision includes 806 passing Node tests (including appearance validation, persistence, user/business isolation and existing checkout regressions), successful full production-target build, real pointer hit-testing of dashboard saves at 390/1024/1440 in both themes, cashier visual save and subsequent navigation, failed-save draft protection, isolated expanded cards, upload/stale-tab/delete checks and employee navigation. Kiosk layout/editor and POS regression suites exercise the same source with isolated fixtures. The detector still reports 21 existing recommendations, including the unused source spring token; no new animation engine or continuous motion was added. Browser fixtures are not evidence of an authenticated preference write on the deployed preview or a physical-device/WebKit test; those remain unclaimed. PR #125 records the final deploy and completed checks.
