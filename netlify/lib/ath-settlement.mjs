import { applyCustomerTransaction } from './customer-transactions.mjs';
import { applyStockOperation,projectStockMovements } from './inventory-operations.mjs';
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
  record = { ...record, inventoryProtocol:1, paymentStatus: "paid", status: "confirmed", paymentMethod: "ath_movil", paymentProvider: "ath_movil", athReferenceNumber: payment.referenceNumber, paidAt, updatedAt: paidAt };
  await store.setJSON(key, record);
  try {
    const site = await getClientSite(session.siteId);
    if (!site) throw new Error("Business unavailable during fulfillment.");
    const customer=await applyCustomerTransaction(site.siteId,record);
    record.customerId = customer.customerId;
    if (record.kind === "order") {
      const applied=await applyStockOperation(site.siteId,{kind:'sale',referenceId:record.transactionId,items:record.items,reason:'ath_sale'});
      await projectStockMovements(site.siteId,applied.operation,store);
      record.inventoryAppliedAt=applied.operation.appliedAt;
      record.inventoryOperationId=applied.operation.id;
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
