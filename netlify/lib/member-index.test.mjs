import test from 'node:test';
import assert from 'node:assert/strict';
import {currentIndexedSites,repairMemberIndex,memberIndexKey} from './member-index.mjs';
function fixture(){
 const data=new Map(),etags=new Map();
 const store={get:async key=>structuredClone(data.get(key)||null),getWithMetadata:async key=>data.has(key)?{data:structuredClone(data.get(key)),etag:String(etags.get(key)||1)}:null,list:async function*({prefix}){for(const key of data.keys())if(key.startsWith(prefix))yield{blobs:[{key}]};},setJSON:async(key,value,options)=>{
  if(options.onlyIfNew&&data.has(key)||options.onlyIfMatch&&options.onlyIfMatch!==String(etags.get(key)||1))return{modified:false};
  data.set(key,structuredClone(value));etags.set(key,(etags.get(key)||1)+1);return{modified:true};
 }};return{data,store};
}
test('stale and paginated indexes never expose revoked, suspended, deleted or foreign businesses',async()=>{
 const {data,store}=fixture();const email='accountant@example.com';
 for(const id of ['a','b','c','d','e'])data.set(memberIndexKey(email,id),{email,siteId:id});
 data.set('sites/a.json',{siteId:'a',members:[{email,role:'accountant'}]});
 data.set('sites/b.json',{siteId:'b',members:[]});
 data.set('sites/c.json',{siteId:'c',members:[{email,role:'accountant',suspendedAt:'now'}]});
 data.set('sites/d.json',{siteId:'d',status:'deleted',members:[{email,role:'accountant'}]});
 data.set('sites/e.json',{siteId:'e',members:[{email:'other@example.com',role:'owner'}]});
 assert.deepEqual((await currentIndexedSites(store,email.toUpperCase())).map(s=>s.siteId),['a']);
});
test('revocation writes a versioned tombstone and regrant restores the same projection',async()=>{
 const {data,store}=fixture(),email='a@example.com',key=memberIndexKey(email,'a');
 data.set('sites/a.json',{siteId:'a',revision:2,members:[]});data.set(key,{email,siteId:'a',revision:1});
 await repairMemberIndex(store,'a',email);assert.equal(data.get(key).active,false);
 data.set('sites/a.json',{siteId:'a',revision:3,members:[{email,role:'accountant'}]});
 await repairMemberIndex(store,'a',email);assert.equal(data.get(key).active,true);assert.equal(data.get(key).revision,3);
});
test('lost CAS retry rereads canonical membership rather than deleting a concurrent regrant',async()=>{
 const {data,store}=fixture(),email='a@example.com',key=memberIndexKey(email,'a');
 data.set('sites/a.json',{siteId:'a',revision:2,members:[]});let calls=0;const write=store.setJSON;
 store.setJSON=async(...args)=>{if(!calls++){data.set('sites/a.json',{siteId:'a',revision:3,members:[{email,role:'accountant'}]});return{modified:false};}return write(...args)};
 await repairMemberIndex(store,'a',email);assert.equal(data.get(key).active,true);assert.equal(data.get(key).revision,3);
});
