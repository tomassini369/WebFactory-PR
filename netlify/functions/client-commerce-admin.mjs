import { syncBookingCalendar, bookingCanSync } from "../lib/booking-calendar.mjs";
import { assertSameOrigin, errorResponse, requireSiteAccess, requireSiteCapability } from "../lib/client-auth.mjs";
import { clientCommerceStore, commerceKey } from "../lib/client-store.mjs";
import { deleteGoogleEvent } from "../lib/google-calendar.mjs";
import { createInventoryMovement } from "../lib/webfactory-v3-domain.mjs";
import { getV3Record, putV3Record } from "../lib/webfactory-v3-store.mjs";
import crypto from "node:crypto";
import { refundState } from "../lib/refund-policy.mjs";
import { assertStripeWriteAllowed } from "../lib/stripe-runtime.mjs";

function env(name) { return globalThis.Netlify?.env?.get(name) || ""; }

async function listRecords(siteId, kind) {
  const result = await clientCommerceStore().list({ prefix: `${siteId}/${kind}/` });
  const records = [];
  const blobs = result.blobs || [];
  for (let index = 0; index < blobs.length; index += 40) {
    const batch = await Promise.all(blobs.slice(index, index + 40).map((blob) => clientCommerceStore().get(blob.key, { type: "json" })));
    records.push(...batch.filter(Boolean));
  }
  return records.sort((a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || "")).slice(0, 250);
}

