import { deleteGoogleEvent } from "../lib/google-calendar.mjs";
import { clientCommerceStore, clientSiteStore, commerceKey, getClientSite } from "../lib/client-store.mjs";
import { sendCommerceConfirmationEmails, sendBookingConfirmationEmails } from "../lib/client-notifications.mjs";
import { syncBookingCalendar, bookingCanSync } from "../lib/booking-calendar.mjs";
import {finishBookingChange} from "../lib/booking-management.mjs";
import {withBookingLock} from "../lib/booking-lock.mjs";

export default async () => {
  const sitePointers = await clientSiteStore().list({ prefix: "sites/" });
  let attempted = 0;
  let completed = 0;
  for (const pointer of (sitePointers.blobs || []).slice(0, 100)) {
    const siteId = pointer.key.replace(/^sites\//, "").replace(/\.json$/, "");
    const site = await getClientSite(siteId);
    if (!site) continue;
    const transactions = await clientCommerceStore().list({ prefix: `${siteId}/transactions/` });
    for (const blob of (transactions.blobs || []).slice(0, 250)) {
      let record = await clientCommerceStore().get(blob.key, { type: "json" });
      if (!record || record.paymentStatus !== "paid") continue;
      if(record.commerceEmailNeedsReview||record.athFulfillmentNeedsReview)continue;
      if(record.kind==='order'&&(record.inventoryNeedsReview||record.status==='processing'||record.inventoryProtocol===1&&!record.inventoryAppliedAt))continue;
      if(record.kind === "booking") {
        // The booking is canonical after customer changes. Never restore stale paid transaction dates.
        try { await withBookingLock(clientCommerceStore(),commerceKey(siteId,"booking-change-locks",record.transactionId),async()=>{
          const bookingKey=commerceKey(siteId,"bookings",record.transactionId);
          const canonical=await clientCommerceStore().get(bookingKey,{type:"json"});
          if(canonical) await clientCommerceStore().setJSON(blob.key,canonical);
          else await clientCommerceStore().setJSON(bookingKey,record,{onlyIfNew:true});
        }); } catch { /* Another booking operation is active. */ }
        continue;
      }
      if (record.customerEmailSent && (record.businessEmailSent || !site.business?.email) && (record.kind !== "booking" || (record.googleEventId && !record.calendarUpdatePending && (!record.customerCalendarInviteRequested || record.customerCalendarInviteStatus === "sent")) || !site.googleCalendar?.connected)) continue;
      attempted += 1;
      try {
        const finalKey = commerceKey(siteId, record.kind === "booking" ? "bookings" : "orders", record.transactionId);
        record = await syncBookingCalendar(site, record);
        record = await sendCommerceConfirmationEmails(site,record,async value => {
          await clientCommerceStore().setJSON(blob.key,value);
          await clientCommerceStore().setJSON(finalKey,value);
        });
        const delivered = (!record.customer?.email || record.customerEmailSent) && (!site.business?.email || record.businessEmailSent);
        if (delivered) record.emailsSentAt = new Date().toISOString();
        await clientCommerceStore().setJSON(blob.key, record);
        await clientCommerceStore().setJSON(finalKey, record);
        if (delivered) completed += 1;
      } catch (error) { console.error("retry-client-commerce", record.transactionId, error?.message || error); }
    }
    // In-person appointments have no payment transaction: retry their calendar sync separately.
    const bookings = await clientCommerceStore().list({ prefix: `${siteId}/bookings/` });
    for (const blob of bookings.blobs || []) {
      try { await withBookingLock(clientCommerceStore(),commerceKey(siteId,"booking-change-locks",blob.key.split('/').pop().replace(/\.json$/,'')),async()=>{
        let record=await clientCommerceStore().get(blob.key,{type:"json"});
        if(!record) return;
        if(record.managementRevision && ((!record.changeCustomerEmailSent && record.customer?.email) || (!record.changeBusinessEmailSent && site.business?.email) || record.calendarUpdatePending || record.calendarCancellationPending)) record=await finishBookingChange(site,record);
        if(record.status === "cancelled") {
          if(record.calendarCancellationPending && record.googleEventId) {
            try {await deleteGoogleEvent(siteId,record.googleCalendarId,record.googleEventId);await clientCommerceStore().setJSON(blob.key,{...record,calendarCancellationPending:false});} catch { /* Retry later. */ }
          }
          return;
        }
        if(!bookingCanSync(record) || Date.parse(record.end)<Date.now()) return;
        if(!record.managementRevision && (record.confirmationEmailRequested || record.paymentStatus === "paid")) record=await sendBookingConfirmationEmails(site,record,value=>clientCommerceStore().setJSON(blob.key,value));
        if(!record.googleEventId || record.calendarUpdatePending || (record.customerCalendarInviteRequested && record.customerCalendarInviteStatus !== "sent")) record=await syncBookingCalendar(site,record);
        await clientCommerceStore().setJSON(blob.key,record);
        const transactionKey=commerceKey(siteId,"transactions",record.transactionId);
        if(await clientCommerceStore().get(transactionKey,{type:"json"})) await clientCommerceStore().setJSON(transactionKey,record);
      }); } catch { /* Do not overwrite another booking operation. */ }
    }
    const holds = await clientCommerceStore().list({ prefix: `${siteId}/holds/` });
    for (const blob of holds.blobs || []) {
      const hold = await clientCommerceStore().get(blob.key, { type: "json" });
      if (hold && Date.parse(hold.expiresAt || "") < Date.now()) await clientCommerceStore().delete(blob.key);
    }
  }
  console.log(`retry-client-commerce attempted=${attempted} completed=${completed}`);
};

export const config = { schedule: "@hourly" };
