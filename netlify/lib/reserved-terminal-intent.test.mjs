import test from 'node:test';
import assert from 'node:assert/strict';
import { createReservedTerminalIntent } from './reserved-terminal-intent.mjs';
import { reserveInventory } from './inventory-reservations.mjs';
import { availableInventory } from './inventory-availability.mjs';

function memory(){const rows=new Map();let version=0;return {rows,async get(key){return structuredClone(rows.get(key)?.data??null)},async getWithMetadata(key){return structuredClone(rows.get(key)??null)},async delete(key){rows.delete(key)},async setJSON(key,data,options={}){const old=rows.get(key);if(options.onlyIfNew&&old||options.onlyIfMatch&&old?.etag!==options.onlyIfMatch)return {modified:false};rows.set(key,{data:structuredClone(data),etag:String(++version)});return {modified:true}}};}
function context(t){globalThis.Netlify={env:{get:name=>name==='STRIPE_SECRET_KEY'?'sk_test_fixture':''}};t.after(()=>delete globalThis.Netlify);}
const record=()=>({siteId:'shop',transactionId:'txn_terminal_a',kind:'order',source:'tap_to_pay',stripeAccountId:'acct_shop',paymentStatus:'pending',items:[{id:'p',quantity:1}],customer:{},amountTotal:100,currency:'usd',createdAt:new Date().toISOString()});
async function fixture(t,inventory=1){context(t);const stock=memory(),store=memory();await stock.setJSON('sites/shop.json',{siteId:'shop',catalog:[{id:'p',type:'product',trackInventory:true,inventory}],revision:1});return {stock,store,options:{requestUrl:'https://deploy-preview-57--webfactorypr.netlify.app',store,reserve:(site,id,items,ignored,provider)=>reserveInventory(site,id,items,stock,provider)}};}
const intent=()=>({id:'pi_terminal',client_secret:'pi_fixture_secret_private',status:'requires_payment_method',amount:100,currency:'usd',metadata:{site_id:'shop',transaction_id:'txn_terminal_a'}});
test('Terminal reserves stock before the provider call and never stores its client secret',async t=>{
 const f=await fixture(t);let calls=0;const client={paymentIntents:{create:async params=>{calls++;const site=await f.stock.get('sites/shop.json');assert.equal(availableInventory(site,site.catalog[0]),0);assert.deepEqual(params.payment_method_types,['card_present']);return intent();},retrieve:async()=>intent()}};
 const result=await createReservedTerminalIntent(record(),{...f.options,client});assert.equal(result.intent.client_secret,intent().client_secret);
 await createReservedTerminalIntent(record(),{...f.options,client});assert.equal(calls,1);assert.equal(JSON.stringify([...f.store.rows.values()]).includes(intent().client_secret),false);
 assert.equal(Object.values((await f.stock.get('sites/shop.json')).stockReservations)[0].provider,'stripe_terminal');
});
test('an uncertain Terminal creation retains stock and retries the same parameters and idempotency key',async t=>{
 const f=await fixture(t),calls=[];const client={paymentIntents:{create:async(params,options)=>{calls.push({params,options});if(calls.length===1)throw new Error('response lost after intent creation');return intent();}}};
 await assert.rejects(createReservedTerminalIntent(record(),{...f.options,client}));assert.equal(Object.values((await f.stock.get('sites/shop.json')).stockReservations)[0].state,'held');
 await createReservedTerminalIntent(record(),{...f.options,client});assert.deepEqual(calls[0],calls[1]);
});
test('Terminal shortage never contacts Stripe and changed payment details cannot reuse an attempt',async t=>{
 const empty=await fixture(t,0);let contacted=false;const client={paymentIntents:{create:async()=>{contacted=true;return intent();}}};
 await assert.rejects(createReservedTerminalIntent(record(),{...empty.options,client}),{status:409});assert.equal(contacted,false);
 const f=await fixture(t);await createReservedTerminalIntent(record(),{...f.options,client});
 await assert.rejects(createReservedTerminalIntent({...record(),tip:100,discounts:100},{...f.options,client}),{status:409});
 await assert.rejects(createReservedTerminalIntent({...record(),stripeAccountId:'acct_other'},{...f.options,client}),{status:409});
});
test('known completed or canceled Terminal intents cannot reopen an attempt',async t=>{
 const f=await fixture(t);const client={paymentIntents:{create:async()=>intent(),retrieve:async()=>({...intent(),status:'canceled'})}};
 await createReservedTerminalIntent(record(),{...f.options,client});await assert.rejects(createReservedTerminalIntent(record(),{...f.options,client}),{status:409});
});
