# Cashier checkout and paired customer display

The paired screen now receives the active saved Stripe Checkout URL through
its existing authenticated device projection, and renders the QR locally with
the same QR component used by the kiosk. No payment code is opened on the
paired screen and no external QR service receives this URL. The cashier's
Show QR control also renders inline instead of opening a PNG tab. Open
checkout remains an explicit fallback link on the cashier device.

Only pending pos_remote records belonging to the paired tenant/operator are
eligible. Require HTTPS checkout.stripe.com, a Checkout pay path, no embedded
credentials or custom port, and a valid future server expiry. Paid, failed,
expired or stale views expose no Checkout URL. Customer contact details,
provider keys and unrelated sales remain excluded. Device pairing, access
checks and server settlement contracts are preserved.

The cashier checks the saved payment status every five seconds, on focus and
when the tab becomes visible. Requests have a 15-second timeout. The same
protected sale identifier remains locked until backend confirmation or a
terminal state; no scan, redirect, polling request or client button marks paid.
Manual status verification is beside the payment controls. Stripe success and
cancel returns stay on the trusted preview origin in deploy-preview and retain
the selected site; production uses the existing canonical origin.

Automated tests use fixtures, not real charges. Run npm test, the preview
build, browser-pos-v2-smoke and browser-customer-display-smoke. The display
smoke verifies pending QR appearance and disappearance after stored payment
confirmation. POS smoke verifies automatic completion without a second
verification click. Native iPhone and actual signed sandbox webhook acceptance
of this cashier/display flow remain manual checks.

This stays in PR125's unified preview. A new deployment recreates the test
business baseline and requires pairing again; old transactions remain scoped
to their original deployment. Do not interpret this as payment cancellation,
or pay an uncertain existing transaction a second time.

A paired device independently reads canonical saved order/payment state even
when Safari suspends the cashier tab. A valid pending Checkout remains visible
until its server expiry. Confirmed receipt display remains available for five
minutes from the saved paid timestamp; then the old stale view is hidden. Drafts
still hide after 20 seconds without cashier synchronization. Membership,
revocation and eight-hour device expiry remain enforced on every request.
The display distinguishes an inactive cashier tab from an unavailable server.
This is not a keep-alive workaround or a client-side payment confirmation.
