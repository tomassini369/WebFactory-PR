# Graphify context gateway

WebFactory PR can optionally use Graphify as a read-only context accelerator behind the existing ChatGPT MCP. It does not replace the WebFactory MCP, OAuth, tenant authorization, direct execution, proposals, or the client-store writers.

## Goal

Use Graphify only when a compact relationship graph can avoid broad exploration. Examples include dependency, impact, architecture, conflict, diagnostic, and multi-system questions.

Simple operations such as changing a price, updating hours, listing bookings, adding an employee, or adjusting inventory must continue to use the normal WebFactory MCP tools directly.

The only WebFactory-facing Graphify tool is `wf_graph_context`. It is advertised as a stable read-only MCP catalog entry even when a particular tenant has no graph enabled, because some MCP clients cache tool discovery before the final OAuth grant is resolved. Visibility never grants graph access: the handler re-authorizes the current grant on every call and fails closed when the authenticated scope has no permitted graph. Keeping this to one tool reduces MCP tool-list overhead and prevents ChatGPT from being exposed to Graphify's lower-level graph tools.

## Security boundary

Graphify is never exposed directly to a WebFactory customer.

```
ChatGPT
  -> WebFactory MCP OAuth
  -> current identity + membership check
  -> wf_graph_context
  -> delegated WebFactory OAuth bearer
  -> Render Graphify OAuth proxy
  -> re-check wf_connection (platform admin + webfactory.read)
  -> selected graph
```

The Graphify service has no separate shared API key. WebFactory delegates the short-lived OAuth bearer already presented by ChatGPT. The Render proxy validates a new bearer against `wf_connection`, then caches only a SHA-256 digest of a successful authorization for a short bounded TTL (30 seconds by default) so the MCP initialize/initialized/tools-call sequence does not repeat the same remote authorization check three times. Only `platform: true` connections with `webfactory.read` are allowed to reach the WebFactory source-code graph. The raw token is stripped before the request reaches Graphify itself and is never stored in the authorization cache.

Platform connections use the configured platform graph. Business connections can only use:

```
<GRAPHIFY_TENANT_PROJECT_ROOT>/<authorized-siteId>/graphify-out/graph.json
```

Do not place WebFactory source code, provider credentials, OAuth tokens, passwords, API keys, private calendar tokens, or another tenant's data inside tenant graphs.

## Required Graphify service

Graphify runs as a persistent Python service outside the existing Netlify JavaScript function. The Render service builds the WebFactory graph locally with AST extraction and starts `scripts/graphify_oauth_proxy.py`.

The proxy wraps Graphify's Streamable HTTP server and protects `/mcp` with the existing WebFactory OAuth connection. A platform-wide WebFactory connection must be selected during OAuth consent; an ordinary business-scoped connection remains business-scoped even when the same identity is a WebFactory administrator. A request without a Bearer token is rejected. A tenant/business token is rejected. Successful platform authorization is cached briefly by digest to cover one MCP exchange; with the default TTL, permission revocation may take up to 30 seconds to be reflected by Graphify.

The current default endpoint is:

```
https://webfactory-graphify-prod.onrender.com/mcp
```

`GRAPHIFY_MCP_URL` remains an optional Netlify override if the Render service moves.

No `GRAPHIFY_API_KEY` is required.

### Resilience controls

- `GRAPHIFY_MCP_TIMEOUT_MS`: total Netlify to Graphify request budget. Default 25000 ms; clamped to 5000-30000 ms. Transient 502/503/504 responses during a Render cold start are retried with bounded backoff inside this same budget.
- `GRAPHIFY_AUTH_TIMEOUT_SECONDS`: Graphify proxy to WebFactory authorization timeout. Default 12 seconds; clamped to 3-20 seconds.
- `GRAPHIFY_AUTH_CACHE_TTL_SECONDS`: successful authorization-digest cache. Default 30 seconds; clamped to 0-60 seconds.
- Failed or denied authorization checks are never cached.

### Tenant graph safety

The deployed Render proxy is intentionally for the WebFactory platform source-code graph. Business/customer connections do not receive `wf_graph_context` by default.

Future tenant graphs require both:

- `GRAPHIFY_TENANT_CONTEXT_ENABLED=true`
- `GRAPHIFY_TENANT_PROJECT_ROOT=<trusted sanitized graph root>`

and a proxy implementation that authorizes those tenant graphs. Do not enable tenant context against the platform code graph.

## Routing and cost controls

The gateway deliberately skips Graphify for ordinary CRUD/read requests. It only invokes Graphify for questions that look like dependency, impact, architecture, diagnostic, relationship, conflict, or multi-system analysis.

Limits:

- Question length: 800 characters.
- Traversal depth: 1-4.
- Tenant response budget: 200-1000 Graphify tokens, default 800.
- Platform response budget: 200-1600 Graphify tokens, default 1200.
- Remote response body: 60 KB maximum.
- Remote timeout: 25 seconds by default (configurable from 5-30 seconds) to tolerate Render free-tier cold starts.
- HTTPS required except localhost development.

These controls are intended to keep Graphify a context reducer, not an extra mandatory step.

## Tenant graph generation

The gateway supports tenant graphs, but it does not generate them inside a customer request. A separate trusted sync/build job must create sanitized tenant snapshots and run Graphify against those snapshots.

Recommended tenant snapshot content:

- business name and public business settings;
- services/catalog metadata;
- employees and scheduling relationships without private credentials;
- business hours, locations, booking rules, enabled features and integrations as status only;
- inventory/category relationships when useful.

Do not include customer PII unless a concrete graph use case requires it. Prefer aggregate or structural relationships. Do not include secrets or source code.

A tenant graph build failure must leave the existing WebFactory MCP fully functional; direct tools are the fallback.

## Platform graph refresh

The platform graph should be rebuilt from the current WebFactory repository after meaningful code changes. Graphify supports hot-reload when the `graph.json` file changes, so the external service can refresh the graph without changing the WebFactory MCP endpoint.

## Validation

`netlify/lib/chatgpt-graphify.test.mjs` verifies:

- Platform Graphify uses the built-in HTTPS OAuth proxy without a shared API key.
- Non-HTTPS remote endpoints are rejected.
- Tenant graph exposure is disabled by default; any future tenant paths are derived server-side and reject traversal.
- Simple CRUD requests do not make a Graphify network call.
- The original WebFactory OAuth bearer is delegated to the proxy for the MCP initialize/initialized/tools-call handshake.
- Tenant project paths are fixed from the authorized site id.
- Platform output budgets remain bounded.
