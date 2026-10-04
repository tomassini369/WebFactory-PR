import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccountingHandler,loadAccountingTransactions} from '../functions/client-business-accounting.mjs';
const origin='https://example.com';
const site={siteId:'a',employees:[{id:'e',name:'Ana'}]};
const request=(payload,requestOrigin=origin)=>new Request(origin+'/?siteId=a',{method:'POST',headers:{origin:requestOrigin,'Content-Type':'application/json'},body:JSON.stringify(payload)});
test('HTTP boundary rejects foreign origins before storage and requires owner for reads and writes',async()=>{
 let calls=0;const handler=createAccountingHandler({authorize:async(id,roles)=>{calls++;assert.deepEqual(roles,['owner']);throw Object.assign(new Error('Forbidden'),{status:403})},getStore:()=>{throw new Error('Storage must not be reached')}});
 assert.equal((await handler(request({siteId:'a'},'https://foreign.test'))).status,403);assert.equal(calls,0);
 assert.equal((await handler(new Request(origin+'/?siteId=a'))).status,403);assert.equal(calls,1);
 assert.equal((await handler(request({siteId:'a'}))).status,403);assert.equal(calls,2);
});
test('Concurrent save failure is a 409, and writes use private tenant key and conditional creation',async()=>{
 const store={getWithMetadata:async()=>null,setJSON:async(key,value,options)=>{assert.equal(key,'a/accounting/ledger.json');assert.equal(value.siteId,'a');assert.deepEqual(options,{onlyIfNew:true});return {modified:false}}};
 const handler=createAccountingHandler({authorize:async()=>({site,user:{email:'owner'}}),getStore:()=>store});
 const response=await handler(request({siteId:'a',id:'request-123',revision:0,type:'rate',date:'2026-10-01',employeeId:'e',hourlyCents:1200}));assert.equal(response.status,409);
});
test('Transaction reader consumes every page and refuses cross-tenant records',async()=>{
 const store={list:async function*({prefix}){yield {blobs:[{key:prefix+'1'}]};yield {blobs:[{key:prefix+'2'}]}},get:async key=>({siteId:'a',transactionId:key})};
 assert.equal((await loadAccountingTransactions(store,'a')).length,4);
 store.get=async()=>({siteId:'b'});await assert.rejects(loadAccountingTransactions(store,'a'),{status:409});
});
