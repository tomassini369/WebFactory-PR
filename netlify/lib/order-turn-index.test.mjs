import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {buildOrderTurnIndexPage, indexedOrderTurnKeys, withOrderTurnIndex} from './order-turn-index.mjs';
import {createPublicOrderTrackingHandler} from '../functions/public-order-tracking.mjs';
import {createCommerceAdminHandler} from '../functions/client-commerce-admin.mjs';
import {createOrderTurnIndexHandler} from '../functions/client-order-turn-index.mjs';

function memory() {
  const rows = new Map();
  let scans = 0, reads = 0, revision = 0;
  return {
    rows,
    counts: () => ({scans, reads}),
    async get(key) { reads++; return rows.get(key)?.data ?? null; },
    async getWithMetadata(key) { return rows.get(key) ?? null; },
    async setJSON(key, data, options = {}) {
      const current = rows.get(key);
      if ((options.onlyIfNew && current) || (options.onlyIfMatch && options.onlyIfMatch !== current?.etag)) return {modified: false};
      rows.set(key, {data: structuredClone(data), etag: String(++revision)});
      return {modified: true};
    },
    async delete(key) { rows.delete(key); },
    async *list({prefix}) {
      scans++;
      const keys = [...rows.keys()].filter(key => key.startsWith(prefix)).sort();
      for (let i = 0; i < keys.length; i += 10) yield {blobs: keys.slice(i, i + 10).map(key => ({key}))};
    },
  };
}

const branch = 'shop-one';
const shop = 'tenant-one';
function order(id, paidAt, siteId = shop, locationId = branch) {
  return {transactionId: id, siteId, locationId, paidAt, kind: 'order', paymentStatus: 'paid', queueNumber: 'Q'};
}
const key = row => `${row.siteId}/orders/${row.transactionId}.json`;

test('history resumes by batch, stays on fallback while incomplete and indexes new concurrent writes', async () => {
  const commerce = memory(), index = memory();
  const write = withOrderTurnIndex(commerce, () => index);
  const first = order('b', '2026-11-12T04:30:00Z');
  const last = order('c', '2026-11-12T14:00:00Z');
  const inserted = order('a', '2026-11-12T04:05:00Z');
  await commerce.setJSON(key(first), first);
  await commerce.setJSON(key(last), last);
  assert.equal((await buildOrderTurnIndexPage(commerce, index, shop, {limit: 1})).status, 'building');
  assert.equal(await indexedOrderTurnKeys(index, commerce, shop, last.paidAt.slice(0,10), {locationId: branch}), null);
  // Sorts before the backfill cursor but still enters the index via the canonical writer.
  await write.setJSON(key(inserted), inserted);
  assert.equal((await buildOrderTurnIndexPage(commerce, index, shop, {limit: 1})).status, 'ready');
  assert.deepEqual((await indexedOrderTurnKeys(index, commerce, shop, last.paidAt.slice(0,10), {locationId: branch})).sort(), [key(inserted), key(first), key(last)]);
  assert.equal(await indexedOrderTurnKeys(index, commerce, 'other-tenant', last.paidAt.slice(0,10), {locationId: branch}), null);
});

test('cold tracking reads the indexed branch, keeps local-day ordering and preserves authorization', async () => {
  const commerce = memory(), index = memory();
  // Unpaginated fallback, used by the existing history path.
  const rawList = commerce.list;
  commerce.list = options => options.paginate ? rawList.call(commerce, options) : (async () => {
    const blobs = [];
    for await (const page of rawList.call(commerce, options)) blobs.push(...page.blobs);
    return {blobs};
  })();
  const write = withOrderTurnIndex(commerce, () => index);
  const requested = order('z', '2026-11-13T02:00:00Z');
  const sameDay = order('a', '2026-11-12T05:00:00Z');
  const previousLocalDay = order('older', '2026-11-12T03:55:00Z');
  const foreign = order('foreign', '2026-11-12T05:00:00Z', 'other-tenant');
  const otherBranch = order('other-branch', '2026-11-12T05:00:00Z', shop, 'shop-two');
  const token = crypto.randomBytes(24).toString('base64url');
  requested.trackingHash = crypto.createHash('sha256').update(token).digest('hex');
  await commerce.setJSON(`tracking/${requested.trackingHash}.json`, {siteId: shop, transactionId: requested.transactionId});
  for (let i = 0; i < 1000; i++) {
    const old = order('history-' + i, '2026-10-01T14:00:00Z');
    await commerce.setJSON(key(old), old);
  }
  for (const row of [requested, sameDay, previousLocalDay, foreign, otherBranch]) await commerce.setJSON(key(row), row);
  const newHandler = () => createPublicOrderTrackingHandler({
    getStore: () => commerce, getIndex: () => index,
    getSite: async () => ({settings:{timezone:'America/Puerto_Rico'}}),
  });
  const request = () => new Request('https://example.invalid/?token=' + token);
  let count = commerce.counts();
  const baseline = await (await newHandler()(request())).json();
  const before = commerce.counts().reads - count.reads;
  assert.equal(baseline.order.turnNumber, 2);
  assert.equal(before, 1006);

  let state;
  do { state = await buildOrderTurnIndexPage(commerce, index, shop); } while (state.status !== 'ready');
  count = commerce.counts();
  const optimized = await (await newHandler()(request())).json();
  assert.deepEqual(optimized, baseline);
  assert.equal(commerce.counts().scans - count.scans, 3);
  assert.equal(commerce.counts().reads - count.reads, 5);
  const later = order('b', '2026-11-12T05:00:00Z');
  await write.setJSON(key(later), later);
  assert.equal((await (await newHandler()(request())).json()).order.turnNumber, 3);
  await write.setJSON(key(sameDay), {...sameDay, paymentStatus: 'due'});
  assert.equal((await (await newHandler()(request())).json()).order.turnNumber, 2);
  await commerce.setJSON(key(requested), {...requested, trackingHash:'changed'});
  assert.equal((await newHandler()(request())).status, 404);
});

