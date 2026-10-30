# WebFactory PR Next — current acceptance

Updated October 30, 2026. Isolated experimental edition; **the full production replacement is not complete**. This file supersedes the initial implementation status. Historical integration evidence: [EXPLORATION.md](EXPLORATION.md).

## Available in the preview

- Original Glassy surfaces, wallpaper, translucent panels, charts and unchanged official logo assets. Photographic Marketplace examples with search, municipality/category filters, following and favorites. Original commercial homepage, hero video and scroll tour, templates, storefront, Builder, business portal, administrator, POS, kiosk, customer display and training are integrated.
- Three design studios with 17 palettes, 15 local OFL fonts, optional Anime.js motion, ES/EN and light/dark. Header theme persists. Reduced motion, native dialogs, visible focus and module error recovery are included.
- Builder edits feed the sample storefront; selected templates carry into Builder. Business/profile/appearance edits and supported operations save locally with readback. Original backend services remain excluded.
- New appointments, up to 12 weekly occurrences, whole-batch conflict checks and business timezone/DST handling. New sample appointments support attendance confirmation/check-in, rescheduling with conflict checks, sample payment recording, completion, cancellation, no-show and partial/full sample refunds. Closed appointments reject new payments and rescheduling. Refunds do not move money.
- Local waitlist request creation/cancellation, explicitly using example.invalid contact addresses; no invitations or emails. Attendance search reads the local example appointments. Original finite training behavior stays unchanged unless the Next-only explore flag is present.
- Standard `npm run build`, `npm run preview`, `npm test` now target this experimental edition. Build restores the approved original video, verifies its source checksum and packages local images/licenses/security rules. Original source branch and production build configuration are untouched.

## Consumer exploration

The original ConsumerPage and MarketplaceBusinessPage are integrated through a Next-only adapter. A fictional profile uses an example.invalid address and no password. Profile changes use local revisions; account favorites/following share the existing Marketplace sample lists. Session changes affect only the consumer view, never the owner fixture or production Identity. Existing live Identity/MFA code remains the default outside Next.

The three sample listings have complete original detail pages, gallery and catalog navigation. Consumer-authored fictional reviews start empty, require explicit simulation acknowledgement, remain pending until sample administrator moderation and return to pending after edits. Withdrawals persist. No ratings or testimonials are generated automatically. These are local examples, not actual accounts, confirmed emails, independent customer opinions, server authorization or published real reviews.

External setup was checked read-only: the isolated Netlify project currently offers Enable Identity (not enabled), and no project environment variable keys were returned. The WebFactory/Admin connector provides read/execute permissions but explicitly does not expose provider credentials. Those checks do not authorize copying production keys or imply team-level secret readiness. Connected backend/authentication and provider acceptance remain separate blockers.

## Validation

- 853 tests pass: 817 inherited tests and 36 Next tests. TypeScript and Next compilation pass.
- Impeccable 4.1.0: 25 advisory findings. Next findings remain five font-face recommendations for the owner's requested font choices. Existing unrelated findings are not silently auto-fixed.
- Logo SHA-256: light `1e92a89ec7e3771875bd1e30326478e6f4fdcd9aee2400bb0305d56ae7dd6f8a`; dark `2ae86e259775cb27f71757479a8e0fa620901aa6bc3cf837d785bbdec8ac270b` (unchanged).
- Earlier deployed Chromium checks cover Marketplace, studios, dashboard, admin, profile reload, Builder/storefront/template selection, cash sample checkout, appointment persistence and four-appointment series. Deployed Chromium additionally verifies sample payment, rescheduling from 10:00 to 12:00 business time, check-in, completion, a partial $5 sample refund, waitlist join/cancel, attendance lookup and the sandboxed confirmation preview. Source tests alone do not establish device/browser acceptance.

## Requirements that remain open

This preview uses browser-local fixtures and fixture identities. It does not provide server authentication, server tenant authorization, durable/cloud data, atomic booking concurrency or cross-device synchronization. These are necessary before admitting real customers.

Stripe Test QR and provider-backed payment failure/cancellation/refund/webhook paths are not connected. Local sample refunds are not Stripe Test transactions. Gmail, Calendar and WhatsApp toggles are simulated; subscription/account lifecycle, consumer registration, reviews/moderation/promotions parity and advanced original booking automation are not completed by these local flows.

Complete mobile/WebKit/Android/physical touch, full screen-reader/keyboard, performance and memory acceptance remain open. Responsive CSS and desktop Chromium checks are not substitutes for that matrix.

## Isolation

Only `experiment/webfactory-next`, draft PR127 and private Netlify project `76c0eacd-27e4-41b9-99ac-5bd5dbe82879` may change. PR125, main and original production stay excluded. Build refuses any other Netlify SITE_ID. No production functions, credentials, OAuth, charges, outgoing messages or real customer data are included. CSP blocks network connections and forms. Do not merge this PR or describe the full master brief as finished.
