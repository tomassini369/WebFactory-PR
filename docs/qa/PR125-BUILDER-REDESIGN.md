# PR #125 — Shared Builder for existing businesses

## Confirmed cause and implementation

`/builder?edit=siteId` mounted a separate reduced form in
`SiteRedesignBuilder.tsx`. It had no upload controls and saved design, business
and features through three independent PATCH requests. The creation Builder
already contained the missing media, catalog, team, hours and payment controls.

The edit route now mounts the same `WebFactoryBuilder` with its eight steps,
Factory AI, device controls and continuously mounted storefront preview.
Existing-site uploads use authenticated `client-asset` POST, not the anonymous
creation upload. Logo, hero, gallery and catalog photos can be uploaded and
removed. Native disclosures, ES/EN, Light/Dark and the current layout remain.

The review step publishes the existing business, without creating an account,
sending an invitation, changing its subscription or connecting a provider.
Provider account state is read-only here; connections remain in the portal.
Creation drafts and the creation step in browser storage are untouched by edit
mode. Unsaved edits have the existing navigation/unload protection. Pending
uploads block publication; failed uploads retain the previous selection.

A mobile browser test also demonstrated that sticky Builder navigation covered
the catalog editor's close button. The existing editor now uses a native modal
dialog/top layer with its existing styles, a named close action, Escape handling
and native modal focus. The portal smoke also exposed a real duplicate React key
between the always-mounted kiosk cash panel and active business panels. A stable,
namespaced kiosk key removes that collision; the smoke now fails on console
errors as well as page exceptions. No navigation, scroll or palette redesign
was applied.

## Server contract

`client-admin` PATCH `section: "builder"` checks the canonical current Owner
membership and existing MFA/origin controls. Every section is normalized before
one revision-checked site write. A stale or concurrent writer receives 409.
New media references must belong to `sites/{siteId}/`, exist in the asset store
and have an allowed image type. Existing legacy references may be retained;
foreign draft assets cannot be newly attached.

The adapter preserves stock/tax metadata, professional IDs, calendars,
availability/time-off, branch assignments, memberships, private integrations and
subscription data. Omitted catalog/professional rows are deactivated, preserving
historical references. Existing 100-record backend limits still apply, including
inactive records. Changed public URLs reuse atomic slug claims and retain old
aliases; a failed CAS may retain a reservation for the same tenant, as in the
existing slug workflow.

Factory AI proposals in edit mode match existing names/type to retain IDs and
merge rather than remove unmentioned catalog/professional records. Renamed AI
suggestions are new proposed records; owners must review them before publishing.
No live AI request is made by these tests.

## Validation and evidence

- `npm test`: 836 passing tests, including nine new real-handler/storage-fixture
  regressions covering authorization, media validation, preservation, aliases,
  rejected/stale saves and concurrent writes.
- `npm run build`: passed, including TypeScript.
- Official Anthropic `webapp-testing` at
  `/home/agent/.agents/skills/webapp-testing/`: read SKILL.md and the console
  example; used native Python sync Playwright and registered listeners before
  navigation. The referenced chat itself was unavailable through this session's
  tools; its contents were not assumed.
- `scripts/browser-builder-redesign.py`: Chromium and WebKit, widths
  320/375/390/430/768/1024/1440, ES/EN, Light/Dark. Each case uploads all four
  media types, edits controls, saves through fixtures and reloads to verify media.
  Also checks eight steps, stable IDs, the mounted preview iframe, creation draft
  isolation, document overflow and JavaScript/console/request failures.
- `--quick --legacy`: missing business days remain disabled; absent booking,
  contact and payment-method settings never inherit creation defaults. Existing
  template colors/style are used when historical design fields are missing.
- `--quick --faults --ai`: pending uploads, upload HTTP 500 and retry of the same
  file, save HTTP 409 with draft retention, and a simulated Factory AI proposal.
  The two intentionally generated HTTP diagnostics are retained separately from
  application exceptions and unexpected console errors.
- Existing `browser-portal-menu-destinations-smoke.mjs`: eight viewport/theme/
  language cases verify portal links, unsaved-draft cancellation, isolated saves,
  eight-step redesign and the subscription gate, including console capture.
- Existing `browser-template-functions-smoke.mjs`: 46 template/language cases
  passed on rerun. Its first run timed out on `.template-booking-modal h2`;
  the unchanged parent commit also passed 46 cases. Cause of the initial
  intermittent timeout remains unconfirmed; no speculative Template change.
- Impeccable 4.1.0: 20 existing recommendations, exit 2; no automatic restyling.

The browser requests for authenticated data, uploads, saves and AI are isolated
HTTP fixtures, never real tenant mutations. Server behavior is verified
separately using the real handler and mocked Identity/Blobs stores. No physical
iPhone or real payment, reservation, email, provider connection or AI charge is
claimed. Actual authenticated tenant publication requires an authorized user;
it was intentionally not exercised against real financial/customer data.

Evidence in the execution environment:
`/tmp/wf125-redesign-browser/`, `/tmp/wf125-redesign-tests.log`,
`/tmp/wf125-redesign-build.log`, `/tmp/wf125-redesign-impeccable.json` and
`/tmp/wf125-redesign-template-regression-rerun.log`. These paths are temporary,
not hosted attachments. The committed scripts reproduce the checks.

## Official logos

SHA-256 before and after, unchanged:

```
assets/webfactory-pr-logo.png
1e92a89ec7e3771875bd1e30326478e6f4fdcd9aee2400bb0305d56ae7dd6f8a
assets/webfactory-pr-logo-dark.png
2ae86e259775cb27f71757479a8e0fa620901aa6bc3cf837d785bbdec8ac270b
```

Work targets `feat/kiosk-skin-engine`, PR #125 and its Netlify Deploy Preview.
No merge or production deployment is authorized by this change.
