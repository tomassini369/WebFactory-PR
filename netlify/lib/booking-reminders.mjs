import crypto from "node:crypto";
import { clientCommerceStore, commerceKey } from "./client-store.mjs";
import { renderBookingEmail } from "./booking-email-template.mjs";
import { sendEmail } from "./email.mjs";

const validEmail = value => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(String(value || ""));
export function dueBookingReminders(record, now = Date.now()) {
  if (record.kind !== "booking" || record.status !== "confirmed") return [];
  const start = Date.parse(record.start), created = Date.parse(record.rescheduledAt || record.createdAt);
  if (!Number.isFinite(start) || start <= now) return [];
  return [24, 4].filter(hours => {
    const due = start - hours * 3600000;
    // A recently made booking never receives an obsolete 24-hour reminder.
    return (!Number.isFinite(created) || created <= due) && now >= due && now - due < 30 * 60000;
  });
}
export async function sendBookingReminders(site, record, now = Date.now(), deadline = Infinity, {store=clientCommerceStore(),send=sendEmail,outcome=()=>{}} = {}) {
  let sent = 0;
  const recipients = [record.customer?.email, site.business?.email].filter(validEmail).map(email => email.trim().toLowerCase());
  for (const hours of dueBookingReminders(record, now)) {
    for (const email of new Set(recipients)) {
      if (Date.now() + 10000 > deadline) return sent;
      const hash = crypto.createHash("sha256").update(`${record.transactionId}:${record.start}:${hours}:${email}`).digest("hex");
      const key = commerceKey(site.siteId, "booking-reminders", hash);
      let claim = await store.setJSON(key, { status: "sending", startedAt: new Date(now).toISOString(), transactionId: record.transactionId, hours }, { onlyIfNew: true });
      if (!claim.modified) {
        const previous = await store.getWithMetadata(key, { type: "json" });
        if (!previous || previous.data?.status !== "sending" || now - Date.parse(previous.data.startedAt) < 10 * 60000) continue;
        // A terminated invocation may already have delivered the email.
        // Preserve the evidence and require review rather than sending again.
        const result=await store.setJSON(key,{...previous.data,status:'delivery_uncertain',issue:'interrupted_attempt'}, {onlyIfMatch:previous.etag});
        if(result.modified)outcome('uncertain');
        continue;
      }
      try {
        // Recheck cancellation after claiming the reminder, immediately before sending.
        const current = await store.get(commerceKey(site.siteId, "bookings", record.transactionId), { type: "json" });
        if (!current || current.status !== "confirmed" || current.start !== record.start) { await store.setJSON(key,{status:'cancelled',transactionId:record.transactionId,hours}); outcome('suppressed'); continue; }
        const response=await send({ category: "team", fromName: site.business?.name || "WebFactory Business", to: email,
          ...renderBookingEmail(site,record,{audience:email===record.customer?.email?.trim().toLowerCase()?"customer":"business",change:"reminder",hours}),
          headers: { "Message-ID": `<booking-reminder-${hash}@webfactorypr.com>` }, timeoutMs:6000,
        });
        if(!response?.accepted?.some(value=>String(value).trim().toLowerCase()===email))throw Error('Delivery not acknowledged');
        await store.setJSON(key, { status: "sent", sentAt: new Date().toISOString(), transactionId: record.transactionId, hours });
        sent++; outcome('sent');
      } catch {
        // Failure after an SMTP attempt is uncertain, including a failed sent-marker write.
        await store.setJSON(key,{status:'delivery_uncertain',startedAt:new Date(now).toISOString(),transactionId:record.transactionId,hours,issue:'provider_or_persistence_failure'});
        outcome('uncertain');
      }
    }
  }
  return sent;
}
