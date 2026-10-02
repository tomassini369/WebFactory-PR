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

function asyncCheckoutRequest(eventId,type='checkout.session.async_payment_failed',overrides={},account='acct_shop'){
 const created=Math.floor(Date.now()/1000);
 const object={id:'cs_shop',status:'complete',payment_status:'unpaid',currency:'usd',amount_total:100,payment_intent:'pi_shop',metadata:{flow:'webfactory_client_commerce',site_id:'shop',transaction_id:'txn_shop'},...overrides};
 const body=JSON.stringify({id:eventId,type,account,created,data:{object}});
 const signature=crypto.createHmac('sha256','test-signing-secret').update(`${created}.${body}`).digest('hex');
 return new Request('https://webfactorypr.com/.netlify/functions/stripe-connect-webhook',{method:'POST',headers:{'stripe-signature':`t=${created},v1=${signature}`},body});
}
test('an unpaid completed checkout retains stock until its signed delayed-payment failure, and replays release once',async t=>{
 const f=fixture(t);await prepareReservation(f);
 assert.equal((await webhook(asyncCheckoutRequest('evt_processing','checkout.session.completed'))).status,200);
 assert.equal((await sale(saleRequest())).status,409);
 assert.equal((await webhook(asyncCheckoutRequest('evt_failed'))).status,200);
 assert.equal((await webhook(asyncCheckoutRequest('evt_failed'))).status,200);
 assert.equal((await webhook(asyncCheckoutRequest('evt_failed_again'))).status,200);
 const record=await clientCommerceStore().get(commerceKey('shop','transactions','txn_shop'));
 assert.equal(record.paymentStatus,'failed');assert.equal(record.status,'payment_failed');
 assert.equal((await clientCommerceStore().get(commerceKey('shop','orders','txn_shop'))).paymentStatus,'failed');
 assert.equal((await getClientSite('shop')).catalog[0].inventory,1);
 assert.equal(Object.values((await getClientSite('shop')).stockReservations)[0].state,'released');
 assert.equal([...f.rows.keys()].filter(key=>key.includes('/v3/receipts/')).length,0);
 assert.equal((await sale(saleRequest())).status,200);
});
test('delayed failure rejects foreign accounts, sessions, amounts, currencies, states and unsigned events',async t=>{
 const f=fixture(t);await prepareReservation(f);
 const variants=[{id:'cs_other'},{amount_total:101},{currency:'eur'},{status:'open'},{payment_status:'paid'}];
 for(const [i,variant] of variants.entries())assert.equal((await webhook(asyncCheckoutRequest(`evt_invalid_${i}`,undefined,variant))).status,500);
 assert.equal((await webhook(asyncCheckoutRequest('evt_wrong_account',undefined,{},'acct_other'))).status,500);
 const unsigned=asyncCheckoutRequest('evt_unsigned');unsigned.headers.delete('stripe-signature');assert.equal((await webhook(unsigned)).status,400);
 const record=await clientCommerceStore().get(commerceKey('shop','transactions','txn_shop'));
 await clientCommerceStore().setJSON(commerceKey('shop','transactions','txn_shop'),{...record,stripePaymentIntentId:'pi_other'});
 assert.equal((await webhook(asyncCheckoutRequest('evt_wrong_intent'))).status,500);
 await clientCommerceStore().setJSON(commerceKey('shop','transactions','txn_shop'),{...record,stripeSessionId:''});
 assert.equal((await webhook(asyncCheckoutRequest('evt_unknown_session'))).status,500);
 assert.equal(Object.values((await getClientSite('shop')).stockReservations)[0].state,'held');
 assert.equal((await sale(saleRequest())).status,409);
});
test('a delayed failure after payment cannot release consumed stock or erase its receipt',async t=>{
 const f=fixture(t);await prepareReservation(f);
 assert.equal((await webhook(asyncCheckoutRequest('evt_async_paid','checkout.session.async_payment_succeeded',{payment_status:'paid'}))).status,200);
 const receipt=(await clientCommerceStore().get(commerceKey('shop','transactions','txn_shop'))).receiptId;
 assert.equal((await webhook(asyncCheckoutRequest('evt_late_failed'))).status,200);
 const record=await clientCommerceStore().get(commerceKey('shop','transactions','txn_shop'));
 assert.equal(record.paymentStatus,'paid');assert.equal(record.receiptId,receipt);
 assert.equal((await getClientSite('shop')).catalog[0].inventory,0);
 assert.equal(Object.values((await getClientSite('shop')).stockReservations)[0].state,'consumed');
});
test('failed order projection retries after transaction persistence without another inventory change',async t=>{
 const f=fixture(t);await prepareReservation(f);
 const proto=Object.getPrototypeOf(clientCommerceStore()),write=proto.setJSON;let broken=true;
 t.mock.method(proto,'setJSON',async function(key,value,options){if(key===commerceKey('shop','orders','txn_shop')&&broken){broken=false;throw new Error('order projection failed')};return write.call(this,key,value,options)});
 assert.equal((await webhook(asyncCheckoutRequest('evt_projection_failure'))).status,500);
 const first=await clientCommerceStore().get(commerceKey('shop','transactions','txn_shop'));
 assert.equal(first.paymentStatus,'failed');
 assert.equal((await webhook(asyncCheckoutRequest('evt_projection_failure'))).status,200);
 assert.equal((await clientCommerceStore().get(commerceKey('shop','orders','txn_shop'))).paymentFailedAt,first.paymentFailedAt);
 assert.equal((await getClientSite('shop')).catalog[0].inventory,1);
});
test('payment reported after a failed and released checkout requires review without fulfilling sold stock',async t=>{
 const f=fixture(t);await prepareReservation(f);
 assert.equal((await webhook(asyncCheckoutRequest('evt_failed_first'))).status,200);
 assert.equal((await sale(saleRequest())).status,200);
 assert.equal((await webhook(asyncCheckoutRequest('evt_paid_after_failure','checkout.session.async_payment_succeeded',{payment_status:'paid'}))).status,409);
 const record=await clientCommerceStore().get(commerceKey('shop','orders','txn_shop'));
 assert.equal(record.paymentStatus,'failed');assert.equal(record.status,'payment_review_required');assert.equal(record.inventoryNeedsReview,true);
 assert.equal((await getClientSite('shop')).catalog[0].inventory,0);
 assert.equal([...f.rows.keys()].filter(key=>key.includes('/v3/receipts/')).length,1);
});
test('failed delayed booking projects its failure and removes only its own temporary hold',async t=>{
 const f=fixture(t);await f.prepare();
 await clientCommerceStore().setJSON(commerceKey('shop','transactions','txn_shop'),{siteId:'shop',transactionId:'txn_shop',kind:'booking',stripeAccountId:'acct_shop',stripeSessionId:'cs_shop',amountTotal:100,paymentStatus:'pending',holdId:'hold_shop'});
 await clientCommerceStore().setJSON(commerceKey('shop','holds','hold_shop'),{holdId:'hold_shop'});
 await clientCommerceStore().setJSON(commerceKey('shop','holds','hold_other'),{holdId:'hold_other'});
 assert.equal((await webhook(asyncCheckoutRequest('evt_booking_failed'))).status,200);
 assert.equal((await clientCommerceStore().get(commerceKey('shop','bookings','txn_shop'))).paymentStatus,'failed');
 assert.equal(await clientCommerceStore().get(commerceKey('shop','holds','hold_shop')),null);
 assert.ok(await clientCommerceStore().get(commerceKey('shop','holds','hold_other')));
});

