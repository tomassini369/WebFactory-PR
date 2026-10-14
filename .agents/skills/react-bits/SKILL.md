---
name: react-bits
description: Local WebFactory guidance for selecting and integrating approved React Bits TypeScript/Tailwind components into the existing React 19 and Vite application, with motion, accessibility and license checks.
---

# React Bits — local WebFactory integration

This skill was written for WebFactory. It is not an official skill published
by React Bits. The component source and documentation are official upstream.

## Sources

- Repository: https://github.com/DavidHDev/react-bits
- Documentation: https://reactbits.dev/
- Installation: https://reactbits.dev/get-started/installation
- Registry: `https://reactbits.dev/r/{name}.json`
- Registry source: `public/r/` in the official repository.
- License: https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md

## Before adding anything

1. Read AGENTS.md, DESIGN.md, the surface brief and current implementation.
   Existing product behavior, brand colors and Anti-Slop take priority.
2. Identify a concrete user benefit. Prefer existing components and native CSS.
   A request to install this skill is not approval to add visual components.
3. Install only a component specifically approved within the user's task.
   Choose a `-TS-TW` variant; inspect its registry JSON, full source, dependency
   versions and peer requirements before any install. Never add JS-only,
   Next.js-specific or incompatible CSS/configuration by assumption.
4. Use the existing `components.json`, `@/` aliases and `src/shadcn.css`.
   Do not run shadcn initialization or create a second component system.
5. Verify React 19, Tailwind 4, Vite and TypeScript. The project already has
   framer-motion; some registry components require `motion/react`. Inspect
   compatibility and reuse existing motion APIs where suitable rather than
   automatically installing a second animation library. Do not add GSAP,
   Three.js/WebGL or other heavy effects without explicit approval.

## Reference command — do not execute during skill installation

```bash
npx shadcn@latest add @react-bits/BlurText-TS-TW
```

BlurText has not been installed. Its current official registry entry uses
`motion/react` and declares `motion@^12.23.12`; evaluate that requirement and
reduced-motion behavior before any future approved integration.

## Quality and licensing

Use motion for state or navigation feedback, not continuous decoration. Keep
the original Hero video and scroll tour. Preserve readable ES/EN text and both
themes, visible focus, keyboard navigation, 44px touch targets and Safari mobile
performance. Reduced-motion must show usable, fully visible static content.

React Bits is MIT + Commons Clause, not unrestricted MIT. It permits use as
part of applications/websites/products but restricts selling, sublicensing or
redistributing the components themselves, alone, bundled or ported. Preserve
notices. Before use in exported/resold SaaS template or component source bundles,
resolve whether distribution is permitted; use an alternative or obtain rights
when necessary. This skill does not grant rights to React Bits Pro resources.

Validate any future integration with tests/build and responsive preview QA.
Never execute real financial transactions or mutate customer records for QA.
