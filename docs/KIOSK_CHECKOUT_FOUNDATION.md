# Kiosk checkout foundation

The existing public checkout accepts an optional `Idempotency-Key` header containing a cryptographically random 256-bit lowercase hexadecimal key. Existing callers remain compatible. This is a backend foundation; the kiosk interface and device pairing are not enabled yet.

A future kiosk must persist one key and the exact request body before submission, and retain them through retries and reloads. Changing the cart requires a new attempt only after the previous outcome has been reconciled. Never automatically generate a new key after a timeout or uncertain response.

The existing commerce store records a hashed key scoped to the business. `onlyIfNew` chooses one executor; `onlyIfMatch` commits its response. Simultaneous requests cannot run payment or inventory code twice for that key. Completed responses, including errors, are replayed with no-store. Processing or uncertain attempts do not expire into permission to charge again. Unavailable businesses cannot replay checkout links. Raw keys and customer request bodies are not stored in the attempt record.

Stripe, ATH Móvil, inventory reservations, receipts, tax, booking and in-person order processing remain in the existing checkout handler. No browser action marks a payment confirmed. Different keys are independent: this mechanism does not deduplicate customers who deliberately start separate attempts. The kiosk must enforce its own single active attempt and secure device session in the next increment.

Pending: device pairing and revocation, administrator enablement, branded kiosk UI, server-side outcome reconciliation, bounded archival policy, modifiers supported by the catalog, and mobile browser QA of the complete kiosk flow. Do not activate public kiosks using this foundation alone.
