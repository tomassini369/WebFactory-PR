import test from 'node:test';
import assert from 'node:assert/strict';
import {createReviewsHandler} from '../functions/marketplace-reviews.mjs';
import {createAdsHandler} from '../functions/marketplace-ads.mjs';
import {adKey,offerKey,adCheckout,settleAdEvent,publicAds,validOffer} from './marketplace-ads.mjs';
import {updateConsumer,consumerKey,publicConsumer} from './marketplace.mjs';
import {CONSUMER_POLICY_VERSION} from './consumer-policy.mjs';
function memory(){const rows=new Map();let seq=0;return {rows,get:async k=>rows.get(k)?.data||null,getWithMetadata:async k=>rows.get(k)||null,setJSON:async(k,v,o={})=>{const old=rows.get(k);if(o.onlyIfNew&&old||o.onlyIfMatch&&o.onlyIfMatch!==old?.etag)return {modified:false};rows.set(k,{data:structuredClone(v),etag:String(++seq)});return{modified:true}},delete:async k=>rows.delete(k),async *list({prefix}){yield{blobs:[...rows.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))}}}}
const business={siteId:'tenant-a',slug:'tenant-a',status:'active',business:{name:'Fixture',locations:[]},servicePlan:{billingModel:'complimentary'},members:[{email:'owner@example.invalid',userId:'owner',role:'owner'}],catalog:[]};
const consumer={id:'consumer',email:'consumer@example.invalid',confirmedAt:'2026-01-01'};
const request=(payload,query='',method=payload?'POST':'GET',origin='https://preview.example')=>new Request('https://preview.example/.netlify/functions/test'+query,{method,headers:{Origin:origin,'Content-Type':'application/json'},...(payload?{body:JSON.stringify(payload)}:{})});
const active={status:'active',name:'Private name',municipality:'Arecibo',favorites:[],following:[],revision:0,consent:{version:CONSUMER_POLICY_VERSION}};
const id='11111111-1111-4111-8111-111111111111',now=1000000000;
async function fixture(){const db=memory(),profiles=memory();await profiles.setJSON(consumerKey(consumer.id),active);let actor=consumer;const denied=()=>{throw Object.assign(Error('Forbidden'),{status:403})};const handler=createReviewsHandler({store:()=>db,profiles:()=>profiles,user:async()=>actor,admin:async()=>actor.id==='admin'?actor:denied(),site:async slug=>slug===business.slug?business:null,clock:()=>now});return {db,profiles,handler,setActor:a=>actor=a}}
test('following is private, independent of favorites, CAS protected and removed by deletion/minor restriction',async()=>{
 const db=memory();await db.setJSON(consumerKey(consumer.id),active);let p=await updateConsumer(db,consumer,{action:'follow',slug:'tenant-a',saved:true,revision:0},async()=>business);assert.deepEqual(p.following,['tenant-a']);assert.deepEqual(p.favorites,[]);
 await assert.rejects(updateConsumer(db,consumer,{action:'follow',slug:'hidden',saved:true,revision:1},async()=>({...business,status:'preview'})),{status:404});
 await assert.rejects(updateConsumer(db,consumer,{action:'follow',slug:'tenant-a',saved:false,revision:0},async()=>business),{status:409});
 p=await updateConsumer(db,consumer,{action:'minor_review',confirmation:'REVIEW MINOR',revision:1},async()=>business);assert.deepEqual(p.following,[]);assert.deepEqual((await db.get(consumerKey(consumer.id))).following,[]);assert.deepEqual(publicConsumer(await db.get(consumerKey(consumer.id)),consumer).following,[]);
});
const submission={slug:'tenant-a',action:'submit',revision:0,alias:'Public alias',rating:1,text:'This was my actual experience with this fixture service.',experienced:true,independent:true};
test('reviews stay private until moderation; negative ratings publish under the same rules with no PII or fake purchase badge',async()=>{
 const f=await fixture();assert.equal((await f.handler(request(submission))).status,200);let rows=(await(await f.handler(request(null,'?slug=tenant-a'))).json()).reviews;assert.equal(rows.length,0);
 const mine=await(await f.handler(request(null,'?slug=tenant-a&scope=mine'))).json();assert.equal(mine.review.status,'pending');
 assert.equal((await f.handler(request({slug:'tenant-a',action:'moderate',id:mine.review.id,revision:1,decision:'publish',reviewed:true}))).status,403);
 f.setActor({id:'admin'});assert.equal((await f.handler(request({slug:'tenant-a',action:'moderate',id:mine.review.id,revision:1,decision:'reject',reason:'negative',reviewed:true}))).status,400);
 assert.equal((await f.handler(request({slug:'tenant-a',action:'moderate',id:mine.review.id,revision:1,decision:'publish',reviewed:true}))).status,200);
 const publicResult=await(await f.handler(request(null,'?slug=tenant-a'))).json();assert.equal(publicResult.average,1);assert.equal(publicResult.count,1);const json=JSON.stringify(publicResult);for(const value of ['consumer@example','authorKey','history','confirmedAt','verifiedPurchase','Private name'])assert(!json.includes(value));
 await f.profiles.setJSON(consumerKey(consumer.id),{...active,status:'deleted'});assert.equal((await(await f.handler(request(null,'?slug=tenant-a'))).json()).count,0);
});
test('review ownership, site entitlement, attestation, stale revisions, insider exclusion, CSRF and withdrawal fail safely',async()=>{
 const f=await fixture();assert.equal((await f.handler(request(submission,'','POST','https://evil.invalid'))).status,403);
 for(const patch of [{rating:0},{text:'<script>bad</script>'},{experienced:false},{independent:false},{slug:'hidden'}])assert((await f.handler(request({...submission,...patch}))).status>=400);
 f.setActor({id:'owner',email:'owner@example.invalid',confirmedAt:'yes'});await f.profiles.setJSON(consumerKey('owner'),active);assert.equal((await f.handler(request(submission))).status,403);f.setActor(consumer);
 assert.equal((await f.handler(request(submission))).status,200);assert.equal((await f.handler(request(submission))).status,409);assert.equal((await f.handler(request({slug:'tenant-a',action:'withdraw',revision:1}))).status,200);
 const mine=await(await f.handler(request(null,'?slug=tenant-a&scope=mine'))).json();assert.equal(mine.review.text,'');assert.equal(mine.review.status,'withdrawn');
});
const offer={enabled:true,approved:true,taxReviewed:true,version:'fixture-approved',amount:500,days:7,terms:'Synthetic test terms only; no public price approved.'};
async function adFixture(){const db=memory();let actor='owner',created=0;const handler=createAdsHandler({store:()=>db,admin:async()=>{if(actor!=='admin')throw Object.assign(Error('Admin required'),{status:403});return{id:'admin'}},owner:async siteId=>{if(siteId!=='tenant-a')throw Object.assign(Error('Tenant denied'),{status:403});return{user:consumer,site:business}},site:async slug=>slug===business.slug?business:null,clock:()=>now,uuid:()=>id,safe:()=>{},stripeFactory:()=>({checkout:{sessions:{create:async()=>{created++;return{id:'cs_test',url:'https://checkout.stripe.com/c/pay/test'}}}}})});return{db,handler,admin:()=>actor='admin',created:()=>created}}
test('advertising requires approved commercial terms, owner access and moderation; public feed hides unpaid/unpublished/expired',async()=>{
 const f=await adFixture(),apply={siteId:'tenant-a',slug:'tenant-a',action:'apply',offerVersion:offer.version,accepted:true,title:'Fixture ad',body:'Synthetic ad description.'};
 assert.equal(validOffer(null),false);assert.equal((await f.handler(request(apply))).status,409);assert.equal((await f.handler(request({...apply,siteId:'tenant-b'}))).status,403);
 await f.db.setJSON(offerKey,offer);assert.equal((await f.handler(request(apply))).status,200);assert.equal((await f.handler(request({siteId:'tenant-a',action:'checkout',id,revision:1}))).status,409);assert.equal(f.created(),0);assert.deepEqual(await publicAds(f.db,async()=>business,now),[]);
 f.admin();assert.equal((await f.handler(request({scope:'admin',action:'moderate',id,revision:1,decision:'approve',reason:'Content reviewed for fixture compliance.',reviewed:true}))).status,200);
 assert.equal((await f.handler(request({siteId:'tenant-b',action:'checkout',id,revision:2}))).status,403);
 assert.deepEqual(await publicAds(f.db,async()=>({...business,status:'suspended'}),now),[]);
});
test('durable ad checkout recovers the same exact Stripe parameters after a lost response',async()=>{
 const db=memory();const row={id,siteId:'tenant-a',slug:'tenant-a',status:'approved',moderation:'approved',offer,revision:1,createdAt:now};await db.setJSON(adKey(id),row);const calls=[];
 const stripe={checkout:{sessions:{create:async(p,o)=>{calls.push({p:structuredClone(p),o});if(calls.length===1)throw Error('lost response');return{id:'cs_test',url:'https://checkout.stripe.com/c/pay/test'}}}}};
 await assert.rejects(adCheckout({store:db,row,stripe,origin:'https://preview.example',clock:()=>now}));assert((await db.get(adKey(id))).checkoutParameters);
 await adCheckout({store:db,row,stripe,origin:'https://changed.invalid',clock:()=>now+1});assert.deepEqual(calls[0],calls[1]);assert.equal(calls[0].p.line_items[0].price_data.unit_amount,500);assert(!JSON.stringify(calls[0]).includes('changed.invalid'));assert(!('payment_method_types' in calls[0].p));
});
test('signed payment fulfillment is idempotent, verifies amount/tenant/session and hides refunded/disputed placements',async()=>{
 const db=memory(),row={id,siteId:'tenant-a',slug:'tenant-a',title:'Fixture ad',body:'Fixture only',status:'checkout_pending',moderation:'approved',offer,revision:1,createdAt:now,checkoutId:'cs_test'};await db.setJSON(adKey(id),row);
 const session={id:'cs_test',mode:'payment',client_reference_id:id,currency:'usd',amount_total:500,payment_status:'paid',status:'complete',payment_intent:'pi_test',metadata:{webfactory_ad_id:id,webfactory_site_id:'tenant-a'}};
 const event={livemode:false,type:'checkout.session.completed',data:{object:session}};
 for(const patch of [{amount_total:1},{currency:'eur'},{id:'cs_other'},{metadata:{webfactory_ad_id:id,webfactory_site_id:'tenant-b'}}])await assert.rejects(settleAdEvent({...event,data:{object:{...session,...patch}}},db,now));
 await settleAdEvent(event,db,now);await settleAdEvent(event,db,now+100);assert.equal((await db.get(adKey(id))).paidAt,now);assert.equal((await publicAds(db,async()=>business,now)).length,1);assert.deepEqual(await publicAds(db,async()=>business,now+8*86400000),[]);
 await settleAdEvent({livemode:false,type:'charge.refunded',data:{object:{payment_intent:'pi_test'}}},db,now+1);assert.deepEqual(await publicAds(db,async()=>business,now+2),[]);await settleAdEvent(event,db,now+3);assert.equal((await db.get(adKey(id))).status,'payment_reversed');
});

