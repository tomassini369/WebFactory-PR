import crypto from "node:crypto";
import { clientCommerceStore, commerceKey } from "./client-store.mjs";
import { googleBusy } from "./google-calendar.mjs";
import { withBookingLock } from "./booking-lock.mjs";

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

export async function reservationsForEmployee(site, employeeId, startDay, endDay, {store=clientCommerceStore(),excludeBookingId=""}={}) {
  const lists = await Promise.all(["bookings", "holds"].map(kind=>store.list({prefix:`${site.siteId}/${kind}/`})));
  const entries = lists.flatMap((list,index)=>(list.blobs||[]).map(blob=>({...blob,kind:index===0?"bookings":"holds"})));
  const loaded=[];
  // Bound concurrency: a large tenant must not launch its entire history at once.
  for(let index=0;index<entries.length;index+=20){
    loaded.push(...await Promise.all(entries.slice(index,index+20).map(async entry=>({kind:entry.kind,record:await store.get(entry.key,{type:"json"})}))));
  }
  const live=loaded.filter(({kind,record})=>record?.employeeId===employeeId && !["cancelled","failed","expired","payment_failed"].includes(record.status) && (kind!=="holds" || Date.parse(record.expiresAt||"")>Date.now()));
  const mirroredHolds=new Set(live.filter(x=>x.kind==="bookings").map(x=>x.record.holdId).filter(Boolean));
  return live.flatMap(({kind,record})=>{
    if(record.transactionId===excludeBookingId || kind==="holds"&&mirroredHolds.has(record.holdId))return [];
    const start=Date.parse(record.start),visibleEnd=Date.parse(record.end);
    const service=(site.catalog||[]).find(item=>item.id===record.serviceId);
    const buffer=Math.max(0,Number(record.bufferMinutes??service?.bufferMinutes??0));
    const end=Number.isFinite(Date.parse(record.occupiedUntil))?Date.parse(record.occupiedUntil):visibleEnd+buffer*60_000;
    return Number.isFinite(start)&&Number.isFinite(end)&&overlaps(start,end,startDay,endDay)?[{start,end,countsTowardLimit:true}]:[];
  });
}

function bookingServiceAndEmployee(site, serviceId, employeeId, locationId = "") {
  const service = (site.catalog || []).find((item) => item.id === serviceId && item.type === "service" && item.requiresAppointment && item.active !== false);
  const hasLocations = (site.business?.locations || []).filter((location) => location.active !== false).length > 0;
  const employee = (site.employees || []).find((item) => item.id === employeeId && item.active !== false && (item.serviceIds || []).includes(serviceId) && (!hasLocations || (locationId && (item.locationIds || []).includes(locationId))));
  if (!service || !employee) throw Object.assign(new Error("Service or employee is unavailable."), { status: 404 });
  return { service, employee };
}

export function effectiveSchedule(site,employee,dayName,locationId="") {
  const location=(site.business?.locations||[]).find(row=>row.id===locationId&&row.active!==false);
  // Branch opening hours replace the business-wide default, not employee limits.
  const schedules=[location?.hours?.[dayName]??site.hours?.[dayName],employee.schedule?.[dayName]].filter(Boolean);
  if(!schedules.length||schedules.some(schedule=>!schedule.enabled))return {enabled:false};
  const open=schedules.map(schedule=>schedule.open||"09:00").sort().at(-1);
  const close=schedules.map(schedule=>schedule.close||"17:00").sort()[0];
  return {enabled:open<close,open,close};
}

function employeeBlocks(employee,timeZone) {
  return (employee.timeOff||[]).map(entry=>{
    const start=/^\d{4}-\d{2}-\d{2}$/.test(entry.start)?zonedToUtc(entry.start,"00:00",timeZone).getTime():Date.parse(entry.start);
    // Date-only end dates include that whole local day; timestamp ends are exclusive.
    let end=Date.parse(entry.end);
    if(/^\d{4}-\d{2}-\d{2}$/.test(entry.end)){
      const next=new Date(`${entry.end}T12:00:00Z`);next.setUTCDate(next.getUTCDate()+1);
      end=zonedToUtc(next.toISOString().slice(0,10),"00:00",timeZone).getTime();
    }
    return {start,end};
  }).filter(block=>Number.isFinite(block.start)&&Number.isFinite(block.end)&&block.end>block.start);
}

