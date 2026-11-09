# Kiosk desktop touch keyboard

Owner-approved feature, preview PR #125 only. Existing kiosk configuration,
checkout, booking and pairing remain authoritative. No new dependency or service.

## Operation

In Business settings → POS · Self-service kiosk, enable **Kiosk touch keyboard**.
The strict boolean `touchKeyboard` defaults to false and is writable through the
existing authorized configure action. Paired screens receive it through their
normal presentation polling; changing it does not reset the sale, cart or device.
The setting is disabled in isolated Training.

On desktop browsers, touching a supported input opens a bottom keyboard after
the initiating gesture finishes, so the same touch cannot accidentally type a
key. Letters support shift, spaces, Spanish accents and symbols; email includes
@ and punctuation; phone uses digits and +; booking IDs use the actual eight
hexadecimal characters; private PIN uses digits and stays masked in its field.
Backspace edits the selection/current caret. Next focuses the next form control
or closes at the end; it never submits a form or starts a charge. Date/select
widgets retain native interaction. Physical keyboards continue to work.

A scope limited to the live kiosk controls dispatches ordinary input changes to
their existing React handlers. Formatters, lengths, validation and business
operations remain unchanged. Email editing uses native browser editing when
available, with bounded value editing as fallback; the supported browser smoke
checks middle insertion/deletion and controlled-state persistence.

The keyboard is a temporary portal, not an iframe or public API. It reserves
space and scrolls the active input above its measured height, including short
windows. Touch targets are at least 44 px, rows wrap without page overflow, and
the panel scrolls internally on small windows. Forced colors and printing have
explicit styles. The floating cart shortcut hides only while the keyboard is
open so it cannot overlap the input or keys.

## Privacy and compatibility

No typed value, PIN, suggestion history or clipboard content is stored, logged
or copied into the keyboard. It holds the active field reference and static
label only. Original input modes are restored on close, opt-out and unmount.
Inactive, removed, disabled and inert fields cannot be edited. Navigation,
sale transitions, loss of connection, hidden/background windows and inactivity
close the keyboard. Virtual key activity refreshes the kiosk's existing activity
clock so normal typing does not trigger its idle cleanup.

Phone/tablet detection keeps native keyboards on iPhone, Android and iPad,
including iPad desktop user agents with Mac-style platform/touch information.
Desktop focus suppresses the browser keyboard hint only while the custom
keyboard owns the field. OS-level behavior on a physical touch monitor remains
a device acceptance check; browser emulation is not physical hardware testing.

All QA uses the existing isolated kiosk handler fixture, never real tenant
configuration, customers, bookings or payments. Server coverage includes opt-in,
strict boolean validation, owner authorization, preservation of other settings
and unchanged sale IDs. Browser coverage exercises actual touch taps, caret and
selection edits, phone formatting, private PIN, native/disabled fallbacks, short
windows, input visibility, date controls, opt-out and no submission from Next.

## Preview validation · 2026-10-29

- TypeScript and the complete application build pass; all 817 Node tests pass.
- Chromium touch coverage: 768/1024/1440 px × ES/EN × light/dark (12 cases).
- WebKit touch coverage: 1024/1440 px × ES/EN × light/dark (8 cases).
- Both engines pass disabled/native phone/iPad fallback, short desktop, native
  date controls, route cleanup and server opt-out checks. Touch actions wait for
  the deferred gesture and React update before checking values.
- Booking regression: Chromium 390/1440 px × ES/EN × light/dark (8 cases), using
  isolated appointments, arrival and balance handling.
- The existing kiosk regression also checks configuration enablement, persistence
  of the keyboard setting after reload and opt-out, pairing/revocation, catalog,
  stock, tax, cart, payment return, receipt and privacy reset with isolated data.
- Visual review confirms the phone field remains above the keyboard. Impeccable
  reports 20 existing recommendations and none in the keyboard files.

No physical touchscreen acceptance, real provider charge or production release
is claimed. The same draft PR #125 preview remains the review destination.
