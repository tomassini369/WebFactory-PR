import commerceAdmin from '../functions/client-commerce-admin.mjs';
import Stripe from 'stripe';
import terminalSale from '../functions/client-terminal-payment-intent.mjs';
import verifyReservation from '../functions/client-stock-reservations.mjs';
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
  t.mock.method(proto,'list',function({prefix='',paginate=false}={}){const page={blobs:[...rows.keys()].filter(key=>key.startsWith(`${this.name}/${prefix}`)).map(key=>({key:key.slice(this.name.length+1)}))};return paginate?(async function*(){yield page})():Promise.resolve(page)});
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

function expirationRequest(eventId,sessionId='cs_shop',status='expired'){
  const created=Math.floor(Date.now()/1000),body=JSON.stringify({id:eventId,type:'checkout.session.expired',account:'acct_shop',created,data:{object:{id:sessionId,status,payment_status:'unpaid',amount_total:100,metadata:{flow:'webfactory_client_commerce',site_id:'shop',transaction_id:'txn_shop'}}}}),signature=crypto.createHmac('sha256','test-signing-secret').update(`${created}.${body}`).digest('hex');
  return new Request('https://webfactorypr.com/.netlify/functions/stripe-connect-webhook',{method:'POST',headers:{'stripe-signature':`t=${created},v1=${signature}`},body});
}
async function prepareReservation(f){await f.prepare();await clientCommerceStore().setJSON(commerceKey('shop','transactions','txn_shop'),{transactionId:'txn_shop',siteId:'shop',kind:'order',stripeAccountId:'acct_shop',stripeSessionId:'cs_shop',inventoryProtocol:1,inventoryReservationRequired:true,paymentStatus:'pending',amountTotal:100,items:[{id:'last-item',quantity:1,unitAmount:100}],customer:{}});const {reserveInventory}=await import('./inventory-reservations.mjs');await reserveInventory('shop','txn_shop',[{id:'last-item',quantity:1}]);}
test('only matching signed Stripe expirations release pending stock; delivery replay is harmless',async t=>{
 const f=fixture(t,1);await prepareReservation(f);
 assert.equal((await sale(saleRequest())).status,409);
 assert.equal((await webhook(expirationRequest('evt_wrong','cs_other'))).status,500);
 assert.equal((await sale(saleRequest())).status,409);
 assert.equal((await webhook(expirationRequest('evt_expired'))).status,200);
 assert.equal((await webhook(expirationRequest('evt_expired'))).status,200);
 assert.equal((await clientCommerceStore().get(commerceKey('shop','transactions','txn_shop'))).paymentStatus,'expired');
 assert.equal((await sale(saleRequest())).status,200);
});
test('paid webhook consumes a reservation; a later expiration never replenishes its sold units',async t=>{
 const f=fixture(t,1);await prepareReservation(f);assert.equal((await webhook(webhookRequest('evt_reserved_paid'))).status,200);assert.equal((await getClientSite('shop')).catalog[0].inventory,0);
 assert.equal((await webhook(expirationRequest('evt_late_expired'))).status,200);assert.equal((await getClientSite('shop')).catalog[0].inventory,0);assert.equal((await clientCommerceStore().get(commerceKey('shop','transactions','txn_shop'))).paymentStatus,'paid');
});
test('configuration edits preserve reservations and cannot remove or disable a reserved product',async t=>{
 const f=fixture(t,2);await prepareReservation(f);const {patchClientSite}=await import('./client-store.mjs');
 await assert.rejects(patchClientSite('shop',{catalog:[]}),{status:409});const site=await getClientSite('shop');
 await assert.rejects(patchClientSite('shop',{catalog:site.catalog.map(item=>({...item,trackInventory:false}))}),{status:409});
 await patchClientSite('shop',{business:{name:'Updated'}});assert.equal(Object.values((await getClientSite('shop')).stockReservations)[0].state,'held');
});

