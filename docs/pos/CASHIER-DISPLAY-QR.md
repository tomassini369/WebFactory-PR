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
expired or stale views expose no Checkout URL. Only the owner-requested buyer name/email/phone are shared with the paired
device for review before payment. Provider keys, other customer fields and
unrelated sales remain excluded. Device pairing, access
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
business baseline; persistent preview device bindings survive updates on the
same preview hostname, while sale snapshots remain deployment-scoped; old transactions remain scoped
to their original deployment. Do not interpret this as payment cancellation,
or pay an uncertain existing transaction a second time.

A paired device independently reads canonical saved order/payment state even
when Safari suspends the cashier tab. A valid pending Checkout remains visible
until its server expiry. The confirmed sale is shown briefly, then the display projects an empty sale
after three seconds from server artifact/paid time, even if the cashier is
suspended. It does not erase the receipt or modify the transaction. Drafts
still hide after 20 seconds without cashier synchronization. Membership,
revocation and eight-hour device expiry remain enforced on every request.
The display distinguishes an inactive cashier tab from an unavailable server.
This is not a keep-alive workaround or a client-side payment confirmation.

On backend confirmation, the cashier now clears the remote Checkout, status,
inline QR, active/display attempt, cart and customer fields together. The
confirmation receipt reference remains visible until the next sale. There is
no required New sale click and the previous remote Checkout cannot keep the
catalog locked. New sales receive a new protected attempt identifier. Browser
regressions verify automatic unlock, cleared customer fields, adding the next
item and completing the next sale, plus paired display automatic clearing.

## Client Info review on the paired display

The cashier syncs the current name, email and phone through the existing
scoped display session. Values are bounded to 180/320/80 characters and only
these three string fields are projected. Corrections and cleared fields sync
without a new checkout. Once a payment attempt exists, the display uses the
frozen server transaction customer, not a mutable browser draft. Personal
fields are empty on confirmed payment, stale drafts are hidden, and completed
sale reset removes the information panel. Anonymous requests, wrong tenant,
revoked device or removed membership cannot retrieve the data. Buyer receipt
capabilities and Marketplace projections retain their previous redaction.

The read-only Client Info / Información del cliente panel lets customers review
Name, Email and Phone and ask the cashier to correct them before paying. No
new confirmation step, payment state or editable customer-screen form is added.
Browser QA covers all seven widths, ES/EN and light/dark, long email wrapping,
live typing/correction across two contexts and removal on sale completion.

## Persistent workstation pairing

Device binding no longer expires after eight hours. The initial one-time pair
link still expires in ten minutes. After redemption, the HttpOnly/Secure/
SameSite=Strict device cookie is persistent and renewed on successful device
reads; the server binding lasts until explicit revocation. Browser removal of
cookies/site data can still require pairing again. iOS may suspend/close tabs;
the application cannot force the operating system to keep them running.

The cashier remembers only an opaque display ID in localStorage, scoped by
business and authenticated operator. No pairing secret, customer data or login
token is persisted there. On remount it validates ownership and resumes the
server sequence before syncing. A pending saved sale is restored as protected,
not silently replaced. Practice transport does not read/write live binding
metadata. Idle draft data still hides after heartbeat loss, with an explicit
Screen paired / Ready for the next sale state instead of implying expiration.

While the live cashier POS is open, a five-minute authenticated, same-origin,
POS-authorized heartbeat renews its already-valid primary session when needed.
It does not revive expired/revoked/reset sessions or change verifiedAt, issuedAt,
MFA policy, profile version or the five-minute proof for sensitive actions.
Logout/withdrawn permissions still apply. Identity token refresh uses the
existing portal mechanism; OAuth configuration and scopes are unchanged.

Production uses its existing stable commerce store. Preview bindings use a
site-owned Netlify Blobs namespace scoped to the preview hostname, with atomic
conditional writes. Only device identity is shared across releases. Each
deployment selects its own draft/attempt snapshot; at most four snapshots are
retained, and transaction/catalog/asset access always delegates to the existing
commerce store. No payment history is migrated and no second database or payment
engine is created. Removing a device revokes it across retained preview releases.
The first rollout of this format needs one pairing; later updates to the same
preview recover it. Login may still be necessary after browser suspension,
credential expiration or a deployment's isolated security-store reset, but that
does not require pairing the customer screen again.
