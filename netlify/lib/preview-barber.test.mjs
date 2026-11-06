import {estimatePosTotals} from '../../src/pos-domain.ts';
import {calculateTax} from './webfactory-v3-domain.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {seedPreviewBarber,previewBarberData,fixtureSiteId} from '../../scripts/seed-preview-barber.mjs';
import {currentIndexedSites} from './member-index.mjs';
import {authorizeSiteUser} from './client-auth.mjs';
import {kioskView,kioskCheckoutPayload} from './kiosk.mjs';
import {bookingBalance} from './kiosk-bookings.mjs';
const env={CONTEXT:'deploy-preview',BRANCH:'main',HEAD:'feat/kiosk-skin-engine',REVIEW_ID:'125',WF_PREVIEW_TEST_BUSINESS:'faro-norte-v1',WF_PREVIEW_TEST_OWNER_EMAIL:'owner@example.test',WF_PREVIEW_STRIPE_ACCOUNT:'acct_sandboxFixture'};
function fixture(){
 const stores=new Map(),opened=[],writes=[];
 const store=name=>{
  opened.push(name);
  if(stores.has(name))return stores.get(name);
  const rows=new Map();
  const api={
   rows,
   async get(key){return structuredClone(rows.get(key)?.data??null)},
   async setJSON(key,data,options={}){return api.set(key,data,options)},
   async set(key,data,options={}){
    if(options.onlyIfNew&&rows.has(key))return {modified:false};
    writes.push([name,key]);rows.set(key,{data:structuredClone(data),metadata:options.metadata});return {modified:true};
   },
   list({prefix=''}){
    return {async *[Symbol.asyncIterator](){yield {blobs:[...rows.keys()].filter(key=>key.startsWith(prefix)).map(key=>({key}))}}};
   },
  };
  stores.set(name,api);return api;
 };
 return {stores,opened,writes,store,loadAsset:async()=>Buffer.from('illustrative-webp-fixture')};
}
test('preview seed cannot run in production, branch deploys, other PRs or without explicit enablement',async()=>{
 for(const change of [{CONTEXT:'production'},{CONTEXT:'branch-deploy'},{CONTEXT:'dev'},{CONTEXT:''},{HEAD:'main'},{REVIEW_ID:'124'},{WF_PREVIEW_TEST_BUSINESS:''}]){
  const f=fixture();assert.equal((await seedPreviewBarber({env:{...env,...change},...f})).seeded,false);assert.equal(f.opened.length,0);assert.equal(f.writes.length,0);
 }
});
test('seed creates existing-model tenant, indexed owner, six image assets and QR glass kiosk; no financial or auth records',async()=>{
 const f=fixture(),result=await seedPreviewBarber({env,...f});assert.equal(result.seeded,true);
 assert.deepEqual([...new Set(f.opened)].sort(),['webfactory-client-assets','webfactory-client-commerce','webfactory-client-sites']);
 const sites=f.stores.get('webfactory-client-sites'),site=await sites.get(`sites/${fixtureSiteId}.json`);
 assert.equal((await currentIndexedSites(sites,env.WF_PREVIEW_TEST_OWNER_EMAIL))[0].siteId,fixtureSiteId);
 assert.equal(authorizeSiteUser({id:'existing-identity',email:env.WF_PREVIEW_TEST_OWNER_EMAIL},site).membership.role,'owner');
 assert.throws(()=>authorizeSiteUser({id:'foreign',email:'foreign@example.test'},site),/access/);
 assert.equal(f.stores.get('webfactory-client-assets').rows.size,6);
 const commerce=f.stores.get('webfactory-client-commerce');assert.equal(commerce.rows.size,1);
 const view=await kioskView(commerce,{siteId:fixtureSiteId,locationId:'arecibo-preview',locationName:'Arecibo',saleId:'fixture'},site);
 assert.equal(view.catalog.length,4);assert.equal(view.appointmentServices.length,4);assert.deepEqual(view.bookingModes,{newBookings:true,existingBookings:true});assert.deepEqual(view.providers,['stripe']);
 assert.equal(view.presentation.appearance.skinId,'glass-premium');assert.equal(view.presentation.appearance.imageFit,'contain');assert.equal(view.presentation.appearance.overlayOpacity,0);assert.equal(view.presentation.appearance.glassBlur,0);
 assert.equal(site.googleCalendar.connected,false);assert.equal(site.paymentRules.bookingDepositPercent,30);assert.equal(site.settings.timezone,'America/Puerto_Rico');
 const payload=kioskCheckoutPayload(site,{locationId:'arecibo-preview'},{items:[{id:'corte-clasico-walk-in',quantity:1}],customer:{name:'Test',email:'buyer@example.invalid'},paymentProvider:'stripe'});
 assert.equal(payload.items[0].id,'corte-clasico-walk-in');
 for(const row of site.catalog.filter(x=>x.requiresAppointment)){
  const total=row.price*100,deposit=Math.round(total*.3),balance=await bookingBalance(commerce,{siteId:fixtureSiteId,transactionId:'fixture-only',bookingTotalCents:total,bookingTaxCents:0,paymentStatus:'paid',amountTotal:deposit,tax:0});assert.equal(balance.due,total-deposit);
 }
});
test('reseed preserves edits and orders on same deploy, while a new deploy receives a clean baseline',async()=>{
 const f=fixture();await seedPreviewBarber({env,...f});const sites=f.stores.get('webfactory-client-sites'),key=`sites/${fixtureSiteId}.json`,site=await sites.get(key);site.revision=2;site.catalog[0].price=29;await sites.setJSON(key,site);
 const commerce=f.stores.get('webfactory-client-commerce');await commerce.setJSON(`${fixtureSiteId}/transactions/existing.json`,{test:true});const writes=f.writes.length;
 assert.equal((await seedPreviewBarber({env,...f})).seeded,false);assert.equal(f.writes.length,writes);assert.equal((await sites.get(key)).catalog[0].price,29);assert.ok(await commerce.get(`${fixtureSiteId}/transactions/existing.json`));
 const next=fixture();await seedPreviewBarber({env,...next});assert.equal((await next.stores.get('webfactory-client-sites').get(key)).catalog[0].price,25);assert.equal(next.stores.get('webfactory-client-commerce').rows.size,1);
});
test('seed rejects invalid owner, invalid account and existing tenant/slug conflicts without replacing records',async()=>{
 for(const change of [{WF_PREVIEW_TEST_OWNER_EMAIL:''},{WF_PREVIEW_TEST_OWNER_EMAIL:'sample@example.invalid'},{WF_PREVIEW_STRIPE_ACCOUNT:'not-an-account'}]){const f=fixture();await assert.rejects(seedPreviewBarber({env:{...env,...change},...f}));assert.equal(f.writes.length,0);}
 for(const [key,data] of [[`sites/${fixtureSiteId}.json`,{members:[]}],['slugs/faro-norte-preview.json',{siteId:'another-tenant'}]]){const f=fixture();await f.store('webfactory-client-sites').setJSON(key,data);const writes=f.writes.length;await assert.rejects(seedPreviewBarber({env,...f}),/conflict/);assert.equal(f.writes.length,writes);}
});
test('business recipe contains no invented credentials, paid transactions or connected Google state',async()=>{
 const {site,configuration}=await previewBarberData(env.WF_PREVIEW_TEST_OWNER_EMAIL);
 assert.equal(site.paymentRules.stripeConnectedAccountId,'');assert.equal(configuration.devices.length,0);
 assert.ok(site.catalog.every(item=>item.imageAssetKey.startsWith(`sites/${fixtureSiteId}/`)));
 assert.equal(site.members.length,1);assert.equal(site.business.email,'faro-norte@example.invalid');assert.equal(site.business.phone,'');assert.equal(site.business.mapsUrl,'');
 assert.equal(configuration.appearance.imageBlur,0);assert.equal(configuration.appearance.glassOpacity,70);
});

