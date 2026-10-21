# WebFactory PR: UI Design and Anti-Slop Agent Policy

This repository's authoritative visual contract is `DESIGN.md`, together with
`docs/design/DESIGN-PORTALS.md` and `docs/design/DESIGN-TEMPLATES.md`.
The product is the existing V3 WebFactory PR SaaS, not a greenfield redesign.

## Required for work on UI, UX, marketing copy, layouts or design tokens

1. Read `DESIGN.md` and the relevant page's existing styles/components first.
2. Apply the vendored MIT-licensed antislop skills:
   - `.agents/skills/antislop/SKILL.md` (core filter)
   - `.agents/skills/antislop-ui/SKILL.md` (visual design)
   - `.agents/skills/antislop-human/SKILL.md` (accessibility)
   The upstream references to `antislop.md` mean the vendored core SKILL.md.
   Use the **After** / audit-existing-work mode for the existing site.
3. Run the Impeccable deterministic detector, document findings, and treat
   its suggestions as recommendations, not automatic changes:
   `npx --yes impeccable@4.1.0 detect --json src/ > impeccable-report.json`
   The CLI uses exit code 2 when it finds issues; an exit code of 1 indicates
   an execution failure. The optional design-review workflow uploads the report.
4. Implement only purposeful, scoped visual improvements. No fabricated
   testimonials, metrics, clients, transactions, or AI filler copy.
5. Preserve the approved Hero video behind its text and native scroll tour,
   existing brand tokens, language/theme controls, approved glass components,
   mobile navigation, all tenant storefront templates, and login/portal patterns.
6. Do not alter auth, payments, bookings, tenant boundaries, or production
   data for aesthetic reasons. Do not replace the Builder or add a duplicate UI.
7. Validate 320/375/390/430/768/1024/1440 px, ES/EN, Light/Dark,
   keyboard access, reduced motion, Builder, Templates and portal logins.
   Run `npm test`, `npm run build`, and the current browser smoke tests.
8. Open a pull request and review its Netlify Deploy Preview. Production
   deployment requires the owner's explicit approval.

See `docs/design/AI-SLOP-QA.md` for the workflow and upstream attribution.

## Premium design skills for Codex

Project skills are in `.agents/skills/`. Keep the existing Anti-Slop skills and
MCP configurations. These resources support the existing product; installing
them does not authorize a redesign, new visual components, or production work.

- **UI/UX Pro Max:** `.agents/skills/ui-ux-pro-max/SKILL.md`. Use its complete
  local Python search/data bundle for a specific UX concern and the React or
  Tailwind stack. Recommendations do not overwrite the existing design system.
- **Impeccable:** `.agents/skills/impeccable/SKILL.md`. Full 4.5.2 skill,
  playbooks and launcher; use audit/critique for existing screens. Preserve the
  separate pinned `impeccable@4.1.0` detector and current CI workflows. Do not
  enable hooks, generate PRODUCT.md, or run an initialization as an installation
  side effect. Missing PRODUCT.md does not block this existing-project audit.
- **Magic UI:** `.agents/skills/magic-ui/SKILL.md`. Official skill and references.
  shadcn is already initialized: never run `shadcn init` or replace
  `components.json`, even if an upstream troubleshooting example suggests it.
  Use its configured `@magicui` registry only for specifically approved components.
- **React Bits:** `.agents/skills/react-bits/SKILL.md`. WebFactory's local
  integration guidance, not an official React Bits published skill. Consult
  DavidHDev/react-bits and use only approved TypeScript/Tailwind variants.

`DESIGN.md`, its approved surface revisions, Anti-Slop and the user's task
take priority over generic style suggestions. Preserve native fonts, tenant
colors (including POS backgrounds), original Hero video and interactive scroll,
ES/EN, Light/Dark, keyboard focus, 44px touch targets and reduced motion. Prefer
existing components; avoid decorative grids, continuous effects, heavy blur,
new animation engines and duplicated dependencies. Never change auth, Stripe,
ATH Móvil, bookings, POS/kiosk logic, tenant data or MCP for a design task.

Before an approved registry addition, inspect its files, dependencies, React 19,
Tailwind 4 and Vite compatibility, reduced-motion behavior and license. React
Bits has a Commons Clause restriction on redistribution of the components
themselves; distinguish hosted application use from selling template/source
bundles. Free Magic UI's MIT license does not license Magic UI Pro assets.
See `docs/design/PREMIUM-SKILLS.md` for provenance, checks and limitations.

## Interactive training

The existing portal, POS, Builder, kiosk and display are reused under a scoped
practice context. Read `docs/design/INTERACTIVE-TRAINING.md` before changing it.
Never introduce a network fallback in `src/training/practice-runtime.mjs`, copy
real tenant records into a practice checkpoint, or make a practice action call
live payment, attendance, invitation, OAuth, MFA or subscription services.
Keep the live workspace/cart mounted and inert while training runs, and retain
the pending-payment entry guard. Scope saved progress by user, business and role.

Guided action steps advance on validated component/result events; reference
steps must label themselves. Keep the nonmodal keyboard adapter when upgrading
Driver.js. Run the training unit suites, build and
`scripts/browser-training-smoke.mjs` on Chromium and WebKit, including the
existing widths, ES/EN and Light/Dark. Preserve the normal live transport and
run the existing POS, workforce, kiosk and Builder regression checks.


## Commercial access (Owner / Employee)

The active commercial product has only `owner` and `employee`. Internal platform
admin is a trusted authorization, never a selectable business role. Reuse
`netlify/lib/commercial-access.mjs` and the canonical site membership on every
request; never infer authority from a sidebar, cached token role or email index.
Professional profiles do not require portal accounts. Only the Owner may bind
an authenticated Identity ID to a professional or grant optional capabilities.
See `docs/OWNER-EMPLOYEE-ACCESS.md` for reviewed legacy migration and API history.
ERP, payroll and advanced HR expansion are canceled. Preserve historical data
without restoring clock/salary controls or using attendance for booking slots.
Run the existing browser-workforce entry point as the retirement regression,
plus the commercial-access, training, POS/kiosk and booking security suites.
