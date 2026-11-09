# Platform audit corrections — November 9, 2026

Base: published PR #125 / `8a9ab63d5768751d99ce222d483d12babe2bbdc2`.
Scope: the nine reproduced findings from the platform audit, preserving the
existing layout, logos, themes, business colors, permissions and provider paths.

| Finding | Resulting behavior |
| --- | --- |
| Silent 96-start cutoff | Return every valid start in the configured local day; minimum interval remains five minutes. A ten-hour day with 30-minute services exposes 115 starts. |
| Invalid business/branch/professional hours | Reject impossible local times and enabled closing-before-opening intervals before saving. Closed defaults remain supported. The booking engine also rejects invalid historical windows without rewriting records. Overnight windows remain unsupported and return an explicit validation error. |
| API failure shown as no assigned business | Access failures retain an alert and an explicit retry. A genuine empty list remains its own state. No automatic access retries or new account creation are introduced. |
| Missing weekdays | Show seven days without saving on render; missing days default closed. Save explicitly completes the week, preserving existing English/Spanish keys and break metadata. |
| Unnamed time inputs | Each open/close input has a day-specific ES/EN accessible name. |
| DMCA production configuration | Deployment requires the already approved public contact in production/functions. Flat contact JSON and the complete response from the existing public endpoint are accepted with the same active-registration/field whitelist. No address or credential values belong in this repository. The owner is configuring the existing variable; final evidence must verify the actual production endpoint. |
| Preview notice in production | The existing compile-time deployment flag limits the preview-draft banner to review builds. Legal wording, effective dates, routes and OAuth disclosures remain unchanged; this is not a legal approval claim. |
| False English Builder failures | Upload/publish selectors follow the selected language. Python uses configured executable paths locally or managed Playwright browsers in CI. |
| Cancelled combined kiosk CI job | Keep skin commerce/booking/keyboard coverage; run settings, customizer and QR matrices in independent engine/suite jobs. Add a separate production/preview release regression job, preserving all existing suites. |

## Regression evidence

Four targeted booking/time-validation tests failed before the implementation and
passed after it. Twelve added unit regressions cover all starts, late-day blocks,
late hold creation/conflict protection, strict server hours, legacy invalid
windows, seven-day defaults, alias precedence and preservation of saved data.
The complete backend suite passes 865 tests; production TypeScript/build passes.

New browser regressions exercise list 503/malformed responses, detail 503,
explicit keyboard retry, a real empty-list fixture, seven weekdays, accessible
names, untouched render defaults, explicit save and reload. Both engines and the
seven widths/ES/EN/Light/Dark matrix are required. Legal checks use real compiled
production and preview variants with synthetic public-contact responses. They do
not substitute for verifying the configured deployed endpoint.

The existing Python Builder fault suite retains upload, revision-conflict,
private-image and preservation assertions in both languages and engines. CI pins
Python Playwright 1.62.0; it shares the Chromium/WebKit revisions already used by
the installed Node Playwright. No application dependency or provider was added.

Final local/CI/preview/production results and matching commits are recorded in the
release PR. No real charges, emails, appointments, accounts or tenant records are
used as test fixtures. Browser/device dimensions are emulation, not physical
hardware acceptance. External provider E2E and legal review remain separate.
