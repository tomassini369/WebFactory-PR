import test from 'node:test';import assert from 'node:assert/strict';
import {erpBinding,createErpConnector,settledSaleEvent,erpEventHash,ERP_BRIDGE_PROTOCOL} from './erp-connector.mjs';
import {enqueueErpEvent,deliverErpEvent,erpOutboxKey} from './erp-outbox.mjs';
const binding={siteId:'a',origin:'https://erp.example.com',company:'Tenant A',apiKey:'test-key',apiSecret:'test-secret'};
const event=settledSaleEvent({siteId:'a',transactionId:'test-sale',paidAt:'2026-10-20T12:00:00Z',paymentStatus:'paid_in_person',amountTotal:2500,tax:100,tip:200},'a');
test('connector binds tenants server-side, requires HTTPS/allowlist and suppresses provider secrets',async()=>{
 const env=name=>name==='WEBFACTORY_ERP_BINDINGS_JSON'?JSON.stringify({a:binding}):'https://erp.example.com';
 assert.equal(erpBinding('a',env).company,'Tenant A');assert.equal(erpBinding('other',env),null);
 assert.throws(()=>erpBinding('a',name=>name==='WEBFACTORY_ERP_BINDINGS_JSON'?JSON.stringify({a:{...binding,origin:'http://localhost'}}):'http://localhost'),{code:'ERP_CONFIGURATION_INVALID'});
 const bad=createErpConnector(binding,{fetcher:async()=>new Response('private provider secret',{status:403})});await assert.rejects(bad.health(),error=>error.code==='ERP_AUTHORIZATION_FAILED'&&!error.message.includes('secret'));
 const crossed=createErpConnector(binding,{fetcher:async()=>Response.json({message:{siteId:'other',company:binding.company,protocol:ERP_BRIDGE_PROTOCOL}})});await assert.rejects(crossed.health(),{code:'ERP_BINDING_MISMATCH'});
 const health=createErpConnector(binding,{fetcher:async()=>Response.json({message:{siteId:'a',company:binding.company,protocol:ERP_BRIDGE_PROTOCOL,draftJournal:true,apiSecret:'never return provider extras'}})});assert.equal(JSON.stringify(await health.health()).includes('never return'),false);
});
test('source adapter uses settled server records without customers, PINs, unpaid charges or invented refund splits',()=>{
 assert.equal(event.revenueCents,2200);assert.equal(JSON.stringify(event).includes('customer'),false);
 assert.equal(settledSaleEvent({siteId:'a',paymentStatus:'due'},'a'),null);
 assert.throws(()=>settledSaleEvent({siteId:'b'},'a'),{status:403});
 assert.throws(()=>settledSaleEvent({siteId:'a',paymentStatus:'refunded',refundedAmount:100},'a'),{code:'ERP_SOURCE_REQUIRES_RECONCILIATION'});
 assert.throws(()=>settledSaleEvent({siteId:'a',transactionId:'x',paidAt:'now',paymentStatus:'paid',amountTotal:1,tax:2},'a'),{status:409});
});
function storeFixture(){let data,etag=0;return{get:async()=>data?structuredClone(data):null,getWithMetadata:async()=>data?{data:structuredClone(data),etag:String(etag)}:null,setJSON:async(key,value,options)=>{if(options.onlyIfNew&&data||options.onlyIfMatch&&options.onlyIfMatch!==String(etag))return{modified:false};data=structuredClone(value);etag++;return{modified:true}}};}
test('durable queue uses CAS claims, immutable fingerprints and safe remote retry after lost response',async()=>{
 const store=storeFixture(),key=erpOutboxKey(event);await enqueueErpEvent(store,event,1);assert.equal((await enqueueErpEvent(store,event,1)).attempts,0);
 await assert.rejects(enqueueErpEvent(store,{...event,totalCents:9999},1),{status:409});
 let calls=0;const receipt={siteId:'a',externalId:event.externalId,payloadHash:erpEventHash(event),documentType:'Journal Entry',documentName:'TEST-ONLY',status:'draft'};
 const connector={ingest:async()=>{if(!calls++)throw Error('secret network payload');return receipt}};
 const first=await deliverErpEvent(store,key,'a',connector,2);assert.equal(first.state,'pending');assert.equal(first.lastError,'ERP_DELIVERY_UNCONFIRMED');
 const results=await Promise.allSettled([deliverErpEvent(store,key,'a',connector,first.nextAttemptAt),deliverErpEvent(store,key,'a',connector,first.nextAttemptAt)]);
 assert.equal(calls,2);assert.equal((await store.get()).state,'confirmed');assert.ok(results.some(result=>result.status==='fulfilled'));
 await assert.rejects(deliverErpEvent(store,key,'other',connector,999999),{status:403});
});
