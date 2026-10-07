# Pending WebFactory web review — 7 October 2026

Baseline: main 4a16861115c1ec4705e56c3d13c99c3d0fed1b06. Production publication is not authorized for this batch.

## Consolidated preview

- PR92: existing homepage visual evolution, original hero video and interactive scroll, mobile navigation and tour corrections.
- PR93: shared template layout, Builder device sizing, feature defaults for new drafts, glass storefront composition, catalog carousel, overlay transitions, preserved catalog position and booking service/professional selectors.
- PR94: readable glass login/workspace surfaces, mobile Home navigation, keyboard viewport handling and progress feedback.
- PR96: MCP-installed official Dialog source. Added an isolated demonstration and checks for scoped portaled styling, viewport containment, Escape/button closure and restored focus. The optional portalContainer adapter preserves .wf-shadcn CSS/theme isolation. It does not replace business confirmation flows. The registry collision guard will require review if a later component request encounters this adapted file.
- Retain all existing and incoming CI checks. Homepage, template and portal design rules have separate documents.

Only local review-branch integration has occurred. Original PRs remain open; none were merged into main. No tenant records or provider configuration were modified.

## Remaining work and boundaries

| Area | Current evidence | Remaining work |
| --- | --- | --- |
| Design review | Combined sources, 381 backend tests and build passed locally; 46 renderer cases passed | Hosted preview and complete browser matrix must pass; physical iPhone keyboard/PWA confirmation remains distinct |
| Shadcn autonomous PR creation | Dispatch/install/tests/build/push worked; GitHub Actions PR creation was denied; connector opened PR96 | Future requests need a clear recoverable PR-creation receipt or owner-configured GitHub permission; do not broaden access automatically |
| Template parity PR83 | Older alternative changes generated-site fields, booking capacity and demo renderer architecture | Reconcile individually against PR93/current main; do not layer incompatible renderers or silently lose current behavior |
| MCP cancellation PR81 | Alternative commerce authorization fix is open; current main contains a later internal authorization mechanism | Verify current OAuth cancellation with controlled fixtures before adopting or superseding the older patch; never replay failed production actions automatically |
| Historical design PR88/91 | Earlier previews remain open; user rejected V4 PR91 | Keep rejected V4 out of consolidation; existing approved video/scroll remain the starting point |
| Employee wages and costs | main has BUSINESS_ACCOUNTING.md, hourly rates, approvals, materials/cost records and CSV reporting | Validate operational workflows and reconcile exports; do not rebuild implemented accounting or claim certified tax reporting |
| Email | Mailjet removed; central Resend and business-owned transports implemented | Flow-specific inbox/render/rebound/limits validation remains; no unrequested mail to third parties |
| Auth/onboarding | Implemented session, MFA, password and trial controls | Controlled real-device/access/recovery/invitation lifecycle acceptance |
| Calendar | Booking synchronization, calendar links and reminder code exist | Controlled conflict/reschedule/cancel/reminder delivery acceptance and Google verification video |
| Billing/commerce/POS | Existing web platform, inventory and provider boundaries | Controlled sandbox/end-to-end reconciliation; live payments/refunds require specific authorization |
| Backups/lifecycle | Export and synthetic recovery evidence exist | Full isolated business restore, media, external reconnection and disposable-business lifecycle validation |
| Operations/capacity | Existing guards and health surfaces | Current alert delivery, maintenance, load evidence and incident runbook acceptance |
| Legal/identity | Existing policies | Owner's actual commercial details and applicable review; do not invent identity or compliance |
| Native app / Tap to Pay | Backend primitives; separate later phase | Device/SDK/distribution work and explicit phase decision; keep the existing backend/auth/database |

The saved master plan predates newer PRs. Its individual closure claims must be reconciled against current code and reproducible evidence. Rejected or superseded feature ideas are not reactivated by this general continuation request.
