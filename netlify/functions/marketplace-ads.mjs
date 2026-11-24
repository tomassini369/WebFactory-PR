import crypto from 'node:crypto';
import Stripe from 'stripe';
import {requirePlatformAdmin,requireMarketplaceUser,requireSiteAccess,assertSameOrigin,errorResponse} from '../lib/client-auth.mjs';
import {withBookingLock} from '../lib/booking-lock.mjs';
import {readAuthPayload,authJson} from '../lib/auth-gateway.mjs';
import {clientAssetStore,clientCommerceStore,clientSiteStore,getClientSiteBySlug} from '../lib/client-store.mjs';
import {publicClientSite} from '../lib/client-store.mjs';
import {discoverableSite,consumerKey,publicConsumer} from '../lib/marketplace.mjs';
import {stripeRuntimeState} from '../lib/stripe-runtime.mjs';
import {mediaView,adKey,adId,adFail,adText,saveAd,adRows,publicAds,adCheckout,settleAdEvent,validOffer,offerKey} from '../lib/marketplace-ads.mjs';
const view=(row,admin)=>({media:mediaView(row,admin?'&review=1':'&own=1'),destination:row.destination||null,cta:row.cta,promotion:row.promotion||null,id:row.id,slug:row.slug,brand:row.brand,siteId:row.siteId,title:row.title,body:row.body,status:row.status,moderation:row.moderation,reason:row.reason||'',createdAt:row.createdAt,paidAt:row.paidAt||null,endsAt:row.endsAt||null,revision:row.revision,offer:row.offer});
const env=k=>globalThis.Netlify?.env?.get(k)||'';
export function createAdsHandler({store=clientCommerceStore,consumer=requireMarketplaceUser,profiles=clientSiteStore,admin=requirePlatformAdmin,owner=id=>requireSiteAccess(id,['owner']),site=getClientSiteBySlug,clock=Date.now,uuid=crypto.randomUUID,stripeFactory=()=>new Stripe(env('STRIPE_SECRET_KEY'),{apiVersion:'2026-08-26.dahlia'}),safe=url=>{const s=stripeRuntimeState({context:globalThis.Netlify?.context?.deploy?.context||env('CONTEXT'),requestUrl:url});if(s.production||s.keyMode!=='test')throw adFail('Advertisement checkout requires the isolated test environment.',503)}}={}){return async req=>{try{
 if(!['GET','POST'].includes(req.method))return new Response(null,{status:405,headers:{Allow:'GET, POST'}});assertSameOrigin(req);
 const input=req.method==='POST'?await readAuthPayload(req):Object.fromEntries(new URL(req.url).searchParams),db=store();
 const offerRow=await db.getWithMetadata(offerKey,{type:'json'}),offer=offerRow?.data;
 if(req.method==='GET'&&input.scope==='public')return authJson({ok:true,ads:await publicAds(db,site,clock(),input.feed==='1')});
 const isAdmin=input.scope==='admin',external=input.scope==='advertiser';
 let actor,accountId;
 if(isAdmin)actor=await admin();
 else if(external){
  actor=await consumer();
  if(!actor.confirmedAt)throw adFail('Confirm your email first.',403);
  const profile=publicConsumer(await profiles().get(consumerKey(actor.id),{type:'json'}),actor);
  if(profile.restricted||profile.needsAcceptance)throw adFail('An eligible Marketplace profile is required.',403);
  accountId='advertiser-'+crypto.createHash('sha256').update(actor.id).digest('hex');
 }else{
  if(typeof input.siteId!=='string')throw adFail('Business required.');
  actor=(await owner(input.siteId)).user;
  accountId=input.siteId;
 }
 const owns=row=>row.siteId===accountId&&(row.kind==='external')===external;
 if(req.method==='GET')return authJson({ok:true,offer:validOffer(offer)?{version:offer.version,amount:offer.amount,days:offer.days,terms:offer.terms}:null,offerRevision:offer?.revision||0,campaigns:(await adRows(db)).filter(r=>isAdmin||owns(r)).map(row=>view(row,isAdmin))});
 if(input.action==='set_offer'){
  if(!isAdmin)throw adFail('Platform access required.',403);if(input.approved!==true||input.taxReviewed!==true)throw adFail('Approve price, terms and tax treatment before enabling.');
  const next={enabled:input.enabled===true,approved:true,taxReviewed:true,amount:input.amount,days:input.days,terms:adText(input.terms,30,1000),version:uuid(),approvedBy:actor.id,at:clock(),revision:(offer?.revision||0)+1};if(!validOffer({...next,enabled:true}))throw adFail('Invalid offer.');if(input.revision!==(offer?.revision||0))throw adFail('Offer changed; reload.',409);if(offerRow&&!offerRow.etag)throw adFail('Concurrency unavailable.',503);
  const saved=await db.setJSON(offerKey,next,offerRow?{onlyIfMatch:offerRow.etag}:{onlyIfNew:true});if(!saved.modified)throw adFail('Offer changed; reload.',409);return authJson({ok:true});
 }
 if(input.action==='apply'){
  if(isAdmin)throw adFail('Use the business owner portal.');if(!validOffer(offer)||input.offerVersion!==offer.version||input.accepted!==true)throw adFail('An approved offer and explicit acceptance are required.',409);
  if(!external){const business=await site(input.slug);if(!discoverableSite(business)||business.siteId!==input.siteId)throw adFail('Published business required.',409);}
  const row={id:uuid(),siteId:accountId,...(external?{kind:"external",brand:adText(input.brand,2,80)}:{slug:input.slug}),title:adText(input.title,5,80),body:adText(input.body,10,350),status:'pending_review',moderation:'pending',createdAt:clock(),createdBy:actor.id,offer:{version:offer.version,amount:offer.amount,days:offer.days,terms:offer.terms,acceptedAt:clock(),acceptedBy:actor.id}};
  if(input.destination){
   let target;try{target=new URL(input.destination)}catch{throw adFail('Invalid destination.')}
   if(target.protocol!=='https:'||target.username||target.password||target.port||target.href.length>1500)throw adFail('Use an HTTPS destination.');
   row.destination=target.href;
  }
  if(input.itemId){
   if(external||typeof input.itemId!=='string')throw adFail('Invalid item.');
   const item=publicClientSite(await site(row.slug)).catalog.find(item=>item.id===input.itemId);
   if(!item)throw adFail('Catalog item unavailable.');
   row.destination='/sites/'+encodeURIComponent(row.slug)+'?'+new URLSearchParams({item:item.id});
   row.cta=item.requiresAppointment?'book':item.type==='product'?'buy':'view';
  }
  if(input.promotion){
   if(external||typeof input.promotion!=='string'||input.promotion.length>160)throw adFail('Invalid promotion.');
   const original=await db.get('marketplace/organic/'+encodeURIComponent(accountId)+'/'+encodeURIComponent(input.promotion),{type:'json'});
   const {publicPromotion}=await import('../lib/organic-promotions.mjs');
   if(!original||!publicPromotion(await site(row.slug),original,clock()))throw adFail('Select an active promotion.');
   row.promotion=input.promotion;
   delete row.destination;
  }
  await withBookingLock(db,`locks/marketplace-ad-application/${accountId}`,async()=>{const previous=(await adRows(db)).find(r=>owns(r)&&(['pending_review','approved','checkout_pending','payment_failed','expired'].includes(r.status)||['paid','paused'].includes(r.status)&&r.endsAt>clock()));if(previous)throw adFail('An existing campaign must be resolved before requesting another.',409);if(input.files?.length){const {attachDrafts}=await import('../lib/promotion-media.mjs');row.media=await attachDrafts(clientAssetStore(),JSON.stringify([actor.id,external?null:accountId]),row,input.files)}await saveAd(db,row,null,0)});return authJson({ok:true});
 }
 if(!adId(input.id))throw adFail('Invalid campaign.');const saved=await db.getWithMetadata(adKey(input.id),{type:'json'}),row=saved?.data;if(!row||!isAdmin&&!owns(row))throw adFail('Campaign unavailable.',404);
 if(input.action==='checkout'){
  if(isAdmin)throw adFail('Owner payment required.',403);if(input.revision!==row.revision)throw adFail('Campaign changed; reload.',409);safe(req.url);if(!external){const business=await site(row.slug);if(!discoverableSite(business)||business.siteId!==row.siteId)throw adFail('Business unavailable.',409);}
  const session=await adCheckout({store:db,row,stripe:stripeFactory(),origin:new URL(req.url).origin,clock});let target;try{target=new URL(session.url)}catch{throw adFail('Checkout URL unavailable.',503)}if(target.protocol!=='https:'||target.hostname!=='checkout.stripe.com'||target.username||target.password||target.port)throw adFail('Checkout URL unavailable.',503);return authJson({ok:true,url:target.href});
 }
 if(input.action==='verify'){
  safe(req.url);const checkoutId=row.checkoutId||(isAdmin?input.checkoutId:'');if(typeof checkoutId!=='string'||!/^cs_[a-zA-Z0-9_]{1,180}$/.test(checkoutId))throw adFail('An administrator must identify the existing Stripe session.',409);
  const session=await stripeFactory().checkout.sessions.retrieve(checkoutId);if(session.livemode!==false||session.id!==checkoutId||session.metadata?.webfactory_ad_id!==row.id||session.metadata?.webfactory_site_id!==row.siteId||session.client_reference_id!==row.id||session.amount_total!==row.offer.amount||session.currency!=='usd'||session.mode!=='payment')throw adFail('Campaign payment mismatch.',409);
  if(session.status==='complete'&&session.payment_status==='paid'){await settleAdEvent({livemode:false,type:'checkout.session.completed',data:{object:session}},db,clock());return authJson({ok:true});}
  if(session.status==='expired'&&session.payment_status==='unpaid'&&!['paid','paused','payment_reversed'].includes(row.status)){await saveAd(db,{...row,checkoutId,status:'cancelled',resolvedAt:clock(),resolvedBy:actor.id},saved,input.revision);return authJson({ok:true});}
  return authJson({ok:true,pending:true});
 }
 if(input.action==='moderate'){
  if(!isAdmin||input.reviewed!==true||row.status!=='pending_review'||!['approve','reject'].includes(input.decision))throw adFail('Administrative content review required.',403);
  await saveAd(db,{...row,status:input.decision==='approve'?'approved':'rejected',moderation:input.decision==='approve'?'approved':'rejected',reason:adText(input.reason,10,500),reviewedBy:actor.id,reviewedAt:clock()},saved,input.revision);return authJson({ok:true});
 }
 if(input.action==='cancel_unpaid'){
  if(!['pending_review','approved'].includes(row.status)||row.checkoutParameters||row.checkoutId)throw adFail('Verify the existing payment before canceling.',409);await saveAd(db,{...row,status:'cancelled',cancelledAt:clock(),cancelledBy:actor.id},saved,input.revision);return authJson({ok:true});
 }
 if(input.action==='pause'){
  if(row.status!=='paid')throw adFail('Only a paid placement can be paused.',409);await saveAd(db,{...row,status:'paused',pausedAt:clock(),pauseRequestedBy:actor.id},saved,input.revision);return authJson({ok:true});
 }
 throw adFail('Invalid action.');
 }catch(error){return errorResponse(error)}}}
export default createAdsHandler();
export const config={rateLimit:{windowLimit:25,windowSize:60,aggregateBy:['ip']}};
