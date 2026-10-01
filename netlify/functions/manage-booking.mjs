import {assertSameOrigin} from "../lib/client-auth.mjs";
import {availabilityForDate} from "../lib/booking-engine.mjs";
import {bookingDetails,safeWebUrl} from "../lib/booking-email-template.mjs";
import {bookingCalendarUrl,escapeHtml} from "../lib/booking-calendar-export.mjs";
import {findPrivateBooking,changePrivateBooking,canManageBooking,bookingVersion} from "../lib/booking-management.mjs";

const headers={"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex, nofollow","Content-Security-Policy":"default-src 'none'; img-src https:; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"};
function page(content,es=true) {
  return `<!doctype html><html lang="${es?'es':'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${es?'Administrar reserva':'Manage booking'} | WebFactory PR</title><style>body{margin:0;background:#f3f6fb;color:#0b1529;font:16px system-ui}main{max-width:640px;margin:32px auto;padding:28px;background:#fff;border:1px solid #dce8f7;border-radius:24px}header{display:flex;align-items:center;gap:16px}header img{object-fit:contain;border-radius:12px}h1{font-size:30px}p{line-height:1.6}small{color:#53637a}dt{color:#53637a;font-size:14px}dd{margin:4px 0 20px;font-weight:650}a,button{display:inline-block;padding:14px 18px;margin:6px 6px 6px 0;border:1px solid #2866cf;background:#2866cf;color:#fff;border-radius:12px;text-decoration:none;font:600 16px system-ui;cursor:pointer}input,select{box-sizing:border-box;width:100%;padding:14px;margin:10px 0;border:1px solid #cbd5e1;border-radius:10px;font:16px system-ui;background:inherit;color:inherit}input[type=checkbox]{width:20px;height:20px;margin-right:10px}.danger{background:#b42336;border-color:#b42336}.notice{background:#e9f3ff;padding:16px;border-radius:12px}form{padding:20px 0;border-top:1px solid #dce8f7}label{display:block;line-height:1.6}@media(max-width:680px){main{margin:12px;padding:22px}}@media(prefers-color-scheme:dark){body{background:#0b1529;color:#f3f6fb}main{background:#14213b;border-color:#31435f}small,dt{color:#b8c7de}.notice{background:#203b60}input,select{border-color:#60708a}}</style></head><body><main>${content}</main></body></html>`;
}
export default async req=>{
  try {
    if(!["GET","POST"].includes(req.method)) return new Response("Method not allowed",{status:405,headers});
    const url=new URL(req.url);
    if(req.method==="POST") {
      assertSameOrigin(req);
      if(!req.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) throw Object.assign(new Error("Invalid request"),{status:400});
      const body=await req.formData(), token=String(body.get("token") || "");
      await changePrivateBooking(token,{action:String(body.get("action") || ""),start:String(body.get("start") || ""),version:String(body.get("version") || ""),acknowledged:String(body.get("acknowledged") || "")});
      return new Response(null,{status:303,headers:{...headers,Location:`${url.pathname}?token=${encodeURIComponent(token)}&updated=1`}});
    }
    const token=url.searchParams.get("token") || "", {site,record}=await findPrivateBooking(token);
    const d=bookingDetails(site,record), es=d.es, e=escapeHtml;
    const cancelled=record.status==="cancelled", active=record.status==="confirmed";
    const fields=[[es?"Servicio":"Service",d.service],[es?"Fecha":"Date",d.date],[es?"Horario":"Time",`${d.time} (${d.timeZone})`],[es?"Profesional":"Professional",d.employee],[es?"Localidad":"Location",record.locationName],[es?"Importe":"Amount",d.price],[es?"Pago":"Payment",d.payment],[es?"Reservación":"Booking ID",d.reference]];
    let content=`<header>${d.logo?`<img src="${e(d.logo)}" alt="${e(d.name)}" width="64" height="64">`:""}<strong>${e(d.name)}</strong></header><h1>${es?'Administrar reserva':'Manage booking'}</h1><p class="notice">${cancelled?(es?'Cita cancelada':'Appointment cancelled'):active?(es?'Cita confirmada':'Appointment confirmed'):e(record.status)}</p>${url.searchParams.get("updated")==="1"?`<p role="status">${es?'Tu cambio fue guardado.':'Your change has been saved.'}</p>`:""}<dl>${fields.filter(([,value])=>value).map(([label,value])=>`<dt>${e(label)}</dt><dd>${e(value)}</dd>`).join("")}</dl>`;
    if(active) content+=`<a href="${e(bookingCalendarUrl(record))}">${es?'Añadir al calendario':'Add to calendar'}</a>`;
    if(d.maps) content+=`<a href="${e(safeWebUrl(d.maps))}" target="_blank" rel="noopener noreferrer">${es?'Cómo llegar':'Get directions'}</a>`;
    if(record.calendarUpdatePending || record.calendarCancellationPending) content+=`<p>${es?'La actualización de Google Calendar está pendiente; tu cambio ya está guardado en el negocio.':'The Google Calendar update is pending; your change is already saved with the business.'}</p>`;
    const hidden=`<input type="hidden" name="token" value="${e(token)}"><input type="hidden" name="version" value="${bookingVersion(record)}">`;
    if(canManageBooking(site,record,"reschedule")) {
      const date=url.searchParams.get("date") || "", today=new Intl.DateTimeFormat("en-CA",{timeZone:d.timeZone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
      content+=`<h2>${es?'Reprogramar cita':'Reschedule appointment'}</h2><p>${es?'Elige otro horario disponible para el mismo servicio, profesional y localidad. Los cambios online requieren al menos una hora de anticipación.':'Choose another available time for the same service, professional and location. Online changes require at least one hour of notice.'}</p><form method="get"><input type="hidden" name="token" value="${e(token)}"><label>${es?'Nueva fecha':'New date'}<input type="date" name="date" value="${/^\d{4}-\d{2}-\d{2}$/.test(date)?date:""}" min="${today}" max="${new Date(Date.now()+365*86400000).toISOString().slice(0,10)}" required></label><button type="submit">${es?'Ver horarios':'View available times'}</button></form>`;
      if(date) {
        if(!/^\d{4}-\d{2}-\d{2}$/.test(date) || Date.parse(date)<Date.now()-2*86400000 || Date.parse(date)>Date.now()+366*86400000) throw Object.assign(new Error("Invalid date / Fecha inválida"),{status:400});
        let slots=[], unavailable=false;
        try {slots=await availabilityForDate(site,record.serviceId,record.employeeId,date,record.locationId || "",{strictGoogle:true});} catch {unavailable=true;}
        content+=slots.length?`<form method="post">${hidden}<input type="hidden" name="action" value="reschedule"><label>${es?'Nuevo horario':'New time'}<select name="start" required><option value="">${es?'Selecciona un horario':'Choose a time'}</option>${slots.map(slot=>`<option value="${e(slot.start)}">${e(new Date(slot.start).toLocaleTimeString(es?'es-PR':'en-US',{timeZone:d.timeZone,hour:'numeric',minute:'2-digit'}))}</option>`).join("")}</select></label><label><input type="checkbox" name="acknowledged" value="yes" required>${es?'Confirmo cambiar mi cita al horario seleccionado.':'I confirm moving my appointment to the selected time.'}</label><button type="submit">${es?'Confirmar nuevo horario':'Confirm new time'}</button></form>`:`<p>${unavailable?(es?'No se pudo verificar el calendario. Inténtalo más tarde.':'Calendar availability could not be verified. Try again later.'):(es?'No hay horarios disponibles para esta fecha.':'No available times for this date.')}</p>`;
      }
    }
    if(canManageBooking(site,record,"cancel")) content+=`<h2>${es?'Cancelar cita':'Cancel appointment'}</h2><form method="post">${hidden}<input type="hidden" name="action" value="cancel"><label><input type="checkbox" name="acknowledged" value="yes" required>${es?'Confirmo cancelar esta cita. Entiendo que esto no emite un reembolso automático.':'I confirm cancelling this appointment. I understand this does not issue an automatic refund.'}</label><button type="submit" class="danger">${es?'Confirmar cancelación':'Confirm cancellation'}</button></form>`;
    content+=`<p>${es?'Para consultas o reembolsos, contacta al negocio.':'Contact the business for questions or refunds.'}<br>${e(d.email)}<br>${e(d.phone)}</p><p><small>${es?'Este enlace es privado. No lo compartas. Las copias de calendario guardadas manualmente deben actualizarse o eliminarse en tu aplicación.':'This link is private. Do not share it. Manually saved calendar copies must be updated or removed in your app.'}</small></p><a href="${e(d.website)}">${es?'Reservar otra cita':'Book another appointment'}</a>`;
    return new Response(page(content,es),{headers:{...headers,"Content-Type":"text/html; charset=utf-8"}});
  } catch(error) {
    const status=error.status || 503;
    return new Response(page(`<h1>No se pudo completar / Could not complete</h1><p>${escapeHtml(error.status?error.message:"Please try again later. / Inténtalo más tarde.")}</p><p>Regresa al enlace de tu correo y actualiza la página. / Return to your email link and reload the page.</p>`),{status,headers:{...headers,"Content-Type":"text/html; charset=utf-8"}});
  }
};
