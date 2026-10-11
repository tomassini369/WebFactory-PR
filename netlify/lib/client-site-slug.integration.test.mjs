import test from 'node:test';
import assert from 'node:assert/strict';
import {getStore} from '@netlify/blobs';
import handler from '../functions/client-admin.mjs';
import {clientSiteStore,getClientSite,getClientSiteBySlug,saveClientSite} from './client-store.mjs';
import {publicSiteSlugMessage} from './client-site-slug.mjs';

function fixture(t){
  globalThis.netlifyBlobsContext=Buffer.from(JSON.stringify({siteID:'fixture',token:'fixture',deployID:'fixture'})).toString('base64');
  globalThis.Netlify={env:{get:()=>''}};
  globalThis.netlifyIdentityContext={user:{email:'owner@example.invalid',sub:'fixture-owner',app_metadata:{}}};
  t.after(()=>{delete globalThis.Netlify;delete globalThis.netlifyIdentityContext;delete globalThis.netlifyBlobsContext});
  const rows=new Map();let etag=0,writes=0;
  const proto=Object.getPrototypeOf(getStore('fixture'));
  t.mock.method(proto,'get',async function(key){return structuredClone(rows.get(this.name+'/'+key)?.data??null)});
  t.mock.method(proto,'getWithMetadata',async function(key){return structuredClone(rows.get(this.name+'/'+key)??null)});
  t.mock.method(proto,'setJSON',async function(key,data,options={}){
    const full=this.name+'/'+key,previous=rows.get(full);
    if(options.onlyIfNew&&previous||options.onlyIfMatch&&previous?.etag!==options.onlyIfMatch)return {modified:false};
    writes++;rows.set(full,{data:structuredClone(data),etag:String(++etag)});return {modified:true};
  });
  const a={siteId:'fixture-a',slug:'fixture-old',revision:3,status:'published',business:{name:'Fixture business'},members:[{email:'owner@example.invalid',role:'owner'}],catalog:[{id:'keep-product',type:'product',price:12,inventory:8,trackInventory:true}],employees:[{id:'keep-employee',name:'Fixture employee',salary:'private-fixture-salary'}],hours:{},settings:{locale:'en'},paymentRules:{methods:{stripe:true,ath:true}},stockOperations:{fixture:{signature:'server-owned'}},stockReservations:{}};
  const b={...structuredClone(a),siteId:'fixture-b',slug:'fixture-other'};
  const store=clientSiteStore();
  return {a,b,store,rows,prepare:async()=>{for(const site of [a,b]){await store.setJSON('sites/'+site.siteId+'.json',site);await store.setJSON('slugs/'+site.slug+'.json',{siteId:site.siteId})}writes=0},writes:()=>writes};
}
const request=(siteId='fixture-a',value='fixture-new',revision=3,origin='https://pos.example.invalid')=>new Request('https://pos.example.invalid/.netlify/functions/client-admin',{method:'PATCH',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({siteId,section:'slug',value,revision,employeeId:'untrusted',role:'owner'})});

