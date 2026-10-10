# Existing-Site Anti-Slop Review — WebFactory PR V3

This is an **incremental quality gate**, not an automated redesign service.
Review the **current production UI** and source; edit V3 components in isolated
pull requests and compare before/after in Netlify preview.

## Open-source components

- Impeccable by Paul Bakaus, Apache 2.0:
  https://github.com/pbakaus/impeccable — deterministic detector in CI,
  version `impeccable@4.1.0` pinned for reproducibility.
- Anti-Slop by Miqdad Badjuber, MIT:
  https://github.com/miqdadbadjuber/anti-slop — three upstream agent skills
  copied under `.agents/skills`; their upstream LICENSE is included as
  `.agents/skills/ANTISLOP-LICENSE.txt`.
- `DESIGN.md` remains the authoritative *project-specific* design system.
  Anti-Slop and Impeccable do not override intentional WebFactory choices.

## Automated audit

Run `npx --yes impeccable@4.1.0 detect --json src/ > impeccable-report.json`.
The dedicated workflow runs on PRs into `main` and manual dispatches,
uploads the JSON as an artifact, and distinguishes findings (exit 2)
from tool failures (exit 1). Existing-design findings are advisory at first,
so unrelated releases are not blocked by an untriaged baseline.
The separate V3 build and browser tests remain mandatory.

For an actual rendered URL audit, use a browser-equipped workstation or
cloud CI runner after ensuring the runtime/browser is installed:
`npx --yes impeccable@4.1.0 detect --viewport 390x844 https://webfactorypr.com`.
A static source scan cannot prove that a page looks good in a browser.


## First audit baseline (PR #100; Impeccable 4.1.0)

The first `src/` scan produced **21 findings**: 19 warnings and
2 advisories. Findings are signals to review, not automatic failures.

- Addressed in this PR: unnecessary 3px side-accent border on Builder
  guidance; touch-target polish for homepage header and demo cart (the
  latter was noticed in direct CSS inspection rather than flagged by the
  detector).
- Explicitly retain while reviewing visual context: Inter as an existing
  brand-compatible native typography choice; preserved original carousel
  and receipt motion; current approved hero treatment.
- Remaining findings about transition widths, gradient text and decorative
  accents need targeted before/after visual and functional validation,
  not blind global replacements.
- The report is available as the `impeccable-design-audit` artifact from
  the GitHub Actions run. Re-run on subsequent PR updates to compare.

## Human acceptance checklist

- Homepage: preserve Hero video **behind** content, scroll-driven tour,
  CTA hierarchy, no overlapping dashboard or filler visual metrics.
- Mobile header: visible 44px targets, no clipped nav, no overlap, 
  ES/EN + dark/light reachable and never duplicated.
- Templates/Builder: design parity and real user flow for catalog/cart/bookings.
- Portals: readable controls, correct contrast, sensible information hierarchy
  in both themes, no loss of authentication or navigation.
- Accessibility: focus states, keyboard use, truthful loading/empty states,
  zoom and reduced-motion compatibility.
- Confirm no regression in commerce, reservations, tenant isolation, payments,
  auth, notification flows, or data provenance.

## Delivery report

Include: findings addressed, intentionally retained design choices, visual
evidence for desktop/mobile (when available), tests/build status, preview link,
and an explicit *not deployed* or *production approved* status.
