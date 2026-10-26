import test from 'node:test';import assert from 'node:assert/strict';
globalThis.Netlify ||= {};
import {cancelPendingCheckout} from './cancel-pending-checkout.mjs';
function fixture(){const rows=new Map(),store={get:async k=>structuredClone(rows.get(k)),setJSON:async(k,v,o={})=>{if(o.onlyIfNew&&rows.has(k))return {modified:false};rows.set(k,structuredClone(v));return {modified:true}},delete:async k=>rows.delete(k)};const row={siteId:'a',transactionId:'txn',kind:'order',paymentStatus:'pending',stripeSessionId:'cs_test',stripeAccountId:'acct_test',amountTotal:100,inventoryReservationRequired:true};rows.set('a/transactions/txn.json',row);let released=0,expired=0;const session={id:'cs_test',metadata:{site_id:'a',transaction_id:'txn'},amount_total:100,payment_status:'unpaid',status:'open'};const options={store,requestUrl:'https://deploy-preview-125--webfactorypr.netlify.app',authorize:()=>{},release:async()=>released++,client:{checkout:{sessions:{retrieve:async()=>session,expire:async()=>{expired++;return {...session,status:'expired'}}}}}};return {rows,row,session,options,counts:()=>[released,expired]}}
test('cancel validates provider, releases once, and retry is idempotent',async t=>{
 t.mock.property(globalThis,'Netlify',{env:{get:k=>k==='STRIPE_SECRET_KEY'?'sk_test_fixture':k==='CONTEXT'?'deploy-preview':''}});
 const f=fixture();await cancelPendingCheckout({siteId:'a'},'txn',f.options);await cancelPendingCheckout({siteId:'a'},'txn',f.options);assert.deepEqual(f.counts(),[1,1]);assert.equal(f.rows.get('a/orders/txn.json').status,'cancelled');
});
test('paid, mismatched, and processing sessions never release inventory',async t=>{
 t.mock.property(globalThis,'Netlify',{env:{get:k=>k==='STRIPE_SECRET_KEY'?'sk_test_fixture':k==='CONTEXT'?'deploy-preview':''}});
 for(const patch of [{payment_status:'paid'},{status:'complete'},{amount_total:200},{metadata:{site_id:'other',transaction_id:'txn'}}]){const f=fixture();Object.assign(f.session,patch);await assert.rejects(cancelPendingCheckout({siteId:'a'},'txn',f.options));assert.deepEqual(f.counts(),[0,0])}
});
test('authorization and tenant scope precede provider access',async()=>{const f=fixture();await assert.rejects(cancelPendingCheckout({siteId:'b'},'txn',f.options),{status:404});await assert.rejects(cancelPendingCheckout({siteId:'a'},'txn',{...f.options,authorize:()=>{throw Object.assign(Error('Forbidden'),{status:403})}}),{status:403});assert.deepEqual(f.counts(),[0,0])});
