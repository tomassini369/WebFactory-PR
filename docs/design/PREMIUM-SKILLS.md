# Premium design resources for Codex

Installed on 2026-10-14 from main
`a48463247bd83af78cde289f10548695a76bb61b` in
`chore/codex-premium-design-skills`. The installation commit
`ba99fd54c64633c8363250789eec1cadc5747563` installs guidance and registry aliases;
that commit does not change application screens or install components. The
subsequently authorized unified UX implementation shares the same PR and preview;
see [WORKSPACE-EXPERIENCE-QA.md](WORKSPACE-EXPERIENCE-QA.md) for its changes and checks.

## Resources and provenance

| Resource | Installation | License |
| --- | --- | --- |
| UI/UX Pro Max | `ui-ux-pro-max-cli` 2.15.0, `init --ai codex`; full SKILL.md, scripts, CSV/JSON data and references retained | MIT; upstream notice included |
| Impeccable | Full Codex/Agents distribution from `pbakaus/impeccable`, tag `skill-v4.5.2`, commit `d631a8827f99414d2b6daba4ef08b7f8701751d7` | Apache-2.0; LICENSE and third-party NOTICE included |
| Magic UI | Official `magicuidesign/magicui` skill installed with Skills CLI 1.7.2; source hash in `skills-lock.json` | MIT for free repository; notice included; Pro has separate terms |
| React Bits | Local WebFactory skill; official DavidHDev/react-bits docs and registry | MIT + Commons Clause; component redistribution restricted |

The UI/UX installer also generated six unrelated auxiliary skills. They were
retained outside the checkout in `/tmp/webfactory-uiux-installer-extras`; they
are not part of this PR. The complete UI/UX Pro Max folder remains standalone.
Existing Anti-Slop files and MCP configurations are unchanged.

The official Impeccable installer was executed with
`install --providers=codex --scope=project`, but its universal-bundle download
failed at `impeccable.style` through the environment proxy. The alternative
uses the official versioned Git tree's complete `.agents/skills/impeccable`
distribution, not a recreated skill or a second detector. Its launcher runs
the official engine with SHA-256 sidecar verification. The existing detector
and `.github/workflows/design-quality.yml` remain pinned to 4.1.0.

## Discovery and compatibility

Codex's project discovery directory is `.agents/skills/<name>/SKILL.md`; all
four resources use that layout with `name` and `description` frontmatter.
`npx skills list --agent codex` checks project discovery. The tool-injected
skill catalog of an already running cloud conversation is separate and may
not refresh during that conversation. Explicit AGENTS.md paths allow reading
the installed files now; future tasks must check out the branch or merged code.

The app uses React/React DOM 19.3.0, Tailwind 4.3.3, TypeScript, Vite 8.3.0 and
the existing shadcn new-york/TSX configuration. Existing aliases, CSS variables,
base color and `src/shadcn.css` are preserved. Only registry mappings are added:

```json
{
  "@magicui": "https://magicui.design/r/{name}.json",
  "@react-bits": "https://reactbits.dev/r/{name}.json"
}
```

Skills themselves add no React/runtime dependencies. Registry items must be
reviewed separately: not every catalog component is automatically compatible.
BlurText-TS-TW is only a documented reference command, not installed. Its
official registry lists `motion@^12.23.12`; the app already uses framer-motion.
Do not add another animation dependency or Next.js APIs without an approved
component-specific compatibility review. Native fonts, reduced motion and
the existing design contract override generic font/effect recommendations.

Direct HTTP checks of `magicui.design` and `reactbits.dev` were blocked by this
cloud proxy. Their official registry source files were read through GitHub;
this does not claim live registry HTTP installation was tested. Future approved
component downloads require access to those registry domains. No registry
components, paid assets, tokens or credentials are included in this PR.

## License scope for SaaS templates

MIT and Apache-2.0 notices must follow redistributed source. Preserve
Impeccable's third-party notice. Magic UI Pro and React Bits Pro are outside
the installed free resources and require their own rights.

