import { renderReceiptBlock } from "./receipt-email-template.mjs";
import { escapeHtml, bookingCalendarUrl } from "./booking-calendar-export.mjs";
import { publicBaseUrl } from "./platform-utils.mjs";
import { emailBrand, emailButton, emailFields, emailParagraph, renderEmailLayout } from "./email-design.mjs";

export function safeWebUrl(value) {
  try { const url = new URL(String(value || "")); return ["http:","https:"].includes(url.protocol) && !url.username && !url.password ? url.href : ""; } catch { return ""; }
}
export function bookingManageUrl(record) {
  return record.calendarToken ? `${publicBaseUrl()}/.netlify/functions/manage-booking?token=${encodeURIComponent(record.calendarToken)}` : "";
}
export function bookingDetails(site, record) {
  const es = (record.language || site.settings?.locale) === "es", locale = es ? "es-PR" : "en-US", timeZone = site.settings?.timezone || "America/Puerto_Rico";
  const location = (site.business?.locations || []).find(item => item.id === record.locationId);
  const address = location?.address || site.business?.address || "";
  const start = new Date(record.start), end = new Date(record.end);
  return { es, timeZone, name:site.business?.name || "Business", logo:safeWebUrl(site.business?.logoUrl),
    service:(record.items || []).map(item=>item.name).filter(Boolean).join(" · ") || (es ? "Cita" : "Appointment"),
    date:start.toLocaleDateString(locale,{timeZone,weekday:"long",year:"numeric",month:"long",day:"numeric"}),
    time:`${start.toLocaleTimeString(locale,{timeZone,hour:"numeric",minute:"2-digit"})} – ${end.toLocaleTimeString(locale,{timeZone,hour:"numeric",minute:"2-digit"})}`,
    employee:(site.employees || []).find(item=>item.id === record.employeeId)?.name || "",
    address, phone:location?.phone || site.business?.phone || "", email:site.business?.email || "",
    maps:safeWebUrl(location?.mapsUrl || site.business?.mapsUrl) || (address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : ""),
    website:`${publicBaseUrl()}/sites/${encodeURIComponent(site.slug || "")}`,
    reference:record.bookingCode || record.transactionId,
    price:new Intl.NumberFormat(locale,{style:"currency",currency:"USD"}).format(Number(record.amountTotal || 0)/100),
    payment:record.paymentStatus === "due" ? (es ? "Pago al llegar" : "Payment due at appointment") : ["paid","paid_in_person"].includes(record.paymentStatus) ? (es ? "Pago confirmado" : "Payment confirmed") : (es ? "Contacta al negocio" : "Contact the business"),
  };
}
export function renderBookingEmail(site, record, {audience="customer",change="confirmed",hours,receipt}={}) {
  const d = bookingDetails(site,record), es=d.es, e=escapeHtml;
  const title = change === "reminder" ? (es ? `Recordatorio de tu cita (${hours} h)` : `Appointment reminder (${hours} h)`) : change === "cancelled" ? (es ? "Tu cita fue cancelada" : "Your appointment is cancelled") : change === "rescheduled" ? (es ? "Tu cita fue reprogramada" : "Your appointment is rescheduled") : (es ? "Tu cita está confirmada" : "You're booked in");
  const heading = change === "reminder" ? title : audience === "business" ? `${es ? "Reservación" : "Booking"}: ${change === "cancelled" ? (es ? "cancelada" : "cancelled") : change === "rescheduled" ? (es ? "reprogramada" : "rescheduled") : (es ? "confirmada" : "confirmed")}` : title;
  const fields = [[es?"Servicio":"Service",d.service],[es?"Fecha":"Date",d.date],[es?"Horario":"Time",`${d.time} (${d.timeZone})`],[es?"Profesional":"With",d.employee],[es?"Localidad":"Location",record.locationName],[es?"Importe":"Amount",d.price],[es?"Pago":"Payment",d.payment],[es?"Reservación":"Booking ID",d.reference]];
  if (audience === "business") fields.unshift([es?"Cliente":"Customer",record.customer?.name],["Email",record.customer?.email],[es?"Teléfono":"Phone",record.customer?.phone]);
  const manage=bookingManageUrl(record), calendar=bookingCalendarUrl(record);
  const brand=emailBrand(site,es?"es":"en");
  d.name=brand.name;
  const button=(url,label,primary=false)=>emailButton(brand,url,label,primary);
  const active=change !== "cancelled";
  const controls=audience === "customer" ? button(manage,es?"Administrar reserva":"Manage booking",true)+(active?button(calendar,es?"Añadir al calendario":"Add to calendar"):"") : button(`${publicBaseUrl()}/client-admin/`,es?"Abrir portal del negocio":"Open business portal",true);
  const explanation = change === "cancelled" ? (es?"La cancelación no realiza un reembolso automático. Contacta al negocio si corresponde un reembolso.":"Cancellation does not automatically issue a refund. Contact the business if a refund applies.") : (es?"Recibirás recordatorios por email 24 horas y 4 horas antes, cuando la anticipación de la reserva lo permita.":"Email reminders are scheduled 24 hours and 4 hours before your appointment when booked sufficiently in advance.");
  const caveat=es?"Si ya aceptaste la invitación de Google, no añadas otra copia. Las copias guardadas manualmente no se actualizan solas; revisa tu calendario después de un cambio.":"If you accepted the Google invitation, do not add another copy. Manually saved copies do not update automatically; check your calendar after a change.";
  const text=[d.name,heading,...fields.filter(([,value])=>value).map(([label,value])=>`${label}: ${value}`),d.address,explanation,manage?`${es?'Administrar reserva':'Manage booking'}: ${manage}`:"",active&&calendar?`${es?'Añadir al calendario':'Add to calendar'}: ${calendar}`:"",d.maps?`${es?'Cómo llegar':'Get directions'}: ${d.maps}`:"",d.email,d.phone,active?caveat:""].filter(Boolean).join("\n");
  const contact=[d.address,d.email,d.phone].filter(Boolean).join("\n");
  const receiptBlock = receipt && audience === "customer" ? renderReceiptBlock(site,receipt,es?"es":"en") : null;
  const bodyHtml=`<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${emailFields(fields)}</table>${receiptBlock?.html || ""}${emailParagraph(explanation)}${controls}<hr style="border:0;border-top:1px solid #dce8f7;margin:24px 0">${contact?emailParagraph(contact):""}${button(d.maps,es?"Cómo llegar":"Get directions")}${button(d.website,es?"Reservar otra cita":"Book another appointment")}${active?emailParagraph(caveat):""}`;
  const html=renderEmailLayout({brand,language:es?"es":"en",title:heading,bodyHtml,footer:es?"Mensaje relacionado con tu reservación. Tecnología de WebFactory PR.":"Message about your booking. Powered by WebFactory PR."});
  return {text:receiptBlock ? `${text}\n\n${receiptBlock.text}` : text,html,subject:`${d.name} — ${heading} · ${d.date}`};
}