test('failure delivery recovers after releasing stock but failing the transaction write',async t=>{
 const f=fixture(t);await prepareReservation(f);
 const proto=Object.getPrototypeOf(clientCommerceStore()),write=proto.setJSON;let broken=true;
 t.mock.method(proto,'setJSON',async function(key,value,options){if(key===commerceKey('shop','transactions','txn_shop')&&value.paymentStatus==='failed'&&broken){broken=false;throw new Error('failed transaction write')};return write.call(this,key,value,options)});
 assert.equal((await webhook(asyncCheckoutRequest('evt_txn_write_failure'))).status,500);
 assert.equal((await clientCommerceStore().get(commerceKey('shop','transactions','txn_shop'))).paymentStatus,'pending');
 assert.equal(Object.values((await getClientSite('shop')).stockReservations)[0].state,'released');
 assert.equal((await webhook(asyncCheckoutRequest('evt_txn_write_failure'))).status,200);
 assert.equal((await clientCommerceStore().get(commerceKey('shop','orders','txn_shop'))).paymentStatus,'failed');
 const completed=await webhook(asyncCheckoutRequest('evt_completed_after_failure','checkout.session.completed'));
 assert.equal(completed.status,200);assert.equal((await completed.json()).pending,false);
 assert.equal((await getClientSite('shop')).catalog[0].inventory,1);
});
test('a consumed reservation with inconsistent pending payment is preserved for reconciliation',async t=>{
 const f=fixture(t);await prepareReservation(f);
 const {applyStockOperation}=await import('./inventory-operations.mjs');
 await applyStockOperation('shop',{kind:'sale',referenceId:'txn_shop',items:[{id:'last-item',quantity:1}],reason:'sale',reservationRequired:true});
 assert.equal((await webhook(asyncCheckoutRequest('evt_consumed_but_pending'))).status,409);
 assert.equal((await clientCommerceStore().get(commerceKey('shop','transactions','txn_shop'))).paymentStatus,'pending');
 assert.equal(Object.values((await getClientSite('shop')).stockReservations)[0].state,'consumed');
 assert.equal((await getClientSite('shop')).catalog[0].inventory,0);
});

