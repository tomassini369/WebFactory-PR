import {bookingSlotLockKey} from './booking-date-index.mjs';
import {reservationBlocks} from './booking-reservation-cache.mjs';
import crypto from "node:crypto";
import { clientCommerceStore, commerceKey } from "./client-store.mjs";
import { googleBusy } from "./google-calendar.mjs";
import { withBookingLock } from "./booking-lock.mjs";
import { bookingPolicy, bookingBuffers } from './booking-policy.mjs';

const DAY_NAMES = { Sun: "Domingo", Mon: "Lunes", Tue: "Martes", Wed: "Miércoles", Thu: "Jueves", Fri: "Viernes", Sat: "Sábado" };

function offsetAt(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date).reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  return asUtc - date.getTime();
}

export function zonedToUtc(date, time, timeZone) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  const offsets = new Set([-86400000, 0, 86400000].map(delta => offsetAt(new Date(wall + delta), timeZone)));
  const candidates = [...offsets].map(offset => wall - offset).filter(value => value + offsetAt(new Date(value), timeZone) === wall).sort((a,b)=>a-b);
  return new Date(candidates[0] ?? NaN);
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

async function reservationsForEmployee(siteId,employeeId,startDay,endDay,catalog=[],ignoreReservationId='',fresh=false){
 return reservationBlocks({store:clientCommerceStore(),siteId,employeeId,startDay,endDay,catalog,ignoreReservationId,fresh});
}

function bookingServiceAndEmployee(site, serviceId, employeeId, locationId = "") {
  const service = (site.catalog || []).find((item) => item.id === serviceId && item.type === "service" && item.requiresAppointment && item.active !== false);
  const locations = (site.business?.locations || []).filter((location) => location.active !== false);
  const hasLocations = locations.length > 0;
  if (hasLocations && !locations.some(location=>location.id===locationId)) throw Object.assign(new Error("Choose an active booking branch."),{status:404});
  const employee = (site.employees || []).find((item) => item.id === employeeId && item.active !== false && (item.serviceIds || []).includes(serviceId) && (!hasLocations || (locationId && (item.locationIds || []).includes(locationId))));
  if (!service || !employee) throw Object.assign(new Error("Service or employee is unavailable."), { status: 404 });
  return { service, employee };
}

const EN_DAYS = {Domingo:'Sunday',Lunes:'Monday',Martes:'Tuesday','Miércoles':'Wednesday',Jueves:'Thursday',Viernes:'Friday','Sábado':'Saturday'};
export function daySchedule(hours, day) {return hours?.[day] ?? hours?.[EN_DAYS[day]];}
function effectiveSchedule(site,employee,locationId,day) {
  const location=(site.business?.locations || []).find(location=>location.id===locationId);
  const schedules=[daySchedule(site.hours,day),daySchedule(location?.hours,day),daySchedule(employee.schedule,day)].filter(Boolean);
  if (!schedules.length || schedules.some(schedule=>!schedule.enabled)) return null;
  const open=schedules.map(schedule=>schedule.open || '09:00').sort().at(-1),close=schedules.map(schedule=>schedule.close || '17:00').sort()[0];
  if (open>=close) return null;
  return {enabled:true,open,close,breaks:schedules.flatMap(schedule=>schedule.breaks || [])};
}
function localDayEnd(date,timeZone) {
  const next=new Date(date+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+1);
  return zonedToUtc(next.toISOString().slice(0,10),'00:00',timeZone).getTime();
}
function ruleSlots({date,timeZone,service,employee,site,blocks,locationId='',clock=Date.now}) {
  const midday=zonedToUtc(date,'12:00',timeZone);
  const day=DAY_NAMES[new Intl.DateTimeFormat('en-US',{timeZone,weekday:'short'}).format(midday)];
  const schedule=effectiveSchedule(site,employee,locationId,day);
  if(!schedule)return [];
  const dayStart=zonedToUtc(date,'00:00',timeZone).getTime(),dayEnd=localDayEnd(date,timeZone);
  if (Number(employee.dailyLimit)>0 && blocks.filter(block=>block.reservationId && block.start>=dayStart && block.start<dayEnd).length>=Number(employee.dailyLimit)) return [];
  const off=(employee.timeOff || []).map(entry=>({start: /^\d{4}-\d{2}-\d{2}$/.test(entry.start)?zonedToUtc(entry.start,'00:00',timeZone).getTime():Date.parse(entry.start),end:/^\d{4}-\d{2}-\d{2}$/.test(entry.end)?localDayEnd(entry.end,timeZone):Date.parse(entry.end)}));
  const breaks=(schedule.breaks || []).map(entry=>({start:zonedToUtc(date,entry.start,timeZone).getTime(),end:zonedToUtc(date,entry.end,timeZone).getTime()}));
  return slotsForSchedule({date,schedule,service,site,blocks:[...blocks,...off,...breaks],timeZone,clock});
}
function slotsForSchedule({ date, schedule, service, site, blocks, timeZone, clock=Date.now }) {
  if (!schedule?.enabled) return [];
  const dayStart = zonedToUtc(date, schedule.open || '09:00', timeZone);
  const dayEnd = zonedToUtc(date, schedule.close || '17:00', timeZone);
  const duration = Math.max(5, Number(service.duration || 30));
  const {before,after:buffer} = bookingBuffers(site,service);
  const policy=bookingPolicy(site), now=clock();
  const slots = [];
  for (let cursor = dayStart.getTime()+before*60000; cursor + (duration+buffer) * 60_000 <= dayEnd.getTime(); cursor += policy.slotIntervalMinutes * 60_000) {
    const end = cursor + (duration + buffer) * 60_000;
    if (cursor < now + policy.minimumNoticeMinutes * 60_000 || policy.maximumAdvanceDays>0 && cursor>now+policy.maximumAdvanceDays*86400000) continue;
    if (!blocks.some((block) => overlaps(cursor-before*60000, end, block.start, block.end))) {
      slots.push({ start: new Date(cursor).toISOString(), end: new Date(cursor + duration * 60_000).toISOString() });
    }
  }
  return slots.slice(0, 96);
}
const validDate = date => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0,10)===date;
export async function availabilityForDate(site, serviceId, employeeId, date, locationId = "", {strictGoogle=true,ignoreReservationId='',fresh=false} = {}) {
  if (!validDate(date)) throw Object.assign(new Error("Invalid booking date."), { status: 400 });
  const { service, employee } = bookingServiceAndEmployee(site, serviceId, employeeId, locationId);
  const timeZone = site.settings?.timezone || "America/Puerto_Rico";
  const dayStart = zonedToUtc(date, '00:00', timeZone);
  const dayEnd = new Date(localDayEnd(date,timeZone));
  const reserved = await reservationsForEmployee(site.siteId, employeeId, dayStart.getTime(), dayEnd.getTime(),site.catalog,ignoreReservationId,fresh);
  let googleReserved = [];
  if (site.googleCalendar?.connected && employee.calendarId) {
    try {
      googleReserved = (await googleBusy(site.siteId, employee.calendarId, dayStart.toISOString(), dayEnd.toISOString(), timeZone))
        .map((entry) => ({ start: Date.parse(entry.start), end: Date.parse(entry.end) }));
    } catch (error) {
      throw Object.assign(new Error("Calendar availability could not be verified. / No se pudo verificar la disponibilidad del calendario."),{status:503});

    }
  }
  return ruleSlots({ date, site, employee, service, locationId, blocks: [...reserved, ...googleReserved], timeZone });
}

