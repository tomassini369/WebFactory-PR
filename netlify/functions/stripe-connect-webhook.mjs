import crypto from "node:crypto";
import { clientCommerceStore, clientEventStore, commerceKey, getClientSite, patchClientSite } from "../lib/client-store.mjs";
import { createGoogleEvent } from "../lib/google-calendar.mjs";
import { sendBusinessCommerceEmail, sendCustomerCommerceEmail } from "../lib/client-notifications.mjs";
import { createCustomerRecord, createInventoryMovement, createReceiptRecord } from "../lib/webfactory-v3-domain.mjs";
import { getV3Record, putV3Record } from "../lib/webfactory-v3-store.mjs";

function env(name) { return globalThis.Netlify?.env?.get(name) || ""; }

function validSignature(rawBody, header, secret) {
  if (!header || !secret) return false;
  const parts = header.split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  if (!timestamp || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
  return signatures.some((value) => {
    try { const a = Buffer.from(expected, "hex"); const b = Buffer.from(value, "hex"); return a.length === b.length && crypto.timingSafeEqual(a, b); }
    catch { return false; }
  });
}

async function finalizeTransaction(event) {
  const session = event.data?.object || {};
  const siteId = session.metadata?.site_id;
  const transactionId = session.metadata?.transaction_id;
  if (!siteId || !transactionId) throw new Error("Client commerce metadata is missing.");
  const key = commerceKey(siteId, "transactions", transactionId);
  let record = await clientCommerceStore().get(key, { type: "json" });
  const site = await getClientSite(siteId);
  if (!record || !site) throw new Error("Client transaction or site was not found.");
  if (record.stripeAccountId !== event.account) throw new Error("Connected account does not match the transaction.");
  if (session.payment_status !== "paid") return { record, pending: true };
  if (Number(session.amount_total) !== Number(record.amountTotal) || String(session.currency).toLowerCase() !== "usd") throw new Error("Stripe amount or currency does not match the server record.");

  if (record.paymentStatus !== "paid") {
    record = { ...record, paymentStatus: "paid", status: "confirmed", stripePaymentIntentId: session.payment_intent || "", paidAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await clientCommerceStore().setJSON(key, record);
    if (record.kind === "order") {
      const catalog = (site.catalog || []).map((item) => {
        const purchased = record.items.find((entry) => entry.id === item.id);
        return purchased && item.type === "product" && item.trackInventory && item.inventory !== null && item.inventory !== undefined
          ? { ...item, inventory: Math.max(0, Number(item.inventory) - Number(purchased.quantity)) }
          : item;
      });
      await patchClientSite(siteId, { catalog });
    }
  }

  if (!record.v3ArtifactsCreatedAt) {
    const customerSeed = createCustomerRecord({ siteId, customer: record.customer || {} });
    const existingCustomer = await getV3Record(siteId, "customers", customerSeed.customerId);
    const customer = createCustomerRecord({
      siteId,
      customer: {
        ...(record.customer || {}),
        totalSpent: Number(existingCustomer?.totalSpent || 0) + Number(record.amountTotal || 0),
        orderCount: Number(existingCustomer?.orderCount || 0) + (record.kind === "order" ? 1 : 0),
        bookingCount: Number(existingCustomer?.bookingCount || 0) + (record.kind === "booking" ? 1 : 0),
        lastActivityAt: record.paidAt || new Date().toISOString(),
      },
      existing: existingCustomer,
    });
    customer.totalSpent = Number(existingCustomer?.totalSpent || 0) + Number(record.amountTotal || 0);
    customer.orderCount = Number(existingCustomer?.orderCount || 0) + (record.kind === "order" ? 1 : 0);
    customer.bookingCount = Number(existingCustomer?.bookingCount || 0) + (record.kind === "booking" ? 1 : 0);
    await putV3Record(siteId, "customers", customer.customerId, customer);

    const receipt = createReceiptRecord({ siteId, transaction: record });
    await putV3Record(siteId, "receipts", receipt.receiptId, receipt);

    if (record.kind === "order") {
      for (const purchased of record.items || []) {
        const catalogItem = (site.catalog || []).find((item) => item.id === purchased.id);
        if (catalogItem?.type === "product" && catalogItem.trackInventory && catalogItem.inventory !== null && catalogItem.inventory !== undefined) {
          const movement = createInventoryMovement({
            siteId,
            itemId: purchased.id,
            quantityDelta: -Math.max(1, Number(purchased.quantity || 1)),
            reason: "sale",
            referenceId: record.transactionId,
          });
          await putV3Record(siteId, "inventory-movements", movement.movementId, movement);
        }
      }
    }

    record = {
      ...record,
      customerId: customer.customerId,
      receiptId: receipt.receiptId,
      v3ArtifactsCreatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await clientCommerceStore().setJSON(key, record);
  }

  const finalKey = commerceKey(siteId, record.kind === "booking" ? "bookings" : "orders", transactionId);
  await clientCommerceStore().setJSON(finalKey, record);
  if (record.holdId) await clientCommerceStore().delete(commerceKey(siteId, "holds", record.holdId));

  if (record.kind === "booking" && !record.googleEventId && site.googleCalendar?.connected) {
    const employee = (site.employees || []).find((item) => item.id === record.employeeId);
    try {
      const calendarEvent = await createGoogleEvent(siteId, employee?.calendarId, {
        summary: `${record.items?.[0]?.name || "Appointment"} — ${record.customer?.name || "Customer"}`,
        description: `WebFactory booking ${record.transactionId}\nCustomer: ${record.customer?.email || ""}\nPhone: ${record.customer?.phone || ""}`,
        start: { dateTime: record.start, timeZone: site.settings?.timezone || "America/Puerto_Rico" },
        end: { dateTime: record.end, timeZone: site.settings?.timezone || "America/Puerto_Rico" },
      });
      if (calendarEvent?.id) {
        record.googleEventId = calendarEvent.id;
        record.googleCalendarId = employee.calendarId;
        await clientCommerceStore().setJSON(finalKey, record);
        await clientCommerceStore().setJSON(key, record);
      }
    } catch (error) { console.error("google-calendar-event", transactionId, error?.message || error); }
  }

  if (!record.customerEmailSent) {
    await sendCustomerCommerceEmail(site, record);
    record.customerEmailSent = true;
    await clientCommerceStore().setJSON(finalKey, record);
    await clientCommerceStore().setJSON(key, record);
  }
  if (!record.businessEmailSent && site.business?.email) {
    await sendBusinessCommerceEmail(site, record);
    record.businessEmailSent = true;
    record.emailsSentAt = new Date().toISOString();
    await clientCommerceStore().setJSON(finalKey, record);
    await clientCommerceStore().setJSON(key, record);
  }
  return { record, pending: false };
}

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const rawBody = await req.text();
    if (!validSignature(rawBody, req.headers.get("stripe-signature"), env("STRIPE_CONNECT_WEBHOOK_SECRET"))) return new Response("Invalid Stripe signature", { status: 400 });
    const event = JSON.parse(rawBody);
    const key = `events/${event.id}.json`;
    const previous = await clientEventStore().get(key, { type: "json" });
    if (previous?.completed) return Response.json({ received: true, duplicate: true });
    if (previous?.processing && Date.parse(previous.updatedAt || "") > Date.now() - 5 * 60_000) return Response.json({ received: true, processing: true });
    await clientEventStore().setJSON(key, { processing: true, updatedAt: new Date().toISOString(), type: event.type });
    const object = event.data?.object || {};
    const checkoutEvent = ["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type) && object.metadata?.flow === "webfactory_client_commerce";
    const terminalEvent = event.type === "payment_intent.succeeded" && object.metadata?.flow === "webfactory_terminal";
    if (!checkoutEvent && !terminalEvent) {
      await clientEventStore().setJSON(key, { completed: true, ignored: true, type: event.type, updatedAt: new Date().toISOString() });
      return Response.json({ received: true, ignored: true });
    }
    const normalizedEvent = terminalEvent ? {
      ...event,
      data: {
        object: {
          metadata: object.metadata,
          payment_status: object.status === "succeeded" ? "paid" : "unpaid",
          amount_total: Number(object.amount_received || object.amount || 0),
          currency: object.currency,
          payment_intent: object.id,
        },
      },
    } : event;
    const result = await finalizeTransaction(normalizedEvent);
    await clientEventStore().setJSON(key, { completed: !result.pending, pending: result.pending, transactionId: result.record.transactionId, updatedAt: new Date().toISOString() });
    return Response.json({ received: true, transactionId: result.record.transactionId, pending: result.pending });
  } catch (error) {
    console.error("stripe-connect-webhook", error);
    return Response.json({ received: false, message: error?.message || "Webhook processing failed." }, { status: 500 });
  }
};