function terminalEventRequest(eventId,type='payment_intent.succeeded',intentId='pi_terminal_shop'){
 const created=Math.floor(Date.now()/1000),body=JSON.stringify({id:eventId,type,account:'acct_shop',created,data:{object:{id:intentId,status:type==='payment_intent.canceled'?'canceled':'succeeded',amount:100,amount_received:type==='payment_intent.canceled'?0:100,currency:'usd',metadata:{flow:'webfactory_terminal',site_id:'shop',transaction_id:'txn_shop'}}}}),signature=crypto.createHmac('sha256','test-signing-secret').update(`${created}.${body}`).digest('hex');
 return new Request('https://webfactorypr.com/.netlify/functions/stripe-connect-webhook',{method:'POST',headers:{'stripe-signature':`t=${created},v1=${signature}`},body});
}
async function prepareTerminalReservation(f){await f.prepare();await clientCommerceStore().setJSON(commerceKey('shop','transactions','txn_shop'),{transactionId:'txn_shop',siteId:'shop',kind:'order',source:'tap_to_pay',stripeAccountId:'acct_shop',stripePaymentIntentId:'pi_terminal_shop',inventoryProtocol:1,inventoryReservationRequired:true,paymentStatus:'pending',amountTotal:100,items:[{id:'last-item',quantity:1,unitAmount:100}],customer:{}});const {reserveInventory}=await import('./inventory-reservations.mjs');await reserveInventory('shop','txn_shop',[{id:'last-item',quantity:1}],undefined,'stripe_terminal');}
test('Terminal cancellation releases stock only for a matching signed canceled intent',async t=>{
 const f=fixture(t,1);await prepareTerminalReservation(f);assert.equal((await sale(saleRequest())).status,409);
 assert.equal((await webhook(terminalEventRequest('evt_cancel_wrong','payment_intent.canceled','pi_other'))).status,500);assert.equal((await sale(saleRequest())).status,409);
 assert.equal((await webhook(terminalEventRequest('evt_terminal_cancel','payment_intent.canceled'))).status,200);assert.equal((await webhook(terminalEventRequest('evt_terminal_cancel','payment_intent.canceled'))).status,200);
 assert.equal((await clientCommerceStore().get(commerceKey('shop','transactions','txn_shop'))).paymentStatus,'cancelled');assert.equal((await sale(saleRequest())).status,200);
});
test('Terminal payment consumes its reservation once and later cancellation never restores sold stock',async t=>{
 const f=fixture(t,1);await prepareTerminalReservation(f);assert.equal((await webhook(terminalEventRequest('evt_terminal_paid'))).status,200);assert.equal((await webhook(terminalEventRequest('evt_terminal_paid_again'))).status,200);assert.equal((await getClientSite('shop')).catalog[0].inventory,0);
 assert.equal((await webhook(terminalEventRequest('evt_terminal_cancel_after_paid','payment_intent.canceled'))).status,200);assert.equal((await getClientSite('shop')).catalog[0].inventory,0);assert.equal((await clientCommerceStore().get(commerceKey('shop','transactions','txn_shop'))).paymentStatus,'paid');
});

test('Terminal API reserves before returning a secret and reconciliation reads only confirmed canceled intents',async t=>{
 const f=fixture(t,1);f.site.paymentRules={methods:{stripe:true},stripeConnectedAccountId:'acct_shop'};await f.prepare();globalThis.Netlify.env.get=name=>name==='STRIPE_SECRET_KEY'?'sk_test_fixture':name==='STRIPE_CONNECT_WEBHOOK_SECRET'?'test-signing-secret':'';
 let creates=0,status='requires_payment_method',metadata,amount;
 t.mock.method(Stripe.resources.PaymentIntents.prototype,'create',async params=>{creates++;metadata=params.metadata;amount=params.amount;assert.equal(Object.values((await getClientSite('shop')).stockReservations)[0].state,'held');return {id:'pi_api_terminal',client_secret:'unit-client-secret',amount,currency:'usd',status,metadata};});
 t.mock.method(Stripe.resources.PaymentIntents.prototype,'retrieve',async()=>({id:'pi_api_terminal',amount,amount_received:0,currency:'usd',status,metadata,client_secret:'unit-client-secret'}));
 const request=()=>new Request('https://webfactorypr.com/.netlify/functions/client-terminal-payment-intent',{method:'POST',headers:{Origin:'https://webfactorypr.com','Content-Type':'application/json'},body:JSON.stringify({siteId:'shop',saleAttemptId:'terminal-api-12345',items:[{id:'last-item',quantity:1}]})});
 const result=await terminalSale(request());assert.equal(result.status,200);const body=await result.json();assert.equal(body.clientSecret,'unit-client-secret');assert.equal((await terminalSale(request())).status,200);assert.equal(creates,1);
 assert.equal([...f.rows.values()].some(row=>JSON.stringify(row.data).includes('unit-client-secret')),false);assert.equal((await sale(saleRequest())).status,409);
 const check=()=>new Request('https://webfactorypr.com/.netlify/functions/client-stock-reservations',{method:'POST',headers:{Origin:'https://webfactorypr.com','Content-Type':'application/json'},body:JSON.stringify({siteId:'shop',transactionId:body.transactionId})});
 assert.equal((await (await verifyReservation(check())).json()).released,false);assert.equal((await sale(saleRequest())).status,409);
 status='canceled';assert.equal((await (await verifyReservation(check())).json()).released,true);assert.equal((await sale(saleRequest())).status,200);
});

