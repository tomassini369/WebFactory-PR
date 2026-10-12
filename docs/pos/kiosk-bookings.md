# Kiosk appointments and outstanding balances

Extends the existing paired `/kiosk` screen and `client-kiosk` function. No second reservation database, payment provider account or POS is created.

## Enablement

Business owners/managers enable the kiosk and independently enable **new appointments** and **existing appointment arrival/balance** under Business settings. Both additions default off. Existing device issuance, eight-hour expiry, single-use pairing, location restrictions, issuer membership checks and revocation continue to apply.

New appointments use the existing booking availability, temporary hold, checkout, Google Calendar and confirmation email flow. A specific professional or any available eligible professional can be selected. The server binds business/location and validates the employee. Calendar verification for kiosk reservations is strict.

Existing appointments are identified with the private manage-booking URL from the confirmation email or its 256-bit private token. The short public booking reference alone and name searches are intentionally insufficient. Camera scanning is not implemented; a hardware scanner can enter the private URL into the reference field. A successful lookup grants a device-local one-minute session, returning only service/time, arrival state and invoice amounts. No customer name, email, calendar token or membership data is returned. Failed lookup clears the preceding session; attempts are throttled per device.

Arrival is stored separately as `checkedInAt`/`checkedInSource`, mirrored to the original transaction and shown in the booking portal. It does not mark a booking paid or completed. Arrival is permitted within 24 hours before start and two hours after end.

## Invoice and settlement

New bookings snapshot `bookingTotalCents` and `bookingTaxCents` from the full service invoice. Later catalog/tax changes cannot reprice the appointment. A legacy unpaid booking can use its stored full amount; a legacy paid booking with no full invoice requires staff review.

Outstanding balance is frozen full total minus server-confirmed original payment and linked balance payments, net of stored refunds. Tax outstanding is allocated from the same original invoice. No client-supplied total is used.

A balance charge is a separate order transaction with `source=booking_balance`, linked to the existing booking by `bookingTransactionId`. It goes through the existing Stripe/ATH checkout and verification, customer accounting, receipts and email machinery. It creates no new booking, calendar event or inventory movement. Original deposit amounts/payment status are preserved, preventing double revenue accounting. Stripe confirmation uses signed paid events with matching account, session, amount and currency; ATH confirmation uses the existing provider verification.

The booking stores one non-expiring balance attempt before any provider call. Two devices cannot independently charge the same outstanding balance. Repeated fulfillment conditionally links the same payment ID once. Redirects, browser flags and arrival never prove payment. Failed/uncertain/expired attempts are kept for staff reconciliation rather than automatically allowing another charge. The portal blocks conflicting mark-paid/cancel/refund actions while a balance is pending; a settled booking may be completed only when its current net balance is zero. Refunds of a linked charge must be handled on that payment record; subsequent collection after refund requires staff review.

## Validation

- Full Node test suite and TypeScript/Vite build.
- `netlify/lib/kiosk-bookings.test.mjs`: disabled defaults, tenant/location isolation, session expiry, private lookup throttling, arrival windows, legacy invoice handling, frozen tax, replay/refund handling and new booking/any-professional flow.
- `netlify/lib/kiosk-balance-checkout.test.mjs`: mocked Stripe SDK checkout, frozen invoice/tax, kiosk return, signed webhook settlement/replay and refusal of privileged balance fields on public checkout.
- `scripts/browser-kiosk-bookings-smoke.mjs`: isolated new booking, arrival and remaining balance payment, privacy reset; 320/375/390/430/768/1024/1440 widths, ES/EN, Light/Dark.
- Existing `scripts/browser-kiosk-smoke.mjs`: original order, pairing/revocation, provider return, receipt, lost reset, stock and responsive/contrast checks.

Browser tests inject in-memory fixtures and mock provider outcomes. They do not create real reservations, send email or charge money. Run actual sandbox/provider acceptance before production rollout. Existing Stripe and ATH readiness requirements still apply; enabling a kiosk does not complete merchant onboarding.