export function monthAvailabilityFromBlocks({ month, timeZone, service, employee, site, blocks, locationId = "" }) {
  const [year, monthNumber] = month.split("-").map(Number);
  const available = {};
  const dayCount = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  for (let day = 1; day <= dayCount; day += 1) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    const slots = ruleSlots({date,timeZone,service,employee,site,blocks,locationId});
    if (slots.length) available[date] = slots.length;
  }
  return available;
}

export async function availabilityForMonth(site, serviceId, employeeId, month, locationId = "") {
  if (!/^\d{4}-\d{2}$/.test(month)) throw Object.assign(new Error("Invalid booking month."), { status: 400 });
  const { service, employee } = bookingServiceAndEmployee(site, serviceId, employeeId, locationId);
  const [year, monthNumber] = month.split("-").map(Number);
  if (monthNumber < 1 || monthNumber > 12) throw Object.assign(new Error("Invalid booking month."), { status: 400 });
  const firstDate = `${month}-01`;
  const lastDate = `${month}-${String(new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()).padStart(2, "0")}`;
  const timeZone = site.settings?.timezone || "America/Puerto_Rico";
  const rangeStart = zonedToUtc(firstDate, "00:00", timeZone);
  const rangeEnd = new Date(localDayEnd(lastDate,timeZone));
  const reserved = await reservationsForEmployee(site.siteId, employeeId, rangeStart.getTime(), rangeEnd.getTime(),site.catalog);
  let googleReserved = [];
  if (site.googleCalendar?.connected && employee.calendarId) {
    try {
      googleReserved = (await googleBusy(site.siteId, employee.calendarId, rangeStart.toISOString(), rangeEnd.toISOString(), timeZone))
        .map((entry) => ({ start: Date.parse(entry.start), end: Date.parse(entry.end) }))
        .filter((entry) => Number.isFinite(entry.start) && Number.isFinite(entry.end));
    } catch (error) {
      throw Object.assign(new Error("Calendar availability could not be verified. / No se pudo verificar la disponibilidad del calendario."),{status:503});
    }
  }
  const blocks = [...reserved, ...googleReserved];
  return monthAvailabilityFromBlocks({ month, timeZone, service, employee, site, blocks, locationId });
}

export async function createBookingHold(site, { serviceId, employeeId, start, locationId = "" }, {strictGoogle=true,ignoreReservationId=''} = {}) {
  if (!Number.isFinite(Date.parse(start))) throw Object.assign(new Error('Invalid booking time.'),{status:400});
  const isoStart = new Date(start).toISOString();
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: site.settings?.timezone || "America/Puerto_Rico", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date(isoStart)).reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  const localDate = `${parts.year}-${parts.month}-${parts.day}`;
  const store=clientCommerceStore();
  const lockKey=bookingSlotLockKey(site.siteId,employeeId);
  return withBookingLock(store,lockKey,async()=>{
  const slots = await availabilityForDate(site, serviceId, employeeId, localDate, locationId,{strictGoogle,ignoreReservationId,fresh:true});
  const selected = slots.find((slot) => slot.start === isoStart);
  if (!selected) throw Object.assign(new Error("That time is no longer available."), { status: 409 });
  const holdId = `hold_${crypto.randomUUID()}`;
  const buffers=bookingBuffers(site,(site.catalog || []).find(item=>item.id===serviceId));
  const hold = {
    holdId, bufferMinutes:buffers.after, bufferBeforeMinutes:buffers.before, siteId: site.siteId, serviceId, employeeId, locationId, start: selected.start, end: selected.end,
    status: "held", createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
  };
  await clientCommerceStore().setJSON(commerceKey(site.siteId, "holds", holdId), hold);
  return hold;
  });
}

