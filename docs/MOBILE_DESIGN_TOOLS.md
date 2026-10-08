# Mobile design tools for WebFactory PR

WebFactory PR exposes private platform-administrator development tools through the same mobile-compatible MCP connection used by ChatGPT on iPhone.

## Architecture

ECC-inspired workflow
-> wf_graph_context for dependency/impact analysis
-> Stitch for visual direction and generated screens
-> 21st.dev for expressive component discovery and UI drafts
-> Shadcn for reusable functional React components
-> GitHub branch/PR
-> tests + build
-> Netlify Deploy Preview
-> verification
-> production only after explicit authorization

These tools are development aids. They are not customer-facing WebFactory features and are never exposed to tenant/business OAuth grants.

## Mobile MCP tools

Platform + webfactory.read:
- wf_dev_workflow
- wf_design_status
- wf_stitch_read
- wf_21st_read
- existing wf_shadcn_* read tools
- wf_graph_context

Platform + webfactory.execute additionally:
- wf_stitch_design
- wf_21st_generate
- existing wf_shadcn_add

## Provider credentials

The provider API keys must exist only as secret Netlify environment variables:

- STITCH_API_KEY
- API_KEY_21ST

Never commit these values, put them in plugin manifests, return them from MCP tools, expose them in logs, or send the WebFactory OAuth bearer to either external provider.

Google Stitch is called only at:
https://stitch.googleapis.com/mcp

21st.dev is called only at:
https://21st.dev/api/mcp

The gateway rejects endpoint, credential, command, script and source-code injection fields and uses server-side allowlists for provider tool names.

## Permission boundary

Only a current WebFactory platform administrator can see or call these tools. A tenant-scoped grant cannot access them even if the same identity has an administrator role elsewhere.

Read tools require webfactory.read. Provider operations that create/modify designs or may consume hosted AI credits require webfactory.execute.

## ECC workflow

For meaningful WebFactory changes:

1. plan — inspect current main and production; use wf_graph_context when dependencies matter.
2. test-current-state — reproduce and understand the existing behavior before editing.
3. implement — use the appropriate design/component tools, then change code in an isolated branch/PR.
4. review — inspect diff, security, tenant isolation, accessibility and regressions.
5. verify — run tests/build, Deploy Preview, desktop/mobile, iPhone/Safari, Light/Dark and ES/EN checks as relevant.
6. improve — convert recurring defects into tests, rules or reusable components.

Generated Stitch/21st output is reference material until deliberately adapted to WebFactory and reviewed. It must not be copied blindly into production.

## Validation before publishing PR #98

The production MCP connection cannot expose tools that exist only in the PR's Deploy Preview. Do not merge or publish just to test them, and do not reuse a production OAuth bearer on the preview: grants are bound to their exact MCP resource.

Create a separate, temporary ChatGPT MCP connection to:
https://deploy-preview-98--webfactorypr.netlify.app/mcp

Complete the preview's OAuth flow with the platform administrator account and read access. This requires no provider API key in ChatGPT. Keep the existing production connection unchanged.

On that preview connection, call wf_design_status, wf_stitch_read with list_projects, wf_21st_read with get_usage, and wf_dev_workflow. Do not call generation tools during validation. Provider secret variables must be populated in both Production and Deploy Previews, scoped to Functions, followed by a preview redeploy.

The gateway sends the negotiated MCP protocol version on requests after initialization, matches JSON-RPC response IDs even when SSE contains notifications, and rejects malformed responses. Provider error text is replaced by safe messages before crossing the gateway boundary.
