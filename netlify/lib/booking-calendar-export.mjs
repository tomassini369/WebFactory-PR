import crypto from "node:crypto";
import { bookingCanSync } from "./booking-calendar.mjs";
import { publicBaseUrl } from "./platform-utils.mjs";

const escapeText = value => String(value || "").replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
export const escapeHtml = value => String(value || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const stamp = value => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
function fold(line) {
  let result = "", part = "";
  for (const char of line) {
    if (Buffer.byteLength(part + char) > 75) { result += part + "\r\n"; part = " "; }
    part += char;
  }
  return result + part;
}
export function bookingCalendarData(site, record) {
  if (!bookingCanSync(record)) return null;
  const service = (record.items || []).map(item => item.name).filter(Boolean).join(" · ") || "Appointment / Cita";
  const business = site.business?.name || "Business";
  const employee = (site.employees || []).find(item => item.id === record.employeeId)?.name;
  const location = (site.business?.locations || []).find(item => item.id === record.locationId);
  return { title: `${service} — ${business}`, start: stamp(record.start), end: stamp(record.end),
    description: [`${business}`, employee, `Confirmation / Confirmación: ${record.transactionId}`].filter(Boolean).join("\n"),
    location: location?.address || site.business?.address || "" };
}
export function bookingIcs(site, record) {
  const data = bookingCalendarData(site, record);
  if (!data) return null;
  const uid = crypto.createHash("sha256").update(`${site.siteId}:${record.transactionId}`).digest("hex");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//WebFactory PR//Bookings//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    `UID:${uid}@webfactorypr.com`, `DTSTAMP:${stamp(record.updatedAt || record.createdAt || Date.now())}`,
    `DTSTART:${data.start}`, `DTEND:${data.end}`, `SUMMARY:${escapeText(data.title)}`, `DESCRIPTION:${escapeText(data.description)}`,
    `LOCATION:${escapeText(data.location)}`, "STATUS:CONFIRMED"];
  for (const hours of [24, 4]) lines.push("BEGIN:VALARM", `TRIGGER:-PT${hours}H`, "ACTION:DISPLAY", "DESCRIPTION:Appointment reminder / Recordatorio de cita", "END:VALARM");
  return [...lines, "END:VEVENT", "END:VCALENDAR"].map(fold).join("\r\n") + "\r\n";
}
export function calendarLinks(site, record) {
  const data = bookingCalendarData(site, record);
  if (!data) return null;
  return {
    google: `https://calendar.google.com/calendar/render?${new URLSearchParams({ action:"TEMPLATE", text:data.title, dates:`${data.start}/${data.end}`, details:data.description, location:data.location })}`,
    outlook: `https://outlook.live.com/calendar/0/deeplink/compose?${new URLSearchParams({ path:"/calendar/action/compose", rru:"addevent", subject:data.title, startdt:new Date(record.start).toISOString(), enddt:new Date(record.end).toISOString(), body:data.description, location:data.location })}`,
  };
}
export function bookingCalendarUrl(record) {
  return record.calendarToken ? `${publicBaseUrl()}/.netlify/functions/booking-calendar-file?token=${encodeURIComponent(record.calendarToken)}` : "";
}
