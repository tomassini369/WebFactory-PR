# Unified dashboards, POS and Builder

Base main: `a48463247bd83af78cde289f10548695a76bb61b`.
Review branch: `chore/codex-premium-design-skills`; PR #116 is the single review
and Deploy Preview for the skill installation and authorized UX improvements.
No merge or production release is part of this change.

## Implemented behavior

- Client primary navigation exposes only permitted Overview, POS, Bookings,
  Team and Website destinations. Other existing destinations are grouped by
  task in searchable native disclosures; no destinations are duplicated.
- Admin preserves its four destinations with the same navigation pattern.
  Blue/navy operating surfaces replace the previous black/gold dashboard layer;
  login screens, the Home video and scroll tour retain their existing design.
- Confirmed revenue and existing metrics precede attendance. Follow-up links
  count relevant records in the loaded history and respect navigation access.
- A labeled panel-options disclosure replaces three permanently visible tool
  buttons. Expand, Hide/Show and internal scrolling retain their handlers,
  dialog semantics and focus management. Escape closes options before fullscreen.
- POS keeps tenant-colored backgrounds and catalog surfaces. Desktop has a
  catalog/order composition; smaller screens reuse the existing fixed sale
  summary with safe-area spacing. History/tools remain accessible in a disclosure.
- Builder provides Edit/Preview choices on smaller screens with the same
  mounted iframe and draft. Optional location/social/media fields are grouped.
  Existing templates, device controls, uploads and publishing handlers remain.
- Feedback buttons have labeled 44px icon targets. Navigation width changes no
  longer use springs; operating surfaces respect reduced motion and forced colors.

## Scope and reuse

UI files: `src/UploadedSidebar.tsx`, `src/ClientAdminPage.tsx`,
`src/BusinessControlCenter.tsx`, `src/WebFactoryAdminPage.tsx`,
`src/PortalPanel.tsx`, `src/PortalPanel.css`, `src/PosWorkspace.tsx`,
`src/WebFactoryBuilder.tsx`, `src/feedback/FeedbackPreferences.tsx`,
`src/TemplateLayout.tsx`, `src/workspace-experience.css`, `src/main.tsx`.
Legacy glass selectors in `src/phase3-premium.css`, `src/portal-glass.css` and
`src/glassy-original-effects.css` exclude the new operating roots to avoid
conflicting `!important` surfaces. Other legacy scopes are retained.

No changes to backend functions, databases, auth, permissions, checkout,
financial verification, bookings, workforce records, MCP manifests or package
versions. Existing role filters, PortalPanel provider, revenue charts, POS
sale/attempt handlers and TemplateLayout/StorefrontPreview are reused.

QA scripts interact with actual native disclosures and controls through
`scripts/qa-workspace-navigation.mjs`. Existing browser scenarios retain their
functional assertions; the navigation hover expectation is reduced for the
approved restrained feedback and touch assertions require 44px on desktop too.
New workspace/admin matrices run in CI, with an additional isolated-fixture
check against the deployed PR preview in Chromium and WebKit.

## Corrections found during validation

- Older glass rules overrode new KPI colors and grid placement: narrowly exclude
  the new roots and verify measured metric text contrast rather than appearance.
- An initial sidebar margin duplicated the existing grid offset: keep the
  original grid architecture with scoped spacing.
- POS phone headings reserved panel-tools space twice: reserve it only once.
- A site-status translation was referenced outside its component scope:
  move it to a shared helper; TypeScript and browser checks detect the regression.
- Clearing the last optional Builder value closed its disclosure: persist the
  native open state independently of those values.
- Empty template hero/gallery URLs produced React warnings and self-fetches:
  render those three images only when a configured source exists.
- The production CSS minifier retained only the final vendor-prefixed backdrop
  declaration, letting an older standard blur win on Chromium. Place the
  standard property last and verify computed styles on the built app, not just
  the development server.
- The secondary reports action inherited white text on a light canvas: use the
  workspace surface/text tokens and include that action in contrast assertions.
- Global FAQ summary styles imposed 76px on panel options: explicitly preserve
  the compact 44px option target without changing FAQ design.
- WebKit QA overlapped a development CSS hot reload and destroyed an iframe
  execution context: rerun against the stable build; do not call that run passed. A separate
  intermittent Admin navigation failure passed its isolated reproduction; the
  full stable-build WebKit matrix is required before calling that matrix passed.

- The actual Netlify preview injects a separate “Netlify Drawer” iframe. The
  initial remote QA used a generic iframe locator and failed strict matching;
  scope it to `.wf-template-preview-frame` and include an unrelated hidden iframe
  in the isolated regression scenario. The application renderer is unchanged.
  A local check with the published CSP headers also passed both mobile themes;
  CSP was not weakened or identified as the cause.
