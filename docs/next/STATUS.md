# WebFactory PR Next: engineering status

**IN PROGRESS. This is an isolated first implementation, not the completed master brief.**

Source SHA: 234dd9361f413277b438e754b479e7e5681b036d. Original PR125/main unchanged by this work. Main readback79d82cf286efcac1fa69dbb567054a4215542ffb. New Netlify project76c0eacd-27e4-41b9-99ac-5bd5dbe82879, webfactory-pr-next-experiment. Native tool readback confirms team-login protection for all deploys, Forms not enabled. Initial private deployment created; corrected deployment acceptance recorded below.

## Implemented

- Separate Git branch and experimental entry/build; original application sources and backend retained in history.
- Marketplace Next discovery/search/municipality filters and fictional business profiles, with local follow/favorites persistence. Explicit sample labels; no invented reviews or ratings.
- Shared responsive work shell, rail/mobile nav, locale and light/dark controls. Existing portal operations adapted by scoped tokens. Original-look comparison toggle.
- Skin/Motion/Typography Studios share a local interactive preview. Draft changes remain temporary until Apply/Save; Cancel restores session entry state. Save writes/readbacks a local revision; stale editor check, failure preservation and reload controls. This is browser-local, **not server persistence or a cross-tab atomic lock**.
- 17 named palettes in both modes, readable base text and button ink, custom background tone correction; material/radius/depth/glow controls. Fixed default Ocean Blue dark; optional Aurora.
- 15 locally hosted WOFF2 font families from official google/fonts directory binaries, with per-file source blob IDs, SHA256 and OFL notices; Spanish/English character-map checks. Logo assets byte-identical.
- Anime.js4.2.2 MIT dynamically imported by a shared scoped engine. Static fallback on failure, reduced-motion/NoMotion, cleanup, bounded reveal/stagger, spring, preview timeline, SVG tracing and controlled3D. No payment callbacks.
- Existing practice-aware portal, Builder, POS, calendar, team, kiosk, customer-display and Training components reused. POS Cash fixture calculation/idempotency, pairing and local actions follow the original practice contract.

## Isolation

- Production netlify/functions and preview-barber seed plugin **excluded** from the experimental deploy. Empty function directory, no provider SDK in a deployed backend, no Netlify Identity session, no copied secrets or data.
- Build fails before invoking compiler if Netlify SITE_ID differs from the new experimental ID. Branch root configuration is experimental only; no original project settings edited.
- Unknown HTTP routes return a static404; CSP connect-src none, form-action none, same-origin-only assets/media/fonts. Experiment-only fetch facade has no native fallback and blocks foreign origins and unsupported requests; browser beacon and native submission disabled. Existing finite practice transport rejects foreign business IDs/unknown operations.
- A browser fixture identity is **not** server authentication. This edition must not be used for real consumers, real roles or actual transactions. Full backend tenant isolation tests remain required before connecting an isolated server.
- State is scoped to this origin's Next keys. No production cookies, consumer accounts, storage tokens or cloud databases imported.
- Existing original source remains available for later isolated backend integration. No OAuth changes, real charges, outgoing messages, migrations, new subscriptions or paid visual assets.

## Verified

- Full inherited Node suite:817/817 pass.
- New Next suite:9/9 pass:34 palette/mode pairings and focus/text/ink, custom backgrounds, save/readback/stale conflict, storage error, foreign origin/tenant/unknown endpoints, employee fixture owner denial, POS fixture total2676/idempotency, deploy exclusion/build guard,15 file/license hashes.
- TypeScript and experimental Vite build pass; lazy original modules and separate optional Anime chunk.
- Real Chromium browser via cloud UI: Marketplace renders, Studio Aurora Save/readback survives reload, heading family changes to Space Grotesk in computed preview style; POS adding a12USD sample gives1.38IVU/13.38total, completing the explicitly fictitious Cash confirmation clears the cart. Dashboard charts show the fixture's two13.38records as26.76, not fabricated marketing metrics.
- Marketplace responsive28 measurements (ES/EN x light/dark x iframe widths320/375/390/430/768/1024/1440), no horizontal overflow after fixing inherited body min-width. Chromium's15px scrollbar reduces document client widths; raw measurements in evidence/marketplace-responsive.json. This is **not** iPhone Safari or Android hardware acceptance.
- Impeccable detector executed; inherited findings plus requested-font/motion recommendations retained in evidence, not treated as automatic redesign instructions. No claim all advisory items are fixed.

## Outstanding acceptance requirements

