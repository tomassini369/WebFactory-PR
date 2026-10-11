import test from 'node:test';
import assert from 'node:assert/strict';
import { createCheckoutAttemptHandler } from './checkout-attempt.mjs';

function fixture(perform, overrides = {}) {
  const records = new Map(); let revision = 0, calls = 0;
  const store = {
    async get(key) { return structuredClone(records.get(key)?.data ?? null); },
    async getWithMetadata(key) { return structuredClone(records.get(key) ?? null); },
    async setJSON(key, data, options) {
      const previous = records.get(key);
      if (options.onlyIfNew && previous || options.onlyIfMatch && options.onlyIfMatch !== previous?.etag) return { modified: false };
      records.set(key, { data: structuredClone(data), etag: String(++revision) }); return { modified: true };
    },
  };
  const handler = createCheckoutAttemptHandler({ getStore: () => store, getSite: async p => ({ siteId: p.siteId }), isAvailable: () => true,
    performCheckout: async req => { calls++; return perform ? perform(req) : Response.json({ checkoutUrl: 'https://checkout.example.invalid/session', transactionId: 'fixture-order', paymentStatus: 'pending' }); }, ...overrides });
  const request = (body = '{"siteId":"fixture","items":[{"id":"item","quantity":1}]}', key = 'a'.repeat(64), origin = 'https://example.invalid') => new Request('https://example.invalid/.netlify/functions/create-client-checkout', { method: 'POST', headers: { Origin: origin, ...(key ? { 'Idempotency-Key': key } : {}) }, body });
  return { handler, request, records, store, calls: () => calls };
}

test('concurrent duplicate checkouts enter payment and inventory code once; later replay returns the same pending result', async () => {
  const f = fixture(); const results = await Promise.all(Array.from({ length: 16 }, () => f.handler(f.request())));
  assert.equal(f.calls(), 1); assert.equal(results.filter(r => r.status === 200).length, 1);
  assert.equal(results.filter(r => r.status === 409).length, 15);
  const replay = await f.handler(f.request()); assert.equal(replay.status, 200);
  assert.deepEqual(await replay.json(), { checkoutUrl: 'https://checkout.example.invalid/session', transactionId: 'fixture-order', paymentStatus: 'pending' });
  assert.equal(replay.headers.get('Cache-Control'), 'no-store'); assert.equal(f.calls(), 1);
});
test('changed quantity cannot reuse an attempt or enter the provider', async () => {
  const f = fixture(); await f.handler(f.request());
  const response = await f.handler(f.request('{"siteId":"fixture","items":[{"id":"item","quantity":2}]}'));
  assert.equal(response.status, 409); assert.equal(f.calls(), 1);
});
test('an interrupted execution remains blocked even when its claim is old', async () => {
  const f = fixture(); await f.handler(f.request());
  const record = [...f.records.values()][0]; record.data.status = 'processing'; record.data.createdAt = '2000-01-01T00:00:00Z';
  assert.equal((await f.handler(f.request())).status, 409); assert.equal(f.calls(), 1);
});
test('provider error responses are replayed without another payment request', async () => {
  const f = fixture(() => Response.json({ ok: false, message: 'Provider outcome uncertain' }, { status: 503 }));
  assert.equal((await f.handler(f.request())).status, 503); assert.equal((await f.handler(f.request())).status, 503); assert.equal(f.calls(), 1);
});
test('disabled businesses cannot replay checkout URLs', async () => {
  let available = true; const f = fixture(null, { isAvailable: () => available });
  await f.handler(f.request()); available = false;
  assert.equal((await f.handler(f.request())).status, 404); assert.equal(f.calls(), 1);
});
test('same-origin, random key, JSON and body size checks happen before checkout', async () => {
  const f = fixture();
  assert.equal((await f.handler(f.request(undefined, 'a'.repeat(64), 'https://foreign.invalid'))).status, 403);
  assert.equal((await f.handler(f.request(undefined, 'short'))).status, 400);
  assert.equal((await f.handler(f.request('{bad'))).status, 400);
  assert.equal((await f.handler(f.request('[]'))).status, 400);
  assert.equal((await f.handler(f.request('x'.repeat(65537)))).status, 413); assert.equal(f.calls(), 0); assert.equal(f.records.size, 0);
});
test('attempt records do not persist customer input or raw keys', async () => {
  const f = fixture(); await f.handler(f.request('{"siteId":"fixture","customer":{"email":"private@example.invalid"}}'));
  const serialized = JSON.stringify([...f.records.entries()]); assert.ok(!serialized.includes('private@example.invalid')); assert.ok(!serialized.includes('a'.repeat(64)));
});
test('legacy callers without an attempt key retain the existing checkout path', async () => {
  const f = fixture(); assert.equal((await f.handler(f.request(undefined, null))).status, 200); assert.equal(f.calls(), 1); assert.equal(f.records.size, 0);
});

test('an exception after entering checkout cannot unlock a second execution', async () => {
  const f = fixture(() => { throw Object.assign(new Error('Uncertain provider response'), { status: 409 }); });
  assert.equal((await f.handler(f.request())).status, 409);
  assert.equal((await f.handler(f.request())).status, 409); assert.equal(f.calls(), 1);
});
test('lost response persistence cannot unlock another payment execution', async () => {
  const f = fixture(); const set = f.store.setJSON;
  f.store.setJSON = async (key, value, options) => options.onlyIfMatch ? { modified: false } : set(key, value, options);
  const original = console.error; console.error = () => {};
  try { assert.equal((await f.handler(f.request())).status, 503); }
  finally { console.error = original; }
  assert.equal((await f.handler(f.request())).status, 409); assert.equal(f.calls(), 1);
});
test('attempt keys are isolated by business', async () => {
  const f = fixture(); await f.handler(f.request());
  assert.equal((await f.handler(f.request('{"siteId":"other-fixture","items":[{"id":"item","quantity":1}]}'))).status, 200);
  assert.equal(f.calls(), 2); assert.equal(f.records.size, 2);
});