export function slotsForSchedule({ date, schedule, service, blocks, timeZone, employee={} }) {
  if (!schedule?.enabled) return [];
  const dayStart = zonedToUtc(date, schedule.open || "09:00", timeZone);
  const dayEnd = zonedToUtc(date, schedule.close || "17:00", timeZone);
  const duration = Math.max(5, Number(service.duration || 30));
  const buffer = Math.max(0, Number(service.bufferMinutes || 0));
  const localDayStart=zonedToUtc(date,"00:00",timeZone).getTime();
  const localDayEnd=zonedToUtc(date,"23:59",timeZone).getTime()+60_000;
  if(Number(employee.dailyLimit)>0&&blocks.filter(block=>block.countsTowardLimit&&block.start>=localDayStart&&block.start<localDayEnd).length>=Number(employee.dailyLimit))return [];
  const unavailable=[...blocks,...employeeBlocks(employee,timeZone)];
  const slots = [];
  for (let cursor = dayStart.getTime(); cursor + (duration+buffer) * 60_000 <= dayEnd.getTime(); cursor += 15 * 60_000) {
    const end = cursor + (duration + buffer) * 60_000;
    if (cursor < Date.now() + 60 * 60_000) continue;
    if (!unavailable.some((block) => overlaps(cursor, end, block.start, block.end))) {
      slots.push({ start: new Date(cursor).toISOString(), end: new Date(cursor + duration * 60_000).toISOString() });
    }
  }
  return slots.slice(0, 96);
}

export async function availabilityForDate(site, serviceId, employeeId, date, locationId = "", {strictGoogle=true,excludeBookingId=""} = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Object.assign(new Error("Invalid booking date."), { status: 400 });
  const { service, employee } = bookingServiceAndEmployee(site, serviceId, employeeId, locationId);
  const timeZone = site.settings?.timezone || "America/Puerto_Rico";
  const midday = zonedToUtc(date, "12:00", timeZone);
  const dayName = DAY_NAMES[new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(midday)];
  const schedule = effectiveSchedule(site,employee,dayName,locationId);
  if (!schedule?.enabled) return [];
  const dayStart = zonedToUtc(date, schedule.open || "09:00", timeZone);
  const dayEnd = zonedToUtc(date, schedule.close || "17:00", timeZone);
  const reserved = await reservationsForEmployee(site, employeeId, zonedToUtc(date,"00:00",timeZone).getTime(), zonedToUtc(date,"23:59",timeZone).getTime()+60_000,{excludeBookingId});
  let googleReserved = [];
  if (site.googleCalendar?.connected && employee.calendarId) {
    try {
      googleReserved = (await googleBusy(site.siteId, employee.calendarId, dayStart.toISOString(), dayEnd.toISOString(), timeZone))
        .map((entry) => ({ start: Date.parse(entry.start), end: Date.parse(entry.end) }));
    } catch (error) {
      if (strictGoogle) throw Object.assign(new Error("Calendar availability could not be verified. / No se pudo verificar la disponibilidad del calendario."),{status:503});
      console.error("google-freebusy", site.siteId, error?.message || error);
    }
  }
  return slotsForSchedule({ date, schedule, service, blocks: [...reserved, ...googleReserved], timeZone, employee });
}

export function monthAvailabilityFromBlocks({ month, timeZone, service, employee, site, blocks, locationId = "" }) {
  const [year, monthNumber] = month.split("-").map(Number);
  const available = {};
  const dayCount = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  for (let day = 1; day <= dayCount; day += 1) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    const midday = zonedToUtc(date, "12:00", timeZone);
    const dayName = DAY_NAMES[new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(midday)];
    const schedule = effectiveSchedule(site,employee,dayName,locationId);
    const slots = slotsForSchedule({ date, schedule, service, blocks, timeZone, employee });
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
  const rangeEnd = zonedToUtc(lastDate, "23:59", timeZone);
  const reserved = await reservationsForEmployee(site, employeeId, rangeStart.getTime(), rangeEnd.getTime()+60_000);
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

export async function createBookingHold(site, { serviceId, employeeId, start, locationId = "" }, {strictGoogle=true,excludeBookingId=""} = {}) {
  const isoStart = new Date(start).toISOString();
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: site.settings?.timezone || "America/Puerto_Rico", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date(isoStart)).reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  const localDate = `${parts.year}-${parts.month}-${parts.day}`;
  const store=clientCommerceStore();
  const lockKey=commerceKey(site.siteId,"booking-slot-locks",crypto.createHash("sha256").update(`${employeeId}:${localDate}`).digest("hex"));
  return withBookingLock(store,lockKey,async()=>{
  const slots = await availabilityForDate(site, serviceId, employeeId, localDate, locationId,{strictGoogle,excludeBookingId});
  const selected = slots.find((slot) => slot.start === isoStart);
  if (!selected) throw Object.assign(new Error("That time is no longer available."), { status: 409 });
  const holdId = `hold_${crypto.randomUUID()}`;
  const hold = {
    holdId, siteId: site.siteId, serviceId, employeeId, locationId, start: selected.start, end: selected.end,
    status: "held", createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
  };
  hold.bufferMinutes=Math.max(0,Number((site.catalog||[]).find(item=>item.id===serviceId)?.bufferMinutes||0));
  hold.occupiedUntil=new Date(Date.parse(hold.end)+hold.bufferMinutes*60_000).toISOString();
  await clientCommerceStore().setJSON(commerceKey(site.siteId, "holds", holdId), hold);
  return hold;
  });
}
