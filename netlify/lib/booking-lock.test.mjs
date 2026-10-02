import test from "node:test";
import assert from "node:assert/strict";
import { withBookingLock } from "./booking-lock.mjs";

function memoryStore() {
  const rows = new Map(); let revision = 0;
  return {
    get: async key => rows.get(key)?.data,
    getWithMetadata: async key => rows.get(key),
    delete: async key => rows.delete(key),
    setJSON: async (key, data, options = {}) => {
      const previous = rows.get(key);
      if ((options.onlyIfNew && previous) || (options.onlyIfMatch && previous?.etag !== options.onlyIfMatch)) return { modified: false };
      rows.set(key, { data, etag: String(++revision) }); return { modified: true };
    },
  };
}

test("concurrent operations on a single business have one winner and conflicts remain retryable", async () => {
  const store = memoryStore(); let release; let entered; let calls = 0;
  const started = new Promise(resolve => { entered = resolve });
  const held = new Promise(resolve => { release = resolve });
  const winner = withBookingLock(store, "business-a", async () => { calls++; entered(); await held; return "saved"; });
  await started;
  await assert.rejects(withBookingLock(store, "business-a", async () => { calls++ }), { status: 409 });
  assert.equal(await withBookingLock(store, "business-b", async () => "independent"), "independent");
  release(); assert.equal(await winner, "saved"); assert.equal(calls, 1);
  assert.equal(await withBookingLock(store, "business-a", async () => "retry"), "retry");
});

test("failed operations release the lock and expired locks can be reclaimed", async () => {
  const store = memoryStore();
  await assert.rejects(withBookingLock(store, "business", async () => { throw new Error("failed") }));
  await store.setJSON("business", { owner: "stale", expiresAt: Date.now() - 1000 });
  assert.equal(await withBookingLock(store, "business", async () => "recovered"), "recovered");
});
