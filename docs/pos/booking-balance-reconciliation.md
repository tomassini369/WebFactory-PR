# Recover a booking with a linked balance checkout

## Confirmed defect

Starting a kiosk balance payment saved `booking.balanceAttempt`. The booking
administrator correctly refused cancellation or manual payment while that attempt
was unresolved, but there was no portal action to review or close it. This created
an operational dead end even for an unpaid or pre-provider failed attempt.
The report does not establish whether the owner's particular payment is unpaid,
paid, processing or uncertain. No live booking/payment was read or changed here.

## Operator flow

In Bookings, on the same appointment:

1. Choose **Review balance checkout / Revisar cobro de saldo**.
2. If the server confirms the attempt did not start a provider checkout, or Stripe
   confirms an unpaid checkout, choose **Close unpaid checkout / Cerrar checkout
   sin cobrar**. Confirm the explanation. The server rechecks the payment.
3. After closure, choose **Cancel / Cancelar**, or record an actual in-person
   payment through the existing control. Closure itself preserves the appointment.

Verified paid Stripe checkouts reuse the existing settlement, receipt and customer
record code. Cancelling the appointment afterwards preserves its payment. Refunds
remain a separate authorized action. Review never initiates a charge or checkout.
An employee without payment permissions sees the reason and administrator guidance.

## Server guarantees

- The existing `client-commerce-admin` endpoint accepts `review_booking_balance`
  and `close_booking_balance` for a booking. Both require authenticated booking
  and payment capabilities, existing same-origin/MFA/tenant controls, the original
  booking ID and `expectedBalanceAttempt`. The browser supplies no authoritative
  payment state, amount, provider transaction/session ID or employee identity.
- Reuse the existing strongly consistent commerce store, site commerce lock,
  booking-change lock and conditional writes. No new database or public endpoint.
- A processing/uncertain claim never becomes releasable simply because it is old.
  Full paginated transaction listing is used. Histories over 2,500 transactions,
  duplicate/missing/mismatched records, unknown claims and missing session IDs
  require investigation; a partial scan is never proof that no payment exists.
- Stripe requests use the frozen merchant account and stored session. The server
  checks session, tenant, transaction, amount, currency and provider status. A paid
  recovery also checks the succeeded PaymentIntent, captured charge, zero refunds
  and provider charge timestamp before invoking the shared settlement routine.
- Closing an open unpaid Stripe session expires it with an idempotency key.
  Linked cancelable PaymentIntents must be verified canceled with zero received
  and capturable funds. Processing/captured/delayed payments are not released.
  A payment completing during expiration keeps the booking protected.
- Only terminal provider evidence, or an atomically fenced pre-provider attempt
  with no transaction, permits removing the active balance guard. The old attempt
  is retained in history with server actor/time/reason. The original checkout
  claim is closed before another operation can execute it. A late browser cannot
  replay the old claim. Compare-and-swap conflicts preserve the booking guard.
- The original booking/payment records are retained. No refund, inventory change
  or new sale is performed by closure. The original kiosk can reset only after a
  server-verified closure; delayed device state uses the same closed claim proof.
- Live Stripe writes remain blocked in previews. All QA uses fake keys, in-memory
  stores, intercepted providers and `.invalid` recipients.

## Deliberate limits

Pending ATH attempts require verification in ATH Business. Browser callbacks or
an expired ATH screen do not prove cancellation, so this change does not release
them automatically. Already-linked paid ATH records are recognized. Unknown
Stripe sessions, incomplete claims and storage inconsistencies stay protected;
there is no force-clear button. These cases need provider/record investigation.

This fix adds the missing safe actions; it does not cancel the reported live
booking or claim that its provider outcome has been verified. Publication requires
owner approval after reviewing the PR. The original Gmail API issue is separate.

## Verification

`npm test` includes 28 new isolated reconciliation cases: endpoint capabilities,
cross-tenant/origin rejection, review/close/cancel, paid settlement/receipt replay,
unpaid expiration, PaymentIntent races, refunds, server time, closed-claim replay,
old processing claims, stale devices, concurrent requests and CAS recovery.
Run `npm run build` for TypeScript/Vite. No npm lint script exists.