test('review reports are private, idempotent and never suppress a negative review automatically',async()=>{
 const f=await fixture();await f.handler(request(submission));const mine=(await(await f.handler(request(null,'?slug=tenant-a&scope=mine'))).json()).review;f.setActor({id:'admin'});await f.handler(request({slug:'tenant-a',action:'moderate',id:mine.id,revision:1,decision:'publish',reviewed:true}));
 f.setActor(consumer);assert.equal((await f.handler(request(null,'?slug=tenant-a&scope=admin'))).status,403);
 const report={slug:'tenant-a',action:'report',id:mine.id,revision:2,reason:'spam'};assert.equal((await f.handler(request(report))).status,200);assert.equal((await f.handler(request(report))).status,200);
 const pub=await(await f.handler(request(null,'?slug=tenant-a'))).json();assert.equal(pub.count,1);assert.equal(pub.average,1);assert(!JSON.stringify(pub).includes('reporter'));
 f.setActor({id:'admin'});const internal=await(await f.handler(request(null,'?slug=tenant-a&scope=admin'))).json();assert.equal(internal.reviews[0].reports,1);
});
test('unconfirmed and restricted consumers cannot create public content; hidden businesses and cross-site references fail closed',async()=>{
 const f=await fixture();f.setActor({...consumer,confirmedAt:null});assert.equal((await f.handler(request(submission))).status,403);f.setActor(consumer);await f.profiles.setJSON(consumerKey(consumer.id),{...active,status:'minor_review'});assert.equal((await f.handler(request(submission))).status,403);assert.equal(f.db.rows.size,0);
});
test('review listing is paginated and never invents a global average from a partial page',async()=>{
 const f=await fixture();for(let i=0;i<21;i++)await f.db.setJSON('marketplace-reviews/tenant-a/'+i+'.json',{...submission,id:String(i),status:'published',authorKey:consumerKey(consumer.id),updatedAt:now,revision:1});
 let page=await(await f.handler(request(null,'?slug=tenant-a'))).json();assert.equal(page.count,20);assert.equal(page.average,null);assert.equal(page.nextOffset,20);page=await(await f.handler(request(null,'?slug=tenant-a&offset=20'))).json();assert.equal(page.count,1);assert.equal(page.average,null);assert.equal(page.nextOffset,null);
});
test('advertising offer configuration is admin-only, validates terms and does not rewrite existing accepted prices',async()=>{
 const f=await adFixture();const config={scope:'admin',action:'set_offer',revision:0,amount:500,days:7,terms:offer.terms,approved:true,taxReviewed:true,enabled:true};assert.equal((await f.handler(request(config))).status,403);f.admin();assert.equal((await f.handler(request({...config,days:0}))).status,400);assert.equal((await f.handler(request({...config,taxReviewed:false}))).status,400);assert.equal((await f.handler(request(config))).status,200);assert.equal((await f.handler(request(config))).status,409);
});
test('live-mode ad events cannot activate test placements and payment does not bypass content approval',async()=>{
 const db=memory();const row={id,siteId:'tenant-a',slug:'tenant-a',status:'checkout_pending',moderation:'approved',offer,revision:1,checkoutId:'cs_test'};await db.setJSON(adKey(id),row);const event={livemode:true,type:'checkout.session.completed',data:{object:{id:'cs_test',mode:'payment',client_reference_id:id,currency:'usd',amount_total:500,payment_status:'paid',status:'complete',payment_intent:'pi_test',metadata:{webfactory_ad_id:id,webfactory_site_id:'tenant-a'}}}};
 await assert.rejects(settleAdEvent(event,db,now),{status:409});await db.setJSON(adKey(id),{...row,moderation:'rejected'});await assert.rejects(settleAdEvent({...event,livemode:false},db,now),{status:409});assert.notEqual((await db.get(adKey(id))).status,'paid');
});

