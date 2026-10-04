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
