# Launch review — preview work, 25 October 2026

This is technical evidence for counsel/owner review, not a legal certification. Production policy effective dates and Google OAuth approvals are not changed by a preview. Baseline verified through GitHub: main 79d82cf286efcac1fa69dbb567054a4215542ffb; PR125 head before audit 99ef8dc89bb30050e6a3cfb8276f4f1243bf16af. Production deploy baseline 6adb4386324a7b400c696775. All audit changes remain on feat/kiosk-skin-engine / PR125. No real email, payment, refund, cancellation, complaint or deletion was submitted.

## Risk and acceptance matrix

| Area | Evidence / finding | Severity | Action / acceptance criterion |
|---|---|---|---|
| Consumer age/consent | marketplace-register, consumer-registration previously accepted only a boolean | High | Server validates adult declaration + current policy version, records timestamp, private legacy accounts require renewed acceptance; no DOB/ID collection |
| Consumer privacy | marketplace-profile keys by authenticated Identity subject, confirmed email, same-origin writes, bounded requests and CAS | Existing protection | Cross-subject/private fields must stay inaccessible; profile deletion must not delete business Identity |
| Minor reports | Previously no dedicated account restriction flow | High | Restrict consumer use, erase consumer profile fields, preserve restriction across reacceptance; external manual review requires owner process |
| Shared screen | publicDisplayView kept frozen customer contacts while pending QR survived disconnected cashier | High | Redact contact projection after heartbeat loss while keeping valid payment QR; do not expire pairing to achieve privacy |
| Pairing/payment | Hashed device secret, HttpOnly Secure cookie, operator/tenant checks, revocation, pending attempt recovery, signed canonical payment confirmation | Existing protection | No privileged permanent portal token; no client-declared paid status; paid screen clears after three seconds |
| Error privacy | client-auth and Stripe webhooks logged raw provider errors | Medium | Log only category/status; generic unexpected-error responses; synthetic PII must not appear |
| Billing ordering | subscription-billing could replace newer state with older event or overwrite courtesy plan | High | Serialized updates, Stripe timestamp ordering, customer/subscription identity checks; preserve signed webhook and legitimate replacement checkout |
| Billing retry | Checkout provider success followed by uncertain storage/response could issue a new subscription | High | Durable protected attempt and stable provider idempotency across retries; sandbox mocks only |
| Email/reviews | Existing explicit opt-in, postal address, suppression, unsubscribe and transactional separation | Existing protection | Review-request eligibility and suppression regressions; do not enable future Marketplace campaigns |
| Third parties | No font/tracker signature in initial source scan; embedded maps loaded thirdparty before deliberate activation | Medium | Actual network observation; click-to-load maps; network report distinguishes public live routes from authenticated fixture coverage |
| Copyright | No structured claims workflow in baseline | High launch requirement | Bounded secure intake, private administrative review/history and counter-notice path; no automatic legal determination/takedown or false DMCA designation |
| Marketplace ads/reviews/location | Public directory and private profiles implemented; public reviews/ratings/ad campaigns/follow feeds not complete | Preventive | Keep unimplemented features disabled; do not imply organic ratings, sponsored rankings or precise geolocation |
| Policies | Earlier terms/privacy/refund predate Marketplace and persistent POS | High launch requirement | Bilingual preview updates reflecting actual flows; retain /privacy /terms /refund-policy and Workspace Limited Use |
| Google | Approved scopes gmail.send / calendar.events, user-provided approval date25Oct2026 | Protected boundary | No consent screen/domain/redirect/credential/scopes/config change; Google data not used for ads/general models |

## External release blockers

