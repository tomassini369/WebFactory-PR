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
