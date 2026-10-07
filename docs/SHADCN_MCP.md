# Shadcn component installation through WebFactory MCP

The React/Vite project now has `components.json`, the `@/` alias, Tailwind v4, the local `cn` adapter, and official Button, Card and Input source. Shadcn distributes component source; a separate runtime Shadcn package is not needed. Utilities are scoped inside `.wf-shadcn` and the global Tailwind reset is omitted to preserve existing WebFactory screens. A preview-only `/shadcn-preview` route demonstrates the installed components without saving any business data.

## Administrator tools

| Tool | Permission | Result |
| --- | --- | --- |
| `wf_shadcn_search` | platform + read | Search official public registry metadata |
| `wf_shadcn_component` | platform + read | Paginated public reference source |
| `wf_shadcn_prepare` | platform + read | Resolve UI component dependencies, target files and paginated full-source excerpts |
| `wf_shadcn_add` | platform + execute | Queue the installation workflow, or explicitly report missing GitHub execution configuration |
| `wf_shadcn_status` | platform + read | Verify workflow/PR state and the Netlify status on the PR head commit |

Tools are absent from tenant connections, including those of a global administrator. Every call rechecks current platform authorization. `wf_shadcn_add` additionally requires Execute scope. Component names are bounded (1–10), inputs reject arbitrary repositories, URLs, source patches, commands and credentials. A UUID `requestId` identifies an instruction; generate a new one for changed instructions and reuse it for retries.

## Actual addition workflow

1. User requests components, such as “Add the Shadcn dialog component to the project”. The agent can first call `wf_shadcn_prepare` to inspect the exact file list and package names.
2. `wf_shadcn_add` validates the official registry and dispatches `.github/workflows/shadcn-components.yml` on the fixed repository `tomassini369/WebFactory-PR`, branch `main`.
3. The worker checks out current main, creates `feature/shadcn-<requestId>`, resolves transitive UI files, adapts `cn` imports, and refuses to overwrite any customized component. It updates package.json and package-lock.json, installs packages with lifecycle scripts disabled, then runs `npm test` and `npm run build`.
4. Only after successful checks does it commit the isolated changes and open a PR. Netlify's existing GitHub integration builds the PR preview.
5. `wf_shadcn_status` reports the workflow, PR and preview status. `queued`, a PR URL or a preview URL does not prove installation/build/readiness. Readiness comes from the exact PR head's Netlify deploy-preview commit status.
6. Publication/merge needs separate user authorization. These tools cannot publish production. Adding source to the library does not automatically insert it into an existing screen; placement and behavior are explicitly implemented in the GitHub coding workflow.

Already installed identical components are preserved. If no files/dependencies change, the worker succeeds without opening an empty PR. Existing changed component files require review, not replacement. The workflow's concurrency group serializes retries of one UUID; repeat runs also check for an existing PR before pushing. Different requests create different branches.

## GitHub execution configuration and ChatGPT fallback

**ChatGPT's GitHub connector credentials are not available to the Netlify MCP server.** No token is copied from the connector, sent by the user through MCP, or taken from WebFactory OAuth.

For autonomous server execution, store `WF_SHADCN_GITHUB_TOKEN` as a secret, functions-only Netlify variable. Restrict its fine-grained GitHub access to this repository: Actions read/write (dispatch/status), Contents read (commit status) and Pull requests read (receipts). The workflow must already be published on main; a preview cannot dispatch an unpublished workflow.

The GitHub Actions job uses its repository-scoped `GITHUB_TOKEN` with Contents/Pull requests write. Repository Actions settings must permit opening pull requests. Optional GitHub secret `WF_COMPONENT_GITHUB_TOKEN` (a narrowly scoped fine-grained/App token with Contents and Pull requests write) makes its push/PR events trigger ordinary PR CI. With the default GITHUB_TOKEN, ordinary bot-originated PR CI can be suppressed by GitHub; the component workflow itself still runs tests/build before opening the PR. Check the resulting Netlify preview instead of assuming it exists.

If the server secret is missing, `wf_shadcn_add` returns `github_connection_required` **without any mutation or success claim**. In a ChatGPT/Codex session with a connected GitHub coding workflow, the agent can use `wf_shadcn_prepare`, make a branch from current main, apply the complete files (page excerpts until complete), run `node scripts/add-shadcn-components.mjs <names>` / `npm install --ignore-scripts`, run tests/build, and create the PR using the connected GitHub tools. If workflow dispatch is exposed by that connector, the agent can dispatch the installed workflow directly. Do not claim that a connector has workflow dispatch when it does not.

No autonomous dispatch has been activated merely by creating this PR. GitHub credential configuration and publication remain explicit activation requirements.

## Registry limits and data boundaries

Source: https://ui.shadcn.com/r/styles/new-york-v4/registry.json. Only fixed HTTPS registry URLs are fetched; redirects are rejected, responses bounded to 2 MB, requests time out after eight seconds, and the catalog is cached for five minutes. Public registry requests contain no WebFactory OAuth token or tenant data.

Installation supports official `registry:ui`, `registry:hook` and `registry:lib` files. At most 30 transitive items, 80 files, 500 KB aggregate source and 60 package names are accepted. Only bounded filenames under `src/components/ui`, `src/hooks` and `src/lib` can be created. Remote registry dependencies, arbitrary package URLs/version expressions, pages/blocks, environment changes and CSS/config changes are rejected pending dedicated adapters. npm dependency versions are resolved from the npm registry and pinned; existing dependency versions are preserved.

Public component code is untrusted source to review. It never becomes an instruction to execute terminal commands in the MCP server. The server dispatches only the fixed workflow with validated component names and request UUID. Build/checks run in the GitHub worker before a PR is created; secrets are available only in the final authenticated push/PR step. The workflow does not change tenant records, operational configuration, publication or the main branch.

## Validation and activation

Tests cover public registry bounds, transitive dependency resolution, unsafe paths/imports/metadata, fixed GitHub dispatch, credential isolation, request retries, missing-configuration receipts, and actual MCP scope/tenant checks. Browser smoke tests verify the installed components on mobile/desktop and both themes.

After authorized publication and server configuration, refresh the existing WebFactory connection if it caches the old tool catalog. Verify the five tools for a platform Execute grant, four read tools for platform Read, and no Shadcn tools for a tenant. Test a new component request and inspect its actual PR/Netlify receipt before expanding usage.