test('only the owner can prepare the index and the request stays scoped to the authorized business', async () => {
  const commerce = memory(), index = memory(), locks = memory();
  const row = order('old', '2026-11-12T14:00:00Z');
  await commerce.setJSON(key(row), row);
  let role = 'employee';
  const handler = createOrderTurnIndexHandler({
    authorize: async (id, capability) => {
      assert.equal(id, shop);
      assert.equal(capability, 'kitchen');
      return {site: {siteId: shop}, membership: {role}};
    },
    getCommerce: () => commerce, getIndex: () => index, getMaintenance: () => locks,
    getSite: async id => ({siteId:id}),
  });
  const req = (origin = 'https://example.invalid') => new Request('https://example.invalid/.netlify/functions/client-order-turn-index', {
    method:'POST', headers:{Origin: origin, 'Content-Type':'application/json'}, body: JSON.stringify({siteId:shop}),
  });
  assert.equal((await handler(req())).status, 403);
  assert.equal(index.rows.size, 0);
  role = 'owner';
  assert.equal((await handler(req('https://other.invalid'))).status, 403);
  assert.deepEqual((await (await handler(req())).json()).state, {status:'ready', processed:1});
});

test('an index write outage preserves the paid order and its reference after recovery', async () => {
  const commerce = memory(), index = memory();
  await buildOrderTurnIndexPage(commerce, index, shop);
  const writer = withOrderTurnIndex(commerce, () => ({setJSON: async () => { throw new Error('index unavailable'); }}));
  const row = order('paid-during-outage', '2026-11-13T02:00:00Z');
  assert.equal((await writer.setJSON(key(row), row, {onlyIfNew:true})).modified, true);
  assert.deepEqual(await commerce.get(key(row)), row);
  assert.deepEqual(await indexedOrderTurnKeys(index, commerce, shop, '2026-11-12', {locationId:branch}), [key(row)]);
  await withOrderTurnIndex(commerce, () => index).setJSON(key(row), row);
  assert.deepEqual(await indexedOrderTurnKeys(index, commerce, shop, '2026-11-12'), [key(row)]);
});

test('indexed kitchen reads the local day and preserves branch scope, late payments and data masking', async () => {
  const commerce = memory(), index = memory();
  const site = {siteId:shop, business:{locations:[{id:branch},{id:'other'}]}, settings:{timezone:'America/Puerto_Rico'}};
  const membership = {role:'employee', permissions:{kitchen:true}, locationIds:[branch]};
  const row = {...order('recent', '2026-11-13T02:00:00Z'), createdAt:'2026-11-10T02:00:00Z', customer:{email:'private@example.invalid'}, kitchenStatus:'preparing'};
  const records = [
    row,
    order('other-branch', row.paidAt, shop, 'other'),
    order('wrong-tenant', row.paidAt, 'foreign'),
    order('previous-local-day', '2026-11-12T03:55:00Z'),
    {...order('due', row.paidAt), paymentStatus:'due'},
    ...Array.from({length:1000}, (_,i) => order('old-'+i, '2026-10-01T02:00:00Z')),
  ];
  for (const record of records) await commerce.setJSON(key(record), record);
  const handler = createCommerceAdminHandler({
    authorizeCapability: async () => ({site,membership}),
    getStore: () => commerce,
    getIndex: () => index,
    clock: () => Date.parse(row.paidAt),
  });
  const read = () => handler(new Request('https://example.invalid/?siteId='+shop+'&view=kitchen'));
  let before = commerce.counts().reads;
  const baseline = await (await read()).json();
  assert.equal(commerce.counts().reads - before, 1004);
  assert.deepEqual(baseline.orders.map(order => order.transactionId), [row.transactionId]);
  assert.equal(baseline.orders[0].paidAt, row.paidAt);
  assert.equal(baseline.orders[0].customer.email, undefined);
  while ((await buildOrderTurnIndexPage(commerce, index, shop)).status !== 'ready') {}
  before = commerce.counts().reads;
  assert.deepEqual(await (await read()).json(), baseline);
  assert.equal(commerce.counts().reads - before, 3);
  index.list = () => { throw new Error('index unavailable'); };
  assert.deepEqual(await (await read()).json(), baseline);
});
