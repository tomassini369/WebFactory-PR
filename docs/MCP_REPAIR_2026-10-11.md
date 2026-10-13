# MCP / ChatGPT repair investigation — 2026-10-11

## Evidence and limits

- Repository main and the active Netlify production deploy both use commit
  `07fb76077d51aa964dc63e293fe8732d9e1152aa`.
- Production deploy: `6acb365b2043370008dd9dd2`, ready, published
  2026-10-11 07:11:03 UTC. It includes chatgpt-mcp and chatgpt-oauth functions
  with the configured /mcp and well-known/OAuth routes.
- In the investigation's ChatGPT Work session, the official connection exposed
  47 tool names. wf_connection and wf_business executed successfully. This is
  client-catalog evidence plus two real authenticated reads, not an assertion
  that all advertised tools execute correctly.
- The current OAuth grant is tenant-scoped (`platform: false`) with Read,
  Propose and Execute. The returned identity is a different account from the
  previously described platform owner. Identity and business details are
  intentionally excluded from this public report.
- The absence of private Stitch, Shadcn, 21st.dev and ECC tools is explained by
  the selected tenant grant. Tenant grants must not be upgraded automatically.
- wf_graph_context was discovered. Its first test exceeded the schema's 1600
  token limit; the corrected safe retry returned a generic error. The code
  returns that generic error when tenant graph context is not enabled, but
  without production env/log access the exact runtime cause of this generic
  response cannot be independently distinguished from a provider failure.
- The earlier total absence of tools is not reproducible in this session. No
  client discovery traces from the affected chats are available. A historical
  ChatGPT cache/runtime fault cannot be confirmed or ruled out from this repo.
- GET /mcp returns HTTP 401, JSON, no-store, and the correct resource-metadata
  challenge. Observed Netlify request ID: `01M4NYEBW5G738EVSCDC9AJTKF`.
- Public production smoke checks passed for /chatgpt, both metadata contracts,
  portal authentication, and unauthenticated initialize, tools/list and
  tools/call challenges. No raw authenticated production tools/list or
  initialize was captured; connector-managed bearer credentials were not read.

## Confirmed defects and corrections

1. Bundled plugin instructions only allowed wf_prepare_* and demanded portal
   approval, while Execute grants advertise direct wf_* tools. Updated the
   instructions and manifest to follow the current server and chat confirmation.
   This is an instruction mismatch, not proof of transport discovery failure.
2. Expected graph-disabled errors were replaced by a generic portal error.
   Return a fixed, safe code/message and direct-tool fallback without enabling
   tenant graphs or leaking backend/provider details.
3. wf_connection did not identify the authorized catalog. It now returns the
   exact registered names, count, scope, server version and configuration-only
   graph status. This enables evidence-based comparison with client discovery.
4. Token errors were all labeled invalid_request; expired/revoked grants could
   return HTTP 401 from token exchange instead of OAuth invalid_grant. Token
   responses now use invalid_grant, invalid_scope and unsupported_grant_type
   appropriately, preserving exact audience, PKCE, rotation and replay handling.
   No evidence shows that these errors caused the earlier reported outage.
5. Provider generation and other writes advertised idempotentHint=true even
   when repeat invocation may create resources. Writes now conservatively omit
   that promise via false; read-only tools retain true.
6. Function handlers now support explicit injected dependencies for isolated
   HTTP testing. Production defaults still authenticate the real OAuth store
   and fetch the current Identity user; request parameters cannot inject them.

## Executed checks

- Baseline npm test: 486 passed, 0 failed.
- Updated npm test: 492 passed, 0 failed. New tests exercise authenticated HTTP
  initialize/list/call, notifications, malformed JSON, Accept negotiation,
  POST-only behavior, payload limit, no-store, token expiry and the exact tenant
  and platform catalogs. Existing tests retain cross-business denial and
  private development tool authorization.
- OAuth HTTP tests exercise metadata, PKCE redemption, access expiration,
  refresh rotation/replay revocation, standard error codes and revoked grants.
