import {canAccessCommerce, assertCommerceAction, employeeCommerceRecord, isBusinessOwner} from "../lib/commercial-access.mjs";
import {bookingPolicy} from '../lib/booking-policy.mjs';
import {bookingBalance} from '../lib/kiosk-bookings.mjs';
import {reconcileBookingBalance} from '../lib/booking-balance-reconciliation.mjs';
import {displayActor} from '../lib/customer-display.mjs';
import { listPosProcessing,recoverPosOrder } from '../lib/pos-recovery.mjs';
import { manageInPersonOrder } from '../lib/in-person-orders.mjs';
import { withBookingLock } from '../lib/booking-lock.mjs';
import { findStockOperation } from '../lib/inventory-archive.mjs';
import { applyStockOperation,projectStockMovements } from '../lib/inventory-operations.mjs';
import {renderBookingEmail} from "../lib/booking-email-template.mjs";
import {finishBookingChange} from "../lib/booking-management.mjs";
import { syncBookingCalendar, bookingCanSync } from "../lib/booking-calendar.mjs";
import { assertSameOrigin, errorResponse, requireSiteAccess, requireSiteCapability, membershipHasCapability } from "../lib/client-auth.mjs";
import { clientCommerceStore, commerceKey } from "../lib/client-store.mjs";
import { deleteGoogleEvent } from "../lib/google-calendar.mjs";
import { createReceiptRecord, createInventoryMovement } from "../lib/webfactory-v3-domain.mjs";
import { getV3Record, putV3Record } from "../lib/webfactory-v3-store.mjs";
import crypto from "node:crypto";
import { refundState } from "../lib/refund-policy.mjs";
import { assertStripeWriteAllowed } from "../lib/stripe-runtime.mjs";

function env(name) { return globalThis.Netlify?.env?.get(name) || ""; }

async function listRecords(siteId, kind, getStore=clientCommerceStore, visible=()=>true) {
  const pages=getStore().list({prefix:`${siteId}/${kind}/`,paginate:true});
  let records=[];
  for await (const page of pages[Symbol.asyncIterator]?pages:[await pages]) {
    for(let index=0;index<(page.blobs || []).length;index+=40) {
      const batch=await Promise.all(page.blobs.slice(index,index+40).map(blob=>getStore().get(blob.key,{type:'json'})));
      records.push(...batch.filter(record=>record && visible(record)));
      records.sort((a,b)=>Date.parse(b.createdAt||'')-Date.parse(a.createdAt||''));records=records.slice(0,250);
    }
  }
  return records;
}