test('deploy preview selects source HEAD over base BRANCH and fails closed for a different source',async()=>{
 const f=fixture();assert.equal((await seedPreviewBarber({env,...f})).seeded,true);
 const other=fixture();assert.equal((await seedPreviewBarber({env:{...env,HEAD:'untrusted-source',BRANCH:'feat/kiosk-skin-engine'},...other})).seeded,false);assert.equal(other.opened.length,0);
});

test('Faro Norte IVU uses its actual walk-in catalog in cashier, kiosk and server calculation',async()=>{
 const {site}=await previewBarberData(env.WF_PREVIEW_TEST_OWNER_EMAIL,env.WF_PREVIEW_STRIPE_ACCOUNT);
 const ids=['corte-clasico-walk-in','corte-barba-walk-in','barba-walk-in','ritual-toalla-walk-in'],cart=ids.map(id=>({id,quantity:1}));
 const before=estimatePosTotals(site.catalog.map(item=>({...item,taxable:false})),cart,0,0,{...site.taxConfig,enabled:true});assert.equal(before.tax,0,'The former blanket exemption reproduces the report');
 const cashier=estimatePosTotals(site.catalog,cart,0,0,site.taxConfig);assert.equal(cashier.subtotal,12000);assert.equal(cashier.tax,1382);assert.equal(cashier.total,13382);
 const f=fixture();await seedPreviewBarber({env,...f});const view=await kioskView(f.stores.get('webfactory-client-commerce'),{siteId:site.siteId,locationId:'arecibo-preview',saleId:'tax-fixture'},site);
 assert.deepEqual(estimatePosTotals(view.catalog,cart,0,0,view.taxConfig),cashier);
 const serverTax=cart.reduce((sum,line)=>{const item=site.catalog.find(item=>item.id===line.id);return sum+calculateTax({amountCents:Math.round(item.price*100),taxable:item.taxable,taxRateOverride:item.taxRateOverride,config:site.taxConfig}).taxCents},0);assert.equal(serverTax,1382);
 const exempt=site.catalog.map(item=>({...item,taxable:false}));assert.equal(estimatePosTotals(exempt,cart,0,0,site.taxConfig).tax,0,'Explicit exemptions remain honored');
});
