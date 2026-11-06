# Receipt print correction · October 24, 2026

The owner's iPhone recording shows a short receipt spread over six Letter
pages with large blue/black storefront backgrounds. The former print rules
used `visibility:hidden`, which retained the hidden page's layout, and placed
the print copy inside a modal/animated surface. Two nested dialogs also had
competing print rules.

`ReceiptPaper` now portals the same `ReceiptDetails` and saved receipt props
directly into its own document's body. Only the selected print root is laid
out during printing; the app, modal top layers and document decorations use
`display:none`. Print styling removes animation, transforms and backgrounds,
bounds the existing business logo, and permits long receipts to paginate.
The print root stays hidden from screen readers and screen layout. Opening
the inspector selects the receipt for native browser printing; the button
calls the owning window synchronously within the user's gesture, including
the Builder iframe. Closing/unmounting removes its active print selection.

No checkout, payment, stored receipt, tax, booking, auth or OAuth behavior
changes. Printing reuses saved amounts and never performs a payment request.

## Verification

- `npm test`: 691/691 passed.
- `npm run build`: passed.
- `scripts/browser-receipt-print-smoke.mjs`: Chromium, 320/375/390/430/768/
  1024/1440 px, ES/EN, light/dark, reduced motion. Short receipts must occupy
  exactly one Letter and one A4 page with backgrounds enabled, even with a
  6,000 px tall transformed storefront behind two open dialogs.
- A standalone portal receipt containing 60 items paginates; extracted PDF
  text includes item 60, the saved total and the transaction reference.
- Existing `scripts/browser-buyer-receipt-smoke.mjs` now requires exactly one
  PDF page instead of accepting any page count and checks the body print root.
  Its optional `QA_REDUCED_MOTION=1` runs the existing reduced-motion path.
- The generated short Letter PDF was rendered and visually inspected.
- Impeccable: 20 findings, all pre-existing; the existing receipt bounce
  recommendation is outside this print correction.
- Native Safari/AirPrint confirmation remains pending: the connected browser
  runtime cannot resume its credential state, and local Playwright WebKit is
  not installed. Chromium PDF checks are not an iPhone device verification.

The user reports completing the sandbox payment. Two Connect webhook HTTP
200 responses were observed at 19:40:27 and 19:45:18 Puerto Rico time; those
request logs alone do not establish the exact provider event or transaction.
No new payment or synthetic paid event was created for the print fix.

## Preview receipt retention

The payment test ran on deploy `6add3ee0be8db2edec411562`:
`https://6add3ee0be8db2edec411562--webfactorypr.netlify.app`.
Its deploy-scoped commerce data is not migrated or deleted by this UI change.
The moving PR preview alias will point at the new deployment, whose fixture
recreates the test business baseline without carrying over earlier orders.
Do not use a missing receipt on the new deploy as a reason to pay again.
Any recovery of that original receipt must use its original deployment and
normal receipt capability or authorized portal access. No private receipt
capability or Checkout URL is committed to the repository.
