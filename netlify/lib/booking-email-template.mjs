import { escapeHtml, bookingCalendarUrl } from "./booking-calendar-export.mjs";
import { publicBaseUrl } from "./platform-utils.mjs";

export function safeWebUrl(value) {
  try { const url = new URL(String(value || "")); return ["http:","https:"].includes(url.protocol) && !url.username && !url.password ? url.href : ""; } catch { return ""; }
}
export function bookingManageUrl(record) {
  return record.calendarToken ? `${publicBaseUrl()}/.netlify/functions/manage-booking?token=${encodeURIComponent(record.calendarToken)}` : "";
}
export function bookingDetails(site, record) {
  const es = record.language === "es", locale = es ? "es-PR" : "en-US", timeZone = site.settings?.timezone || "America/Puerto_Rico";
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
export function renderBookingEmail(site, record, {audience="customer",change="confirmed",hours}={}) {
  const d = bookingDetails(site,record), es=d.es, e=escapeHtml;
  const title = change === "reminder" ? (es ? `Recordatorio de tu cita (${hours} h)` : `Appointment reminder (${hours} h)`) : change === "cancelled" ? (es ? "Tu cita fue cancelada" : "Your appointment is cancelled") : change === "rescheduled" ? (es ? "Tu cita fue reprogramada" : "Your appointment is rescheduled") : (es ? "Tu cita está confirmada" : "You're booked in");
  const heading = change === "reminder" ? title : audience === "business" ? `${es ? "Reservación" : "Booking"}: ${change === "cancelled" ? (es ? "cancelada" : "cancelled") : change === "rescheduled" ? (es ? "reprogramada" : "rescheduled") : (es ? "confirmada" : "confirmed")}` : title;
  const fields = [[es?"Servicio":"Service",d.service],[es?"Fecha":"Date",d.date],[es?"Horario":"Time",`${d.time} (${d.timeZone})`],[es?"Profesional":"With",d.employee],[es?"Localidad":"Location",record.locationName],[es?"Importe":"Amount",d.price],[es?"Pago":"Payment",d.payment],[es?"Reservación":"Booking ID",d.reference]];
  if (audience === "business") fields.unshift([es?"Cliente":"Customer",record.customer?.name],["Email",record.customer?.email],[es?"Teléfono":"Phone",record.customer?.phone]);
  const manage=bookingManageUrl(record), calendar=bookingCalendarUrl(record);
  const button=(url,label,primary=false)=>url ? `<a href="${e(url)}" style="display:inline-block;margin:6px 6px 6px 0;padding:14px 20px;border:1px solid ${primary?'#2866cf':'#cbd5e1'};border-radius:12px;background:${primary?'#2866cf':'#ffffff'};color:${primary?'#ffffff':'#0b1529'};text-decoration:none;font-weight:700">${e(label)}</a>` : "";
  const active=change !== "cancelled";
  const controls=audience === "customer" ? button(manage,es?"Administrar reserva":"Manage booking",true)+(active?button(calendar,es?"Añadir al calendario":"Add to calendar"):"") : button(`${publicBaseUrl()}/client-admin/`,es?"Abrir portal del negocio":"Open business portal",true);
  const explanation = change === "cancelled" ? (es?"La cancelación no realiza un reembolso automático. Contacta al negocio si corresponde un reembolso.":"Cancellation does not automatically issue a refund. Contact the business if a refund applies.") : (es?"Recibirás recordatorios por email 24 horas y 4 horas antes, cuando la anticipación de la reserva lo permita.":"Email reminders are scheduled 24 hours and 4 hours before your appointment when booked sufficiently in advance.");
  const caveat=es?"Si ya aceptaste la invitación de Google, no añadas otra copia. Las copias guardadas manualmente no se actualizan solas; revisa tu calendario después de un cambio.":"If you accepted the Google invitation, do not add another copy. Manually saved copies do not update automatically; check your calendar after a change.";
  const text=[d.name,heading,...fields.filter(([,value])=>value).map(([label,value])=>`${label}: ${value}`),d.address,explanation,manage?`${es?'Administrar reserva':'Manage booking'}: ${manage}`:"",active&&calendar?`${es?'Añadir al calendario':'Add to calendar'}: ${calendar}`:"",d.maps?`${es?'Cómo llegar':'Get directions'}: ${d.maps}`:"",d.email,d.phone,active?caveat:""].filter(Boolean).join("\n");
  const html=`<!doctype html><html lang="${es?'es':'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:24px 12px;background:#f3f6fb;color:#0b1529;font-family:Arial,sans-serif"><table role="presentation" style="width:100%;max-width:600px;margin:auto;border-collapse:collapse"><tr><td style="padding:28px;background:#ffffff;border-radius:24px"><table role="presentation"><tr>${d.logo?`<td style="padding-right:14px"><img src="${e(d.logo)}" width="64" height="64" alt="${e(d.name)}" style="object-fit:contain;border-radius:12px"></td>`:""}<td style="font-size:24px;font-weight:700">${e(d.name)}</td></tr></table><h1 style="font-size:30px;margin:30px 0 24px">${e(heading)}</h1>${fields.filter(([,value])=>value).map(([label,value])=>`<p style="margin:0 0 18px;line-height:1.5"><span style="display:block;font-size:14px;color:#53637a">${e(label)}</span><strong style="font-size:18px">${e(value)}</strong></p>`).join("")}<p style="line-height:1.6">${e(explanation)}</p><div>${controls}</div><hr style="border:0;border-top:1px solid #dce8f7;margin:28px 0"><h2 style="font-size:20px">${e(d.name)}</h2>${d.address?`<p style="line-height:1.6">${e(d.address)}</p>`:""}${d.email?`<p>${e(d.email)}</p>`:""}${d.phone?`<p>${e(d.phone)}</p>`:""}${button(d.maps,es?"Cómo llegar":"Get directions")}${button(d.website,es?"Reservar otra cita":"Book another appointment")}<p style="font-size:13px;line-height:1.6;color:#53637a">${active?e(caveat):""}</p></td></tr><tr><td style="padding:18px;text-align:center;color:#53637a;font-size:12px">${es?'Mensaje relacionado con tu reservación.':'Message about your booking.'} · WebFactory PR</td></tr></table></body></html>`;
  return {text,html,subject:`${d.name} — ${heading} · ${d.date}`};
}
