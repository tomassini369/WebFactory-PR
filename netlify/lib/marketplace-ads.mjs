import crypto from 'node:crypto';
import {clientCommerceStore,getClientSiteBySlug} from './client-store.mjs';
import {discoverableSite,directoryEntry} from './marketplace.mjs';
import {withBookingLock} from './booking-lock.mjs';
export const adKey=id=>`marketplace-ads/${id}.json`;
export const offerKey='marketplace-ad-offer.json';
export const adFail=(message,status=400)=>Object.assign(new Error(message),{status});
export const adId=id=>typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id);
export function adText(value,min,max){if(typeof value!=='string'||value.trim().length<min||value.length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f<>]/.test(value))throw adFail('Invalid advertisement text.');return value.trim()}
export async function saveAd(store,row,saved,revision){if(!Number.isSafeInteger(revision)||revision!==(saved?.data?.revision||0))throw adFail('Campaign changed; reload.',409);if(saved&&!saved.etag)throw adFail('Concurrency unavailable.',503);const next={...row,revision:revision+1};const r=await store.setJSON(adKey(row.id),next,saved?{onlyIfMatch:saved.etag}:{onlyIfNew:true});if(!r.modified)throw adFail('Campaign changed; reload.',409);return next}
export function validOffer(value){return Boolean(value&&value.enabled===true&&value.approved===true&&value.taxReviewed===true&&typeof value.version==='string'&&Number.isSafeInteger(value.amount)&&value.amount>=100&&value.amount<=10000000&&Number.isInteger(value.days)&&value.days>=1&&value.days<=90&&typeof value.terms==='string'&&value.terms.length>=30&&value.terms.length<=2000)}
export async function adRows(store){const rows=[];let n=0;for await(const page of store.list({prefix:'marketplace-ads/',paginate:true}))for(const blob of page.blobs||[]){if(++n>1000)throw adFail('Campaign listing limit; contact support.',503);const r=await store.get(blob.key,{type:'json'});if(r)rows.push(r)}return rows.sort((a,b)=>b.createdAt-a.createdAt)}
export async function publicAds(store=clientCommerceStore(),getSite=getClientSiteBySlug,now=Date.now()){
 const rows=await adRows(store),ads=[];for(const row of rows){if(row.status!=='paid'||row.moderation!=='approved'||!row.paidAt||!row.endsAt||now>=row.endsAt)continue;const site=await getSite(row.slug);if(!discoverableSite(site)||site.siteId!==row.siteId)continue;ads.push({id:row.id,title:row.title,body:row.body,sponsored:true,endsAt:row.endsAt,business:directoryEntry(site)})}if(!ads.length)return [];const offset=Math.floor(now/60000)%ads.length;return [...ads.slice(offset),...ads.slice(0,offset)].slice(0,3)
}
export async function adCheckout({store,row,stripe,origin,clock=Date.now}){
 // Persist exact request parameters before Stripe. Recovery reuses the same key/parameters.
 return withBookingLock(store,`locks/marketplace-ad/${row.id}`,async()=>{
  let saved=await store.getWithMetadata(adKey(row.id),{type:'json'}),current=saved?.data;if(!current||current.moderation!=='approved'||!['approved','checkout_pending'].includes(current.status))throw adFail('Campaign is not ready for payment.',409);
  if(current.checkoutId){const session=await stripe.checkout.sessions.retrieve(current.checkoutId);if(session.status==='open')return session;if(session.payment_status==='paid'||session.status==='complete')throw adFail('Payment awaiting server confirmation.',409);throw adFail('Checkout expired; request administrative review.',409)}
  if(current.checkoutCreatedAt&&clock()-current.checkoutCreatedAt>=23*3600000)throw adFail('Uncertain checkout requires review.',409);
  if(!current.checkoutParameters){
   const suffix=[...crypto.randomBytes(8)].map(n=>String.fromCharCode(97+n%26)).join('');
   const parameters={mode:'payment',line_items:[{price_data:{currency:'usd',unit_amount:current.offer.amount,product_data:{name:`WebFactory sponsored placement · ${current.offer.days} days`}},quantity:1}],metadata:{webfactory_ad_id:current.id,webfactory_site_id:current.siteId},payment_intent_data:{metadata:{webfactory_ad_id:current.id,webfactory_site_id:current.siteId}},client_reference_id:current.id,success_url:`${origin}/client-admin?marketplaceAd=${current.id}`,cancel_url:`${origin}/client-admin?marketplaceAd=${current.id}`,integration_identifier:`webfactory_ad_${suffix}`,custom_text:{submit:{message:current.offer.terms.slice(0,1000)}}};
   current=await saveAd(store,{...current,status:'checkout_pending',checkoutCreatedAt:clock(),checkoutParameters:parameters},saved,current.revision);saved=await store.getWithMetadata(adKey(row.id),{type:'json'});
  }
  const session=await stripe.checkout.sessions.create(current.checkoutParameters,{idempotencyKey:`marketplace-ad-${current.id}`});if(!session.id||!session.url)throw adFail('Checkout unavailable.',503);
  await saveAd(store,{...current,checkoutId:session.id},saved,current.revision);return session;
 });
}
export function isAdEvent(event){if(['charge.refunded','charge.dispute.created'].includes(event?.type))return true;return ['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','checkout.session.expired'].includes(event?.type)&&Boolean(event?.data?.object?.metadata?.webfactory_ad_id)}
export async function settleAdEvent(event,store=clientCommerceStore(),now=Date.now()){
 if(['charge.refunded','charge.dispute.created'].includes(event.type)){
  const object=event.data.object,intent=typeof object.payment_intent==='string'?object.payment_intent:object.payment_intent?.id;
  const row=(await adRows(store)).find(r=>r.paymentIntentId&&r.paymentIntentId===intent);if(!row)return {ignored:true};if(event.livemode!==false)throw adFail('Sandbox event required.',409);
  return withBookingLock(store,`locks/marketplace-ad/${row.id}`,async()=>{const saved=await store.getWithMetadata(adKey(row.id),{type:'json'});if(saved?.data?.status==='payment_reversed')return {id:row.id,status:'payment_reversed'};await saveAd(store,{...saved.data,status:'payment_reversed',reversalAt:now,reversalType:event.type},saved,saved.data.revision);return {id:row.id,status:'payment_reversed'}});
 }
 if(event.livemode!==false)throw adFail('Sandbox event required.',409);
 const session=event.data.object,id=session.metadata?.webfactory_ad_id;if(!adId(id))throw adFail('Invalid campaign reference.');
 return withBookingLock(store,`locks/marketplace-ad/${id}`,async()=>{
  const saved=await store.getWithMetadata(adKey(id),{type:'json'}),row=saved?.data;if(!row)throw adFail('Campaign unavailable.',503);
  if(session.client_reference_id!==id||session.metadata.webfactory_site_id!==row.siteId||session.currency!=='usd'||session.amount_total!==row.offer.amount||session.mode!=='payment'||row.checkoutId&&row.checkoutId!==session.id)throw adFail('Campaign payment mismatch.',409);
  if(row.status==='paid'||row.status==='paused'||row.status==='payment_reversed')return {id,status:row.status};
  if(!['approved','checkout_pending','payment_failed','expired'].includes(row.status))throw adFail('Campaign payment needs review.',409);
  if(session.payment_status==='paid'&&session.status==='complete'){
   const paymentIntent=typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id;if(typeof paymentIntent!=='string'||!paymentIntent.startsWith('pi_'))throw adFail('Payment reference unavailable.',409);
   if(row.moderation!=='approved')throw adFail('Campaign approval unavailable.',409);
   const next=await saveAd(store,{...row,status:'paid',checkoutId:session.id,paymentIntentId:typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id,paidAt:now,endsAt:now+row.offer.days*86400000},saved,row.revision);return{id,status:next.status};
  }
  if(event.type==='checkout.session.async_payment_failed'||event.type==='checkout.session.expired'){
   const next=await saveAd(store,{...row,status:event.type.endsWith('expired')?'expired':'payment_failed',checkoutId:session.id},saved,row.revision);return{id,status:next.status};
  }return {id,status:row.status};
 });
}