test('interrupted POS recovery reconstructs one receipt and reconnects the original attempt without another sale',async t=>{
 const f=fixture(t,3);await f.prepare();const proto=Object.getPrototypeOf(clientCommerceStore()),write=proto.setJSON;let broken=true;
 t.mock.method(proto,'setJSON',async function(key,value,options){if(key.includes('/v3/receipts/')&&broken){broken=false;throw new Error('receipt failed')};return write.call(this,key,value,options)});
 const payload={siteId:'shop',saleAttemptId:'recover-pos-12345',items:[{id:'last-item',quantity:1}],paymentMethod:'cash',customer:{email:'fixture@example.com'}};
 const request=()=>new Request('https://webfactorypr.com/.netlify/functions/client-pos-sale-idempotent',{method:'POST',headers:{Origin:'https://webfactorypr.com','Content-Type':'application/json'},body:JSON.stringify(payload)});
 assert.equal((await idempotentSale(request())).status,500);assert.equal((await getClientSite('shop')).catalog[0].inventory,2);
 const listing=await commerceAdmin(new Request('https://webfactorypr.com/.netlify/functions/client-commerce-admin?siteId=shop'));assert.equal(listing.status,200);const pending=(await listing.json()).orders.find(record=>record.status==='processing');assert.ok(pending);
 const action=()=>new Request('https://webfactorypr.com/.netlify/functions/client-commerce-admin',{method:'POST',headers:{Origin:'https://webfactorypr.com','Content-Type':'application/json'},body:JSON.stringify({siteId:'shop',kind:'order',transactionId:pending.transactionId,action:'recover_pos'})});
 assert.equal((await commerceAdmin(action())).status,200);assert.equal((await idempotentSale(request())).status,200);assert.equal((await getClientSite('shop')).catalog[0].inventory,2);
 const customers=[...f.rows.entries()].filter(([key])=>key.includes('/v3/customers/'));assert.equal(customers.length,1);assert.equal(customers[0][1].data.orderCount,1);
 assert.equal([...f.rows.keys()].filter(key=>key.includes('/v3/receipts/')).length,1);assert.equal([...f.rows.keys()].filter(key=>key.includes('/pos-processing/')).length,0);
});
test('POS recovery refuses an interrupted record without the original inventory operation',async t=>{
 const f=fixture(t,2);await f.prepare();await clientCommerceStore().setJSON(commerceKey('shop','transactions','txn_unknown'),{siteId:'shop',transactionId:'txn_unknown',kind:'order',source:'pos',inventoryProtocol:1,paymentStatus:'paid_in_person',status:'processing',items:[{id:'last-item',quantity:1}],customer:{},amountTotal:100});
 const {recoverPosOrder}=await import('./pos-recovery.mjs');await assert.rejects(recoverPosOrder('shop','txn_unknown'),{status:409});assert.equal((await getClientSite('shop')).catalog[0].inventory,2);assert.equal([...f.rows.keys()].filter(key=>key.includes('/v3/receipts/')).length,0);
});

test('a completed POS sale with a lost attempt-marker response is listed and linked back to the same receipt',async t=>{
 const f=fixture(t,3);await f.prepare();const proto=Object.getPrototypeOf(clientCommerceStore()),write=proto.setJSON;let broken=true;
 t.mock.method(proto,'setJSON',async function(key,value,options){if(key.includes('/pos-attempts/')&&value.status==='completed'&&broken){broken=false;throw new Error('attempt marker failed')};return write.call(this,key,value,options)});
 const request=()=>new Request('https://webfactorypr.com/.netlify/functions/client-pos-sale-idempotent',{method:'POST',headers:{Origin:'https://webfactorypr.com','Content-Type':'application/json'},body:JSON.stringify({siteId:'shop',saleAttemptId:'lost-marker-12345',items:[{id:'last-item',quantity:1}],paymentMethod:'cash'})});
 assert.equal((await idempotentSale(request())).status,500);
 const listing=await commerceAdmin(new Request('https://webfactorypr.com/.netlify/functions/client-commerce-admin?siteId=shop'));const pending=(await listing.json()).orders.find(record=>record.posRecoveryNeeded);assert.ok(pending);assert.equal(pending.status,'completed');
 const {recoverPosOrder}=await import('./pos-recovery.mjs');const recovered=await recoverPosOrder('shop',pending.transactionId);const repeated=await idempotentSale(request());assert.equal(repeated.status,200);assert.equal((await repeated.json()).receiptId,recovered.receiptId);assert.equal((await getClientSite('shop')).catalog[0].inventory,2);assert.equal([...f.rows.keys()].filter(key=>key.includes('/v3/receipts/')).length,1);
});
