import test from 'node:test';
import Stripe from 'stripe';
import assert from 'node:assert/strict';
import { reserveInventory,releaseInventory } from './inventory-reservations.mjs';
import { applyStockOperation } from './inventory-operations.mjs';
import { availableInventory,reservationId } from './inventory-availability.mjs';
import { createReservedStripeCheckout,checkoutParameters } from './reserved-stripe-checkout.mjs';
import { publicClientSite } from './client-store.mjs';

function memory(){const rows=new Map();let version=0;return {rows,async get(key){return structuredClone(rows.get(key)?.data??null)},async getWithMetadata(key){return structuredClone(rows.get(key)??null)},async delete(key){rows.delete(key)},async setJSON(key,data,options={}){const old=rows.get(key);if(options.onlyIfNew&&old||options.onlyIfMatch&&old?.etag!==options.onlyIfMatch)return {modified:false};rows.set(key,{data:structuredClone(data),etag:String(++version)});return {modified:true}}};}
async function fixture(inventory=1){const store=memory();await store.setJSON('sites/shop.json',{siteId:'shop',slug:'shop',revision:1,catalog:[{id:'p',type:'product',active:true,trackInventory:true,inventory}]});return store;}
const items=[{id:'p',quantity:1}];
const sale=referenceId=>({kind:'sale',referenceId,items,reservationRequired:true});
test('two simultaneous checkouts cannot both reserve the last unit',async()=>{
  const store=await fixture();const results=await Promise.allSettled([reserveInventory('shop','a',items,store),reserveInventory('shop','b',items,store)]);
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
  assert.equal(Object.values((await store.get('sites/shop.json')).stockReservations).length,1);
});
test('POS cannot consume another checkout reservation; its owner consumes it atomically once',async()=>{
  const store=await fixture();await reserveInventory('shop','owner',items,store);
  await assert.rejects(applyStockOperation('shop',{...sale('cash'),reservationRequired:false},store),{status:409});
  assert.equal((await store.get('sites/shop.json')).catalog[0].inventory,1);
  await applyStockOperation('shop',sale('owner'),store);await applyStockOperation('shop',sale('owner'),store);
  const site=await store.get('sites/shop.json');assert.equal(site.catalog[0].inventory,0);assert.equal(site.stockReservations[reservationId('owner')].state,'consumed');
  assert.equal(await releaseInventory('shop','owner',store),false);
});
test('elapsed time never releases a hold and public availability hides private reservation records',async()=>{
  const store=await fixture(3);await reserveInventory('shop','old',items,store);
  const site=await store.get('sites/shop.json');site.stockReservations[reservationId('old')].createdAt='2000-01-01T00:00:00.000Z';
  assert.equal(availableInventory(site,site.catalog[0]),2);
  const publicSite=publicClientSite(site);assert.equal(publicSite.catalog[0].inventory,2);assert.equal(publicSite.stockReservations,undefined);
});
test('verified release is repeatable; a late sale cannot consume a released reservation',async()=>{
  const store=await fixture();await reserveInventory('shop','a',items,store);assert.equal(await releaseInventory('shop','a',store),true);assert.equal(await releaseInventory('shop','a',store),false);
  await assert.rejects(applyStockOperation('shop',sale('a'),store),{status:409});await reserveInventory('shop','b',items,store);
  assert.equal((await store.get('sites/shop.json')).catalog[0].inventory,1);
});
test('changed reservation items and a missing required reservation fail closed',async()=>{
  const store=await fixture(3);await reserveInventory('shop','a',items,store);
  await assert.rejects(reserveInventory('shop','a',[{id:'p',quantity:2}],store),{status:409});await assert.rejects(applyStockOperation('shop',sale('missing'),store),{status:409});
});
test('reservation commit with a lost response reuses the same hold',async()=>{
  const store=await fixture(3),write=store.setJSON;let lost=true;
  store.setJSON=async(key,data,options)=>{const result=await write(key,data,options);if(data.stockReservations&&lost){lost=false;throw new Error('lost response')};return result};
  await assert.rejects(reserveInventory('shop','a',items,store));await reserveInventory('shop','a',items,store);
  assert.equal(availableInventory(await store.get('sites/shop.json'),{id:'p',type:'product',trackInventory:true,inventory:3}),2);
});
test('Stripe parameters retain nested line items and metadata',()=>{
  assert.deepEqual(checkoutParameters(new URLSearchParams({'mode':'payment','line_items[0][quantity]':'1','line_items[0][price_data][unit_amount]':'100','metadata[site_id]':'shop'})),{mode:'payment',line_items:[{quantity:'1',price_data:{unit_amount:'100'}}],metadata:{site_id:'shop'}});
});
function context(t){const previous=globalThis.Netlify;globalThis.Netlify={env:{get:name=>name==='STRIPE_SECRET_KEY'?'sk_test_fixture':''}};t.after(()=>{if(previous===undefined)delete globalThis.Netlify;else globalThis.Netlify=previous});}
function record(){return {siteId:'shop',transactionId:'txn_a',kind:'order',stripeAccountId:'acct_shop',paymentStatus:'pending',items,customer:{email:'fixture@example.com'},amountTotal:100,createdAt:new Date().toISOString()};}
const params=()=>new URLSearchParams({mode:'payment','metadata[site_id]':'shop','metadata[transaction_id]':'txn_a'});
test('checkout holds stock before contacting Stripe and reuses an existing result',async t=>{
  context(t);
  const stock=await fixture(),commerce=memory();let calls=0;
  const client={checkout:{sessions:{create:async input=>{calls++;const site=await stock.get('sites/shop.json');assert.equal(availableInventory(site,site.catalog[0]),0);return {id:'cs_a',url:'https://checkout.stripe.com/a',expires_at:Number(input.expires_at)};}}}};
  const options={requestUrl:'https://deploy-preview-57--webfactorypr.netlify.app',store:commerce,client,reserve:(site,id,lines)=>reserveInventory(site,id,lines,stock)};
  await createReservedStripeCheckout({siteId:'shop'},record(),params(),options);await createReservedStripeCheckout({siteId:'shop'},record(),params(),options);assert.equal(calls,1);
  await assert.rejects(createReservedStripeCheckout({siteId:'shop'},{...record(),amountTotal:200},params(),options),{status:409});
});
test('uncertain Stripe response retains stock and retries identical persisted parameters and key',async t=>{
  context(t);
  const stock=await fixture(),commerce=memory(),seen=[];
  const client={checkout:{sessions:{create:async(input,options)=>{seen.push({input,options});if(seen.length===1)throw new Error('connection lost after session creation');return {id:'cs_a',url:'https://checkout.stripe.com/a',expires_at:Number(input.expires_at)};}}}};
  const options={requestUrl:'https://deploy-preview-57--webfactorypr.netlify.app',store:commerce,client,reserve:(site,id,lines)=>reserveInventory(site,id,lines,stock)};
  await assert.rejects(createReservedStripeCheckout({siteId:'shop'},record(),params(),options));assert.equal((await stock.get('sites/shop.json')).stockReservations[reservationId('txn_a')].state,'held');
  await createReservedStripeCheckout({siteId:'shop'},record(),params(),options);assert.deepEqual(seen[0],seen[1]);
});
test('insufficient stock prevents all Stripe calls',async t=>{
  context(t);
  const stock=await fixture(0),commerce=memory();let called=false;
  const client={checkout:{sessions:{create:async()=>{called=true;}}}};
  await assert.rejects(createReservedStripeCheckout({siteId:'shop'},record(),params(),{requestUrl:'https://deploy-preview-57--webfactorypr.netlify.app',store:commerce,client,reserve:(site,id,lines)=>reserveInventory(site,id,lines,stock)}),{status:409});assert.equal(called,false);
});

