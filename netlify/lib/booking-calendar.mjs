import crypto from "node:crypto";
import { createGoogleEvent } from "./google-calendar.mjs";

export function bookingCanSync(record) {
  return record.kind === "booking" && ["confirmed", "completed"].includes(record.status) &&
    Number.isFinite(Date.parse(record.start)) && Number.isFinite(Date.parse(record.end)) && Date.parse(record.end) > Date.parse(record.start);
}

export async function syncBookingCalendar(site, record) {
  if (!bookingCanSync(record)) return record;
  if (record.googleEventId) return { ...record, calendarSyncStatus: "synced", calendarSyncPending: false };
  const employee = (site.employees || []).find(item => item.id === record.employeeId);
  if (!site.googleCalendar?.connected) return { ...record, calendarSyncStatus: "not_connected", calendarSyncPending: true };
  if (!employee?.calendarId) return { ...record, calendarSyncStatus: "unassigned", calendarSyncPending: true };
  const id = "bf" + crypto.createHash("sha256").update(`${site.siteId}:${record.transactionId}`).digest("hex");
  try {
    const event = await createGoogleEvent(site.siteId, employee.calendarId, {
      id,
      summary: `${record.items?.[0]?.name || "Appointment"} — ${record.customer?.name || "Customer"}`,
      description: `WebFactory booking ${record.transactionId}`,
      extendedProperties: { private: { webfactoryTransactionId: record.transactionId, webfactorySiteId: site.siteId } },
      start: { dateTime: record.start, timeZone: site.settings?.timezone || "America/Puerto_Rico" },
      end: { dateTime: record.end, timeZone: site.settings?.timezone || "America/Puerto_Rico" },
    });
    if (!event?.id) throw new Error("Calendar did not return an event.");
    return { ...record, googleEventId: event.id, googleCalendarId: employee.calendarId, calendarSyncStatus: "synced", calendarSyncPending: false, calendarSyncedAt: new Date().toISOString() };
  } catch {
    return { ...record, calendarSyncStatus: "pending", calendarSyncPending: true };
  }
}