test('a second advertising application is blocked while an earlier checkout is unresolved',async()=>{
 const f=await adFixture();await f.db.setJSON(offerKey,offer);const apply={siteId:'tenant-a',slug:'tenant-a',action:'apply',offerVersion:offer.version,accepted:true,title:'Fixture ad',body:'Synthetic description for tests.'};assert.equal((await f.handler(request(apply))).status,200);assert.equal((await f.handler(request(apply))).status,409);
});
test('ad offer expiry/price fields cannot be supplied by the buyer to override the accepted snapshot',async()=>{
 const f=await adFixture();await f.db.setJSON(offerKey,offer);assert.equal((await f.handler(request({siteId:'tenant-a',slug:'tenant-a',action:'apply',offerVersion:offer.version,accepted:true,title:'Fixture ad',body:'Synthetic description for tests.',amount:1,days:90,offer:{amount:1}}))).status,200);
 const row=await f.db.get(adKey(id));assert.equal(row.offer.amount,500);assert.equal(row.offer.days,7);await f.db.setJSON(offerKey,{...offer,amount:1000});assert.equal((await f.db.get(adKey(id))).offer.amount,500);
});

test('deleting then reaccepting a consumer profile never republishes its old reviews',async()=>{
 const f=await fixture();await f.handler(request(submission));let mine=(await(await f.handler(request(null,'?slug=tenant-a&scope=mine'))).json()).review;f.setActor({id:'admin'});await f.handler(request({slug:'tenant-a',action:'moderate',id:mine.id,revision:1,decision:'publish',reviewed:true}));
 assert.equal((await(await f.handler(request(null,'?slug=tenant-a'))).json()).count,1);
 await updateConsumer(f.profiles,consumer,{action:'delete_profile',confirmation:'DELETE PROFILE',revision:0},async()=>business);
 await updateConsumer(f.profiles,consumer,{action:'accept_policy',adult:true,acceptedTerms:true,policyVersion:CONSUMER_POLICY_VERSION,revision:1},async()=>business);
 assert.equal((await(await f.handler(request(null,'?slug=tenant-a'))).json()).count,0);assert.equal((await f.profiles.get(consumerKey(consumer.id))).reviewEpoch,1);
});
test('an unpaid campaign may be canceled with revision checks and never creates a Stripe charge',async()=>{
 const f=await adFixture();await f.db.setJSON(adKey(id),{id,siteId:'tenant-a',slug:'tenant-a',status:'approved',moderation:'approved',revision:1,offer});assert.equal((await f.handler(request({siteId:'tenant-a',action:'cancel_unpaid',id,revision:0}))).status,409);assert.equal((await f.handler(request({siteId:'tenant-a',action:'cancel_unpaid',id,revision:1}))).status,200);assert.equal((await f.db.get(adKey(id))).status,'cancelled');assert.equal(f.created(),0);
});
