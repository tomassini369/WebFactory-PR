import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {z} from 'zod';
import {getStore} from '@netlify/blobs';
import {clientSiteStore,clientOAuthStore,getClientSite} from './client-store.mjs';
import {key} from './chatgpt-oauth.mjs';
import {prepareImageUpload,receiveImageUpload,finalizeImageUpload,imageUploadStatus} from './chatgpt-assets.mjs';
import {serveMcp} from './chatgpt-mcp.mjs';

async function fixture(t){
 globalThis.netlifyBlobsContext=Buffer.from(JSON.stringify({siteID:'test',token:'test',deployID:'test'})).toString('base64');globalThis.Netlify={env:{get:()=>''}};
 t.after(()=>{delete globalThis.netlifyBlobsContext;delete globalThis.Netlify});
 const rows=new Map(),proto=Object.getPrototypeOf(getStore('test'));let revision=0;
 t.mock.method(proto,'get',async function(k,{type}={}){const v=rows.get(this.name+'/'+k)?.data;return v===undefined?null:type==='arrayBuffer'?v:structuredClone(v)});
 t.mock.method(proto,'getWithMetadata',async function(k){return structuredClone(rows.get(this.name+'/'+k)||null)});
 t.mock.method(proto,'getMetadata',async function(k){const v=rows.get(this.name+'/'+k);return v?{metadata:v.metadata}:null});
 t.mock.method(proto,'setJSON',async function(k,data,o={}){const id=this.name+'/'+k,old=rows.get(id);if(o.onlyIfNew&&old||o.onlyIfMatch&&old?.etag!==o.onlyIfMatch)return {modified:false};rows.set(id,{data:structuredClone(data),etag:String(++revision)});return {modified:true}});
 t.mock.method(proto,'set',async function(k,data,{metadata}={}){rows.set(this.name+'/'+k,{data,metadata,etag:String(++revision)});return {modified:true}});
 const user={id:'owner',email:'owner@example.invalid'},site={siteId:'tenant-a',slug:'old-link',revision:1,status:'active',business:{name:'Shop'},design:{},members:[{email:user.email,role:'owner'}],catalog:[{id:'cut',name:'Cut',type:'service',price:25},{id:'beard',name:'Beard',type:'service',price:15}],servicePlan:{subscriptionStatus:'active'}};
 const grant={id:crypto.randomUUID(),userId:user.id,email:user.email,siteId:site.siteId,platform:false,scopes:['webfactory.read','webfactory.execute'],expiresAt:Date.now()+86400000};
 await clientSiteStore().setJSON('sites/tenant-a.json',site);await clientOAuthStore().setJSON(key('grants',grant.id),grant);
 const bytes=await sharp({create:{width:20,height:20,channels:3,background:'#334455'}}).png().toBuffer();
 const args={requestId:crypto.randomUUID(),fileName:'cut.png',contentType:'image/png',size:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
 const prepare=()=>prepareImageUpload(grant,user,args,'https://webfactorypr.com');
 const put=(p,data=bytes)=>receiveImageUpload(new Request(p.uploadUrl,{method:'PUT',headers:{'Content-Type':'image/png'},body:data}),{getUser:async()=>user});
 return {rows,user,site,grant,bytes,args,prepare,put};
}
test('image transfer validates and optimizes bytes; finalize changes only one catalog image and is idempotent',async t=>{
 const f=await fixture(t),p=await f.prepare();assert.equal((await f.prepare()).uploadUrl,p.uploadUrl);
 assert.equal(z.string().uuid().safeParse(p.uploadId).success,true);
 const results=await Promise.all([f.put(p),f.put(p)]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 const status=await imageUploadStatus(f.grant,f.user,{uploadId:p.uploadId});assert.equal(status.status,'uploaded');assert(!JSON.stringify(status).includes('capability'));
 const args={uploadId:p.uploadId,requestId:crypto.randomUUID(),target:{kind:'catalog',itemId:'cut'}};
 const r=await finalizeImageUpload(f.grant,f.user,args,'https://webfactorypr.com',new Request('https://webfactorypr.com/mcp'),{});assert.equal(r.verified,true);
 const site=await getClientSite(f.site.siteId);assert.match(site.catalog[0].imageAssetKey,/^sites\/tenant-a\/mcp-/);assert.equal(site.catalog[0].price,25);assert.equal(site.catalog[1].imageAssetKey,'');assert.equal(site.slug,'old-link');
 await finalizeImageUpload(f.grant,f.user,args,'https://webfactorypr.com',new Request('https://webfactorypr.com/mcp'),{});assert.equal((await getClientSite(f.site.siteId)).revision,site.revision);
 await assert.rejects(finalizeImageUpload(f.grant,f.user,{...args,target:{kind:'catalog',itemId:'beard'}},'https://webfactorypr.com',new Request('https://webfactorypr.com/mcp'),{}),{status:409});
});
test('upload rejects other tenants, identities, expired/revoked grants and changed retry metadata',async t=>{
 const f=await fixture(t);await assert.rejects(prepareImageUpload(f.grant,f.user,{...f.args,siteId:'tenant-b'},'https://webfactorypr.com'),{status:403});
 const p=await f.prepare();await assert.rejects(imageUploadStatus(f.grant,{...f.user,id:'other'},{uploadId:p.uploadId}),{status:404});
 await assert.rejects(prepareImageUpload(f.grant,f.user,{...f.args,size:99},'https://webfactorypr.com'),{status:409});
 await clientOAuthStore().setJSON(key('grants',f.grant.id),{...f.grant,revoked:true});assert.equal((await f.put(p)).status,401);
});
test('bad checksum, MIME spoofing and oversized files never attach images',async t=>{
 const f=await fixture(t);await assert.rejects(prepareImageUpload(f.grant,f.user,{...f.args,size:4194305},'https://webfactorypr.com'),{status:400});
 const p=await f.prepare();const invalid=Buffer.alloc(f.bytes.length,1);assert.equal((await f.put(p,invalid)).status,400);assert.equal((await imageUploadStatus(f.grant,f.user,{uploadId:p.uploadId})).status,'failed');
 const args={...f.args,requestId:crypto.randomUUID(),sha256:crypto.createHash('sha256').update(invalid).digest('hex')};const spoof=await prepareImageUpload(f.grant,f.user,args,'https://webfactorypr.com');assert.equal((await f.put(spoof,invalid)).status,400);assert.equal((await getClientSite(f.site.siteId)).revision,1);
});
test('expired capabilities, tampering and revoked membership fail before storing bytes',async t=>{
 const f=await fixture(t),p=await f.prepare();
 const tampered=new URL(p.uploadUrl);tampered.searchParams.set('capability','x'.repeat(43));assert.equal((await receiveImageUpload(new Request(tampered,{method:'PUT',body:f.bytes,headers:{'Content-Type':'image/png'}}),{getUser:async()=>f.user})).status,401);
 const entry=[...f.rows.entries()].find(([k])=>k.endsWith(`/image-uploads/${p.uploadId}.json`));assert(entry);entry[1].data.expiresAt=Date.now()-1;assert.equal((await f.put(p)).status,401);
 const next=await prepareImageUpload(f.grant,f.user,{...f.args,requestId:crypto.randomUUID()},'https://webfactorypr.com');
 await clientSiteStore().setJSON('sites/tenant-a.json',{...f.site,members:[]});assert.equal((await f.put(next)).status,403);
 assert(![...f.rows.keys()].some(k=>k.includes('/sites/tenant-a/mcp-')));
});
test('MCP lists image writers and slug writer only for Execute connections and rejects injected URL fields',async t=>{
 const f=await fixture(t);
 const rpc=async(grant,method,params)=>{const r=await serveMcp(new Request('https://webfactorypr.com/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}),grant,f.user);return r.json();};
 const listed=await rpc(f.grant,'tools/list',{});const names=listed.result.tools.map(x=>x.name);for(const n of ['wf_prepare_image_upload','wf_finalize_image_upload','wf_update_slug'])assert(names.includes(n));
 const read=await rpc({...f.grant,scopes:['webfactory.read']},'tools/list',{});assert(!read.result.tools.some(x=>['wf_prepare_image_upload','wf_finalize_image_upload','wf_update_slug'].includes(x.name)));
 const injected=await rpc(f.grant,'tools/call',{name:'wf_prepare_image_upload',arguments:{...f.args,url:'https://untrusted.invalid/image.png'}});assert(injected.error||injected.result?.isError);
});
