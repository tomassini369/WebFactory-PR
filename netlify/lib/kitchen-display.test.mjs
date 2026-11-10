import assert from 'node:assert/strict';
import test from 'node:test';
import { createCommerceAdminHandler } from '../functions/client-commerce-admin.mjs';
import { normalizeClientSection } from '../functions/client-admin.mjs';
import { employeeSiteView } from './commercial-access.mjs';
import { isKitchenOrder, kitchenChannel, kitchenColumns, paidPosKitchenFields } from './kitchen-display.mjs';

const site = {
  siteId: 'test-kds', business: { category: 'Restaurant', locations: [{id:'one',name:'Arecibo'}, {id:'two',name:'San Juan'}] },
  catalog: [{ id: 'pizza', type: 'product' }], settings: { timezone: 'America/Puerto_Rico' },
};
const member = { role:'employee', permissions:{ kitchen:true }, locationIds:['one'] };
const order = {
  siteId: site.siteId, transactionId: 'test-paid-order', locationId: 'one', kind: 'order',
  status: 'confirmed', paymentStatus: 'paid', queueNumber: 'Q-01',
  kitchenStatus: 'received', createdAt: '2026-11-11T03:55:00Z', paidAt: '2026-11-11T03:55:00Z',
};

test('kitchen actions persist on paid scoped orders and stale ETA retries do not increment again', async () => {
  const orderKey = `${site.siteId}/orders/${order.transactionId}.json`;
  const transactionKey = `${site.siteId}/transactions/${order.transactionId}.json`;
  const rows = new Map([[orderKey, order], [transactionKey, order]]);
  const store = {
    get: async key => rows.get(key),
    setJSON: async (key, value, opts) => {
      if (opts?.onlyIfNew && rows.has(key)) return {modified:false};
      rows.set(key, structuredClone(value));
      return {modified:true};
    },
    delete: async key => rows.delete(key),
  };
  let membership = member;
  const handler = createCommerceAdminHandler({
    authorizeCapability: async (siteId, capability) => {
      assert.equal(siteId, site.siteId);
      assert.equal(capability, 'kitchen');
      return { site, membership, user:{ id:'test-cook' } };
    },
    getStore: () => store,
  });
  const send = (fields, expectedKitchenRevision) => handler(new Request('https://example.invalid/api', {
    method:'POST', headers:{origin:'https://example.invalid', 'Content-Type':'application/json'},
    body: JSON.stringify({ siteId:site.siteId, kind:'order', transactionId:order.transactionId,
      action:'kitchen_status', expectedKitchenRevision, ...fields }),
  }));

  assert.equal((await send({ kitchenPause:true }, 0)).status, 200);
  assert.equal(rows.get(orderKey).kitchenPaused, true);
  assert.equal(rows.get(orderKey).kitchenStatus, 'received');
  assert.equal((await send({ kitchenStatus:'preparing' }, 1)).status, 200);
  assert.equal(rows.get(orderKey).kitchenPaused, false);
  assert.equal((await send({ kitchenEtaMinutes:15 })).status, 409);
  assert.equal((await send({ kitchenEtaMinutes:15 }, 2)).status, 200);
  assert.equal(rows.get(orderKey).kitchenEtaTime, '00:10');
  assert.equal((await send({ kitchenEtaMinutes:15 }, 2)).status, 409);
  assert.equal(rows.get(orderKey).kitchenEtaTime, '00:10');
  assert.equal((await send({ kitchenEtaTime:'25:00' }, 3)).status, 400);
  assert.equal((await send({ kitchenEtaTime:'00:40' }, 3)).status, 200);
  assert.equal(rows.get(transactionKey).kitchenEtaTime, '00:40');
  assert.equal(rows.get(orderKey).paymentStatus, 'paid');
  assert.equal(rows.get(orderKey).status, 'confirmed');

  membership = { ...member, locationIds:['two'] };
  assert.equal((await send({ kitchenStatus:'ready' }, 4)).status, 403);
  membership = member;
  rows.set(orderKey, {...rows.get(orderKey), siteId:'different-tenant'});
  assert.equal((await send({ kitchenStatus:'ready' }, 4)).status, 403);
});

test('stations validate catalog and location scope and employees see their station settings only', () => {
  const display = {
    id:'pizza-one',name:'Pizza',limit:20,enabled:true,columns:kitchenColumns,locationIds:['one'],
    productIds:['pizza'],channels:['pos'],
  };
  const saved = normalizeClientSection(site, 'kitchenDisplays', [display, {...display,id:'other',locationIds:['two']}]);
  assert.deepEqual(employeeSiteView({...site,kitchenDisplays:saved},member).kitchenDisplays.map(value => value.id), ['pizza-one']);
  assert.equal(employeeSiteView({...site,kitchenDisplays:saved},{...member,permissions:{}}).kitchenDisplays, undefined);
  assert.throws(() => normalizeClientSection(site, 'kitchenDisplays', [{...display,productIds:['another-tenant-item']}]), {status:400});
  assert.throws(() => normalizeClientSection(site, 'kitchenDisplays', [{...display,columns:['on_hold']}]), {status:400});
});

test('settled cashier food orders get a kitchen turn without admitting pending and non-food sales', () => {
  const sale = {...order,queueNumber:undefined,kitchenStatus:undefined,status:'completed',paymentStatus:'paid_in_person',source:'pos'};
  const fields = paidPosKitchenFields(site, sale);
  assert(fields.queueNumber.startsWith('Q'));
  assert.equal(fields.locationName, 'Arecibo');
  assert.equal(fields.kitchenStatus, 'received');
  assert(isKitchenOrder({...sale,...fields}));
  assert(!isKitchenOrder({...sale,...fields,status:'processing'}));
  assert(!isKitchenOrder({...sale,...fields,paymentStatus:'due'}));
  assert.deepEqual(paidPosKitchenFields({...site,business:{category:'Retail'}}, sale), {});
  assert.equal(kitchenChannel(sale), 'pos');
  assert.equal(kitchenChannel({source:'pos_remote'}), 'pos');
  assert.equal(kitchenChannel({channel:'kiosk'}), 'kiosk');
  assert.equal(kitchenChannel({channel:'storefront'}), 'storefront');
});
