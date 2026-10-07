# WebFactory PR ChatGPT connection

This integration extends the existing production app. Gmail configuration remains unchanged.

## Connection and authorization

MCP endpoint: `https://webfactorypr.com/mcp` (Streamable HTTP, stateless).
OAuth metadata: `/.well-known/oauth-authorization-server` and `/.well-known/oauth-protected-resource/mcp`.
Public client registration accepts only ChatGPT callback URLs. S256 PKCE, exact resource binding, one-use codes, rotating refresh tokens and reuse revocation are required. Bearer tokens are stored as hashes in the existing private OAuth store, separately from Google tokens. Grants expire after 30 days; access tokens after 15 minutes.

Owners explicitly select one business during consent. A platform administrator can separately select platform-wide access. Business connections remain business-scoped even when the same account is a platform administrator. Each MCP request re-fetches the Identity account and current membership. Staff/manager connections are not enabled in this release.

`webfactory.execute` is the direct write/execute scope. When explicitly authorized, normal supported changes are applied from ChatGPT without a WebFactory approval page. Sensitive, destructive, access, billing, and financial actions return `confirmation_required`; ChatGPT must show the exact phrase and wait for the user to type it in the same conversation before calling `wf_confirm_action`. `webfactory.propose` remains optional for preview-only connections. Action records expire after one hour, site revision checks prevent stale writes, and request UUIDs bind retries to the original instruction.

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

## Optional Graphify context accelerator

WebFactory advertises one additional read-only tool, `wf_graph_context`, as a stable MCP catalog entry so clients do not lose it when tool discovery occurs before the final OAuth grant is known. Visibility is not authorization: every invocation revalidates the active WebFactory grant and fails closed when graph context is unavailable for that scope. It is intended only for dependency, impact, architecture, diagnostic, conflict and multi-system questions where graph context can reduce broad exploration. Simple reads and mutations continue through the normal WebFactory tools and deliberately skip Graphify.

Graphify remains behind WebFactory OAuth and tenant authorization. The Render proxy re-validates the delegated short-lived WebFactory bearer against `wf_connection` and only accepts platform-admin connections with `webfactory.read`; Graphify itself never receives the bearer. No separate Graphify API key is used. Platform code graphs are platform-admin only. Business graph support remains fail-closed and requires an explicit tenant enable flag plus a sanitized tenant graph root. See `docs/GRAPHIFY_CONTEXT.md` for deployment, refresh and isolation requirements.

## Validation

`npm test` includes PKCE, callback/resource/client binding, replay, revocation, concurrent code redemption, scope narrowing, current membership removal, cross-business denial, restricted inputs, redaction, stale proposals, one-time redesign and stateless MCP initialize/list/call tests. `npm run build` validates TypeScript and bundles the existing app. Production connection still requires an actual user OAuth consent and end-to-end verification before declaring activation complete.

## Direct execution model

The existing MCP endpoint, OAuth store, tenant authorization, client-store writers and portal handlers are reused. No second MCP or second database is introduced.

Scopes remain `webfactory.read`, `webfactory.propose` and `webfactory.execute`. Execute is independently consented and may be granted without Propose. Existing grants are not silently upgraded. Revoking Execute takes effect for live connections because each action re-reads the stored grant.

When Execute is present, the MCP publishes direct tools such as `wf_update_catalog`, `wf_update_hours`, `wf_adjust_inventory` and the other supported operation names. It does not publish the old `wf_prepare_*` approval flow for that connection. A normal action validates the current Identity user, membership, capability, site scope, input schema and current revision, performs the existing server-side operation, and returns the stored result. Configuration writers retain atomic revision control and read-after-write verification.

Actions classified as sensitive do not execute on the first call. The tool stores the exact normalized payload and returns `confirmation_required`, a fixed `confirmationId`, the exact `requiredConfirmation`, expiry, and safe before/after information when available. The user must type that exact phrase in ChatGPT. ChatGPT then calls `wf_confirm_action` with only the stored confirmation ID and the exact user-provided phrase. The second call cannot replace the original action payload.

Sensitive confirmation currently covers destructive catalog/employee removal, membership removal or replacement, transaction completion/cancellation/payment-state recovery, refunds, recorded POS sales, new checkout creation, integration disconnection, subscription cancellation, complimentary-access revocation, destructive accounting approvals/payment records/voids, and business-page deletion. Page deletion uses a business-specific phrase such as `DELETE NOVA FADE STUDIO`. Normal price/catalog edits, hours, employees without removal, website/business/design/features/settings, ordinary inventory adjustments, customer updates, payment links, booking rescheduling, calendar sync, kitchen status and supported invitations can execute directly.

Provider credentials, passwords, MFA changes, source code, terminal/deployment access, and unsupported account-security operations remain outside the MCP. Provider OAuth still uses its dedicated provider flow.

Legacy proposal records and the `/chatgpt` review UI remain readable for compatibility, but newly created MCP actions are not approved there. The page is used to authorize/revoke connection permissions and inspect activity. New sensitive actions can only be confirmed through the MCP chat flow.

Execution remains idempotent by request UUID. Cross-business access is denied server-side. Failed or uncertain operations are not blindly retried. Configuration actions retain sanitized audit receipts with actor, role, site, before/after state, result and verification. Other MCP actions retain their stored action/result record and the existing operation-level idempotency controls.

## Validation

`npm test` covers OAuth scope separation, direct Execute without Propose, tenant isolation, direct normal writes, chat-only sensitive confirmation, exact confirmation text, deletion protection, replay/idempotency, stale revisions, Execute revocation and MCP tool exposure. `npm run build` validates TypeScript and the production bundle.

## Shadcn public component reference

Platform-administrator connections can search/read the official public Shadcn registry through `wf_shadcn_search` and `wf_shadcn_component`. Only external public component code is returned; private WebFactory source, command execution, package installation and deployment remain unavailable. Tenant connections do not expose these tools. See [SHADCN_MCP.md](SHADCN_MCP.md).