async function preparePayAtBusiness(f){
 f.site.servicePlan={billingModel:'complimentary'};f.site.paymentRules.productPayment='in_person';await f.prepare();
}
function inPersonCheckoutRequest(origin='https://webfactorypr.com'){
 return new Request('https://webfactorypr.com/.netlify/functions/create-client-checkout',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({siteId:'shop',items:[{id:'last-item',quantity:1}],customer:{name:'Fixture',email:'fixture@example.invalid'}})});
}
function orderAction(transactionId,action,origin='https://webfactorypr.com'){
 return new Request('https://webfactorypr.com/.netlify/functions/client-commerce-admin',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({siteId:'shop',kind:'order',transactionId,action})});
}
async function placeInPersonOrder(){
 const {default:createCheckout}=await import('../functions/create-client-checkout.mjs');
 const response=await createCheckout(inPersonCheckoutRequest());assert.equal(response.status,200);
 return (await response.json()).transactionId;
}
test('pay-at-business checkout reserves stock without reducing physical inventory or creating a receipt',async t=>{
 const f=fixture(t);await preparePayAtBusiness(f);
 t.mock.method(globalThis,'fetch',async()=>{throw new Error('No provider network calls permitted')});
 const transactionId=await placeInPersonOrder();
 const record=await clientCommerceStore().get(commerceKey('shop','orders',transactionId));
 assert.equal(record.paymentStatus,'due');assert.equal(record.status,'confirmed');assert.equal(record.inventoryReservationRequired,true);
 assert.equal((await getClientSite('shop')).catalog[0].inventory,1);
 assert.equal(Object.values((await getClientSite('shop')).stockReservations)[0].provider,'in_person');
 assert.equal((await sale(saleRequest())).status,409);
 assert.equal([...f.rows.keys()].filter(key=>key.includes('/v3/receipts/')).length,0);
});
test('two public pay-at-business requests cannot both reserve the last unit',async t=>{
 const f=fixture(t);await preparePayAtBusiness(f);
 const {default:createCheckout}=await import('../functions/create-client-checkout.mjs');
 const responses=await Promise.all([createCheckout(inPersonCheckoutRequest()),createCheckout(inPersonCheckoutRequest())]);
 assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
 assert.equal(Object.values((await getClientSite('shop')).stockReservations).filter(r=>r.state==='held').length,1);
});
test('recording received payment consumes the original reservation and creates one receipt and customer contribution',async t=>{
 const f=fixture(t,2);await preparePayAtBusiness(f);const id=await placeInPersonOrder();
 const first=await commerceAdmin(orderAction(id,'mark_paid'));assert.equal(first.status,200);const paid=(await first.json()).record;
 assert.equal(paid.paymentStatus,'paid_in_person');assert.ok(paid.inventoryAppliedAt);assert.ok(paid.receiptId);
 assert.equal((await commerceAdmin(orderAction(id,'mark_paid'))).status,200);
 assert.equal((await getClientSite('shop')).catalog[0].inventory,1);
 assert.equal(Object.values((await getClientSite('shop')).stockReservations)[0].state,'consumed');
 const customers=[...f.rows.entries()].filter(([key])=>key.includes('/v3/customers/'));assert.equal(customers.length,1);assert.equal(customers[0][1].data.orderCount,1);assert.equal(customers[0][1].data.totalSpent,paid.amountTotal);
 assert.equal([...f.rows.keys()].filter(key=>key.includes('/v3/receipts/')).length,1);
 assert.equal((await commerceAdmin(orderAction(id,'cancel_in_person'))).status,409);
 assert.equal((await commerceAdmin(orderAction(id,'complete'))).status,200);
 assert.equal((await clientCommerceStore().get(commerceKey('shop','orders',id))).status,'completed');
});
test('canceling an unpaid order releases only its own reserved units and cannot later record payment',async t=>{
 const f=fixture(t,2);await preparePayAtBusiness(f);const id=await placeInPersonOrder(),other=await placeInPersonOrder();
 assert.equal((await commerceAdmin(orderAction(id,'cancel_in_person'))).status,200);
 assert.equal((await commerceAdmin(orderAction(id,'cancel_in_person'))).status,200);
 assert.equal((await commerceAdmin(orderAction(id,'mark_paid'))).status,409);
 const reservations=Object.values((await getClientSite('shop')).stockReservations);
 assert.equal(reservations.find(r=>r.referenceId===id).state,'released');assert.equal(reservations.find(r=>r.referenceId===other).state,'held');
 assert.equal((await getClientSite('shop')).catalog[0].inventory,2);
 assert.equal((await sale(saleRequest())).status,200);
 assert.equal((await sale(saleRequest())).status,409);
});
test('a receipt failure after in-person payment resumes the same order without charging, decrementing or counting twice',async t=>{
 const f=fixture(t,2);await preparePayAtBusiness(f);const id=await placeInPersonOrder();
 const proto=Object.getPrototypeOf(clientCommerceStore()),write=proto.setJSON;let broken=true;
 t.mock.method(proto,'setJSON',async function(key,value,options){if(key.includes('/v3/receipts/')&&broken){broken=false;throw new Error('receipt write failed')};return write.call(this,key,value,options)});
 assert.equal((await commerceAdmin(orderAction(id,'mark_paid'))).status,500);
 const pending=await clientCommerceStore().get(commerceKey('shop','transactions',id));assert.equal(pending.paymentStatus,'paid_in_person');assert.equal(pending.status,'processing');
 assert.equal((await commerceAdmin(orderAction(id,'cancel_in_person'))).status,409);
 assert.equal((await commerceAdmin(orderAction(id,'mark_paid'))).status,200);
 const record=await clientCommerceStore().get(commerceKey('shop','orders',id));assert.equal(record.paidAt,pending.paidAt);
 assert.equal((await getClientSite('shop')).catalog[0].inventory,1);
 assert.equal([...f.rows.values()].filter(row=>row.data.customerId&&row.data.appliedTransactions)[0].data.orderCount,1);
 assert.equal([...f.rows.keys()].filter(key=>key.includes('/v3/receipts/')).length,1);
});
test('a partial creation after reservation stays visible and can be canceled safely',async t=>{
 const f=fixture(t);await preparePayAtBusiness(f);
 const proto=Object.getPrototypeOf(clientCommerceStore()),write=proto.setJSON;let broken=true;
 t.mock.method(proto,'setJSON',async function(key,value,options){if(key.includes('/orders/')&&value.status==='confirmed'&&broken){broken=false;throw new Error('order projection failed')};return write.call(this,key,value,options)});
 const {default:createCheckout}=await import('../functions/create-client-checkout.mjs');
 assert.equal((await createCheckout(inPersonCheckoutRequest())).status,500);
 const orders=[...f.rows.values()].map(row=>row.data).filter(record=>record.source==='in_person_order');const id=orders[0].transactionId;
 assert.equal((await sale(saleRequest())).status,409);
 assert.equal((await commerceAdmin(orderAction(id,'cancel_in_person'))).status,200);
 assert.equal((await sale(saleRequest())).status,200);
});
test('a lost cancellation projection retries without restoring physical inventory',async t=>{
 const f=fixture(t);await preparePayAtBusiness(f);const id=await placeInPersonOrder();
 const proto=Object.getPrototypeOf(clientCommerceStore()),write=proto.setJSON;let broken=true;
 t.mock.method(proto,'setJSON',async function(key,value,options){if(key===commerceKey('shop','orders',id)&&value.status==='cancelled'&&broken){broken=false;throw new Error('cancel projection failed')};return write.call(this,key,value,options)});
 assert.equal((await commerceAdmin(orderAction(id,'cancel_in_person'))).status,500);
 assert.equal((await commerceAdmin(orderAction(id,'mark_paid'))).status,409);
 assert.equal((await commerceAdmin(orderAction(id,'cancel_in_person'))).status,200);
 assert.equal((await clientCommerceStore().get(commerceKey('shop','orders',id))).status,'cancelled');
 assert.equal((await getClientSite('shop')).catalog[0].inventory,1);
});
test('legacy unpaid orders without reservation proof require reconciliation instead of guessing a sale',async t=>{
 const f=fixture(t);await f.prepare();await clientCommerceStore().setJSON(commerceKey('shop','orders','legacy_due'),{siteId:'shop',transactionId:'legacy_due',kind:'order',paymentStatus:'due',status:'confirmed',items:[{id:'last-item',quantity:1}],amountTotal:100});
 assert.equal((await commerceAdmin(orderAction('legacy_due','mark_paid'))).status,409);
 assert.equal((await getClientSite('shop')).catalog[0].inventory,1);
});
test('order payment and cancellation preserve authentication, origin, role and location guards',async t=>{
 const f=fixture(t);await preparePayAtBusiness(f);const id=await placeInPersonOrder();
 assert.equal((await commerceAdmin(orderAction(id,'cancel_in_person','https://untrusted.invalid'))).status,403);
 globalThis.netlifyIdentityContext={user:null};assert.equal((await commerceAdmin(orderAction(id,'mark_paid'))).status,401);
 globalThis.netlifyIdentityContext={user:{email:'stranger@example.invalid',sub:'stranger',app_metadata:{}}};assert.equal((await commerceAdmin(orderAction(id,'cancel_in_person'))).status,403);
 globalThis.netlifyIdentityContext={user:{email:'owner@example.invalid',sub:'owner',app_metadata:{}}};
 const site=await getClientSite('shop');await clientSiteStore().setJSON('sites/shop.json',{...site,business:{locations:[{id:'other',active:true}]},members:[{email:'owner@example.invalid',role:'cashier',locationIds:['other']}]});
 assert.equal((await commerceAdmin(orderAction(id,'mark_paid'))).status,403);
 assert.equal(Object.values((await getClientSite('shop')).stockReservations)[0].state,'held');
});
test('simultaneous payment and cancellation cannot both succeed for one reserved order',async t=>{
 const f=fixture(t);await preparePayAtBusiness(f);const id=await placeInPersonOrder();
 const responses=await Promise.all([commerceAdmin(orderAction(id,'mark_paid')),commerceAdmin(orderAction(id,'cancel_in_person'))]);
 assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
 const record=await clientCommerceStore().get(commerceKey('shop','transactions',id));const site=await getClientSite('shop');
 const reservation=Object.values(site.stockReservations)[0];
 assert.equal(reservation.state,record.paymentStatus==='paid_in_person'?'consumed':'released');
 assert.equal(site.catalog[0].inventory,record.paymentStatus==='paid_in_person'?0:1);
});
test('a stock movement projection failure resumes after atomic consumption without another decrement',async t=>{
 const f=fixture(t,2);await preparePayAtBusiness(f);const id=await placeInPersonOrder();
 const proto=Object.getPrototypeOf(clientCommerceStore()),write=proto.setJSON;let broken=true;
 t.mock.method(proto,'setJSON',async function(key,value,options){if(key.includes('/v3/inventory-movements/')&&broken){broken=false;throw new Error('movement projection failed')};return write.call(this,key,value,options)});
 assert.equal((await commerceAdmin(orderAction(id,'mark_paid'))).status,500);
 assert.equal((await getClientSite('shop')).catalog[0].inventory,1);
 assert.equal((await commerceAdmin(orderAction(id,'mark_paid'))).status,200);
 assert.equal((await getClientSite('shop')).catalog[0].inventory,1);
 assert.equal([...f.rows.keys()].filter(key=>key.includes('/v3/inventory-movements/')).length,1);
});

