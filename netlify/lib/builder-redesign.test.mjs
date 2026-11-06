import test from 'node:test';
import assert from 'node:assert/strict';
import {getStore} from '@netlify/blobs';
import handler,{normalizeBuilderUpdate} from '../functions/client-admin.mjs';
import {clientSiteStore,getClientSite} from './client-store.mjs';
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
  const a={siteId:'fixture-a',slug:'fixture-old',revision:3,status:'published',servicePlan:{subscriptionStatus:'active'},business:{name:'Fixture business'},members:[{email:'owner@example.invalid',role:'owner'}],catalog:[{id:'keep-product',type:'product',price:12,inventory:8,trackInventory:true}],employees:[{id:'keep-employee',name:'Fixture employee',salary:'private-fixture-salary',calendarId:'keep-calendar',dailyLimit:7,serviceIds:[],timeOff:[],schedule:{},locationIds:[]}],hours:{},settings:{locale:'en'},paymentRules:{methods:{stripe:true,ath:true}},stockOperations:{fixture:{signature:'server-owned'}},stockReservations:{}};
  const b={...structuredClone(a),siteId:'fixture-b',slug:'fixture-other'};
  const store=clientSiteStore();
  return {a,b,store,rows,prepare:async()=>{for(const site of [a,b]){await store.setJSON('sites/'+site.siteId+'.json',site);await store.setJSON('slugs/'+site.slug+'.json',{siteId:site.siteId})}writes=0},writes:()=>writes};
}
function draft(site){return {
 business:{...site.business,slug:site.slug,heroAssetKey:'',galleryAssets:[]},
 design:{templateSlug:'',style:'Modern',primary:'#123456',secondary:'#234567',customLayout:'split',sectionOrder:['catalog','team','about','gallery','contact']},
 features:{products:true,services:true},catalog:structuredClone(site.catalog),team:structuredClone(site.employees),hours:{Lunes:{enabled:true,open:'09:00',close:'17:00',breaks:[{start:'12:00',end:'13:00'}]}},
 payments:{...site.paymentRules,methods:{stripe:true,ath:true,inPerson:true},bookingPayment:'in_person',productPayment:'online'}
};}
function request(site,value,revision=site.revision){return new Request('https://pos.example.invalid/.netlify/functions/client-admin',{method:'PATCH',headers:{Origin:'https://pos.example.invalid','Content-Type':'application/json'},body:JSON.stringify({siteId:site.siteId,section:'builder',revision,value})});}
test('Builder publishes together and preserves stock, private metadata and stable identities',async t=>{
 const f=fixture(t);await f.prepare();const value=draft(f.a);value.business.name=value.business.nameEn='Edited fixture';value.catalog[0].price=27;value.catalog[0].inventory=0;value.catalog[0].trackInventory=false;value.team[0].calendarId='attacker';value.team[0].salary=0;
 const response=await handler(request(f.a,value));assert.equal(response.status,200,await response.clone().text());const {site}=await response.json();
 assert.equal(site.revision,4);assert.equal(site.business.name,'Edited fixture');assert.equal(site.design.primary,'#123456');assert.equal(site.catalog[0].price,27);assert.equal(site.catalog[0].inventory,8);assert.equal(site.catalog[0].trackInventory,true);assert.equal(site.employees[0].calendarId,'keep-calendar');assert.equal(site.employees[0].salary,'private-fixture-salary');assert.deepEqual(site.stockOperations,f.a.stockOperations);assert.deepEqual(site.members,f.a.members);assert.deepEqual(site.hours,value.hours);assert.equal((await getClientSite(f.b.siteId)).revision,3);
});
test('Builder rejects invalid and stale saves without partial updates',async t=>{
 const f=fixture(t);await f.prepare();let value=draft(f.a);value.business.nameEn='Do not save';value.catalog[0].price=null;
 assert.equal((await handler(request(f.a,value))).status,400);assert.equal((await getClientSite(f.a.siteId)).business.name,'Fixture business');assert.equal(f.writes(),0);
 assert.equal((await handler(request(f.a,draft(f.a),2))).status,409);assert.equal(f.writes(),0);
 value=draft(f.a);value.members=[{role:'owner'}];assert.equal((await handler(request(f.a,value))).status,400);assert.equal(f.writes(),0);
 value=draft(f.a);value.design.sectionOrder=['unknown'];assert.equal((await handler(request(f.a,value))).status,400);assert.equal(f.writes(),0);
});
test('Builder checks current owner membership and rejects employees, revoked and unknown users',async t=>{
 const f=fixture(t);await f.prepare();for(const members of [[{email:'owner@example.invalid',role:'employee'}],[],[{email:'different@example.invalid',role:'owner'}]]){
  await f.store.setJSON('sites/'+f.a.siteId+'.json',{...f.a,members});assert.equal((await handler(request(f.a,draft(f.a)))).status,403);
 }globalThis.netlifyIdentityContext={user:null};assert.equal((await handler(request(f.a,draft(f.a)))).status,401);
});
test('Builder media accepts owned images, rejects cross-tenant and missing uploads, and supports clearing',async t=>{
 const f=fixture(t);await f.prepare();const value=draft(f.a);const keys=['logo','hero','gallery','catalog'].map(name=>`sites/${f.a.siteId}/${name}.png`);
 value.business.logoAssetKey=keys[0];value.business.heroAssetKey=keys[1];value.business.galleryAssets=[{assetKey:keys[2]}];value.catalog[0].imageAssetKey=keys[3];
 const checked=[];const patch=await normalizeBuilderUpdate(f.a,value,{}, {role:'owner'},async key=>{checked.push(key);return {metadata:{contentType:'image/png'}}});assert.deepEqual(new Set(checked),new Set(keys));assert.deepEqual(patch.business.galleryAssetKeys,[keys[2]]);assert.equal(patch.catalog[0].imageAssetKey,keys[3]);
 for(const key of ['sites/other/logo.png',`sites/${f.a.siteId}/../other/logo.png`,'drafts/foreign/logo.png']){value.business.logoAssetKey=key;await assert.rejects(normalizeBuilderUpdate(f.a,value,{}, {},async()=>({metadata:{contentType:'image/png'}})),{status:403});}
 value.business.logoAssetKey=keys[0];await assert.rejects(normalizeBuilderUpdate(f.a,value,{}, {},async()=>null),{status:400});await assert.rejects(normalizeBuilderUpdate(f.a,value,{}, {},async()=>({metadata:{contentType:'text/html'}})),{status:400});
 const cleared=await normalizeBuilderUpdate(f.a,draft(f.a),{},{});assert.equal(cleared.business.heroAssetKey,'');assert.deepEqual(cleared.business.galleryAssetKeys,[]);
});
test('Builder removal archives profiles and catalog, preserving bookings and portal identities',async t=>{
 const f=fixture(t);await f.prepare();const value=draft(f.a);value.team=[];value.catalog=[];const response=await handler(request(f.a,value));assert.equal(response.status,200,await response.clone().text());const {site}=await response.json();assert.equal(site.catalog[0].active,false);assert.equal(site.employees[0].active,false);assert.equal(site.employees[0].calendarId,'keep-calendar');assert.equal(site.catalog[0].inventory,8);
});
test('Builder rename respects tenant alias reservations',async t=>{
 const f=fixture(t);await f.prepare();const value=draft(f.a);value.business.slug=f.b.slug;assert.equal((await handler(request(f.a,value))).status,409);assert.equal((await getClientSite(f.a.siteId)).revision,3);
 value.business.slug='fixture-new';const response=await handler(request(f.a,value));assert.equal(response.status,200,await response.clone().text());assert.equal((await f.store.get('slugs/fixture-old.json')).siteId,f.a.siteId);assert.equal((await f.store.get('slugs/fixture-new.json')).siteId,f.a.siteId);
});
test('concurrent Builder requests have one revision winner and cannot partially overwrite it',async t=>{
 const f=fixture(t);await f.prepare();const first=draft(f.a),second=draft(f.a);first.business.nameEn='First';second.business.nameEn='Second';first.design.primary='#112233';second.design.primary='#445566';
 const responses=await Promise.all([handler(request(f.a,first)),handler(request(f.a,second))]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);const site=await getClientSite(f.a.siteId);assert.equal(site.revision,4);assert.equal(site.design.primary,site.business.name==='First'?'#112233':'#445566');
});
test('inactive subscriptions and malformed Builder values reject before storage writes',async t=>{
 const f=fixture(t);await f.prepare();for(const field of ['business','design','features','catalog','team','hours','payments'])for(const invalid of [null,1,'bad']){const value=draft(f.a);value[field]=invalid;assert.equal((await handler(request(f.a,value))).status,400,field);assert.equal(f.writes(),0)}
 await f.store.setJSON('sites/'+f.a.siteId+'.json',{...f.a,servicePlan:{subscriptionStatus:'canceled'}});assert.equal((await handler(request(f.a,draft(f.a)))).status,403);
});
test('unchanged legacy assets and private integrations survive unrelated Builder edits',async t=>{
 const f=fixture(t);await f.prepare();const site={...f.a,business:{...f.a.business,logoAssetKey:'legacy/logo',heroAssetKey:'legacy/hero',galleryAssetKeys:['legacy/gallery']},paymentRules:{...f.a.paymentRules,stripe:{accountId:'preserve-account'},ath:{token:'preserve-private-token'}}};const value=draft(site);value.business.heroAssetKey=site.business.heroAssetKey;value.business.galleryAssets=[{assetKey:'legacy/gallery'}];value.payments.stripe={accountId:'untrusted'};value.payments.ath={token:'untrusted'};
 const patch=await normalizeBuilderUpdate(site,value,{},{} ,async()=>{throw new Error('Existing assets need no reupload')});assert.equal(patch.business.heroAssetKey,'legacy/hero');assert.equal(patch.paymentRules.stripe.accountId,'preserve-account');assert.equal(patch.paymentRules.ath.token,'preserve-private-token');
});
