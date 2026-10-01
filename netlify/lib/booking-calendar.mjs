import crypto from "node:crypto";
import { createGoogleEvent, ensureGoogleGuest } from "./google-calendar.mjs";

export function bookingCanSync(record) {
  return record.kind === "booking" && ["confirmed", "completed"].includes(record.status) &&
    Number.isFinite(Date.parse(record.start)) && Number.isFinite(Date.parse(record.end)) && Date.parse(record.end) > Date.parse(record.start);
}

export async function syncBookingCalendar(site, record) {
  if (!bookingCanSync(record)) return record;
  if (record.googleEventId && (!record.customerCalendarInviteRequested || record.customerCalendarInviteStatus === "sent")) return { ...record, calendarSyncStatus: "synced", calendarSyncPending: false };
  const employee = (site.employees || []).find(item => item.id === record.employeeId);
  if (!site.googleCalendar?.connected) return { ...record, calendarSyncStatus: "not_connected", calendarSyncPending: true };
  if (!employee?.calendarId) return { ...record, calendarSyncStatus: "unassigned", calendarSyncPending: true };
  const id = "bf" + crypto.createHash("sha256").update(`${site.siteId}:${record.transactionId}`).digest("hex");
  try {
    const email = String(record.customer?.email || "").trim().toLowerCase();
    const guest = record.customerCalendarInviteRequested && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ? { email, displayName: record.customer?.name || "", responseStatus: "needsAction" } : null;
    const calendarId = record.googleCalendarId || employee.calendarId;
    let event = record.googleEventId ? { id: record.googleEventId } : await createGoogleEvent(site.siteId, calendarId, {
      id,
      ...(guest ? { attendees: [guest], guestsCanInviteOthers: false, guestsCanSeeOtherGuests: false } : {}),
      reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 1440 }, { method: "popup", minutes: 240 }] },
      summary: `${record.items?.[0]?.name || "Appointment"} — ${record.customer?.name || "Customer"}`,
      description: `WebFactory booking ${record.transactionId}`,
      extendedProperties: { private: { webfactoryTransactionId: record.transactionId, webfactorySiteId: site.siteId } },
      start: { dateTime: record.start, timeZone: site.settings?.timezone || "America/Puerto_Rico" },
      end: { dateTime: record.end, timeZone: site.settings?.timezone || "America/Puerto_Rico" },
    }, { sendUpdates: guest ? "all" : "none" });
    if (!event?.id) throw new Error("Calendar did not return an event.");
    let synced = { ...record, googleEventId: event.id, googleCalendarId: calendarId, calendarSyncStatus: "synced", calendarSyncPending: false, calendarSyncedAt: new Date().toISOString() };
    if (guest) {
      try {
        event = await ensureGoogleGuest(site.siteId, calendarId, event.id, guest, record.googleEventId ? null : event);
        if (!(event.attendees || []).some(row => row.email?.toLowerCase() === email)) throw new Error("Guest was not added.");
        synced = { ...synced, customerCalendarInviteStatus: "sent", customerCalendarInviteEmail: email, customerCalendarInvitedAt: new Date().toISOString() };
      } catch { synced.customerCalendarInviteStatus = "pending"; }
    } else if (record.customerCalendarInviteRequested) synced.customerCalendarInviteStatus = "missing_email";
    return synced;
  } catch {
    return { ...record, calendarSyncStatus: "pending", calendarSyncPending: true };
  }
}