- Owner/counsel must verify legal contracting identity, business/legal notice postal address, support capacity and jurisdictions served. Do not invent these details or substitute an email for a mandatory postal address.
- Counsel must determine Puerto Rico consumer/contract/automatic renewal and privacy obligations and applicable US state laws based on actual customers and thresholds. Product account minimum18 is a policy decision, not the universal COPPA age.
- DMCA section512 safe-harbor eligibility is conditional. Owner must determine eligible service functions, adopt/enforce repeat-infringer policy, supply a real designated agent and contact information, register through Copyright Office directory, publish matching information and maintain/renew registration. No official registration has been performed.
- Owner must establish personnel/process for verified rights/deletion/minor reports and complaint review, lawful holds and merchant financial retention. No invented universal retention schedule is imposed.
- Marketing remains subject to existing opt-in/suppression/address controls; future advertising, public reviews, precise location and campaigns need another feature-specific review before activation.
- Actual authenticated live sessions and physical iOS/Android are not established by local browser fixtures. Reports must identify their coverage honestly.

## Authoritative legal research

- FTC COPPA: https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa — under13 child-directed/actual-knowledge framework; adult-only registered account policy is separate. Do not collect more age evidence than justified.
- FTC CAN-SPAM guide: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business — commercial vs transactional primary purpose, truthful headers, postal address, unsubscribe and suppression.
- Copyright Office512 resources: https://www.copyright.gov/512/ — agent designation, notices/counter-notices and safe-harbor conditions are not satisfied merely by adding a web form.
- FTC negative-option rule page: https://www.ftc.gov/legal-library/browse/rules/negative-option-rule — distinguish effective law from proposals; do not claim vacated 2024 click-to-cancel amendments are in force. ROSCA/FTC Act and applicable state/PR duties require counsel review.

Final commit, deployment and validation evidence will be appended after integration. See separate consumer, billing/email and network reports for detailed scope.

## Puerto Rico and review-feature legal scope

Primary sources checked: DACO consumer guidance https://www.daco.pr.gov/consumidores (misleading offers/material omissions), Puerto Rico Law111-2005 amended official text https://bvirtualogp.pr.gov/ogp/Bvirtual/leyesreferencia/PDF/111-2005.pdf and regulation7376 https://app.estado.gobierno.pr/ReglamentosOnLine/Reglamentos/7376.pdf (security incident duties requiring counsel evaluation); FTC review-rule guidance https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers. Future review implementation must prohibit fabricated/incentivized-sentiment ratings, disclose material relationships and avoid suppressing negative feedback deceptively. None is activated here.18+ is an account product threshold, not a universal statement about Puerto Rico civil contractual capacity.

## Validation evidence

- Legal pages browser smoke: all four routes at seven widths320–1440, ES/EN, light/dark (112 route checks) passed, including unchecked copyright declarations and no horizontal overflow.
- Full Node suite:728/728 passed, zero skipped; TypeScript included in successful deploy-preview build.
- Consumer smoke:390/1440, ES/EN, light/dark; acceptance, private favorites, restriction and data clearing passed with synthetic fixtures.
- Cashier and paired-display smoke:390/1440, ES/EN, light/dark; pendingQR, server-confirmed payment, automatic reset and reattachment passed with fixtures, no real provider operations.
- Security boundary script ran against the existing real preview:9/9 expected401/403/405 responses, including admin/export/payment status and foreign-origin protection.
- Impeccable deterministic detector:20 existing recommendations, no broad style rewrite.
- First concurrent local builds raced over dist/index.html; rerun sequential final build passed. Standard Playwright browser download returned incomplete archives; official headless-shell alternative enabled Chromium QA. This is browser emulation, not physical iPhone/Android acceptance; WebKit not yet verified in this workspace.
- Existing CI suites remain available; local output paths are transient. The reproducible scripts/tests and this report are retained in Git.

## Operational launch decision

Technical corrections do not equal unconditional launch approval. Keep Preview until owner/counsel complete the external blockers and review the evidence. The follow-up adds authenticated admin and owner case consoles over the existing APIs; see CONTENT-CLAIMS.md. Human legal review and official notices remain operational responsibilities. No official claim handling or statutory deadline determination is automated. Pairing persists independently of screen customer data; expired privileged sessions remain protected. Google OAuth configuration and Google Limited Use paragraphs are unchanged.

## Preview inspection and additional regressions