async function healthForShop(options={}){
 const {inventoryHealth}=await import('./inventory-health.mjs');return inventoryHealth(await getClientSite('shop'),options);
}
test('inventory health flags old holds without releasing stock or altering their transactions',async t=>{
 const f=fixture(t);await prepareReservation(f);const site=await getClientSite('shop');
 Object.values(site.stockReservations)[0].createdAt=new Date(Date.now()-3*3600000).toISOString();await clientSiteStore().setJSON('sites/shop.json',site);
 const before=structuredClone([...f.rows.entries()]);const report=await healthForShop();
 assert.equal(report.heldCount,1);assert.equal(report.reviewCount,1);assert.ok(report.reservations[0].issues.includes('age_review'));
 assert.deepEqual([...f.rows.entries()],before);assert.equal((await sale(saleRequest())).status,409);
});
test('fresh reservations have no age warning while missing provider or transaction evidence is reported',async t=>{
 const f=fixture(t);await prepareReservation(f);assert.equal((await healthForShop()).reviewCount,0);
 let record=await clientCommerceStore().get(commerceKey('shop','transactions','txn_shop'));await clientCommerceStore().setJSON(commerceKey('shop','transactions','txn_shop'),{...record,stripeSessionId:''});
 assert.ok((await healthForShop()).reservations[0].issues.includes('provider_reference_missing'));
 await clientCommerceStore().delete(commerceKey('shop','transactions','txn_shop'));assert.ok((await healthForShop()).reservations[0].issues.includes('missing_transaction'));
});
test('health exposes mismatched products and invalid dates without pretending expiration is proven',async t=>{
 const f=fixture(t,2);await prepareReservation(f);const site=await getClientSite('shop');Object.values(site.stockReservations)[0].createdAt='bad-date';await clientSiteStore().setJSON('sites/shop.json',site);
 const record=await clientCommerceStore().get(commerceKey('shop','transactions','txn_shop'));await clientCommerceStore().setJSON(commerceKey('shop','transactions','txn_shop'),{...record,items:[{id:'last-item',quantity:2}],paymentStatus:'paid'});
 const report=await healthForShop();assert.equal(report.reservations[0].ageHours,null);assert.deepEqual(report.reservations[0].issues.sort(),['invalid_date','items_mismatch','payment_reconciliation'].sort());
 assert.equal(Object.values((await getClientSite('shop')).stockReservations)[0].state,'held');
});
test('health applies provider-specific review ages and retains both in-person and Terminal holds',async t=>{
 const f=fixture(t,2);await preparePayAtBusiness(f);const id=await placeInPersonOrder();await prepareTerminalReservation(f);
 // prepareTerminalReservation resets site; retain its hold and add one in-person order.
 const {reserveInventory}=await import('./inventory-reservations.mjs');
 const original=await clientCommerceStore().get(commerceKey('shop','transactions',id));await reserveInventory('shop',id,original.items,undefined,'in_person');
 const site=await getClientSite('shop');for(const row of Object.values(site.stockReservations))row.createdAt=new Date(Date.now()-3*3600000).toISOString();await clientSiteStore().setJSON('sites/shop.json',site);
 assert.equal((await healthForShop()).reviewCount,0);
 for(const row of Object.values(site.stockReservations))row.createdAt=new Date(Date.now()-25*3600000).toISOString();await clientSiteStore().setJSON('sites/shop.json',site);
 assert.equal((await healthForShop()).reviewCount,2);
 assert.ok(Object.values((await getClientSite('shop')).stockReservations).every(row=>row.state==='held'));
});
test('health refuses deadline or pointer-cap overruns rather than returning a partial clean report',async t=>{
 const f=fixture(t);await prepareReservation(f);let ticks=0;
 await assert.rejects(healthForShop({clock:()=>ticks+=100,budgetMs:50}),{status:503});
 await clientCommerceStore().setJSON(commerceKey('shop','pos-processing','unknown_one'),{transactionId:'unknown_one'});
 await clientCommerceStore().setJSON(commerceKey('shop','pos-processing','unknown_two'),{transactionId:'unknown_two'});
 await assert.rejects(healthForShop({maxPointers:1}),{status:503});
});
test('missing or malformed POS pointers remain for reconciliation and cannot be cleaned',async t=>{
 const f=fixture(t);await f.prepare();const store=clientCommerceStore();
 await store.setJSON(commerceKey('shop','pos-processing','unknown'),{transactionId:'unknown'});
 await store.setJSON(commerceKey('shop','pos-processing','mismatch'),{transactionId:'other'});
 const report=await healthForShop();assert.equal(report.pos.pointerCount,2);assert.equal(report.pos.cleanupEligibleCount,0);assert.equal(report.pos.reviewCount,2);
 const {cleanupCompletedPosPointer}=await import('./inventory-health.mjs');await assert.rejects(cleanupCompletedPosPointer('shop','unknown'),{status:409});
 assert.ok(await store.get(commerceKey('shop','pos-processing','unknown')));
});
test('only a completed proven POS pointer is removed while sale, stock marker, receipt and customer remain',async t=>{
 const f=fixture(t,2);await f.prepare();const response=await sale(saleRequest());assert.equal(response.status,200);const body=await response.json();const id=body.record.transactionId;
 await clientCommerceStore().setJSON(commerceKey('shop','pos-processing',id),{transactionId:id});
 const report=await healthForShop();assert.equal(report.pos.cleanupEligibleCount,1);
 const {cleanupCompletedPosPointer}=await import('./inventory-health.mjs');assert.equal((await cleanupCompletedPosPointer('shop',id)).removed,true);
 assert.equal((await cleanupCompletedPosPointer('shop',id)).alreadyAbsent,true);
 assert.equal((await getClientSite('shop')).catalog[0].inventory,1);
 assert.ok(await clientCommerceStore().get(commerceKey('shop','transactions',id)));assert.ok(await clientCommerceStore().get(`shop/v3/receipts/${body.receiptId}.json`));
 assert.equal(Object.keys((await getClientSite('shop')).stockOperations).length,1);
});
test('a completed POS transaction with an uncertain original attempt never loses its recovery pointer',async t=>{
 const f=fixture(t);await f.prepare();const payload={siteId:'shop',saleAttemptId:'health-attempt-123',items:[{id:'last-item',quantity:1}],paymentMethod:'cash'};
 const request=new Request('https://webfactorypr.com/.netlify/functions/client-pos-sale-idempotent',{method:'POST',headers:{Origin:'https://webfactorypr.com','Content-Type':'application/json'},body:JSON.stringify(payload)});
 const response=await idempotentSale(request);assert.equal(response.status,200);const {record}=await response.json(),id=record.transactionId;
 const store=clientCommerceStore();await store.setJSON(commerceKey('shop','pos-processing',id),{transactionId:id});
 assert.equal((await healthForShop()).pos.cleanupEligibleCount,1);
 const marker=await store.get(commerceKey('shop','pos-attempts',record.posAttemptId));await store.setJSON(commerceKey('shop','pos-attempts',record.posAttemptId),{...marker,status:'uncertain'});
 assert.equal((await healthForShop()).pos.cleanupEligibleCount,0);
 const {cleanupCompletedPosPointer}=await import('./inventory-health.mjs');await assert.rejects(cleanupCompletedPosPointer('shop',id),{status:409});
 assert.ok(await store.get(commerceKey('shop','pos-processing',id)));
});
test('journal snapshots verify persisted content and reuse the same copy without freeing active capacity',async t=>{
 const f=fixture(t);await prepareReservation(f);const before=await getClientSite('shop');const {snapshotInventoryJournal}=await import('./inventory-health.mjs');
 const first=await snapshotInventoryJournal('shop','owner@example.invalid'),again=await snapshotInventoryJournal('shop','owner@example.invalid');
 assert.equal(first.checksum,again.checksum);assert.equal(first.activeJournalUnchanged,true);assert.equal(first.reservationCount,1);
 assert.equal([...f.rows.keys()].filter(key=>key.includes('/inventory-journal-snapshots/')).length,1);assert.deepEqual(await getClientSite('shop'),before);
 const key=[...f.rows.keys()].find(key=>key.includes('/inventory-journal-snapshots/'));f.rows.get(key).data.payload.stockReservations={};
 await assert.rejects(snapshotInventoryJournal('shop','owner@example.invalid'),{status:503});assert.deepEqual(await getClientSite('shop'),before);
});
test('inventory maintenance endpoint enforces private caching, role, tenant, origin and bounded JSON',async t=>{
 const f=fixture(t);await prepareReservation(f);const {default:handler}=await import('../functions/client-inventory-health.mjs');
 const get=()=>new Request('https://webfactorypr.com/.netlify/functions/client-inventory-health?siteId=shop');
 const result=await handler(get());assert.equal(result.status,200);assert.equal(result.headers.get('Cache-Control'),'no-store');
 const post=(body,origin='https://webfactorypr.com')=>new Request('https://webfactorypr.com/.netlify/functions/client-inventory-health',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await handler(post({siteId:'shop',action:'snapshot_journal'},'https://untrusted.invalid'))).status,403);
 assert.equal((await handler(post({siteId:'shop',padding:'x'.repeat(9000)}))).status,413);
 assert.equal((await handler(post({siteId:'shop',action:'snapshot_journal'}))).status,200);
 globalThis.netlifyIdentityContext={user:{email:'foreign@example.invalid',app_metadata:{}}};assert.equal((await handler(get())).status,403);
 globalThis.netlifyIdentityContext={user:{email:'owner@example.invalid',app_metadata:{}}};const site=await getClientSite('shop');await clientSiteStore().setJSON('sites/shop.json',{...site,members:[{email:'owner@example.invalid',role:'cashier'}]});assert.equal((await handler(get())).status,403);
 globalThis.netlifyIdentityContext={user:null};assert.equal((await handler(get())).status,401);
});
test('changed receipt or original stock evidence blocks cleanup even after an eligible report',async t=>{
 const f=fixture(t);await f.prepare();const response=await sale(saleRequest());const {record}=await response.json(),id=record.transactionId;const store=clientCommerceStore();
 await store.setJSON(commerceKey('shop','pos-processing',id),{transactionId:id});assert.equal((await healthForShop()).pos.cleanupEligibleCount,1);
 const receiptKey=`shop/v3/receipts/${record.receiptId}.json`,receipt=await store.get(receiptKey);await store.setJSON(receiptKey,{...receipt,siteId:'foreign'});
 const {cleanupCompletedPosPointer}=await import('./inventory-health.mjs');await assert.rejects(cleanupCompletedPosPointer('shop',id),{status:409});
 await store.setJSON(receiptKey,receipt);const site=await getClientSite('shop');Object.values(site.stockOperations)[0].fingerprint='changed';await clientSiteStore().setJSON('sites/shop.json',site);
 await assert.rejects(cleanupCompletedPosPointer('shop',id),{status:409});assert.ok(await store.get(commerceKey('shop','pos-processing',id)));
});
test('a lost snapshot write response can retry the same verified copy without duplicating history',async t=>{
 const f=fixture(t);await prepareReservation(f);const proto=Object.getPrototypeOf(clientCommerceStore()),write=proto.setJSON;let broken=true;
 t.mock.method(proto,'setJSON',async function(key,value,options){const result=await write.call(this,key,value,options);if(key.includes('/inventory-journal-snapshots/')&&broken){broken=false;throw new Error('snapshot response lost')};return result});
 const {snapshotInventoryJournal}=await import('./inventory-health.mjs');await assert.rejects(snapshotInventoryJournal('shop','owner@example.invalid'));
 assert.equal((await snapshotInventoryJournal('shop','owner@example.invalid')).activeJournalUnchanged,true);
 assert.equal([...f.rows.keys()].filter(key=>key.includes('/inventory-journal-snapshots/')).length,1);
 assert.equal(Object.values((await getClientSite('shop')).stockReservations)[0].state,'held');
});
