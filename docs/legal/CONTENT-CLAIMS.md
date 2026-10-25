# Content claim operations — preview, 2026-10-25

This is a technical intake/review procedure, not a statement of DMCA safe-harbor qualification. The owner must supply the real legal entity/contact information, designate and register a Copyright Office agent where appropriate, publish that agent's details, and have counsel approve notice, counter-notice, forwarding, restoration and repeat-infringer procedures before launch. No agent registration or external notices are submitted by this implementation.

## Implemented

- `/copyright` embeds the bilingual `ContentClaimForm`. The form accepts a same-platform `/sites/{slug}` content URL, contact name/email/phone/address, work identification, location/infringement explanation, electronic signature and the required good-faith/accuracy/authority declarations. It warns against sending identity/payment documents and explains necessary sharing.
- `POST /.netlify/functions/content-claims`, `action: submit`, resolves the business from the URL; users cannot attach a complaint to a different tenant by providing an internal ID. Responses expose only an opaque reference. No public search or case-detail API exists.
- Bounded fields, 16,000-character request limit, same-origin checks, a honeypot and Netlify's five requests/minute/IP limit protect intake. No attachments, arbitrary HTML, external URL fetching or automated emails are accepted.
- Private records use the existing commerce storage service and its preview/production isolation. No new database/provider. No IP/fingerprint collection was added.
- Admin-only GET returns case summaries without contact details; `?id=<reference>` returns one full private case for authorized review.
- Admin-only POST `action: review`, `id`, `status` and `reason` records under_review/rejected/restriction_requested/restoration_requested/closed. History includes server time and authenticated actor ID; concurrent writes use ETags.
- Affected, authenticated business **owner** may POST `action: counter`, `id`, `siteId`, `claimantName`, `email`, `phone`, `address`, `removedUrl`, `statement`, `signature`, plus `consentJurisdiction`, `perjury` and `serviceConsent` booleans. Another tenant or employee cannot file against that case. Original notice/history remain preserved; duplicate counters fail closed.

## Required operator procedure

1. A platform administrator checks actual ownership/authorization, statutory elements, specificity, fair-use/mistake concerns and abusive complaints. A received notice is an allegation, not an infringement finding.
2. Record review with the exact reason. If restriction is justified, use the existing authorized content/business administration controls for the precisely identified material. `restriction_requested` **does not automatically remove content**. Record the action actually performed and its timestamp in the case reason.
3. Contact the affected owner through an approved existing support channel; do not disclose unnecessary claimant information. Sending/forwarding and delivery evidence remain manual, intentional operator actions, never automatic financial or messaging side effects.
4. Review any owner counter-notice, verify jurisdiction/service and perjury declarations, forward where required, and have counsel determine the statutory restoration window and any court-action hold. `restoration_requested` records a request only; it never restores content automatically.
5. Search admin case summaries by siteId for previous confirmed findings. Repeated allegations alone do not justify automatic sanctions. Review a documented repeat-infringer policy with counsel; record reasoned restrictions/account actions through existing admin controls. Preserve rejected/abusive notices and counters in history.
6. Handle correction/deletion/retention requests through the privacy support process, preserving only records required for actual disputes/security/legal obligations. No universal retention period is invented here.

## Known boundaries / launch blockers

- Intake currently handles hosted tenant storefront URLs, not custom-domain media links or platform-owned content. Public instructions provide the existing support contact for other content. No public reviews feature is activated.
- Admin review and counter-notice are secured APIs; a dedicated operator/owner case console and automatic delivery are not implemented. Use an authenticated same-origin portal session and the documented API; do not copy tokens into logs or external tools. A future console should reuse these handlers.
- Identity/address verification and legal merits remain human review. The form is not a representation that a registered agent already exists.
- No scheduled automated takedown, restoration or account termination occurs. This prevents abusive notices from immediately removing legitimate material, but requires a staffed monitored process before public launch.
- Current records follow deploy-scoped preview storage; case records do not automatically migrate across preview deployments. Do not accept real legal claims on an ephemeral preview as the official live channel.

Tests: `node --test netlify/lib/content-claims.test.mjs` verifies validation, no unauthenticated read, tenant isolation, summary redaction, declarations, safe origin and audit/counter behavior using isolated fixtures. No real claim, email or takedown was created.
