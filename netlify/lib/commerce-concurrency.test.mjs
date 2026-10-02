import idempotentSale from "../functions/client-pos-sale-idempotent.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";
import { clientSiteStore, clientCommerceStore, commerceKey, getClientSite } from "./client-store.mjs";
import sale from "../functions/client-pos-sale.mjs";
import webhook from "../functions/stripe-connect-webhook.mjs";

function fixture(t, inventory = 1) {
  globalThis.netlifyBlobsContext = Buffer.from(JSON.stringify({ siteID: "test", token: "test", deployID: "test" })).toString("base64");
  globalThis.Netlify = { env: { get: name => name === "STRIPE_CONNECT_WEBHOOK_SECRET" ? "test-signing-secret" : "" } };
  globalThis.netlifyIdentityContext = { user: { email: "owner@example.invalid", sub: "owner", app_metadata: {} } };
  t.after(() => { delete globalThis.Netlify; delete globalThis.netlifyIdentityContext; delete globalThis.netlifyBlobsContext });
  const rows = new Map(); let revision = 0;
  const proto = Object.getPrototypeOf(getStore("test"));
  t.mock.method(proto, "get", async function(key) { return structuredClone(rows.get(`${this.name}/${key}`)?.data || null) });
  t.mock.method(proto, "getWithMetadata", async function(key) { return structuredClone(rows.get(`${this.name}/${key}`) || null) });
  t.mock.method(proto, "setJSON", async function(key, value, options = {}) {
    const full = `${this.name}/${key}`, previous = rows.get(full);
    if ((options.onlyIfNew && previous) || (options.onlyIfMatch && previous?.etag !== options.onlyIfMatch)) return { modified: false };
    rows.set(full, { data: structuredClone(value), etag: String(++revision) }); return { modified: true };
  });
  t.mock.method(proto, "delete", async function(key) { rows.delete(`${this.name}/${key}`) });
  const site = { siteId: "shop", slug: "shop", business: {}, members: [{ email: "owner@example.invalid", role: "owner" }], catalog: [{ id: "last-item", name: "Product", type: "product", price: 1, active: true, inventory, trackInventory: true }], settings: {}, paymentRules: {}, taxConfig: {} };
  return { rows, site, prepare: () => clientSiteStore().setJSON(`sites/${site.siteId}.json`, site) };
}

function saleRequest(items = [{ id: "last-item", quantity: 1 }]) {
  return new Request("https://webfactorypr.com/.netlify/functions/client-pos-sale", { method: "POST", headers: { Origin: "https://webfactorypr.com", "Content-Type": "application/json" }, body: JSON.stringify({ siteId: "shop", items, paymentMethod: "cash" }) });
}