test('real administrative handler saves the URL, preserves aliases and financial/employee identity',async t=>{
  const f=fixture(t);await f.prepare();const response=await handler(request());assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);const body=await response.json();
  assert.equal(body.site.siteId,f.a.siteId);assert.equal(body.site.slug,'fixture-new');assert.equal(body.site.revision,4);
  for(const key of ['catalog','employees','paymentRules','stockOperations','stockReservations'])assert.deepEqual(body.site[key],f.a[key]);
  assert(!JSON.stringify(body.publicSite).includes('private-fixture-salary'));assert(!JSON.stringify(body.publicSite).includes('owner@example.invalid'));
  assert.equal((await getClientSiteBySlug('fixture-old')).siteId,f.a.siteId);assert.equal((await getClientSiteBySlug('fixture-new')).siteId,f.a.siteId);
  assert.equal((await getClientSite(f.b.siteId)).slug,f.b.slug);
  const read=await handler(new Request('https://pos.example.invalid/.netlify/functions/client-admin?siteId='+f.a.siteId));assert.equal(read.status,200);assert.equal((await read.json()).posOperations.cashierEnabled,true);
});
test('real session and tenant roles reject unauthenticated, cashier, employee and cross-business changes',async t=>{
  const f=fixture(t);await f.prepare();globalThis.netlifyIdentityContext={user:null};assert.equal((await handler(request())).status,401);
  for(const role of ['employee','cashier','staff']){globalThis.netlifyIdentityContext={user:{email:'owner@example.invalid',sub:'fixture-owner',app_metadata:{}}};const site=structuredClone(f.a);site.members[0].role=role;await f.store.setJSON('sites/'+site.siteId+'.json',site);assert.equal((await handler(request())).status,403)}
  globalThis.netlifyIdentityContext={user:{email:'outsider@example.invalid',sub:'outsider',app_metadata:{}}};assert.equal((await handler(request())).status,403);
  assert.equal(await f.store.get('slugs/fixture-new.json',{type:'json'}),null);assert.equal((await getClientSite(f.a.siteId)).slug,f.a.slug);
});
test('real manager membership can save; rejected origin and reserved names never reserve an address',async t=>{
  const f=fixture(t);await f.prepare();const manager=structuredClone(f.a);manager.members[0].role='manager';await f.store.setJSON('sites/'+f.a.siteId+'.json',manager);
  assert.equal((await handler(request(f.a.siteId,'fixture-new',3,'https://foreign.example.invalid'))).status,403);
  const invalid=await handler(request(f.a.siteId,'builder'));assert.equal(invalid.status,400);assert.equal((await invalid.json()).code,'SLUG_INVALID');assert.equal(await f.store.get('slugs/builder.json',{type:'json'}),null);
  assert.equal((await handler(request())).status,200);
});
test('real concurrent tenant claims have one winner; established URL pointers cannot be stolen',async t=>{
  const f=fixture(t);await f.prepare();const results=await Promise.all([handler(request(f.a.siteId)),handler(request(f.b.siteId))]);assert.deepEqual(results.map(x=>x.status).sort(),[200,409]);
  const winner=await f.store.get('slugs/fixture-new.json',{type:'json'});assert([f.a.siteId,f.b.siteId].includes(winner.siteId));
  const a=await getClientSite(f.a.siteId),b=await getClientSite(f.b.siteId);assert.equal([a,b].filter(x=>x.slug==='fixture-new').length,1);
  assert.equal((await getClientSiteBySlug('fixture-old')).siteId,f.a.siteId);assert.equal((await getClientSiteBySlug('fixture-other')).siteId,f.b.siteId);
});
test('general site saves and provisioning also respect aliases reserved by another tenant',async t=>{
  const f=fixture(t);await f.prepare();await handler(request());
  await assert.rejects(saveClientSite({...f.b,revision:4,slug:'fixture-new'}),{status:409});
  const created={...f.b,siteId:'fixture-created',revision:0,slug:'fixture-old'};delete created.stockOperations;delete created.stockReservations;
  await assert.rejects(saveClientSite(created),{status:409});
  assert.equal(await getClientSite('fixture-created'),null);assert.equal((await getClientSite(f.b.siteId)).slug,'fixture-other');assert.equal((await getClientSiteBySlug('fixture-old')).siteId,f.a.siteId);
});
test('concurrent provisioning and rename cannot overwrite each other’s URL claim',async t=>{
  const f=fixture(t);await f.prepare();const created={...f.b,siteId:'fixture-created',slug:'fixture-new',revision:0};delete created.stockOperations;delete created.stockReservations;
  const results=await Promise.all([handler(request()).then(r=>r.status),saveClientSite(created).then(()=>200).catch(e=>e.status)]);assert.deepEqual(results.sort(),[200,409]);
  const pointer=await f.store.get('slugs/fixture-new.json',{type:'json'});const site=await getClientSite(pointer.siteId);assert.equal(site.slug,'fixture-new');assert.equal((await getClientSiteBySlug('fixture-old')).siteId,f.a.siteId);
});
test('two tabs changing one site cannot both advance the business revision',async t=>{
  const f=fixture(t);await f.prepare();const responses=await Promise.all([handler(request(f.a.siteId,'fixture-one')),handler(request(f.a.siteId,'fixture-two'))]);assert.deepEqual(responses.map(x=>x.status).sort(),[200,409]);assert.equal((await getClientSite(f.a.siteId)).revision,4);
  for(const slug of ['fixture-old','fixture-one','fixture-two'])assert.equal((await getClientSiteBySlug(slug)).siteId,f.a.siteId);
});
test('stale revisions and missing ETags fail closed without overwriting the business',async t=>{
  const f=fixture(t);await f.prepare();const stale=await handler(request(f.a.siteId,'fixture-new',2));assert.equal(stale.status,409);assert.equal((await stale.json()).code,'SLUG_STALE');assert.equal(f.writes(),0);
  const row=[...f.rows.entries()].find(([key])=>key.endsWith('/sites/fixture-a.json'));delete row[1].etag;
  const failed=await handler(request());assert.equal(failed.status,503);assert.equal((await failed.json()).code,'SLUG_STORAGE');assert.equal((await getClientSite(f.a.siteId)).slug,'fixture-old');
});
test('slug errors offer both locales and never assert success after an uncertain response',()=>{
  assert.match(publicSiteSlugMessage('SLUG_IN_USE','es'),/ya está en uso/);assert.match(publicSiteSlugMessage('SLUG_STALE','en'),/Reload/);assert.match(publicSiteSlugMessage('','es',401),/sesión/);assert.match(publicSiteSlugMessage('','en',403),/cannot change/);assert.match(publicSiteSlugMessage('','es',503),/verificar/);
});
