# Client Portal public website address

The existing Website panel includes an editable `/sites/` address, preview,
confirmation, Save link, Cancel editing, View website and Copy link. Only an
owner, manager or explicitly authorized platform administrator can change it.
The backend derives permissions from the authenticated identity and tenant
membership; frontend role checks are only presentation.

Changing an address preserves the stable `siteId`, catalog, inventory, employee
identities, payment configuration, bookings and accounting. Old URL pointers
continue resolving to the same tenant so shared links and QR codes work. The
Builder opens the existing site using its `edit` parameter.

Addresses use 3–64 lowercase letters, numbers and single hyphens. Reserved
routes, malformed addresses and other tenants' current or historical aliases
are rejected. Every site writer uses the same atomic `onlyIfNew` alias claim;
the site update uses its existing revision and ETag compare-and-set. Missing
concurrency metadata fails closed. No new database or credential is required.

Alias reservation and site update are two separate conditional writes. A losing
site update can leave its requested address reserved to that same tenant. It
never transfers the pointer to another business. Historical aliases remain
reserved; this change does not introduce alias release or reassignment.

The portal protects unsaved edits and blocks tenant switching during saving.
Conflicts and uncertain network outcomes have localized errors and a reload
action. Copy and View always use the confirmed address. A lost response does
not imply the write failed; reload confirms server state before retrying.

QA uses synthetic tenants and intercepts all browser function requests. Backend
integration tests exercise the actual client-admin handler, authentication,
shared site writer and conditional storage operations with an isolated SDK
fixture. Tests include authorization, CSRF, competing tenant claims,
provisioning races, concurrent tabs, stable identity and public data redaction.
Browser checks cover seven widths, ES/EN, Light/Dark, Chromium and WebKit,
contrast, keyboard, reduced motion, touch sizes, confirmation, conflicts and
lost-response recovery. Deployed HTTP probes are unauthenticated and use a
nonexistent fixture tenant. No customer records or financial transactions are
modified during verification.

Local verification on 2026-10-11: all 486 unit/integration tests passed, the
TypeScript/build command passed, and the public-link browser matrix passed on
Chromium and touch WebKit. Impeccable 4.1.0 reported the same 20 inherited
findings, with none in the modified editor files. Mobile QA found and corrected
an inherited 42px secondary button and insufficient blue-button text contrast.
