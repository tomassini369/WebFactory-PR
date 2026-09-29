import test from "node:test";
import assert from "node:assert/strict";
import { monthAvailabilityFromBlocks } from "./booking-engine.mjs";

test("month availability includes every open weekday in a leap-year February", () => {
  const closed = { enabled: false, open: "10:00", close: "11:00" };
  const site = { hours: Object.fromEntries(["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map((day) => [day, closed])) };
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