test("two simultaneous POS sales cannot both sell the last unit", async t => {
  const f = fixture(t); await f.prepare();
  const results = await Promise.all([sale(saleRequest()), sale(saleRequest())]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  assert.equal((await getClientSite("shop")).catalog[0].inventory, 0);
  assert.equal([...f.rows.keys()].filter(key => key.includes("/v3/receipts/")).length, 1);
  assert.equal((await sale(saleRequest())).status, 409);
});

test("malformed quantities and duplicate item rows cannot bypass stock validation", async t => {
  const f = fixture(t, 5); await f.prepare();
  for (const items of [[{ id: "last-item", quantity: "bad" }], [{ id: "last-item", quantity: -1 }], [{ id: "last-item", quantity: 3 }, { id: "last-item", quantity: 3 }]]) {
    assert.equal((await sale(saleRequest(items))).status, 400);
  }
  assert.equal((await getClientSite("shop")).catalog[0].inventory, 5);
});

function webhookRequest(eventId) {
  const created = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({ id: eventId, type: "checkout.session.completed", account: "acct_shop", created, data: { object: { payment_status: "paid", currency: "usd", amount_total: 100, payment_intent: "pi_shop", metadata: { flow: "webfactory_client_commerce", site_id: "shop", transaction_id: "txn_shop" } } } });
  const signature = crypto.createHmac("sha256", "test-signing-secret").update(`${created}.${body}`).digest("hex");
  return new Request("https://webfactorypr.com/.netlify/functions/stripe-connect-webhook", { method: "POST", headers: { "stripe-signature": `t=${created},v1=${signature}` }, body });
}

test("concurrent webhook delivery conflicts are retryable and repeated payment events do not decrement stock twice", async t => {
  const f = fixture(t, 5); await f.prepare();
  await clientCommerceStore().setJSON(commerceKey("shop", "transactions", "txn_shop"), { transactionId: "txn_shop", siteId: "shop", kind: "order", stripeAccountId: "acct_shop", amountTotal: 100, paymentStatus: "pending", items: [{ id: "last-item", name: "Product", quantity: 1, unitAmount: 100 }], customer: {}, createdAt: new Date().toISOString() });
  const results = await Promise.all([webhook(webhookRequest("evt_shop")), webhook(webhookRequest("evt_shop"))]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  assert.equal((await webhook(webhookRequest("evt_shop"))).status, 200);
  assert.equal((await webhook(webhookRequest("evt_another"))).status, 200);
  assert.equal((await getClientSite("shop")).catalog[0].inventory, 4);
  assert.equal([...f.rows.keys()].filter(key => key.includes("/v3/receipts/")).length, 1);
});

test("a simultaneous or repeated POS attempt cannot create a second sale", async t => {
  const f = fixture(t, 5); await f.prepare();
  const request = () => new Request("https://webfactorypr.com/.netlify/functions/client-pos-sale-idempotent", { method: "POST", headers: { Origin: "https://webfactorypr.com", "Content-Type": "application/json" }, body: JSON.stringify({ siteId: "shop", saleAttemptId: "attempt-12345678", items: [{ id: "last-item", quantity: 1 }], paymentMethod: "cash" }) });
  const results = await Promise.all([idempotentSale(request()), idempotentSale(request())]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  assert.equal((await idempotentSale(request())).status, 200);
  assert.equal((await getClientSite("shop")).catalog[0].inventory, 4);
  assert.equal([...f.rows.keys()].filter(key => key.includes("/v3/receipts/")).length, 1);
});

test('a stock movement failure after the catalog write is recovered without a second stock decrement',async t=>{
  const f=fixture(t,5);await f.prepare();await clientCommerceStore().setJSON(commerceKey('shop','transactions','txn_shop'),{transactionId:'txn_shop',siteId:'shop',kind:'order',stripeAccountId:'acct_shop',amountTotal:100,paymentStatus:'pending',items:[{id:'last-item',quantity:1,unitAmount:100}],customer:{},createdAt:new Date().toISOString()});
  const proto=Object.getPrototypeOf(clientCommerceStore()),base=proto.setJSON;let fail=true;t.mock.method(proto,'setJSON',async function(key,value,options){if(key.includes('/v3/inventory-movements/')&&fail){fail=false;throw new Error('movement write failed')};return base.call(this,key,value,options)});
  assert.equal((await webhook(webhookRequest('evt_partial'))).status,500);assert.equal((await getClientSite('shop')).catalog[0].inventory,4);assert.equal((await webhook(webhookRequest('evt_partial'))).status,200);assert.equal((await getClientSite('shop')).catalog[0].inventory,4);assert.equal([...f.rows.keys()].filter(key=>key.includes('/v3/inventory-movements/')).length,1);
});
test('an artifact failure after customer totals retries without counting the payment twice',async t=>{
  const f=fixture(t,5);await f.prepare();await clientCommerceStore().setJSON(commerceKey('shop','transactions','txn_shop'),{transactionId:'txn_shop',siteId:'shop',kind:'order',stripeAccountId:'acct_shop',amountTotal:100,paymentStatus:'pending',items:[{id:'last-item',quantity:1,unitAmount:100}],customer:{email:'fixture@example.com'},createdAt:new Date().toISOString()});
  const proto=Object.getPrototypeOf(clientCommerceStore()),base=proto.setJSON;let fail=true;t.mock.method(proto,'setJSON',async function(key,value,options){if(key.includes('/v3/receipts/')&&fail){fail=false;throw new Error('receipt write failed')};return base.call(this,key,value,options)});
  assert.equal((await webhook(webhookRequest('evt_customer_partial'))).status,500);assert.equal((await webhook(webhookRequest('evt_customer_partial'))).status,200);const customers=[...f.rows.entries()].filter(([key])=>key.includes('/v3/customers/'));assert.equal(customers.length,1);assert.equal(customers[0][1].data.totalSpent,100);assert.equal(customers[0][1].data.orderCount,1);assert.equal((await getClientSite('shop')).catalog[0].inventory,4);
});
test('a paid legacy transaction with unknown stock effects requires review instead of guessing a decrement',async t=>{const f=fixture(t,5);await f.prepare();await clientCommerceStore().setJSON(commerceKey('shop','transactions','txn_shop'),{transactionId:'txn_shop',siteId:'shop',kind:'order',stripeAccountId:'acct_shop',amountTotal:100,paymentStatus:'paid',items:[{id:'last-item',quantity:1,unitAmount:100}],customer:{}});assert.equal((await webhook(webhookRequest('evt_legacy'))).status,409);assert.equal((await getClientSite('shop')).catalog[0].inventory,5);assert.equal((await clientCommerceStore().get(commerceKey('shop','orders','txn_shop'))).inventoryNeedsReview,true);});
test('stale business edits cannot overwrite a stock operation or erase its markers',async t=>{const f=fixture(t,5);await f.prepare();const original=await getClientSite('shop');await sale(saleRequest());const {saveClientSite,patchClientSite}=await import('./client-store.mjs');await assert.rejects(saveClientSite({...original,revision:Number(original.revision||0)+1,business:{name:'stale'}}),{status:409});await assert.rejects(patchClientSite('shop',{catalog:original.catalog},{expectedRevision:original.revision}),{status:409});const current=await getClientSite('shop');const copy={...current,revision:current.revision+1,business:{name:'new'}};delete copy.stockOperations;await saveClientSite(copy);const updated=await getClientSite('shop');assert.equal(updated.catalog[0].inventory,4);assert.equal(Object.keys(updated.stockOperations).length,1);});


test('changed POS tips cannot reuse a completed attempt and invalid cents never change stock',async t=>{
  const f=fixture(t,5);await f.prepare();
  const request=tipCents=>new Request('https://webfactorypr.com/.netlify/functions/client-pos-sale-idempotent',{method:'POST',headers:{Origin:'https://webfactorypr.com','Content-Type':'application/json'},body:JSON.stringify({siteId:'shop',saleAttemptId:'attempt-money-12345',items:[{id:'last-item',quantity:1}],tipCents})});
  assert.equal((await idempotentSale(request(0))).status,200);
  assert.equal((await idempotentSale(request(100))).status,409);
  const invalid=new Request('https://webfactorypr.com/.netlify/functions/client-pos-sale',{method:'POST',headers:{Origin:'https://webfactorypr.com','Content-Type':'application/json'},body:JSON.stringify({siteId:'shop',items:[{id:'last-item',quantity:1}],discountCents:'invalid'})});
  assert.equal((await sale(invalid)).status,400);
  assert.equal((await getClientSite('shop')).catalog[0].inventory,4);
});
