# Platform audit corrections

Base: main `a48463247bd83af78cde289f10548695a76bb61b`.
Scope: the October 14 audit. Preview only; no production publication or data migration.

## Behavioral changes

- Booking availability intersects employee hours with the effective business/branch hours. A branch retains its own hours as the authoritative base instead of inheriting another location's closures. An employee schedule cannot reopen a closed base day.
- Employee absences and daily appointment limits apply to daily and monthly availability. Timestamp absences use an exclusive end; a date-only absence includes the entire final local date.
- Confirmed bookings and their mirrored holds count once. Reprogramming excludes the original appointment from its own limit calculation. Existing concurrency locks remain in place.
- New holds and booking records preserve the effective buffer and occupied-until timestamp. Legacy records derive the buffer from their service because they have no historical snapshot. A service plus buffer must fit before closing.
- Connected Google Calendar availability fails closed on daily/monthly reads and commitment. Public checkout no longer opts out of strict verification. A failed provider read cannot create an unchecked hold.
- Public storefront data includes only locale and timezone from settings. No private configuration is exposed. Storefront types and regression tests cover that contract.
- Business opening summaries group only consecutive days with identical hours, preserving closed days and different schedules.
- Availability requests cancel superseded reads and ignore stale responses, including clearing/changing service or professional. Monthly and daily selections cannot silently overwrite one another with old daily results.
- Admin overview no longer silently samples the first 300 objects. It reads complete lists in bounded batches and counts transaction documents rather than mirrored booking/order/hold documents. Read failures are surfaced instead of silently dropping failed records.
- Live storefronts and template demos share keyboard dialog management: explicit accessible name/role, Escape, focus containment, background inertness, and focus restoration. The existing mounted catalog and native scroll remain intact.
- Builder color inputs and all five palette buttons have localized accessible names; palettes expose selection state.
- Both portal login actions use the existing brand blue `#285FA6` with white text instead of the insufficient-contrast `#3C86F6` pairing. Experience controls retain their compact labels with 44px minimum hit targets.
- Builder progress and login focus-line animations use transforms. Device preview width changes no longer animate layout. Training progress uses transform with a stronger source rule overriding the legacy width transition, including reduced motion.
- A root React error boundary provides localized reload/home recovery for render or lazy-chunk failures without exposing error details.
- Follow-up to the supplied iPhone screenshot: MFA input text, WebKit text fill, headings and secondary Authenticator controls have explicit theme color pairs. Security controls no longer depend on inheriting a readable foreground from the login/dashboard cascade. A compiled-app contrast regression covers both portal entry points, direct light-mode loading, ES/EN and seven widths without performing security writes.

## Performance limitation retained explicitly

Availability storage reads now overlap in batches of at most 20 instead of running one by one. This reduces serial round trips but **does not create a historical date index**: the number of reads still grows with tenant history. A durable date/employee index or storage redesign requires coordinated writer coverage, backfill and deployment planning. No partial index, background migration, new database, provider provisioning or production rewrite is included in this PR.

The admin overview is complete rather than capped, but similarly remains proportional to collection size. If it outgrows function budgets, use maintained aggregates or paginated views with explicit completion status; never silently restore a 300-object sample.

## Verification

- Backend regression suite: 524 tests pass, including 10 new regressions for absences, limits, branch/base hours, daily/monthly parity, buffers, hold deduplication, rescheduling exclusion, bounded reads, safe public projection, complete overview and unavailable Google Calendar.
- Production build and TypeScript pass.
- New browser audit exercises 320/375/390/430/768/1024/1440px, ES/EN, Light/Dark across public surfaces, Builder colors, live storefront dialogs, grouping and portal colors using isolated responses.
- New browser race regression deliberately releases old availability after the new response and checks that the new date/time remains selected; also checks Escape on live booking.
- Existing auth usability and panel accessibility regressions pass with isolated endpoints. No credentials, recovery emails, business writes or payments reach production.
- New browser scripts are included in CI. Local Chromium verification uses the available 134 headless shell with the installed Playwright client; CI uses its configured browser versions. This is not a physical iPhone/Safari certification.
- Impeccable: 17 source observations vs 20 in the audit baseline. The remaining legacy width declaration is overridden by the effective Training transform rule. Font/gradient/decorative advisories are not automatically changed because approved design contracts take precedence.

## Release review

Review the matching Netlify Deploy Preview and CI, particularly booking concurrency, employee/branch schedules, buffers near closing, daily limits during reprogramming, Google failures, mounted catalog focus/scroll, portal themes and mobile layout. Keep production on main until the owner explicitly authorizes publication.
