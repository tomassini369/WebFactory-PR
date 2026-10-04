# WebFactory PR ChatGPT connection

This integration extends the existing production app. Gmail configuration remains unchanged.

## Connection and authorization

MCP endpoint: `https://webfactorypr.com/mcp` (Streamable HTTP, stateless).
OAuth metadata: `/.well-known/oauth-authorization-server` and `/.well-known/oauth-protected-resource/mcp`.
Public client registration accepts only ChatGPT callback URLs. S256 PKCE, exact resource binding, one-use codes, rotating refresh tokens and reuse revocation are required. Bearer tokens are stored as hashes in the existing private OAuth store, separately from Google tokens. Grants expire after 30 days; access tokens after 15 minutes.

Owners explicitly select one business during consent. A platform administrator can separately select platform-wide access. Business connections remain business-scoped even when the same account is a platform administrator. Each MCP request re-fetches the Identity account and current membership. Staff/manager connections are not enabled in this release.

The optional propose scope lets ChatGPT prepare actions, not execute them. The owner opens `/chatgpt?proposal=...`, signs in through the existing portal (including MFA), reviews the payload and preview, and types CONFIRM. Deleting a page requires DELETE PAGE. Proposals expire after one hour. Site revision checks prevent applying stale designs. A conditional processing marker prevents duplicate execution. Failed/uncertain outcomes require portal review and are never automatically retried. A request UUID binds retries to the original instruction.

## Implemented capabilities

- Business configuration, paginated orders/bookings/customers/receipts/payment links/inventory/review requests, accounting report and administrator business listing, platform overview/health and platform-only revenue.
- Proposals for business/design/features/catalog/employees/hours/payment rules/settings/taxes/membership/review settings.
- Existing order/booking actions, availability and revision-checked rescheduling, refunds, recorded POS sales, inventory adjustments, customers, payment links, receipt resend, member invitations/revocation and subscription renewal cancellation.
- Salary/hours/cost/payment-record/accounting entries through the existing owner-only ledger. These record data; they do not pay employee wages.
- Existing integration disconnection and Stripe enablement; credentials and provider authorization remain in the portal.
- Platform trial/complimentary invitations, complimentary revocation and page deletion, for explicitly authorized administrators only.
- Website redesign uses the existing Factory AI configuration sanitizer, actual storefront preview and atomic revision-controlled publication. ChatGPT supplies structured design; this does not invoke the existing Anthropic provider, edit source code, or deploy software.

## Manual workflows and remaining coverage

Password changes, MFA management, account-wide deletion, provider OAuth/credentials, checkout payment approval, and source/deployment access are deliberately not MCP actions. Asset uploads, backup download/restore and provisioning a new website still use the existing portal. This first connection does not claim every existing portal feature is exposed as a tool. Accounting report arrays are limited to 500 rows; complete exports remain available in business analytics.

Disconnect at `/chatgpt` to revoke the grant immediately. Prior data shared in ChatGPT conversations is not deleted by revocation. The privacy policy describes this data transfer. Model-visible records never intentionally include credential or private calendar-management token fields; do not add raw storage export tools.

## Validation

`npm test` includes PKCE, callback/resource/client binding, replay, revocation, concurrent code redemption, scope narrowing, current membership removal, cross-business denial, restricted inputs, redaction, stale proposals, one-time redesign and stateless MCP initialize/list/call tests. `npm run build` validates TypeScript and bundles the existing app. Production connection still requires an actual user OAuth consent and end-to-end verification before declaring activation complete.

## Execute extension (preview; not production-approved)

Audited base: main f3dadbb. Existing entry points remain chatgpt-mcp, chatgpt-oauth and chatgpt-control; existing client-store, Identity authorization, configuration sanitizers and conditional site writes are reused. No second MCP or database is introduced.

The ChatGPT connector chooses `link_id` outside WebFactory. WebFactory does not accept a caller-supplied link_id as authorization: the bearer token resolves a stored grant, Identity user and fixed business scope. Primary Portal is a separately consented platform grant; Client Portal is an owner grant fixed to one business. Both revalidate current roles server-side.

Scopes: webfactory.read; webfactory.propose; webfactory.execute. Execute requires a fresh OAuth request including that scope, with a separate unchecked consent checkbox. Existing grants are unchanged. Revoking only Execute takes effect for existing access tokens because every request reads the live grant.

Existing wf_prepare_* tools remain the proposal API. New tools: wf_get_proposal, wf_cancel_proposal, wf_execute_change (visible only with Execute). Proposals bind user, grant, site, parsed operation, exact normalized before/after, diff, site revision and expiry. To execute, show the diff and approvalUrl, wait for the user to review and type the confirmation in WebFactory, then call wf_execute_change with only proposalId. Chat confirmation text alone is not a server authorization. The agent must never fill this approval on the user's behalf.

Direct execution initially covers business, catalog, employees, hours, paymentRules, settings, design, features and redesign. Existing sanitizers determine supported fields. Catalog/employees removal requires CONFIRM DELETION. Other sensitive flows remain portal-only; refund/disconnection/subscription and payment-related portal proposals now require CONFIRM SENSITIVE ACTION, while page deletion retains DELETE PAGE. Account-wide deletion remains unsupported. No new booking rules beyond fields already supported by these configuration sections are invented.

The new executor uses pending → confirmed → executed/failed, plus cancelled/expired. A conditional one-use claim prevents races; a site revision and conditional storage write prevent stale overwrites. Cancel is denied after an execution claim. Ambiguous crashes retain the claim and must be reviewed, never retried automatically. Legacy portal-only actions retain their legacy status names for compatibility.

Receipts at chatgpt/audit/<auditId>.json record the actor, role, business, operation, sanitized before/after, timestamps, result, verified, success and sanitizedError. Platform actions are labeled platform-admin action. Read-after-write compares the actual persisted fields with the approved state. No HTTP status alone implies success. Preflight authorization/validation rejections do not mutate the business; an execution receipt is written once a proposal is claimed. An interrupted execution can leave a started receipt requiring manual review.

Security tests cover owner/admin isolation, missing scope, missing confirmation, expiry, replay and concurrent execution, tampered payload/site, concurrent business revision, reinforced deletion confirmation, read-after-write mismatch, receipts and independent Execute revocation. Existing OAuth/portal tests remain in the suite.

Home navigation reuses the existing bilingual desktop/mobile link list and existing FAQ section with #faq, sticky-header offset, reduced-motion-aware scrolling and existing theme styles. Privacy and Terms were updated in place in both languages.
