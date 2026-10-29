import {test} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {createDashboardAppearanceHandler} from '../functions/dashboard-appearance.mjs';
import {normalizeAppearance} from '../../shared/dashboard-appearance.mjs';
const hash=x=>'"'+crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex')+'"';
function fixture(){
 let id='user-a',denied=false,admin=false;const records=new Map(),versions=new Map();let writes=0;
 const storage={get:async key=>structuredClone(records.get(key)||null),getWithMetadata:async key=>records.has(key)?{data:structuredClone(records.get(key)),etag:String(versions.get(key))}:null,getMetadata:async key=>records.has(key)?{etag:String(versions.get(key))}:null,setJSON:async(key,value,options)=>{if(options.onlyIfNew&&records.has(key)||options.onlyIfMatch&&options.onlyIfMatch!==String(versions.get(key)))return {modified:false};records.set(key,structuredClone(value));versions.set(key,(versions.get(key)||0)+1);writes++;return {modified:true}}};
 const handler=createDashboardAppearanceHandler({store:()=>storage,siteAccess:async siteId=>{if(denied||siteId==='other')throw Object.assign(Error('Forbidden'),{status:403});return {user:{id}}},platformAccess:async()=>{if(!admin)throw Object.assign(Error('Forbidden'),{status:403});return {id}}});
 const req=(method='GET',body,tag=hash({}),query='?siteId=site-a',origin='https://preview.example')=>new Request('https://preview.example/.netlify/functions/dashboard-appearance'+query,{method,headers:{Origin:origin,'Content-Type':Buffer.isBuffer(body)?'image/png':'application/json','If-Match':tag},...(body!==undefined?{body:Buffer.isBuffer(body)?body:JSON.stringify(body)}:{})});
 return {handler,req,records,get writes(){return writes},setId:v=>id=v,deny:()=>denied=true,makeAdmin:()=>admin=true};
}
test('preferences are private, scoped by authenticated user and business',async()=>{const f=fixture();let r=await f.handler(f.req('PUT',{background:'waves'}));assert.equal(r.status,200);assert.equal((await r.json()).prefs.background,'waves');assert.match(r.headers.get('cache-control'),/private, no-store/);f.setId('user-b');r=await f.handler(f.req());assert.equal((await r.json()).prefs.background,'room');assert.equal(f.writes,1);r=await f.handler(f.req('GET',undefined,undefined,'?siteId=other'));assert.equal(r.status,403)});
test('writes require same origin and current ETag; stale device cannot overwrite',async()=>{const f=fixture();assert.equal((await f.handler(f.req('PUT',{},undefined,undefined,'https://attacker.invalid'))).status,403);const r=await f.handler(f.req('PUT',{background:'waves'}));assert.equal(r.status,200);assert.equal((await f.handler(f.req('PUT',{background:'room'}))).status,409);assert.equal(f.writes,1)});
test('revoked membership denies preferences AND private image',async()=>{const f=fixture();f.deny();for(const query of ['?siteId=site-a','?siteId=site-a&asset=1'])assert.equal((await f.handler(f.req('GET',undefined,undefined,query))).status,403);assert.equal(f.writes,0)});
test('platform personalization requires existing platform authorization',async()=>{const f=fixture();assert.equal((await f.handler(f.req('GET',undefined,undefined,''))).status,403);f.makeAdmin();assert.equal((await f.handler(f.req('GET',undefined,undefined,''))).status,200)});
test('remote URLs, unsafe accent and extreme transparency never enter CSS prefs',()=>{assert.deepEqual(normalizeAppearance({background:'https://tracker.invalid/x',alpha:0,dim:-1,blur:900,motion:NaN,accent:'url(secret)'}),{background:'room',alpha:.66,dim:.25,blur:40,motion:1,accent:'#6aa8ff',cardDepth:'soft',buttonDepth:'soft',liquidGlass:true})});
test('custom image is reencoded, private, stripped from settings JSON, replaceable and deletable',async()=>{const f=fixture();const bytes=await sharp({create:{width:4,height:4,channels:3,background:'#89abcd'}}).png().toBuffer();let r=await f.handler(f.req('POST',bytes));assert.equal(r.status,200);let data=await r.json();assert.equal(data.prefs.background,'custom');assert.equal(data.hasCustom,true);assert.equal(data.image,undefined);let tag=r.headers.get('etag');r=await f.handler(f.req('GET',undefined,undefined,'?siteId=site-a&asset=1'));assert.equal(r.headers.get('content-type'),'image/webp');assert.equal((await sharp(Buffer.from(await r.arrayBuffer())).metadata()).format,'webp');r=await f.handler(f.req('PUT',{background:'landscape'},tag));assert.equal(r.status,200);tag=r.headers.get('etag');r=await f.handler(f.req('DELETE',undefined,tag));assert.equal((await r.json()).hasCustom,false);assert.equal((await f.handler(f.req('GET',undefined,undefined,'?siteId=site-a&asset=1'))).status,404)});
test('corrupt raster and active SVG cannot be uploaded',async()=>{const f=fixture();assert.equal((await f.handler(f.req('POST',Buffer.from('<svg onload="alert(1)"/>')))).status,400);assert.equal(f.writes,0)});
test('upload size and JSON settings are bounded',async()=>{const f=fixture();assert.equal((await f.handler(f.req('POST',Buffer.alloc(4*1024*1024+1)))).status,413);assert.equal((await f.handler(f.req('PUT',{x:'x'.repeat(4000)}))).status,413);assert.equal((await f.handler(f.req('PUT',[]))).status,400);assert.equal((await f.handler(f.req('PUT',{background:'custom'}))).status,400);assert.equal(f.writes,0)});

 test('cashier depth preferences round-trip without allowing executable styles',async()=>{const f=fixture();const r=await f.handler(f.req('PUT',{cardDepth:'raised',buttonDepth:'flat'}));assert.equal(r.status,200);const saved=await r.json();assert.equal(saved.prefs.cardDepth,'raised');assert.equal(saved.prefs.buttonDepth,'flat');assert.equal(normalizeAppearance({cardDepth:'url(secret)',buttonDepth:'script'}).cardDepth,'soft')});

