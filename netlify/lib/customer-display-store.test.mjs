import test from 'node:test';
import assert from 'node:assert/strict';
import {scopedDisplayStore} from './customer-display-store.mjs';
import {mutateDisplay,displayKey} from './customer-display.mjs';
function memory(){const rows=new Map();let version=0;return {rows,get:async key=>structuredClone(rows.get(key)?.data||null),getWithMetadata:async key=>structuredClone(rows.get(key)||null),async setJSON(key,data,options={}){const old=rows.get(key);if(options.onlyIfNew&&old||options.onlyIfMatch&&old?.etag!==options.onlyIfMatch)return {modified:false};rows.set(key,{data:structuredClone(data),etag:String(++version)});return {modified:true}}};}
test('preview releases share pairing identity but never another deployment sale or customer snapshot',async()=>{
 const registry=memory(),commerceA=memory(),commerceB=memory(),a=scopedDisplayStore(commerceA,registry,'deploy-a'),b=scopedDisplayStore(commerceB,registry,'deploy-b'),id='a'.repeat(32);
 await mutateDisplay(a,id,()=>({id,siteId:'tenant',actor:'owner',deviceHash:'device-hash',persistent:true,sequence:5,updatedAt:100,draft:{customer:{name:'Private A'}},attemptId:'sale-a'}));
 let next=await b.get(displayKey(id));assert.equal(next.deviceHash,'device-hash');assert.equal(next.draft,null);assert.equal(next.attemptId,'');assert.equal(next.sequence,0);
 await mutateDisplay(b,id,current=>({...current,sequence:1,updatedAt:200,draft:{customer:{name:'Private B'}},attemptId:'sale-b'}));
 assert.equal((await a.get(displayKey(id))).draft.customer.name,'Private A');assert.equal((await b.get(displayKey(id))).draft.customer.name,'Private B');
 await b.setJSON('tenant/transactions/payment.json',{siteId:'tenant'});assert.equal(await a.get('tenant/transactions/payment.json'),null);assert.equal(registry.rows.has('tenant/transactions/payment.json'),false);
 await mutateDisplay(b,id,current=>({...current,revoked:true,deviceHash:null}));assert.equal((await a.get(displayKey(id))).revoked,true);
});
test('shared binding CAS rejects stale updates, retains both releases and bounds snapshot history',async()=>{
 const registry=memory(),commerce=memory(),id='b'.repeat(32),a=scopedDisplayStore(commerce,registry,'release-0');
 await mutateDisplay(a,id,()=>({id,actor:'owner',sequence:0,updatedAt:0,draft:null,attemptId:''}));
 const stale=await a.getWithMetadata(displayKey(id));
 for(let i=1;i<=8;i++)await mutateDisplay(scopedDisplayStore(commerce,registry,'release-'+i),id,current=>({...current,sequence:i,updatedAt:i,draft:{label:i}}));
 assert.equal((await a.setJSON(displayKey(id),stale.data,{onlyIfMatch:stale.etag})).modified,false);
 assert.equal(Object.keys((await registry.get(displayKey(id))).snapshots).length,4);
 assert.equal((await a.get(displayKey(id))).draft,null);
});
