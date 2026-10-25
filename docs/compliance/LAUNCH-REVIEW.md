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

Technical corrections do not equal unconditional launch approval. Keep Preview until owner/counsel complete the external blockers and review the evidence. Claims administration/counter-notices currently have authenticated APIs and written operating instructions; they do not yet have a dedicated case-management console. No official claim handling or statutory deadline determination is automated. Pairing persists independently of screen customer data; expired privileged sessions remain protected. Google OAuth configuration and Google Limited Use paragraphs are unchanged.
