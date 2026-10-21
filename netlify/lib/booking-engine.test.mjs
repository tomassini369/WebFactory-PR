import test from "node:test";
import assert from "node:assert/strict";
import { monthAvailabilityFromBlocks } from "./booking-engine.mjs";

test("month availability includes every open weekday in a leap-year February", () => {
  const closed = { enabled: false, open: "10:00", close: "11:00" };
  const site = { hours: Object.fromEntries(["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map((day) => [day, day === "Martes" ? {enabled:true,open:"09:00",close:"17:00"}:closed])) };
  const employee = { schedule: { Martes: { enabled: true, open: "10:00", close: "11:00" } } };

  const available = monthAvailabilityFromBlocks({
    month: "2028-02",
    timeZone: "America/Puerto_Rico",
    service: { duration: 30 },
    employee,
    site,
    blocks: [],
  });

  assert.deepEqual(Object.keys(available), ["2028-02-01", "2028-02-08", "2028-02-15", "2028-02-22", "2028-02-29"]);
  assert.ok(Object.values(available).every((count) => count === 3));
});

test("month availability leaves fully booked days out of the calendar", () => {
  const site = { hours: { Martes: { enabled: true, open: "10:00", close: "11:00" } } };
  const employee = { schedule: {} };
  const blocks = [{ start: Date.parse("2028-02-01T13:00:00.000Z"), end: Date.parse("2028-02-01T16:00:00.000Z") }];

  const available = monthAvailabilityFromBlocks({
    month: "2028-02",
    timeZone: "America/Puerto_Rico",
    service: { duration: 30 },
    employee,
    site,
    blocks,
  });

  assert.equal(available["2028-02-01"], undefined);
  assert.equal(available["2028-02-08"], 3);
});

test("branch hours control monthly booking availability when employee hours are unset", () => {
  const closed = { enabled: false, open: "09:00", close: "17:00" };
  const site = {
    hours: Object.fromEntries(["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map((day) => [day, day === "Martes" ? {enabled:true,open:"09:00",close:"17:00"}:closed])),
    business: { locations: [{ id: "east", hours: { Martes: { enabled: true, open: "10:00", close: "11:00" } } }] },
  };
  const available = monthAvailabilityFromBlocks({ month: "2028-02", timeZone: "America/Puerto_Rico", service: { duration: 30 }, employee: { schedule: {} }, site, blocks: [], locationId: "east" });
  assert.deepEqual(Object.keys(available), ["2028-02-01", "2028-02-08", "2028-02-15", "2028-02-22", "2028-02-29"]);
});

test('business and employee hours intersect; English branch keys, breaks, inclusive time off, buffers and daily limits all constrain the monthly view',()=>{
 const date='2028-02-01',service={duration:30,bufferMinutes:15};
 const site={hours:{Martes:{enabled:true,open:'09:00',close:'17:00'}},business:{locations:[{id:'one',hours:{Tuesday:{enabled:true,open:'10:00',close:'12:00'}}}]}};
 const employee={dailyLimit:2,schedule:{Martes:{enabled:true,open:'10:00',close:'13:00',breaks:[{start:'10:45',end:'11:15'}]}}};
 const count=(patch={},blocks=[])=>monthAvailabilityFromBlocks({month:'2028-02',timeZone:'America/Puerto_Rico',service,site,employee:{...employee,...patch},blocks,locationId:'one'})[date] || 0;
 assert.equal(count(),2);
 assert.equal(count({timeOff:[{start:date,end:date}]}),0);
 assert.equal(count({},[{start:Date.parse(date+'T14:00:00Z'),end:Date.parse(date+'T14:30:00Z'),reservationId:'one'},{start:Date.parse(date+'T15:00:00Z'),end:Date.parse(date+'T15:30:00Z'),reservationId:'two'}]),0);
 site.hours.Martes.enabled=false;assert.equal(count(),0);
});

test('full-day time off follows business-local midnight through 23-hour and 25-hour days',()=>{
 const employee={timeOff:[{start:'2028-11-05',end:'2028-11-05'}]};
 const fall=monthAvailabilityFromBlocks({month:'2028-11',timeZone:'America/New_York',service:{duration:30},employee,site:{hours:{Sunday:{enabled:true,open:'23:00',close:'23:59'}}},blocks:[]});
 assert.equal(fall['2028-11-05'],undefined,'A day off must also block the final hour of a 25-hour day');
 const spring=monthAvailabilityFromBlocks({month:'2028-03',timeZone:'America/New_York',service:{duration:30},employee:{timeOff:[{start:'2028-03-12',end:'2028-03-12'}]},site:{hours:{Monday:{enabled:true,open:'00:00',close:'02:00'}}},blocks:[]});
 assert.equal(spring['2028-03-13'],7,'A 23-hour day off must not block the next working day');
});