export default async (req) => {
  try {
    if (req.method === "GET") {
      const siteId = new URL(req.url).searchParams.get("siteId") || "";
      const { site, membership } = await requireSiteAccess(siteId);
      const [orders, bookings] = await Promise.all([listRecords(siteId, "orders"), listRecords(siteId, "bookings")]);
      const limited = ["employee", "cashier", "staff"].includes(membership?.role) && (site.business?.locations || []).length > 0;
      const visible = (records) => limited ? records.filter((record) => (membership.locationIds || []).includes(record.locationId)) : records;
      return Response.json({ ok: true, orders: visible(orders), bookings: visible(bookings) }, { headers: { "Cache-Control": "no-store" } });
    }
    if (req.method !== "POST") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
    assertSameOrigin(req);
    const payload = await req.json();
    const requestedCapability = payload.action === "refund" ? "refunds" : payload.action === "kitchen_status" ? "kitchen" : (payload.kind === "booking" ? "bookings" : "orders");
    const { site, membership } = await requireSiteCapability(payload.siteId, requestedCapability);
    const kind = payload.kind === "booking" ? "bookings" : "orders";
    const key = commerceKey(site.siteId, kind, payload.transactionId);
    let record = await clientCommerceStore().get(key, { type: "json" });
    if (!record) throw Object.assign(new Error("Transaction not found."), { status: 404 });
    if (["employee", "cashier", "staff"].includes(membership?.role) && (site.business?.locations || []).length > 0 && !(membership.locationIds || []).includes(record.locationId)) {
      throw Object.assign(new Error("This account is not assigned to the order location."), { status: 403 });
    }

    if (payload.action === "kitchen_status") {
      if (kind !== "orders" || !record.queueNumber) throw Object.assign(new Error("Kitchen updates are only available for paid food orders."), { status: 409 });
      const kitchenStatus = String(payload.kitchenStatus || "");
      if (!["received", "preparing", "ready", "completed"].includes(kitchenStatus)) throw Object.assign(new Error("Invalid kitchen status."), { status: 400 });
      record = { ...record, kitchenStatus, updatedAt: new Date().toISOString() };
    } else if (payload.action === "cancel" && kind === "bookings") {
      if (record.googleEventId) {
        try { await deleteGoogleEvent(site.siteId, record.googleCalendarId, record.googleEventId); }
        catch (error) { console.error("calendar-cancel", record.transactionId, error?.message || error); }
      }
      record = { ...record, status: "cancelled", cancelledAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    } else if (payload.action === "sync_calendar" && kind === "bookings") {
      if (!bookingCanSync(record)) throw Object.assign(new Error("Only confirmed appointments can sync to Google Calendar."), { status: 409 });
      record = await syncBookingCalendar(site, record);
    } else if (payload.action === "mark_paid" && record.paymentStatus === "due") {
      if (["cancelled", "failed", "refunded"].includes(record.status)) throw Object.assign(new Error("This transaction is no longer active."), { status: 409 });
      record = { ...record, paymentStatus: "paid_in_person", status: "confirmed", paidAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      if (kind === "orders" && /restaurant|food|catering|bakery|cafe|coffee|comida|alimento|panader|cafeter|restaurante/i.test(`${site.business?.category || ""} ${site.business?.name || ""}`)) {
        record.kitchenStatus = "received";
        record.queueNumber = `Q${Date.parse(record.paidAt)}`;
      }
    } else if (payload.action === "complete") {
      if (!["paid","paid_in_person"].includes(record.paymentStatus)) throw Object.assign(new Error("Only paid transactions can be completed."), { status: 409 });
      record = { ...record, status: "completed", completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };

      const settings = site.reviewSettings || {};
      const eligible = settings.enabled && settings.reviewUrl && (
        (record.kind === "order" && settings.includeOrders !== false) ||
        (record.kind === "booking" && settings.includeBookings !== false)
      );
      if (eligible && record.customer?.email && !record.reviewRequestId) {
        const dueAt = new Date(Date.now() + Math.max(0, Number(settings.delayHours ?? 2)) * 3600000).toISOString();
        const reviewRequestId = `review-${crypto.randomUUID()}`;
        const request = {
          reviewRequestId,
          siteId: site.siteId,
          transactionId: record.transactionId,
          kind: record.kind,
          customer: {
            name: record.customer?.name || "",
            email: record.customer?.email || "",
          },
          reviewUrl: settings.reviewUrl,
          status: "pending",
          dueAt,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await putV3Record(site.siteId, "review-requests", reviewRequestId, request);
        record.reviewRequestId = reviewRequestId;
      }
    } else if (payload.action === "refund") {
      if(record.paymentProvider === "ath_movil") throw Object.assign(new Error("Manage this ATH Móvil refund in ATH Business. Stripe cannot refund ATH payments."),{status:409});
      assertStripeWriteAllowed({ requestUrl: req.url });
      if (!record.stripePaymentIntentId || record.paymentStatus !== "paid") throw Object.assign(new Error("This transaction cannot be refunded through Stripe."), { status: 409 });
      const refundMath = refundState({
        amountTotal: record.amountTotal,
        refundedAmount: record.refundedAmount,
        requestedAmount: payload.amount ? Math.round(Number(payload.amount) * 100) : null,
      });
      const { amount, existingRefunded, newRefundedAmount, fullRefund } = refundMath;
      const refundReason = String(payload.reason || "").trim().slice(0, 300);
      const params = new URLSearchParams({
        payment_intent: record.stripePaymentIntentId,
        amount: String(amount),
        "metadata[webfactory_transaction_id]": record.transactionId,
        "metadata[webfactory_refund_reason]": refundReason || "unspecified",
      });
      const response = await fetch("https://api.stripe.com/v1/refunds", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env("STRIPE_SECRET_KEY")}`,
          "Stripe-Account": record.stripeAccountId,
          "Content-Type": "application/x-www-form-urlencoded",
          "Idempotency-Key": `refund-${record.transactionId}-${existingRefunded}-${amount}`,
        },
        body: params,
      });
      const refund = await response.json();
      if (!response.ok) throw new Error(refund?.error?.message || "Stripe refund failed.");
      record = {
        ...record,
        status: fullRefund ? "refunded" : "partially_refunded",
        refundedAmount: newRefundedAmount,
        stripeRefundId: refund.id,
        refundHistory: [
          ...(Array.isArray(record.refundHistory) ? record.refundHistory : []),
          {
            refundId: refund.id,
            amount,
            reason: refundReason,
            createdAt: new Date().toISOString(),
          },
        ],
        updatedAt: new Date().toISOString(),
      };

      if (fullRefund && record.kind === "order" && !record.inventoryRestoredAt) {
        const catalog = (site.catalog || []).map((item) => {
          const purchased = (record.items || []).find((entry) => entry.id === item.id);
          return purchased && item.type === "product" && item.trackInventory && item.inventory !== null && item.inventory !== undefined
            ? { ...item, inventory: Number(item.inventory || 0) + Number(purchased.quantity || 1) }
            : item;
        });
        const { patchClientSite } = await import("../lib/client-store.mjs");
        await patchClientSite(site.siteId, { catalog });
        for (const item of record.items || []) {
          const catalogItem = (site.catalog || []).find((entry) => entry.id === item.id);
          if (catalogItem?.type === "product" && catalogItem.trackInventory && catalogItem.inventory !== null && catalogItem.inventory !== undefined) {
            const movement = createInventoryMovement({
              siteId: site.siteId,
              itemId: item.id,
              quantityDelta: Math.max(1, Number(item.quantity || 1)),
              reason: "refund",
              referenceId: record.transactionId,
            });
            await putV3Record(site.siteId, "inventory-movements", movement.movementId, movement);
          }
        }
        record.inventoryRestoredAt = new Date().toISOString();
      }

      if (record.receiptId) {
        const receipt = await getV3Record(site.siteId, "receipts", record.receiptId);
        if (receipt) {
          await putV3Record(site.siteId, "receipts", receipt.receiptId, {
            ...receipt,
            paymentStatus: fullRefund ? "refunded" : "partially_refunded",
            refundedAmount: Number(record.refundedAmount || 0),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } else {
      throw Object.assign(new Error("Unsupported transaction action."), { status: 400 });
    }
    if (payload.action === "mark_paid" && kind === "bookings") record = await syncBookingCalendar(site, record);
    await clientCommerceStore().setJSON(key, record);
    const transactionKey = commerceKey(site.siteId, "transactions", record.transactionId);
    if (await clientCommerceStore().get(transactionKey)) await clientCommerceStore().setJSON(transactionKey, record);
    return Response.json({ ok: true, record }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
};
