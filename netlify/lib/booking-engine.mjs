import crypto from "node:crypto";
import { clientCommerceStore, commerceKey } from "./client-store.mjs";
import { googleBusy } from "./google-calendar.mjs";

const DAY_NAMES = { Sun: "Domingo", Mon: "Lunes", Tue: "Martes", Wed: "Miércoles", Thu: "Jueves", Fri: "Viernes", Sat: "Sábado" };

function offsetAt(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date).reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  return asUtc - date.getTime();
}

function zonedToUtc(date, time, timeZone) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  let result = new Date(Date.UTC(year, month - 1, day, hour, minute));
  result = new Date(result.getTime() - offsetAt(result, timeZone));
  return result;
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

async function reservationsForEmployee(siteId, employeeId, startDay, endDay) {
  const store = clientCommerceStore();
  const records = [];
  for (const kind of ["bookings", "holds"]) {
    const list = await store.list({ prefix: `${siteId}/${kind}/` });
    for (const blob of list.blobs || []) {
      const record = await store.get(blob.key, { type: "json" });
      if (!record || record.employeeId !== employeeId) continue;
      if (kind === "holds" && Date.parse(record.expiresAt || "") <= Date.now()) continue;
      if (["cancelled", "failed"].includes(record.status)) continue;
      const start = Date.parse(record.start);
      const end = Date.parse(record.end);
      if (Number.isFinite(start) && Number.isFinite(end) && overlaps(start, end, startDay, endDay)) records.push({ start, end });
    }
  }
  return records;
}

export async function availabilityForDate(site, serviceId, employeeId, date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Object.assign(new Error("Invalid booking date."), { status: 400 });
  const service = (site.catalog || []).find((item) => item.id === serviceId && item.type === "service" && item.requiresAppointment && item.active !== false);
  const employee = (site.employees || []).find((item) => item.id === employeeId && item.active !== false && (item.serviceIds || []).includes(serviceId));
  if (!service || !employee) throw Object.assign(new Error("Service or employee is unavailable."), { status: 404 });
  const timeZone = site.settings?.timezone || "America/Puerto_Rico";
  const midday = zonedToUtc(date, "12:00", timeZone);
  const dayName = DAY_NAMES[new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(midday)];
  const schedule = employee.schedule?.[dayName] || site.hours?.[dayName];
  if (!schedule?.enabled) return [];
  const dayStart = zonedToUtc(date, schedule.open || "09:00", timeZone);
  const dayEnd = zonedToUtc(date, schedule.close || "17:00", timeZone);
  const duration = Math.max(5, Number(service.duration || 30));
  const buffer = Math.max(0, Number(service.bufferMinutes || 0));
  const reserved = await reservationsForEmployee(site.siteId, employeeId, dayStart.getTime(), dayEnd.getTime());
  let googleReserved = [];
  if (site.googleCalendar?.connected && employee.calendarId) {
    try {
      googleReserved = (await googleBusy(site.siteId, employee.calendarId, dayStart.toISOString(), dayEnd.toISOString(), timeZone))
        .map((entry) => ({ start: Date.parse(entry.start), end: Date.parse(entry.end) }));
    } catch (error) {
      console.error("google-freebusy", site.siteId, error?.message || error);
    }
  }
  const blocks = [...reserved, ...googleReserved];
  const slots = [];
  for (let cursor = dayStart.getTime(); cursor + duration * 60_000 <= dayEnd.getTime(); cursor += 15 * 60_000) {
    const end = cursor + (duration + buffer) * 60_000;
    if (cursor < Date.now() + 60 * 60_000) continue;
    if (!blocks.some((block) => overlaps(cursor, end, block.start, block.end))) {
      slots.push({ start: new Date(cursor).toISOString(), end: new Date(cursor + duration * 60_000).toISOString() });
    }
  }
  return slots.slice(0, 96);
}

export async function createBookingHold(site, { serviceId, employeeId, start }) {
  const isoStart = new Date(start).toISOString();
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: site.settings?.timezone || "America/Puerto_Rico", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date(isoStart)).reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  const localDate = `${parts.year}-${parts.month}-${parts.day}`;
  const slots = await availabilityForDate(site, serviceId, employeeId, localDate);
  const selected = slots.find((slot) => slot.start === isoStart);
  if (!selected) throw Object.assign(new Error("That time is no longer available."), { status: 409 });
  const holdId = `hold_${crypto.randomUUID()}`;
  const hold = {
    holdId, siteId: site.siteId, serviceId, employeeId, start: selected.start, end: selected.end,
    status: "held", createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
  };
  await clientCommerceStore().setJSON(commerceKey(site.siteId, "holds", holdId), hold);
  return hold;
}