export function createCommerceAdminHandler({authorizeAccess=requireSiteAccess,authorizeCapability=requireSiteCapability,getStore=clientCommerceStore,pendingSales=listPosProcessing}={}) {return async (req) => {
  try {
    if (req.method === "GET") {
      const siteId = new URL(req.url).searchParams.get("siteId") || "";
      const { site, membership } = await authorizeAccess(siteId);
      const query=new URL(req.url).searchParams,id=query.get('kioskSale'),kind=query.get('kind');
      if(id!==null){
        if(!/^[a-zA-Z0-9_-]{1,160}$/.test(id)||!['order','booking'].includes(kind))throw Object.assign(new Error('Invalid kiosk sale.'),{status:400});
        const record=await getStore().get(commerceKey(site.siteId,kind==='booking'?'bookings':'orders',id),{type:'json'});
        if(!record||record.siteId!==site.siteId||record.kind!==kind||record.transactionId!==id||record.channel!=='kiosk')throw Object.assign(new Error('Kiosk sale unavailable.'),{status:404});
        assertCommerceAction(site,membership,record,'mark_paid');
        if(!membershipHasCapability(membership,'collect'))throw Object.assign(new Error('Collection permission required.'),{status:403});
        return Response.json({ok:true,record:employeeCommerceRecord(record,membership)},{headers:{'Cache-Control':'private, no-store'}});
      }
      const [orders, bookings, pendingPos] = await Promise.all([listRecords(siteId, "orders",getStore,record=>canAccessCommerce(site,membership,record)), listRecords(siteId, "bookings",getStore,record=>canAccessCommerce(site,membership,record)),pendingSales(siteId)]);
      const mergedOrders=[...new Map([...orders,...pendingPos].map(record=>[record.transactionId,record])).values()];
      const visible = records => records.filter(record => canAccessCommerce(site,membership,record));
      const visibleBookings=await Promise.all(visible(bookings).map(async row=>row.bookingTotalCents!=null||row.balanceAttempt?{...row,bookingBalance:await bookingBalance(getStore(),row)}:row));
      return Response.json({ ok: true, orders: visible(mergedOrders).map(row=>employeeCommerceRecord(row,membership)), bookings: visibleBookings.map(row=>employeeCommerceRecord(row,membership)) }, { headers: { "Cache-Control": "no-store" } });
    }
    if (req.method !== "POST") return Response.json({ ok: false, message: "Method not allowed." }, { status: 405 });
    assertSameOrigin(req);
    const payload = await req.json();
    const requestedCapability = payload.action === "recover_pos" ? "pos" : payload.action === "refund" ? "refunds" : payload.action === "kitchen_status" ? "kitchen" : (payload.kind === "booking" ? "bookings" : "orders");
    const { site, membership, user } = await authorizeCapability(payload.siteId, requestedCapability);
    if (['mark_paid','recover_pos','recover_ath'].includes(payload.action) && !membershipHasCapability(membership,'collect')) throw Object.assign(new Error('Collection permission required / Se requiere permiso de cobro.'),{status:403});
    const balanceAction=['review_booking_balance','close_booking_balance'].includes(payload.action);
    if(balanceAction&&(payload.kind!=='booking'||!membershipHasCapability(membership,'payments')))throw Object.assign(new Error('Booking and payment permissions required / Se requieren permisos de citas y pagos.'),{status:403});
    const kind = payload.kind === "booking" ? "bookings" : "orders";
    const run=async()=>{
    const key = commerceKey(site.siteId, kind, payload.transactionId);
    let record = await getStore().get(key, { type: "json" });
    if(payload.action==='recover_pos')record=await getStore().get(commerceKey(site.siteId,'transactions',payload.transactionId),{type:'json'});
    if (!record) throw Object.assign(new Error('Transaction not found.'),{status:404});
    assertCommerceAction(site,membership,record,payload.action);
    const recordMetadata=record?.calendarToken ? await getStore().getWithMetadata(key,{type:"json"}) : null;
    if(recordMetadata?.data) record=recordMetadata.data;
    if (!record) throw Object.assign(new Error("Transaction not found."), { status: 404 });
    assertCommerceAction(site,membership,record,payload.action);
    if(payload.action === "preview_confirmation" && record && !["confirmed","completed","cancelled"].includes(record.status)) throw Object.assign(new Error("Only confirmed or cancelled appointments have confirmations."),{status:409});
    if(payload.action === "preview_confirmation" && kind === "bookings" && record) return Response.json({ok:true,html:renderBookingEmail(site,record,{change:record.status === "cancelled"?"cancelled":"confirmed"}).html},{headers:{"Cache-Control":"no-store"}});


    if(balanceAction)return Response.json(await reconcileBookingBalance(site,record.transactionId,{expectedAttempt:payload.expectedBalanceAttempt,close:payload.action==='close_booking_balance',actor:displayActor(user),requestUrl:req.url,lockHeld:true}),{headers:{'Cache-Control':'no-store'}});
    if(kind==='bookings'&&record.balanceAttempt&&(payload.action==='mark_paid'||record.balancePaymentStatus!=='paid'&&['cancel','refund'].includes(payload.action)))throw Object.assign(new Error('Use Review balance checkout on this booking before changing its payment / Usa Revisar cobro de saldo en esta cita antes de cambiar su pago.'),{status:409});
    if(payload.action==='recover_pos')return Response.json(await recoverPosOrder(site.siteId,record.transactionId),{headers:{'Cache-Control':'no-store'}});
    if(payload.cash===true&&(payload.action!=='mark_paid'||record.channel!=='kiosk'))throw Object.assign(new Error('Cash confirmation is only available for kiosk collections.'),{status:409});
    if(kind==='bookings'&&payload.cash===true){
      if(!['confirmed','completed'].includes(record.status)||!['due','paid_in_person'].includes(record.paymentStatus)||record.paymentStatus==='paid_in_person'&&record.paymentMethod!=='cash')throw Object.assign(new Error('Booking cash payment requires review.'),{status:409});
      if(record.paymentStatus==='due'){
        record={...record,paymentStatus:'paid_in_person',paymentMethod:'cash',cashConfirmedBy:displayActor(user),paidAt:new Date().toISOString(),cashReceiptPending:true};
        const saved=await getStore().setJSON(key,record,recordMetadata?.etag?{onlyIfMatch:recordMetadata.etag}:{});if(!saved.modified)throw Object.assign(new Error('Booking changed. Reload.'),{status:409});
      }
      const receipt=createReceiptRecord({siteId:site.siteId,transaction:record,now:record.paidAt});
      await putV3Record(site.siteId,'receipts',receipt.receiptId,receipt);
      const current=await getStore().getWithMetadata(key,{type:'json'});if(!current?.etag||current.data.paymentStatus!=='paid_in_person')throw Object.assign(new Error('Booking requires review.'),{status:409});
      record={...current.data,receiptId:receipt.receiptId,cashReceiptPending:false};const saved=await getStore().setJSON(key,record,{onlyIfMatch:current.etag});if(!saved.modified)throw Object.assign(new Error('Booking changed. Retry receipt recovery.'),{status:409});
      await getStore().setJSON(commerceKey(site.siteId,'transactions',record.transactionId),record);
      return Response.json({ok:true,record:employeeCommerceRecord(record,membership)},{headers:{'Cache-Control':'no-store'}});
    }
    if(kind==='orders'&&['mark_paid','cancel_in_person'].includes(payload.action))return Response.json({ok:true,record:await manageInPersonOrder(site.siteId,record.transactionId,payload.action,{lockHeld:true,...(payload.cash===true?{cashActor:displayActor(user)}:{})})},{headers:{'Cache-Control':'no-store'}});
    if(payload.action==='recover_ath'){
      const {recoverAthOrder}=await import('../lib/ath-recovery.mjs');
      const recovered=await recoverAthOrder(site,record,req.url);
      return Response.json({ok:true,record:recovered},{headers:{'Cache-Control':'no-store'}});
    }
    if (payload.action === "kitchen_status") {
      if (kind !== "orders" || !record.queueNumber || !["paid","paid_in_person"].includes(record.paymentStatus) || ["cancelled","refunded","failed"].includes(record.status)) throw Object.assign(new Error("Kitchen updates are only available for paid food orders."), { status: 409 });
      const kitchenStatus = String(payload.kitchenStatus || "");
      if (!["received", "preparing", "ready", "completed"].includes(kitchenStatus)) throw Object.assign(new Error("Invalid kitchen status."), { status: 400 });
      record = { ...record, kitchenStatus, updatedAt: new Date().toISOString() };
    } else if (payload.action === "no_show" && kind === "bookings") {
      if(record.status!=='confirmed'||!Number.isFinite(Date.parse(record.start))||Date.parse(record.start)>Date.now()||record.balanceAttempt&&record.balancePaymentStatus!=='paid') throw Object.assign(new Error('Only started, confirmed appointments with no pending balance checkout may be marked absent.'),{status:409});
      record={...record,status:'no_show',noShowAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    } else if (payload.action === "cancel" && kind === "bookings") {
      if(!['confirmed','pending_approval'].includes(record.status)) throw Object.assign(new Error('Only active appointments may be cancelled.'),{status:409});
      record={...record,lateCancellation:Date.parse(record.start)<Date.now()+bookingPolicy(site).cancellationNoticeMinutes*60000};
      if (record.googleEventId && !record.calendarToken) {
        try { await deleteGoogleEvent(site.siteId, record.googleCalendarId, record.googleEventId); record.calendarCancellationPending = false; }
        catch { record.calendarCancellationPending = true; }
      }
      record = { ...record, ...(record.calendarToken?{managementRevision:crypto.randomUUID(),managementChange:"cancelled",changeCustomerEmailSent:false,changeBusinessEmailSent:false,calendarCancellationPending:Boolean(record.googleEventId),calendarUpdatePending:false}:{}), status: "cancelled", cancelledAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    } else if (payload.action === "invite_customer" && kind === "bookings") {
      if (!bookingCanSync(record) || Date.parse(record.end) <= Date.now()) throw Object.assign(new Error("Only active appointments can send invitations."), { status: 409 });
      record = await syncBookingCalendar(site, { ...record, customerCalendarInviteRequested: true });
    } else if (payload.action === "sync_calendar" && kind === "bookings") {
      if (!bookingCanSync(record)) throw Object.assign(new Error("Only confirmed appointments can sync to Google Calendar."), { status: 409 });
      record = await syncBookingCalendar(site, record);
    } else if (payload.action === "mark_paid" && record.paymentStatus === "due") {
      if (["cancelled", "failed", "refunded", "no_show", "pending_approval"].includes(record.status)) throw Object.assign(new Error("This transaction is no longer active or requires approval."), { status: 409 });
      record = { ...record, paymentStatus: "paid_in_person", status: "confirmed", ...(payload.cash===true?{paymentMethod:"cash",cashConfirmedBy:displayActor(user)}:{}), paidAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      if (kind === "orders" && /restaurant|food|catering|bakery|cafe|coffee|comida|alimento|panader|cafeter|restaurante/i.test(`${site.business?.category || ""} ${site.business?.name || ""}`)) {
        record.kitchenStatus = "received";
        record.queueNumber = `Q${Date.parse(record.paidAt)}`;
      }
    } else if (payload.action === "confirm" && kind === "bookings") {
      if (record.status !== "confirmed") throw Object.assign(new Error("Only existing confirmed bookings may acknowledge attendance."),{status:409});
      record={...record,attendanceConfirmedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    } else if (payload.action === "complete") {
      if(record.kind==='order'&&(record.inventoryNeedsReview||record.status==='processing'||(record.inventoryProtocol===1&&!record.inventoryAppliedAt))) throw Object.assign(new Error("Reconcile inventory before completing this order."),{status:409});
      if(record.kind==='booking'&&record.balanceAttempt){const balance=await bookingBalance(getStore(),record);if(!balance.known||balance.due!==0)throw Object.assign(new Error("Booking balance is not settled."),{status:409});}
      if (!["paid","paid_in_person"].includes(record.paymentStatus)&&record.balancePaymentStatus!=="paid") throw Object.assign(new Error("Only paid transactions can be completed."), { status: 409 });
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
            reviewOptIn: record.customer?.reviewOptIn === true,
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
        const currentSite=await (await import('../lib/client-store.mjs')).getClientSite(site.siteId);
        const saleId=(await import('../lib/inventory-operations.mjs')).stockOperationId('sale',record.transactionId);
        const original=await findStockOperation(currentSite,saleId);
        const restockItems=original?original.deltas.map(delta=>({id:delta.itemId,quantity:-delta.quantityDelta})):record.items;
        if(restockItems.length&&((record.inventoryProtocol!==1&&!record.inventoryNeedsReview)||original)){
          const applied=await applyStockOperation(site.siteId,{kind:'refund',referenceId:record.transactionId,items:restockItems,direction:1,reason:'refund'});
          await projectStockMovements(site.siteId,applied.operation,getStore());
        }
        if(record.inventoryProtocol!==1&&record.inventoryNeedsReview) record.inventoryRestockNeedsReview=true;
        else record.inventoryRestoredAt = new Date().toISOString();
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
    const write=await getStore().setJSON(key,record,recordMetadata?.etag?{onlyIfMatch:recordMetadata.etag}:{});
    if(recordMetadata?.etag && !write.modified) throw Object.assign(new Error("The booking changed. Reload and try again."),{status:409});
    const transactionKey = commerceKey(site.siteId, "transactions", record.transactionId);
    if (await getStore().get(transactionKey)) await getStore().setJSON(transactionKey, record);
    if(payload.action === "cancel" && record.calendarToken) record=await finishBookingChange(site,record);
    return Response.json({ ok: true, record:employeeCommerceRecord(record,membership) }, { headers: { "Cache-Control": "no-store" } });
    };
    const bookingRow=kind==='bookings'?await getStore().get(commerceKey(site.siteId,kind,payload.transactionId),{type:'json'}):null;
    return payload.cash!==true&&!balanceAction&&((kind==='bookings'&&!bookingRow?.balanceAttempt&&bookingRow?.bookingTotalCents==null)||['recover_pos','recover_ath'].includes(payload.action))?await run():await withBookingLock(getStore(),`locks/commerce/${site.siteId}`,run);
  } catch (error) { return errorResponse(error); }
};}
export default createCommerceAdminHandler();

