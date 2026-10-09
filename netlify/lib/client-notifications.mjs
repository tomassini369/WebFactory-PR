import { getV3Record } from "./webfactory-v3-store.mjs";
import { bookingIcs } from "./booking-calendar-export.mjs";
import { renderBookingEmail } from "./booking-email-template.mjs";
import { renderCommerceEmail } from "./commerce-email-template.mjs";
import { sendBusinessEmail } from "./business-email.mjs";

export async function sendCustomerCommerceEmail(site, record, deliver=sendBusinessEmail, {readReceipt=getV3Record}={}) {
  let receipt;
  if (record.receiptId && ["paid","paid_in_person"].includes(record.paymentStatus)) {
    receipt = await readReceipt(site.siteId,"receipts",record.receiptId);
    if (!receipt || receipt.siteId !== site.siteId || receipt.transactionId !== record.transactionId || receipt.receiptId !== record.receiptId || !["paid","paid_in_person"].includes(receipt.paymentStatus) || String(receipt.customer?.email || "").toLowerCase() !== String(record.customer?.email || "").toLowerCase()) throw new Error("Saved receipt does not match this confirmed payment.");
    receipt = {...receipt,language:record.language || site.settings?.locale};
  }
  const ics = record.kind === "booking" ? bookingIcs(site,record) : null;
  const mail = ics ? renderBookingEmail(site,record,{receipt}) : receipt ? renderCommerceEmail(site,receipt,{receipt:true}) : renderCommerceEmail(site,record);
  await deliver(site,{fromName:site.business?.name || "WebFactory Business",to:record.customer.email,...mail,
    ...(ics ? {attachments:[{filename:"appointment.ics",content:ics,contentType:"text/calendar; charset=utf-8"}]} : {})});
}
export async function sendBusinessCommerceEmail(site, record, deliver=sendBusinessEmail) {
  if (!site.business?.email) return;
  const mail = record.kind === "booking" && bookingIcs(site,record)
    ? renderBookingEmail(site,record,{audience:"business"}) : renderCommerceEmail(site,record,{audience:"business"});
  await deliver(site,{fromName:site.business?.name || "WebFactory Business",to:site.business.email,...mail});
}

// Persist each successful recipient before trying the next one. Failed mail never cancels a booking.
export async function sendCommerceConfirmationEmails(site, record, persist, {deliver=sendBusinessEmail,readReceipt=getV3Record}={}) {
  if (!["confirmed","completed"].includes(record.status) || (record.kind !== "booking" && !(record.kind === "order" && record.paymentStatus === "paid" && record.receiptId))) return record;
  for (const [recipient, send, flag] of [[record.customer?.email,sendCustomerCommerceEmail,"customerEmailSent"],[site.business?.email,sendBusinessCommerceEmail,"businessEmailSent"]]) {
    if (!recipient || record[flag]) continue;
    try { await send(site,record,deliver,{readReceipt}); record = {...record,[flag]:true}; await persist(record); }
    catch { /* The commerce retry job retries only unsent recipients. */ }
  }
  return record;
}

export async function sendBookingConfirmationEmails(site, record, persist, options) {
  if (record.kind !== "booking") return record;
  return sendCommerceConfirmationEmails(site,record,persist,options);
}
