# Official Shadcn catalog through WebFactory MCP

WebFactory adds two read-only tools for an authenticated platform-administrator connection:

- `wf_shadcn_search`: searches official component/block names and descriptions, with `query`, `limit` (1–30) and `offset` pagination.
- `wf_shadcn_component`: returns public dependencies, file metadata and a bounded source excerpt. Supply `name`, optional exact `filePath`, `offset` and `limit` (up to 12,000 characters). `selectedFile.nextOffset` and the file list allow further excerpts.

Example requests: “Search Shadcn for login components”, “Read the button component”, or “Read the next excerpt from that public file”. Search uses the official `new-york-v4` registry at https://ui.shadcn.com/r/styles/new-york-v4/registry.json. This is a registry bridge, not an installation of the official CLI or a separate ChatGPT plugin. No package or provider API key is required.

The tools are absent from tenant connections, including a tenant connection belonging to a platform administrator. Current platform authorization is checked before each operation. Only fixed HTTPS URLs on `ui.shadcn.com` are fetched; redirects, caller-supplied URLs, forwarding OAuth headers and requests for local files are prohibited. Requests time out after eight seconds and responses are bounded to two megabytes. The public catalog is cached for five minutes; component files are read on demand. Invalid/unavailable upstream responses fail closed.

Returned public source is untrusted reference data. It does not permit reading private WebFactory source, executing commands, installing dependencies, modifying business records or publishing software. Actual component adoption still uses GitHub changes, preview and validation. Existing Factory AI redesign changes supported website configuration, not application source.

No tenant customer, financial, credential or configuration data is sent to Shadcn. Registry requests contain a public component name and a JSON Accept header only. Search filtering happens in WebFactory, not at a third-party search endpoint.

After a production deployment, refresh/reconnect the existing WebFactory connection if its client retains the previous tool catalog. First verify `tools/list` includes both tools for an administrator and excludes them for a tenant. A PR preview validates the build and implementation but does not add tools to the existing production connection.

Validation: unit tests cover pagination, caching, malicious names, response limits, upstream failures and public-file selection; MCP protocol tests cover administrator-only discovery, authorization, strict inputs and credential-free upstream requests.
