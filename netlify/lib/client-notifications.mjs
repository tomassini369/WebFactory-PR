import { bookingIcs, bookingCalendarUrl, escapeHtml } from "./booking-calendar-export.mjs";
import { sendEmail } from "./email.mjs";

function env(name) { return globalThis.Netlify?.env?.get(name) || ""; }

function money(cents) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(cents || 0) / 100); }

function messages(site, record) {
  const kindLabel = record.kind === "booking" ? "booking" : "order";
  const lines = (record.items || []).map((item) => `- ${item.name} × ${item.quantity}: ${money(item.unitAmount * item.quantity)}`);
  const customerText = [
    `Hello ${record.customer?.name || ""},`, "",
    `Your ${kindLabel} with ${site.business?.name || "the business"} is confirmed.`,
    `Confirmation: ${record.transactionId}`,
    ...lines,
    `${record.paymentStatus === "due" ? "Amount due at appointment" : "Total paid"}: ${money(record.amountTotal)}`,
    record.start ? `Appointment: ${new Date(record.start).toLocaleString("en-US", { timeZone: site.settings?.timezone || "America/Puerto_Rico" })}` : "",
    "", record.paymentStatus === "due" ? "Payment is due at the business. / Pago al llegar al negocio." : record.paymentProvider === "ath_movil" ? `Payment was verified by ATH Móvil. Reference: ${record.athReferenceNumber || ""}` : record.paymentMethod === "manual_ath" ? "The business recorded an ATH Móvil payment manually." : record.paymentStatus === "paid_in_person" ? "The business recorded an in-person payment." : "Payment was verified securely by Stripe.",
  ].filter(Boolean).join("\n");
  const businessText = [
    `New confirmed ${kindLabel}`, "",
    `Confirmation: ${record.transactionId}`,
    `Customer: ${record.customer?.name || ""}`,
    `Email: ${record.customer?.email || ""}`,
    `Phone: ${record.customer?.phone || ""}`,
    ...lines,
    `Total: ${money(record.amountTotal)}`,
    record.start ? `Appointment: ${new Date(record.start).toLocaleString("en-US", { timeZone: site.settings?.timezone || "America/Puerto_Rico" })}` : "",
  ].filter(Boolean).join("\n");

  return { kindLabel, customerText, businessText };
}

export async function sendCustomerCommerceEmail(site, record) {
  const { kindLabel, customerText } = messages(site, record);
  const ics = bookingIcs(site, record), url = ics ? bookingCalendarUrl(record) : "";
  const calendarText = ics ? `\n\nAñadir al calendario / Add to calendar: ${url || "Open the attached appointment.ics file / Abre el archivo appointment.ics adjunto"}\nIf you accepted the Google invitation, do not add another copy. / Si aceptaste la invitación de Google, no añadas otra copia.` : "";
  await sendEmail({ category:"team", fromName:site.business?.name || "WebFactory Business", to:record.customer.email, subject:`${site.business?.name || "Business"} — ${kindLabel} confirmed`, text:customerText + calendarText,
    ...(ics ? { html:`<div style="font:16px system-ui;color:#0b1529;background:#fff;padding:24px"><p>${escapeHtml(customerText).replace(/\n/g,"<br>")}</p>${url ? `<a href="${escapeHtml(url)}" style="display:inline-block;background:#2866cf;color:#fff;padding:16px;border-radius:12px;text-decoration:none">Añadir al calendario / Add to calendar</a>` : ""}<p>Google · Outlook · Apple Calendar (.ics)</p><p>Si ya aceptaste la invitación de Google, no añadas otra copia. / If you accepted the Google invitation, do not add another copy.</p></div>`, attachments:[{filename:"appointment.ics",content:ics,contentType:"text/calendar; charset=utf-8"}] } : {}) });
}

export async function sendBusinessCommerceEmail(site, record) {
  if (!site.business?.email) return;
  const { kindLabel, businessText } = messages(site, record);
  await sendEmail({ category:"team", fromName:site.business?.name || "WebFactory Business", to:site.business.email, subject:`New confirmed ${kindLabel} — ${record.transactionId}`, text:businessText });
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