1. Draft PR #127 exists. Browser deployment authorized by the owner; protected initial deploy verified. Corrected deployment and browser acceptance recorded below.
2. Full module-specific redesign (especially original Builder inner preview, POS/kiosk/display, original administrative portal and auth). Existing reused modules are functional only within the finite practice action set; an administrative reference card is explicitly not the original admin implementation.
3. Isolated server authentication, tenant/role authorization, durable transactions and server concurrency protection for new bookings. No real double-booking guarantee is claimed for local fixtures.
4. Stripe Test QR/ATH simulator, paired multi-tab display sync/reconnect, reminders and Calendar/Gmail/WhatsApp simulators. No provider connection permitted until isolation is independently verified.
5. Public reviews/moderation/promotions and full consumer registration in isolated test backend; current new Marketplace uses synthetic local listings.
6. Extend all three studios into per-business persisted preferences and the existing Builder/storefront iframe. Current Studio applies the shared experimental shell tokens and saves browser-locally.
7. Full browser regressions: all modules x widths x ES/EN x light/dark, keyboard/screen reader, reduced motion, touch keyboard, cancel/refund/receipt, stock/buffers/roles and failure recovery. WebKit/iPhone/Android/tablet/physical touchscreen and desktop-site preference not verified.
8. Lighthouse/Core Web Vitals, memory/leak benchmarks, before/after performance and full WCAG2.2AA audit. Do not infer these from build/test success.
9. Review and complete all master brief acceptance criteria before calling Next complete.

## Safe discard (instructions only; nothing deleted)

Close only the experimental Draft PR. Delete only experiment/webfactory-next and Netlify site76c0eacd-27e4-41b9-99ac-5bd5dbe82879. Do not touch PR125, feat/kiosk-skin-engine, main, original site1fa77856-faad-4f0f-8f7c-2671e772513f, domain, OAuth, storage or production integrations. Clear only wf-next:* local keys on the experimental origin if needed. Retain source/QA commits for review until discarded explicitly.

## Continuation: deployment packaging

- Experimental build now derives `_headers` and `_redirects` from `netlify.toml`, so manual directory/ZIP uploads retain CSP, no-index headers and hash navigation. Unknown paths return a static404 instead of rendering the application. SSO team protection remains a project setting and must be verified independently; static headers cannot enforce it.
- Published output now includes all 15 OFL notices, font provenance/hashes and the Anime.js MIT notice under `/next/licenses/`.
- Corrected two recorded notice hashes to match the repository's LF-normalized copies. Original provider notice hashes are retained separately as `upstreamLicenseSha256`; license wording is unchanged.
- New packaging regression passes along with the 9 existing Next checks. TypeScript and experimental build pass. This does not verify the CDN's deployed behavior or complete the master redesign.

## Netlify acceptance correction

The first private manual deploy (`6ae3f3c5aaa0201a1e391a32`) rendered Next after the team-auth gate, but Netlify rejected the reserved `/.netlify/*` source rule. Unknown backend URLs fell through to the SPA document, not the claimed403. Corrected the single catch-all to return `/blocked.json` with404; existing files remain served normally, and all Next module navigation uses hashes. No functions, rewrites to external services or backend providers are deployed. Removing the invalid rule does not grant network access or weaken CSP.

Local packaging regression requires exactly the static404 catch-all. Corrected deployment `6ae3f43ab92155a0cb1235db` is ready, with all header and redirect rules processed without errors. Browser navigation to the reserved backend URL renders the static isolation JSON (no app or tenant data); the browser tooling did not expose a separate HTTP status measurement. The earlier initial audit's403 claim is superseded by this observation.

## Protected deployment verified

- URL: https://webfactory-pr-next-experiment.netlify.app/
- Netlify deploy: `6ae3f43ab92155a0cb1235db` (ready); artifact commit `659dcf8fbb018896c6c159fbcc33b75a2c5726b8` read back from deployed `/experiment.json`. This is a manual deploy on the dedicated experimental project; Netlify labels that project's primary deployment “Production”. It is unrelated to production WebFactory PR.
- Owner authorized browser fallback; Netlify sign-in completed through secure browser authentication. Team-login protection observed before entry and confirmed through the Netlify connector for all deploys. Project remains private; no protection settings changed.
- Dashboard deploy details confirm one valid redirect and one header rule, both processed without errors. The first invalid-rule deployment was superseded; no rollback used.
- Chromium deployed checks: Marketplace loads; municipality Arecibo removes San Juan; Studio Aurora save/readback survives reload; typography preview computes Space Grotesk; Cancel leaves the editor; dashboard practice data renders; Motion Studio exposes controls and its playback button responds; ES/EN and light/dark toggles render both variants. Animation timing/performance and physical mobile behavior are not established by these checks.
- Original production site still has deploy `6adb4386324a7b400c696775`, ready. No original project deployment, main merge, PR125 modification, OAuth change or real provider operation performed.
- Known limitation observed: inherited dashboard's `/builder?edit=...` link is not adapted to Next hash navigation; use the experimental Website Builder module navigation. Module-specific integration remains pending, along with the isolated backend and full acceptance matrix above.
- Local tests after routing correction:10/10 Next regressions, TypeScript and build pass. Inherited817-test suite passed in preceding continuation; it was not rerun for the static routing-only correction.