Implementation commit1e704a512f5b34cbc87d167e231c6e4781d15189 deployed READY at6ade37da6ec54e367656137d with preview-barber plugin success. Actual preview /copyright,/privacy,/terms,/refund-policy returned200; anonymous claim/profile reads returned401. Existing protected admin/payment/export probes9/9 passed. Marketplace browser regression390/1440 ES/EN light/dark passed, including history, original landing video, image recovery and accessibility;390px Spanish dark screenshot visually inspected with original logo and copyright footer visible. Additional390px workspace regressions cover permissions, navigation and retained Builder state. Bilingual consumer/business instructions are in USER-GUIDE.es-en.md. Live network details and final revision are recorded separately in NETWORK-AUDIT.md and the PR delivery report.


## Completion follow-up —25October2026, preview only

- Added platform Resources case console and tenant-owner Settings console. Owner GETs are tenant-scoped and omit claimant contacts, staff-only notes and actor IDs. Explicit revision+ETag checks reject stale reviews/counters; missing concurrency metadata fails closed.
- Public copyright intake now uses content-claims-intake with the original5/minute/IP limit; authenticated operations use content-claims with60/minute/IP. No automatic mail/takedown/restoration added.
- Added private platform eligibility-review API/panel: completed external review attestation, reason and revision are required. Decisions retain restriction or permit fresh consent; erased preferences are never resurrected. Internal bounded audit survives repeated self-deletion/reports.
- Added owner-only read-only Billing verification. It exposes stored/provider discrepancies and protected Checkout uncertainty without writes or charges. Equal-second webhook snapshots trigger validated canonical subscription retrieval under the existing lock; subsequent snapshots retain canonical reconciliation. Failed verification leaves event retryable.
- Unknown Checkout attempts beyond provider-safe retry remain blocked for operator reconciliation. That is a financial protection, not an automatic reset to implement.
- Owner inputs/legal review are collected as a bilingual worksheet in OWNER-RELEASE-CHECKLIST.es-en.md. No identity/address, statutory determination, DMCA registration or production publication is fabricated.
- WebKit binary downloaded, but host dependencies could not be installed because the managed runtime denied apt cache/group operations. No WebKit or physical-device pass is claimed for this follow-up; Chromium touch emulation is identified separately.

Completion validation:744/744 Node tests passed with no skips; TypeScript and sequential deploy-preview build passed. Claims/eligibility/billing console smoke previously passed12 Chromium touch/desktop emulation combinations (iPhone13, Pixel7, desktop; ES/EN; light/dark), including stale-revision recovery, owner counter-notice, eligibility decisions and read-only Billing mismatch display. This is Chromium emulation, not physical-device/WebKit acceptance. Impeccable remains20 existing findings. No actual cases, account decisions, provider mutations or emails were submitted. Runtime maintenance removed temporary browser binaries/screenshots afterward; reproducible fixtures remain in Git. External owner/counsel release worksheet remains necessary before publication.

## Owner-directed operational preparation — 2026-10-25 (Puerto Rico)

Prepared bilingual operating procedures, code-backed retention inventory and blocked future release handoff; updated the owner worksheet and stale legal-review statements about DMCA registration. Individual operator identity and initial Puerto Rico scope were already confirmed by the owner; residential contact values remain outside Git. DMCA-1084143 registration is complete. Remaining external items are legal approval (including age/capacity, renewals and section512), approved category/backup retention schedule, and operational confirmation of mailbox monitoring/coverage. Proposed routines are not represented as staffed commitments. No production environment values, public effective dates, Google OAuth, application behavior, real records or communications changed.

Validation:746/746 existing Node tests pass; deploy-preview TypeScript/build passes; changed-document relative links and exclusion of residential address/phone pass; git diff --check passes. No new end-to-end tests were run, per owner scope. No new UI was introduced. Existing large-chunk build advisory remains. Preview deploy status/commit must be verified separately after push. Prepared documentation does not constitute legal sign-off or production authorization.
