import { bookingIcs } from "./booking-calendar-export.mjs";
import { renderBookingEmail } from "./booking-email-template.mjs";
import { renderCommerceEmail } from "./commerce-email-template.mjs";
import { sendEmail } from "./email.mjs";

export async function sendCustomerCommerceEmail(site, record) {
  const ics = record.kind === "booking" ? bookingIcs(site,record) : null;
  const mail = ics ? renderBookingEmail(site,record) : renderCommerceEmail(site,record);
  await sendEmail({category:"team",fromName:site.business?.name || "WebFactory Business",to:record.customer.email,...mail,
    ...(ics ? {attachments:[{filename:"appointment.ics",content:ics,contentType:"text/calendar; charset=utf-8"}]} : {})});
}
export async function sendBusinessCommerceEmail(site, record) {
  if (!site.business?.email) return;
  const mail = record.kind === "booking" && bookingIcs(site,record)
    ? renderBookingEmail(site,record,{audience:"business"}) : renderCommerceEmail(site,record,{audience:"business"});
  await sendEmail({category:"team",fromName:site.business?.name || "WebFactory Business",to:site.business.email,...mail});
}

// Persist each successful recipient before trying the next one. Failed mail never cancels a booking.
export async function sendBookingConfirmationEmails(site, record, persist) {
  if (record.kind !== "booking" || !["confirmed","completed"].includes(record.status)) return record;
  for (const [recipient, send, flag] of [[record.customer?.email,sendCustomerCommerceEmail,"customerEmailSent"],[site.business?.email,sendBusinessCommerceEmail,"businessEmailSent"]]) {
    if (!recipient || record[flag]) continue;
    try { await send(site,record); record = {...record,[flag]:true}; await persist(record); }
    catch { /* The commerce retry job retries only unsent recipients. */ }
  }
  return record;
}