- npm run build: passed (TypeScript and complete Vite build).
- Changed JavaScript syntax checks, git diff --check, plugin JSON and skill
  frontmatter validation: passed. No lint script/config exists in package.json;
  an ESLint pass was not claimed.
- Production public HTTP smoke: passed. Authenticated reads through this Work
  connector: wf_connection and wf_business passed; wf_graph_context returned
  an error. No writes or private business mutations were executed.

## Remaining activation and external verification

- Review the PR and preview. Production changes require explicit owner approval.
- For platform development, use the intended administrator account during an
  actual OAuth authorization, explicitly choose platform administration and
  the required Read/Execute permissions. Verify identity and platform=true via
  wf_connection before testing private read tools. Do not modify this tenant's
  scope or permissions to bypass the boundary.
- Repository plugin files are not automatically the installed ChatGPT package.
  The owner must update that package using its existing distribution workflow;
  a web deploy alone will not rewrite an installed skill or cached catalog.
- Verify authenticated discovery/calls in both intended ChatGPT clients after
  authorization. Server HTTP success and client tool exposure are separate.
- Netlify tool capabilities in this session expose deploy/site metadata, but
  not function logs or project-level environment values. No secret values were
  requested. Platform Graphify/provider checks and production token refresh
  require the proper authorized scope and cannot be claimed from tenant reads.
- If an affected ChatGPT chat still exposes zero tools while the authorized
  server catalog is verified, obtain a sanitized client-side discovery trace
  and report the endpoint, time, versions/statuses and request IDs to client
  support. That client registration/runtime cannot be rewritten from this repo.
- iPhone/native ChatGPT and desktop UI were not remotely exercised. The
  transport tests verify protocol behavior, not every client application's UI.

## Follow-up: administrator connection and App catalog ownership

After the owner switched connections, wf_connection verified platform=true with
Read and Execute. A bounded wf_graph_context retry successfully returned
platform-code context, so Graphify is not universally broken. Private development
tools remained absent from this Work thread's offered tool registry.

Inspection of the actual installed official plugin shows it is an App-backed
custom MCP plugin, not the repository's standalone plugin package. Its current
source contains only an App binding and generated legacy presentation manifest,
with no bundled manage-webfactory skill. The separately owned legacy plugin has
different App identity and already-correct direct-execution instructions. Neither
was deleted, replaced or duplicated. The earlier package-instruction corrections
apply to the repository package, not automatically to the active official App.

OpenAI's official connection guide documents Refresh in the custom App's details
as the action that imports updated tool metadata. Plugin Creator's source editor
cannot modify the App-owned MCP binding/catalog. Browser inspection of the
existing official App verified OAuth authentication, the canonical /mcp endpoint
and a Refresh tools control. The plugin's host action permission was Read-only;
this is separate from OAuth Execute and was not silently changed.

Server version 1.0.2 adds initialize instructions about rechecking identity/scope
and refreshing the existing App metadata after a scope change. The existing
wf_connection diagnostic adds a catalog fingerprint derived from validated
identity, scope, permissions, version and registered names. It does not expose
user IDs or tokens and is stable across token refresh with the same catalog.
These diagnostics cannot directly force ChatGPT to re-import tools.

The existing official App's Refresh tools control was invoked in ChatGPT. Its
loading state completed and the control became available again, but there was
no visible success confirmation or changed version ID. A fresh tool-registry
search in this running thread still did not expose the private admin tools.
wf_connection remained executable and verified platform=true. Therefore the
refresh attempt is recorded, not reported as a successful catalog repair; a
new conversation must verify the imported catalog before declaring success.

A new real-handler/SDK regression switches tenant -> platform-admin -> tenant
on the same endpoint. It verifies admin discovery, private-tool absence/denial
for tenants, distinct catalog fingerprints and expired-token rejection without
borrowing the other connection's catalog. Updated suite: 493 passed, zero failed;
complete build and TypeScript passed again.

Official references:
- https://developers.openai.com/plugins/deploy/connect-chatgpt
- https://developers.openai.com/api/docs/guides/custom-mcp-server