test('real Stripe SDK serializes checkout quantities, metadata, account and idempotency key without a live request',async t=>{
 context(t);const stock=await fixture(),commerce=memory();let called=false;
 const client=new Stripe('sk_test_fixture',{apiVersion:'2026-08-26.dahlia',maxNetworkRetries:0,httpClient:Stripe.createFetchHttpClient(async(url,options)=>{
  called=true;assert.equal(String(url).endsWith('/v1/checkout/sessions'),true);
  const body=new URLSearchParams(options.body),headers=new Headers(options.headers);
  assert.equal(body.get('line_items[0][quantity]'),'1');assert.equal(body.get('line_items[0][price_data][unit_amount]'),'100');assert.equal(body.get('metadata[site_id]'),'shop');
  assert.equal(headers.get('stripe-account'),'acct_shop');assert.equal(headers.get('idempotency-key'),'reserved-checkout-shop-txn_a');
  return new Response(JSON.stringify({id:'cs_sdk',url:'https://checkout.stripe.com/sdk',expires_at:Number(body.get('expires_at'))}),{status:200,headers:{'Content-Type':'application/json'}});
 })});
 const input=params();input.set('line_items[0][quantity]','1');input.set('line_items[0][price_data][unit_amount]','100');
 const result=await createReservedStripeCheckout({siteId:'shop'},record(),input,{requestUrl:'https://deploy-preview-57--webfactorypr.netlify.app',store:commerce,client,reserve:(site,id,lines)=>reserveInventory(site,id,lines,stock)});
 assert.equal(called,true);assert.equal(result.stripeSessionId,'cs_sdk');
});
