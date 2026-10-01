import { clientCommerceStore, commerceKey, getClientSite, patchClientSite } from "./client-store.mjs";
import { createCustomerRecord, createInventoryMovement, createReceiptRecord } from "./webfactory-v3-domain.mjs";
import { getV3Record, putV3Record } from "./webfactory-v3-store.mjs";
import { syncBookingCalendar } from "./booking-calendar.mjs";
import { sendCustomerCommerceEmail, sendBusinessCommerceEmail } from "./client-notifications.mjs";
import { athError } from "./ath-domain.mjs";

export async function settleAthPayment(session, payment) {
  const store = clientCommerceStore();
  const key = commerceKey(session.siteId, "transactions", session.transactionId);
  let record = await store.get(key, { type: "json" });
  if (record?.athSettledAt) return record;
  // A conditional write serializes fulfillment; retries never subtract stock or add customer totals twice.
  const lock = await store.setJSON(commerceKey(session.siteId, "ath-settlement", session.transactionId), { referenceNumber: payment.referenceNumber, createdAt: new Date().toISOString() }, { onlyIfNew: true });
  if (!lock.modified) {
    record = await store.get(key, { type: "json" });
    if (record?.athSettledAt) return record;
    throw athError("ATH payment is verified. The business is completing your order; contact it if this message persists.", 409);
  }
  const paidAt = new Date().toISOString();
  record = { ...record, paymentStatus: "paid", status: "confirmed", paymentMethod: "ath_movil", paymentProvider: "ath_movil", athReferenceNumber: payment.referenceNumber, paidAt, updatedAt: paidAt };
  await store.setJSON(key, record);
  try {
    const site = await getClientSite(session.siteId);
    if (!site) throw new Error("Business unavailable during fulfillment.");
    const seed = createCustomerRecord({ siteId: site.siteId, customer: record.customer || {} });
    const previous = await getV3Record(site.siteId, "customers", seed.customerId);
    const customer = createCustomerRecord({ siteId: site.siteId, customer: record.customer || {}, existing: previous });
    customer.totalSpent = Number(previous?.totalSpent || 0) + record.amountTotal;
    customer.orderCount = Number(previous?.orderCount || 0) + (record.kind === "order" ? 1 : 0);
    customer.bookingCount = Number(previous?.bookingCount || 0) + (record.kind === "booking" ? 1 : 0);
    customer.lastActivityAt = paidAt;
    await putV3Record(site.siteId, "customers", customer.customerId, customer);
    record.customerId = customer.customerId;
    if (record.kind === "order") {
      const catalog = (site.catalog || []).map((item) => {
        const line = record.items?.find((row) => row.id === item.id);
        return line && item.type === "product" && item.trackInventory && item.inventory !== null && item.inventory !== undefined
          ? { ...item, inventory: Math.max(0, Number(item.inventory) - line.quantity) } : item;
      });
      await patchClientSite(site.siteId, { catalog });
      for (const line of record.items || []) {
        const original = site.catalog?.find((item) => item.id === line.id);
        if (original?.type === "product" && original.trackInventory && original.inventory !== null && original.inventory !== undefined) {
          const movement = createInventoryMovement({ siteId: site.siteId, itemId: line.id, quantityDelta: -line.quantity, reason: "ath_sale", referenceId: record.transactionId });
          movement.movementId = `ath-${record.transactionId}-${line.id}`;
          await putV3Record(site.siteId, "inventory-movements", movement.movementId, movement);
        }
      }
      if (/restaurant|food|catering|bakery|cafe|comida|panader|cafeter|restaurante/i.test(site.business?.category || "")) {
        record.kitchenStatus = "received"; record.queueNumber = `Q${Date.parse(paidAt)}`;
      }
    }
    const receipt = createReceiptRecord({ siteId: site.siteId, transaction: record });
    await putV3Record(site.siteId, "receipts", receipt.receiptId, receipt);
    record.receiptId = receipt.receiptId;
    record.athSettledAt = new Date().toISOString();
    const finalKey = commerceKey(site.siteId, record.kind === "booking" ? "bookings" : "orders", record.transactionId);
    await store.setJSON(finalKey, record);
    await store.setJSON(key, record);
    if (record.holdId) await store.delete(commerceKey(site.siteId, "holds", record.holdId));
    record = await syncBookingCalendar(site, record);
    // Mark connected only after ATH has independently verified a completed transaction.
    const current = await getClientSite(site.siteId);
    if (current?.paymentRules?.ath?.credentialVersion === session.credentialVersion) {
      await patchClientSite(site.siteId, { paymentRules: { ...current.paymentRules, ath: { ...current.paymentRules.ath, status: "connected", verifiedAt: paidAt } } });
    }
    try { if (record.customer?.email) { await sendCustomerCommerceEmail(site, record); record.customerEmailSent = true; } } catch { record.customerEmailPending = true; }
    try { if (site.business?.email) { await sendBusinessCommerceEmail(site, record); record.businessEmailSent = true; } } catch { record.businessEmailPending = true; }
    await store.setJSON(finalKey, record);
    await store.setJSON(key, record);
    return record;
  } catch {
    // Retain proof of payment and flag partial fulfillment instead of replaying financial side effects.
    const needsReview = { ...record, athFulfillmentNeedsReview: true, updatedAt: new Date().toISOString() };
    await store.setJSON(key, needsReview);
    await store.setJSON(commerceKey(session.siteId,record.kind === "booking" ? "bookings" : "orders",record.transactionId),needsReview);
    throw athError("ATH payment was verified, but the business must finish processing the order. Contact the business with your payment reference.", 409);
  }
}
