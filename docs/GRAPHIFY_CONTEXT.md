# Graphify context gateway

WebFactory PR can optionally use Graphify as a read-only context accelerator behind the existing ChatGPT MCP. It does not replace the WebFactory MCP, OAuth, tenant authorization, direct execution, proposals, or the client-store writers.

## Goal

Use Graphify only when a compact relationship graph can avoid broad exploration. Examples include dependency, impact, architecture, conflict, diagnostic, and multi-system questions.

Simple operations such as changing a price, updating hours, listing bookings, adding an employee, or adjusting inventory must continue to use the normal WebFactory MCP tools directly.

The only WebFactory-facing Graphify tool is `wf_graph_context`. Keeping this to one tool reduces MCP tool-list overhead and prevents ChatGPT from being exposed to Graphify's lower-level graph tools.

## Security boundary

Graphify is never exposed directly to a WebFactory customer.

```
ChatGPT
  -> WebFactory MCP OAuth
  -> current identity + membership check
  -> wf_graph_context
  -> WebFactory Graphify gateway
  -> private Graphify MCP API key
  -> selected graph
```

The browser/client never receives the Graphify API key. A tenant cannot supply `project_path`; WebFactory derives it from the already-authorized `siteId`.

Platform connections use the configured platform graph. Business connections can only use:

```
<GRAPHIFY_TENANT_PROJECT_ROOT>/<authorized-siteId>/graphify-out/graph.json
```

Do not place WebFactory source code, provider credentials, OAuth tokens, passwords, API keys, private calendar tokens, or another tenant's data inside tenant graphs.

## Required Graphify service

Graphify is a persistent Python service and should not be embedded inside the existing Netlify JavaScript function. Run Graphify separately and let the Netlify MCP call it over HTTPS.

Tested integration target: Graphify `graphifyy[mcp]` 0.9.77 or newer with Streamable HTTP and JSON responses.

Example:

```bash
python -m graphify.serve /data/webfactory/graphify-out/graph.json \
  --transport http \
  --host 0.0.0.0 \
  --port 8080 \
  --api-key "$GRAPHIFY_API_KEY" \
  --json-response
```

Terminate TLS in front of the container and expose only the HTTPS `/mcp` URL to WebFactory. Graphify's API-key authentication is used only between WebFactory and the Graphify service; customer authentication remains WebFactory OAuth.

## Netlify environment variables

`GRAPHIFY_MCP_URL`
: HTTPS endpoint for the private Graphify MCP, for example `https://graph.internal.example/mcp`.

`GRAPHIFY_API_KEY`
: Private service-to-service key. The gateway does not enable Graphify if this is missing.

`GRAPHIFY_PLATFORM_PROJECT_PATH`
: Optional absolute project directory on the Graphify server. If omitted, Graphify's configured default graph is used for platform administrators.

`GRAPHIFY_TENANT_PROJECT_ROOT`
: Optional absolute root containing tenant project directories. If omitted, business/customer connections do not receive `wf_graph_context`.

The tenant Graphify feature is therefore fail-closed: customers do not see the graph tool until a tenant graph root is intentionally configured.

## Routing and cost controls

The gateway deliberately skips Graphify for ordinary CRUD/read requests. It only invokes Graphify for questions that look like dependency, impact, architecture, diagnostic, relationship, conflict, or multi-system analysis.

Limits:

- Question length: 800 characters.
- Traversal depth: 1-4.
- Tenant response budget: 200-1000 Graphify tokens, default 800.
- Platform response budget: 200-1600 Graphify tokens, default 1200.
- Remote response body: 60 KB maximum.
- Remote timeout: 8 seconds.
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

- Graphify remains disabled without both endpoint and API key.
- Non-HTTPS remote endpoints are rejected.
- Tenant paths are derived server-side and reject traversal.
- Simple CRUD requests do not make a Graphify network call.
- MCP initialize/initialized/tools-call handshake is used.
- Tenant project paths are fixed from the authorized site id.
- Platform output budgets remain bounded.
