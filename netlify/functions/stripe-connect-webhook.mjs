import { releaseInventory } from '../lib/inventory-reservations.mjs';
import { applyCustomerTransaction } from '../lib/customer-transactions.mjs';
import { applyStockOperation,projectStockMovements } from '../lib/inventory-operations.mjs';
import { withBookingLock } from "../lib/booking-lock.mjs";
import { sendBookingConfirmationEmails } from "../lib/client-notifications.mjs";
import crypto from "node:crypto";
import { clientCommerceStore, clientEventStore, commerceKey, getClientSite } from "../lib/client-store.mjs";
import { syncBookingCalendar } from "../lib/booking-calendar.mjs";
import { createReceiptRecord } from "../lib/webfactory-v3-domain.mjs";
import { putV3Record } from "../lib/webfactory-v3-store.mjs";

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
  if(record.stripeSessionId&&session.id&&record.stripeSessionId!==session.id)throw new Error('Checkout session does not match the transaction.');
  if(record.inventoryReservationRequired&&!record.stripeSessionId&&session.id){record={...record,stripeSessionId:session.id};await clientCommerceStore().setJSON(key,record);}
  if(['refunded','partially_refunded','expired','cancelled'].includes(record.paymentStatus))return {record,pending:false};
  if(record.stripePaymentIntentId&&session.payment_intent&&record.stripePaymentIntentId!==session.payment_intent)throw new Error('PaymentIntent does not match the transaction.');
  if(record.source==='tap_to_pay'&&!record.stripePaymentIntentId&&session.payment_intent){record={...record,stripePaymentIntentId:session.payment_intent};await clientCommerceStore().setJSON(key,record);}
  if (session.payment_status !== "paid") return { record, pending: true };
  if (Number(session.amount_total) !== Number(record.amountTotal) || String(session.currency).toLowerCase() !== "usd") throw new Error("Stripe amount or currency does not match the server record.");

  if(record.kind==='order'&&record.paymentStatus==='paid'&&!record.inventoryProtocol&&!record.inventoryAppliedAt){
    if(record.v3ArtifactsCreatedAt)record={...record,inventoryAppliedAt:record.v3ArtifactsCreatedAt,inventoryLegacyAssumed:true};
    else{
      record={...record,inventoryNeedsReview:true,status:'inventory_review_required',inventoryIssue:'LEGACY_INVENTORY_UNCERTAIN'};
      await clientCommerceStore().setJSON(key,record);
      await clientCommerceStore().setJSON(commerceKey(siteId,'orders',transactionId),record);
      throw Object.assign(new Error('Legacy inventory requires reconciliation.'),{status:409});
    }
  }
  if (record.paymentStatus !== "paid") {
    const paidAt = new Date(Number(event.created || Date.now() / 1000) * 1000).toISOString();
    const foodBusiness = /restaurant|food|catering|bakery|cafe|coffee|comida|alimento|panader|cafeter|restaurante/i.test(`${site.business?.category || ""} ${site.business?.name || ""}`);
    record = { ...record, inventoryProtocol:1, paymentStatus: "paid", status: "confirmed", stripePaymentIntentId: session.payment_intent || "", paidAt, updatedAt: paidAt,
      ...(record.kind === "order" && foodBusiness ? { kitchenStatus: "received", queueNumber: `Q${Date.parse(paidAt)}` } : {}) };
    await clientCommerceStore().setJSON(key, record);
  }

  if(record.kind==='order'&&!record.inventoryAppliedAt){
    try{
      const applied=await applyStockOperation(siteId,{kind:'sale',referenceId:transactionId,items:record.items,reason:'sale',reservationRequired:record.inventoryReservationRequired===true});
      await projectStockMovements(siteId,applied.operation,clientCommerceStore());
      record={...record,inventoryAppliedAt:applied.operation.appliedAt,inventoryOperationId:applied.operation.id,status:record.status==='inventory_review_required'?'confirmed':record.status,inventoryNeedsReview:false};
      await clientCommerceStore().setJSON(key,record);
    }catch(error){
      if(['INVENTORY_SHORTAGE','INVENTORY_PRODUCT_MISSING','INVENTORY_INVALID','INVENTORY_JOURNAL_FULL','INVENTORY_RESERVATION_INVALID'].includes(error.code)){
        record={...record,status:'inventory_review_required',inventoryNeedsReview:true,inventoryIssue:error.code,updatedAt:new Date().toISOString()};
        await clientCommerceStore().setJSON(key,record);
        await clientCommerceStore().setJSON(commerceKey(siteId,'orders',transactionId),record);
      }
      throw error;
    }
  }

  if (!record.v3ArtifactsCreatedAt) {
    const customer=await applyCustomerTransaction(siteId,record);

    const receipt = createReceiptRecord({ siteId, transaction: record });
    await putV3Record(siteId, "receipts", receipt.receiptId, receipt);


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

  record = await syncBookingCalendar(site, record);
  await clientCommerceStore().setJSON(finalKey, record);
  await clientCommerceStore().setJSON(key, record);

  record = await sendBookingConfirmationEmails(site,record,async value => {
    await clientCommerceStore().setJSON(finalKey,value);
    await clientCommerceStore().setJSON(key,value);
  });
  return { record, pending: false };
}

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const rawBody = await req.text();
    if (!validSignature(rawBody, req.headers.get("stripe-signature"), env("STRIPE_CONNECT_WEBHOOK_SECRET"))) return new Response("Invalid Stripe signature", { status: 400 });
    const event = JSON.parse(rawBody);
    return await withBookingLock(clientCommerceStore(), `locks/commerce/${event.data?.object?.metadata?.site_id || event.id}`, async () => {
    const key = `events/${event.id}.json`;
    const previous = await clientEventStore().get(key, { type: "json" });
    if (previous?.completed) return Response.json({ received: true, duplicate: true });
    await clientEventStore().setJSON(key, { processing: true, updatedAt: new Date().toISOString(), type: event.type });
    const object = event.data?.object || {};
    if(event.type==='payment_intent.canceled'&&object.metadata?.flow==='webfactory_terminal'){
      const siteId=object.metadata.site_id,transactionId=object.metadata.transaction_id,transactionKey=commerceKey(siteId,'transactions',transactionId);
      const record=await clientCommerceStore().get(transactionKey,{type:'json'});
      if(!record||record.source!=='tap_to_pay'||record.stripeAccountId!==event.account||(record.stripePaymentIntentId&&record.stripePaymentIntentId!==object.id)||typeof object.id!=='string'||Number(object.amount)!==Number(record.amountTotal)||object.currency!=='usd'||object.status!=='canceled'||Number(object.amount_received)!==0)throw new Error('Cancellation does not match the Terminal payment.');
      if(record.inventoryReservationRequired&&record.paymentStatus==='pending'){
        await releaseInventory(siteId,transactionId);
        const cancelled={...record,stripePaymentIntentId:object.id,paymentStatus:'cancelled',status:'cancelled',updatedAt:new Date().toISOString()};
        await clientCommerceStore().setJSON(transactionKey,cancelled);
        await clientCommerceStore().setJSON(commerceKey(siteId,'orders',transactionId),cancelled);
      }
      await clientEventStore().setJSON(key,{completed:true,type:event.type,updatedAt:new Date().toISOString()});
      return Response.json({received:true});
    }
    if(event.type==='checkout.session.expired'&&object.metadata?.flow==='webfactory_client_commerce'){
      const siteId=object.metadata.site_id,transactionId=object.metadata.transaction_id;
      const transactionKey=commerceKey(siteId,'transactions',transactionId);
      const record=await clientCommerceStore().get(transactionKey,{type:'json'});
      if(!record||record.stripeAccountId!==event.account||(record.stripeSessionId&&record.stripeSessionId!==object.id)||typeof object.id!=='string'||Number(object.amount_total)!==Number(record.amountTotal)||object.status!=='expired'||object.payment_status!=='unpaid')throw new Error('Expiration does not match the checkout.');
      if(record.inventoryReservationRequired&&record.paymentStatus==='pending'){
        await releaseInventory(siteId,transactionId);
        const expired={...record,stripeSessionId:object.id,paymentStatus:'expired',status:'expired',updatedAt:new Date().toISOString()};
        await clientCommerceStore().setJSON(transactionKey,expired);
        await clientCommerceStore().setJSON(commerceKey(siteId,'orders',transactionId),expired);
      }
      await clientEventStore().setJSON(key,{completed:true,type:event.type,updatedAt:new Date().toISOString()});
      return Response.json({received:true});
    }
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
    });
  } catch (error) {
    if (error?.status !== 409) console.error("stripe-connect-webhook", error);
    return Response.json({ received: false, message: "Webhook processing failed. Retry this event." }, { status: error?.status === 409 ? 409 : 500 });
  }
};
