import crypto from "node:crypto";
import { clientCommerceStore, commerceKey, getClientSite } from "../lib/client-store.mjs";
import { bookingCalendarData, bookingIcs, calendarLinks, escapeHtml } from "../lib/booking-calendar-export.mjs";

const headers = { "Cache-Control":"private, no-store", "Referrer-Policy":"no-referrer", "X-Content-Type-Options":"nosniff", "X-Robots-Tag":"noindex, nofollow" };
export default async req => {
  if (req.method !== "GET") return new Response("Method not allowed", {status:405,headers});
  const url = new URL(req.url), token = url.searchParams.get("token") || "";
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return new Response("Appointment not found / Cita no encontrada", {status:404,headers});
  const store = clientCommerceStore(), hash = crypto.createHash("sha256").update(token).digest("hex");
  const pointer = await store.get(`calendar/${hash}.json`, {type:"json"});
  if (!pointer) return new Response("Appointment not found / Cita no encontrada", {status:404,headers});
  const record = await store.get(commerceKey(pointer.siteId,"bookings",pointer.transactionId), {type:"json"});
  const site = await getClientSite(pointer.siteId);
  if (!site || !record || record.calendarToken !== token) return new Response("Appointment not found / Cita no encontrada", {status:404,headers});
  const data = bookingCalendarData(site,record);
  if (!data) return new Response("This appointment is not confirmed or has been cancelled. / Esta cita no está confirmada o fue cancelada.",{status:409,headers});
  if (url.searchParams.get("format") === "ics") return new Response(bookingIcs(site,record), {headers:{...headers,"Content-Type":"text/calendar; charset=utf-8","Content-Disposition":'attachment; filename="appointment.ics"'}});
  const links = calendarLinks(site,record);
  return new Response(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Añadir al calendario | WebFactory PR</title><style>body{margin:0;background:#f3f6fb;color:#0b1529;font:17px system-ui}main{max-width:600px;margin:8vh auto;padding:28px;background:white;border-radius:24px}a{display:block;padding:16px;margin:12px 0;background:#2866cf;color:white;border-radius:12px;text-decoration:none}p{line-height:1.6}small{color:#4b5563}@media(prefers-color-scheme:dark){body{background:#0b1529;color:#f3f6fb}main{background:#14213b}small{color:#dce8f7}}</style></head><body><main><small>WebFactory PR</small><h1>Añadir al calendario<br><small>Add to calendar</small></h1><h2>${escapeHtml(data.title)}</h2><p>${escapeHtml(new Date(record.start).toLocaleString("es-PR",{timeZone:site.settings?.timezone||"America/Puerto_Rico"}))} · ${escapeHtml(site.settings?.timezone||"America/Puerto_Rico")}</p><a href="${escapeHtml(links.google)}" target="_blank" rel="noopener noreferrer">Google Calendar</a><a href="${escapeHtml(links.outlook)}" target="_blank" rel="noopener noreferrer">Outlook</a><a href="?token=${encodeURIComponent(token)}&amp;format=ics">Apple Calendar / Archivo .ics</a><p>Si ya aceptaste la invitación de Google, no añadas otra copia. If you accepted the Google invitation, do not add another copy.</p><small>Guardar una copia no la sincroniza automáticamente. Las alertas dependen de tu aplicación. Saving a copy does not automatically sync it; alerts depend on your app.</small></main></body></html>`,{headers:{...headers,"Content-Type":"text/html; charset=utf-8","Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"}});
};
