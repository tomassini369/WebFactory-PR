import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createPublicOrderTrackingHandler } from '../functions/public-order-tracking.mjs';
import { commerceKey } from './client-store.mjs';

function fixture() {
  const records = new Map();
  let now = 0, scans = 0, reads = 0;
  const store = {
    async list({prefix}) {
      scans++;
      return {blobs:[...records.keys()].filter(key => key.startsWith(prefix)).map(key => ({key}))};
    },
    async get(key) { reads++; return records.get(key); },
  };
  const add = (siteId, transactionId, locationId, paidAt, paymentStatus = 'paid') => {
    const token = crypto.randomBytes(24).toString('base64url');
    const trackingHash = crypto.createHash('sha256').update(token).digest('hex');
    records.set('tracking/' + trackingHash + '.json', {siteId, transactionId});
    const key = commerceKey(siteId, 'orders', transactionId);
    records.set(key, {siteId, transactionId, locationId, paidAt, paymentStatus, trackingHash, queueNumber:'Q', kind:'order'});
    return { token, key };
  };
  const handler = createPublicOrderTrackingHandler({getStore:() => store, getSite:async () => ({settings:{timezone:'America/Puerto_Rico'}}), clock:() => now});
  const request = token => handler(new Request('https://example.invalid/?token=' + token));
  const track = async token => {
    const response = await request(token);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    return (await response.json()).order.turnNumber;
  };
  return {add, track, request, records, counts:() => ({reads, scans}), advance: ms => { now += ms; }};
}

test('simultaneous tracking requests reuse one scan and warm reads still verify each token and order', async () => {
  const f = fixture();
  const date = '2026-11-12T14:00:00Z';
  const orders = Array.from({length:1000}, (_, i) => f.add('site', String(i).padStart(4, '0'), 'branch', date));
  const {token, key} = orders[750];
  assert.deepEqual(await Promise.all(Array.from({length:10}, () => f.track(token))), Array(10).fill(751));
  assert.deepEqual(f.counts(), {reads:1020, scans:1});
  assert.equal(await f.track(token), 751);
  assert.deepEqual(f.counts(), {reads:1022, scans:1});
  f.records.set(key, {...f.records.get(key), trackingHash:'changed'});
  assert.equal((await f.request(token)).status, 404);
  assert.deepEqual(f.counts(), {reads:1024, scans:1});
});

test('tenant, branch and local day stay isolated; new paid orders refresh a snapshot and old ranks expire', async () => {
  const f = fixture();
  const date = '2026-11-12T14:00:00Z';
  const a = f.add('a', 'a', 'branch', date);
  const b = f.add('a', 'b', 'branch', date);
  const otherBranch = f.add('a', 'c', 'other', date);
  const otherTenant = f.add('b', 'a', 'branch', date);
  const previousDay = f.add('a', 'previous', 'branch', '2026-11-12T02:00:00Z');
  assert.equal(await f.track(b.token), 2);
  assert.equal(await f.track(otherBranch.token), 1);
  assert.equal(await f.track(otherTenant.token), 1);
  assert.equal(await f.track(previousDay.token), 1);
  const newlyPaid = f.add('a', 'new', 'branch', date);
  assert.equal(await f.track(newlyPaid.token), 3);
  f.records.set(a.key, {...f.records.get(a.key), paymentStatus:'due'});
  f.advance(10_001);
  assert.equal(await f.track(b.token), 1);
});