`scripts/browser-workspace-experience-smoke.mjs` exercises the full portal at
320/375/390/430/768/1024/1440, ES/EN and Light/Dark. It clicks review with the
keyboard, checks visible focus, >=44px controls and >=4.5:1 status text contrast,
dismisses then confirms closure, cancels the same booking, preserves payment
state and tests employee restrictions plus existing Builder persistence. All
operational requests are intercepted. The same script runs against Deploy Preview
in CI. See the PR for completed run results; do not infer a pass from this list.

The QA harness reselects locale after an authentication reload and returns to the
portal after the isolated OAuth destination. Focus is checked after actual Tab /
Shift+Tab navigation, rather than requiring mouse focus to match `:focus-visible`.

## Scoped Anti-Slop gate

After/audit mode from AGENTS.md. Direction: existing portal, native typography,
tenant colors and restrained status-first recovery; ENERGY 3, RHYTHM 2, MOTION 1.
This gate covers the new controls, not legacy application design. Impeccable 4.1.0
found the same 20 existing advisories as the previous baseline, byte-identical;
exit 2 means findings, not execution failure. No dependency or visual asset added.

- R-01 PASS: existing colors retained; no new gradient or glow.
- R-02 PASS: ordinary action sentences without decorative em dashes.
- R-03 PASS: new controls wrap; browser checks assert no document overflow.
- R-04 PASS: no new icon or emoji.
- R-05 PASS: existing booking row and navigation reused.
- R-06 PASS: existing native typography retained.
- R-07 PASS: no background pattern.
- R-08 PASS: actions have descriptive labels without decorative arrows.
- R-09 PASS: no badge added.
- R-10 PASS: no glass or blur introduced.
- R-11 PASS: existing button shapes retained.
- R-12 PASS: no shadow added.
- R-13 PASS: no pulse, glow or decorative dot.
- R-14 PASS: recovery sits on the affected booking, no extra dashboard cards.
- R-15 PASS: Review and Close describe distinct real operations.
- R-16 PASS: text explains server-confirmed state without marketing claims.
- R-17 PASS: no fabricated metrics.
- R-18 PASS: no testimonials or customer examples in the product.
- R-19 PASS: no animation; browser tests request reduced motion.
- R-20 PASS: booking, payment, tenant identity and existing receipt flow reused.
- R-21 PASS: existing theme controls retained and exercised by the browser matrix.
- R-22 PASS: no illustration.
- R-23 PASS: no new navigation or decorative assets.
- R-24 PASS: controls call the existing tenant-authorized endpoint.
- R-25 PASS: browser checks calculate >=4.5:1 paragraph contrast in both themes.
- R-26 PASS: review, close and cancel have tested onClick/API outcomes.
- R-27 PASS: pending, unpaid, paid, uncertain and failure states are differentiated.
- R-28 PASS: no FAQ change.
- R-29 PASS: no palette change.
- R-30 PASS: existing product composition, no third-party UI clone.
- R-31 PASS: the new actions resolve a confirmed operational dead end.
- R-32 PASS: keyboard activation, focus and touch target assertions included.
- R-33 PASS: normal source changes; no runtime source injection.
- R-34 PASS: ES/EN and existing Light/Dark tokens retained.
- R-35 PASS: TypeScript/Vite build and isolated review/close/cancel click-through.
- R-36 PASS: live payment/booking verification and deployment limits stated.
- R-37 PASS: DESIGN.md and portal contract read before edits.
- R-38 PASS: all example records live only in isolated QA.
- Liveliness PASS: business identity and the affected booking remain the focal point.
- C-1 PASS: every addition addresses recovery, permissions or evidence.
- C-2 PASS: existing checkout/settlement architecture reused.
- C-3 PASS: no unrelated page, feature or visual component library added.
- C-4 PASS: responsive, localization, themes and accessibility checks recorded in QA.
- C-5 PASS: mocked tests, published preview and real provider operations distinguished.