- A second remote QA failure came from the unguarded theme initialization script
  executing inside Netlify's restricted third-party iframe. Initialize only the
  top window, preserving error assertions. An opaque-frame negative reproduction
  also exposes Playwright's own service-worker-blocking initializer limitation;
  the dedicated local opaque-frame case permits service workers to isolate the
  storage guard. Default and remote QA still block service workers. Sixteen normal cases and
  four dedicated opaque-frame cases passed in Chromium/WebKit after the guard.
  An intermediate POS WebKit CI failure did not recur in the following run;
  preserve diagnostics and do not claim an unproven runtime cause.

## Validation

Local results already executed:

- `npm test`: 514 passed, 0 failed, 0 skipped.
- `npm run build`: passed, including TypeScript and Vite after the status-helper fix.
- Unified workspace and Admin: 28 cases each in Chromium and WebKit, 112 total,
  across 320/375/390/430/768/1024/1440 px, ES/EN and Light/Dark. Drafts,
  mounted iframe, role filtering, chart focus and metric contrast passed.
- POS: 28 layout/theme/language cases in each engine, 56 total, plus isolated
  permissions, empty stock/catalog, exact-attempt retry, reload protection,
  pending Stripe verification, server confirmation and distinct new-sale IDs.
  Seven tenant colors produce different canvases in each theme; invalid colors
  retain the established fallback.
- Built portal workspaces: 20 cases plus revenue unavailable/zero/partial states,
  search, role restrictions, business switching, draft cancel/confirm and failed
  logout retention passed. Tests inspect closed groups too, so hidden controls
  cannot produce false permission results.
- Keyboard/recovery-form smoke: 390/1280 px passed, including Tab wrapping,
  inert siblings, nested Escape behavior, restored focus and protected recovery
  form/retry state. The recovery request is intercepted, never sent to a tenant.
- Template workspace: 36 library/demo/Builder cases passed, including equal-width
  style parity, stored custom data and cart persistence while switching views.
- Template renderer regression: 46 template/language combinations passed, with
  custom colors, media, feature gates, missing team and four legacy layout checks.
- Kiosk WebKit: eight cases at 390/1440 px, plus isolated administrator enablement,
  branch pairing/revocation and long-catalog/20-line-cart checks passed.
- Final secondary-action and compact-options checks: eight cases in each engine
  passed after the production minifier correction. Metric and secondary-action
  text contrast is measured at >=4.5:1; panel options measure 44px.
- Netlify review-iframe regression: eight cases per engine passed with an
  unrelated iframe present. Published-CSP reproduction: both mobile themes passed.
- `git diff --check` passed for these project-owned changes. No lint script is
  defined in package.json; modified browser scripts are syntax-checked with
  `node --check`, and TypeScript validation runs in the build.
- Impeccable 4.1.0: executed with expected advisory exit 2; 20 findings (4 layout transitions, 2 grid backgrounds, 7 font warnings, 3 border accents, 2 gradient-text rules and 2 bounce easings). Native fonts are intentional; computed operating styles disable their legacy decorative rules and layout transitions. This static report is not 20 confirmed visible defects.

The final CSS compiled with both the prefixed fallback and standard backdrop
property, and computed Chromium navigation blur is `none`. The full stable-build
WebKit Admin rerun passed all 28 cases after the earlier intermittent failure.
CI and deployment status are verified against the PR's exact commit at delivery.
The existing full CI suites are retained; no previous check is disabled.
All browser QA uses isolated intercepted fixture data. Its displayed amounts
verify rendering and existing state transitions, not real financial activity.
No test records a real sale, attendance event or customer mutation.

WebKit touch emulation is Safari-engine evidence, not a physical-iPhone test.
WebFactory/Graphify and design MCP tools were rechecked in Codex's callable tool
catalog and were absent; local project skills and existing components were used.
The cloud proxy restricts direct preview browser access. GitHub Actions runs
checks against the matching Netlify PR deployment; its results are separate
from local checks. Production remains outside this review.

## Visual comparison with the base

The comparison uses the same isolated fixtures on base main and this branch;
it is not a capture of private production tenant data.

| Base presentation | Review presentation |
| --- | --- |
| Many destinations presented at the same level | Five permitted client priorities / four Admin priorities, with searchable secondary groups |
| Three panel controls displayed throughout each workspace | One labeled options disclosure with the same actions and keyboard access |
| Black/gold operating layer and legacy translucent metric strip | Consistent blue/navy surfaces, individual readable metrics and a clear revenue priority |
| POS tools always visible above catalog | Focused catalog/order composition, tools on demand and existing fixed phone summary |
| Phone Builder stacks editing and preview | Edit/Preview choices using the same renderer and preserved draft/cart |

Twenty before/after fixture captures cover Home, Builder, login, client overview
and Admin at 390/1440 px in both themes. Home video/tour and authentication
remain in their original design; the visible operating surfaces are changed.
Seven-width browser assertions independently check document overflow.
