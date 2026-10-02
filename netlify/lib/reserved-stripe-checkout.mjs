import crypto from 'node:crypto';
import Stripe from 'stripe';
import { clientCommerceStore, commerceKey } from './client-store.mjs';
import { withBookingLock } from './booking-lock.mjs';
import { reserveInventory } from './inventory-reservations.mjs';
import { assertStripeWriteAllowed } from './stripe-runtime.mjs';

const fail=(message,status=409)=>Object.assign(new Error(message),{status});
export const stripeClient=()=>new Stripe(globalThis.Netlify?.env?.get('STRIPE_SECRET_KEY')||'',{apiVersion:'2026-08-26.dahlia',timeout:15000,maxNetworkRetries:0});
export function checkoutParameters(params){
  const result={};
  for(const [key,value] of params){
    const parts=key.match(/[^\[\]]+/g);let target=result;
    for(let i=0;i<parts.length-1;i++){const part=parts[i];target[part]??=/^\d+$/.test(parts[i+1])?[]:{};target=target[part];}
    target[parts.at(-1)]=value;
  }
  return result;
}
export async function createReservedStripeCheckout(site,record,params,{requestUrl,store=clientCommerceStore(),client, reserve=reserveInventory}={}){
  assertStripeWriteAllowed({requestUrl});
  if(record.kind!=='order'||record.siteId!==site.siteId||!record.stripeAccountId||!Number.isSafeInteger(record.amountTotal)||record.amountTotal<=0)throw fail('Invalid inventory checkout.',400);
  const fingerprint=crypto.createHash('sha256').update(JSON.stringify({items:record.items,customer:record.customer,amountTotal:record.amountTotal})).digest('hex');
  return withBookingLock(store,`locks/commerce/${site.siteId}`,async()=>{
    const key=commerceKey(site.siteId,'transactions',record.transactionId);
    const previous=await store.get(key,{type:'json'});
    if(previous){
      if(previous.checkoutFingerprint!==fingerprint)throw fail('Use a new attempt for a changed checkout.');
      if(previous.stripeSessionId&&previous.checkoutUrl&&previous.paymentStatus==='pending')return previous;
      if(previous.paymentStatus!=='pending'||!previous.checkoutParameters)throw fail('This checkout requires review.');
      if(Date.now()-Date.parse(previous.createdAt)>23*60*60*1000)throw fail('An uncertain old checkout requires provider reconciliation.');
      record=previous;
    }else{
      params.set('expires_at',String(Math.floor(Date.now()/1000)+31*60));
      params.set('integration_identifier',`webfactory_${Array.from(crypto.randomBytes(8),value=>String.fromCharCode(97+value%26)).join('')}`);
      record={...record,inventoryProtocol:1,inventoryReservationRequired:true,checkoutFingerprint:fingerprint,checkoutParameters:checkoutParameters(params),status:'checkout_creating'};
      const write=await store.setJSON(key,record,{onlyIfNew:true});
      if(!write.modified)throw fail('Checkout changed. Try again.');
    }
    await reserve(site.siteId,record.transactionId,record.items);
    // Persist parameters and key before Stripe. A timeout may mean a session exists.
    const session=await (client||stripeClient()).checkout.sessions.create(record.checkoutParameters,{stripeAccount:record.stripeAccountId,idempotencyKey:`reserved-checkout-${site.siteId}-${record.transactionId}`});
    if(!session.id||!session.url)throw fail('Checkout response requires review.',503);
    record={...record,stripeSessionId:session.id,checkoutUrl:session.url,status:'payment_pending',checkoutExpiresAt:new Date(session.expires_at*1000).toISOString(),updatedAt:new Date().toISOString()};
    await store.setJSON(key,record);
    await store.setJSON(commerceKey(site.siteId,'orders',record.transactionId),record);
    return record;
  });
}