test('application version survives rewritten or missing HTTP ETags and still rejects stale saves',async()=>{
 const f=fixture();const loaded=await (await f.handler(f.req())).json();assert.match(loaded.version,/^[a-f0-9]{64}$/);
 const request=(method,version,body)=>{const req=f.req(method,body);req.headers.delete('if-match');if(version!==undefined)req.headers.set('x-appearance-version',version);return req};
 let response=await f.handler(request('PUT',loaded.version,{background:'waves'}));assert.equal(response.status,200);const saved=await response.json();assert.notEqual(saved.version,loaded.version);
 assert.equal((await f.handler(request('PUT',loaded.version,{background:'room'}))).status,409);
 assert.equal((await f.handler(request('PUT',undefined,{background:'room'}))).status,409);
 response=await f.handler(request('DELETE',saved.version));assert.equal(response.status,200);assert.equal((await response.json()).prefs.background,'room');assert.equal(f.writes,2);
});

test('concurrent storage changes between snapshot and write cannot be overwritten',async()=>{
 let record={prefs:{background:'waves'},revision:1},storageVersion='one';let writes=0;
 const handler=createDashboardAppearanceHandler({siteAccess:async()=>({user:{id:'qa'}}),store:()=>({
  getWithMetadata:async()=>({data:structuredClone(record),etag:storageVersion}),
  setJSON:async(_key,_value,options)=>{record={prefs:{background:'landscape'},revision:2};storageVersion='two';if(options.onlyIfMatch!==storageVersion)return {modified:false};writes++;return {modified:true}}
 })});
 const response=await handler(new Request('https://preview.example/.netlify/functions/dashboard-appearance?siteId=qa',{method:'PUT',headers:{origin:'https://preview.example','content-type':'application/json','x-appearance-version':hash(record).slice(1,-1)},body:JSON.stringify({background:'room'})}));
 assert.equal(response.status,409);assert.equal(record.prefs.background,'landscape');assert.equal(writes,0);
});

test('liquid glass is opt-out and rejects non-boolean settings',()=>{assert.equal(normalizeAppearance().liquidGlass,true);assert.equal(normalizeAppearance({liquidGlass:false}).liquidGlass,false);assert.equal(normalizeAppearance({liquidGlass:'false'}).liquidGlass,true)});