React Bits' current license permits use inside applications and websites but
prohibits selling, sublicensing or redistributing the components themselves,
alone, in bundles or as ports. Do not assume that a paid downloadable template,
component kit or customer source export has the same rights as hosted SaaS.
Review the actual distribution model before any component adoption. No React
Bits component source has been copied into WebFactory by this installation.

## Current visual audit — recommendations only

Local review of current main captured Home, Builder, login, client overview and
platform admin at 390 and 1440 px in Light/Dark with isolated backend fixtures.
These captures assess layout, not real client/admin data or production APIs.
POS Chromium smoke also exercised ES/EN and both themes at those widths, with
isolated transactions only. The remaining five widths and real iPhone device
performance have not been tested in this audit.

Highest-impact next work:

1. Compact repeated business/header cards so metrics and POS catalog appear
   sooner, especially on iPhone. Preserve identity and active employee context.
2. Reduce prominent repeated Hide/Scroll/Expand toolbars while keeping those
   controls accessible through a clear compact panel-tools menu.
3. Use a consistent hierarchy of canvas, primary panels and inner content.
   Limit blur/shadows and repeated rounded outlines; preserve approved glass.
4. Make transaction total/action easier to reach on phones, with a compact
   order summary and existing cart details accessible on demand.
5. Improve Builder form grouping/progressive disclosure and preview access;
   keep the same shared template renderer and existing fields/steps.
6. Standardize operational typography, metric sizes, filters and table rhythm.
   Keep brand-specific storefront typography and real data/empty states.
7. Enlarge tiny secondary sound/haptic controls and sidebar expand targets.
   Measurements flagged some 18–19px-high controls; their full hit areas require
   checking before calling them confirmed accessibility failures.

The existing Impeccable 4.1.0 detector ran successfully with expected exit 2:
20 static findings (4 layout transitions, 2 grid backgrounds, 7 font warnings,
3 rounded-border accents, 2 gradient text and 2 bounce easing). These are
recommendations, not 20 confirmed visible defects. Font warnings do not
override DESIGN.md's native-stack/no-download preference. Check computed
styles before changing old CSS rules that may already be overridden.

## Installation-commit verification results

- `npx skills list --agent codex`: all four new skills and the three existing
  Anti-Slop skills detected for Codex; no duplicate installation directories.
- UI/UX local Python searches: React `forms` returned two matches; mobile
  touch/spacing query returned three. An initial narrower React query had no
  matches and was retried with the broader term rather than called successful.
- Impeccable full launcher `context --target src/HomePage.tsx`: exit 0,
  existing DESIGN.md resolved. Missing PRODUCT.md is reported; no design
  initialization, hooks or new product assumptions were added.
- Configuration preservation check: entrypoints/frontmatter valid; existing
  components.json properties identical before/after registry addition;
  package.json, lockfile, DESIGN.md, Anti-Slop, MCP manifests and detector
  workflow byte-identical to base main.
- `npm test`: 514 passed, 0 failed, 0 skipped.
- `npm run build`: passed, including TypeScript and Vite. Build outputs are
  local/ignored, not a production deployment.
- POS Chromium fixture QA: eight layout/theme/language cases at 390/1440 px
  passed, plus permissions, retry protection and server-confirmed checkout
  state scenarios. No live payment or customer mutation occurred.
- Visual captures: 20 combinations across five surfaces, two widths and two
  themes. Sampled document overflow was 0; this is not a full accessibility,
  contrast, all-width or real-device Safari certification.
- `git diff --check` passed for project-owned configuration/documentation.
  A full staged check reports pre-existing whitespace in vendored UI/UX
  scripts; upstream files are retained as distributed, not locally reformatted.
- Initial configuration validation hit a sandbox EPERM on its read-only Git
  subprocess; the permitted retry passed. CLI download and live registry
  network limitations are documented above; they were not treated as success.

GitHub CI and Netlify preview are separate remote checks; consult the PR for
their current status. This installation makes no merge or production release.
