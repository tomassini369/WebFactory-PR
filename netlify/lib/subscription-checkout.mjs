import crypto from 'node:crypto';
import {assertSubscriptionBelongsToSite} from './subscription-consent.mjs';
const fail=(message,status=409)=>Object.assign(new Error(message),{status});
const terminalSubscriptionStatuses = new Set(['canceled', 'incomplete_expired']);

async function canReplaceCompletedCheckout(stripe, site, session) {
 const plan=site?.servicePlan;
 const subscriptionId=typeof session.subscription==='string'?session.subscription:session.subscription?.id;
 if(!subscriptionId || !terminalSubscriptionStatuses.has(plan?.subscriptionStatus) || subscriptionId!==plan.stripeSubscriptionId)return false;
 const subscription=await stripe.subscriptions.retrieve(subscriptionId);
 assertSubscriptionBelongsToSite(subscription,site);
 return terminalSubscriptionStatuses.has(subscription.status);
}
// Caller holds the tenant subscription lock. Persist exact request/idempotency
// identity before contacting Stripe so an uncertain response cannot create anew.
export async function subscriptionCheckout({store,stripe,siteId,site,interval,consent,price,base,integrationIdentifier,clock=Date.now}){
 const key=`${siteId}/billing-checkout.json`;
 async function create(prepared){
  if(!prepared.parameters||!prepared.acceptanceId||!Number.isFinite(prepared.preparedAt)||clock()-prepared.preparedAt>23*3600000||clock()<prepared.preparedAt)throw fail('Subscription recovery requires review.',503);
  const session=await stripe.checkout.sessions.create(prepared.parameters,{idempotencyKey:`subscription-${siteId}-${prepared.acceptanceId}`});
  await store.setJSON(key,{...prepared,sessionId:session.id});return session;
 }
 const previous=await store.get(key,{type:'json'});
 if(previous?.sessionId||previous?.acceptanceId){
  const pending=previous.sessionId?await stripe.checkout.sessions.retrieve(previous.sessionId):await create(previous);
  if(pending.status==='complete'){
   if(site?.siteId!==siteId||!await canReplaceCompletedCheckout(stripe,site,pending))throw fail('Payment confirmation is in progress. Refresh your plan shortly.');
  }else if(pending.status==='open'){
   if(previous.interval===interval && previous.parameters?.line_items?.[0]?.price===price)return pending;
   await stripe.checkout.sessions.expire(pending.id);
  }else if(pending.status!=='expired')throw fail('Subscription checkout is awaiting confirmation.');
 }
 const acceptanceId=crypto.randomUUID();
 await store.setJSON(`${siteId}/billing-consents/${acceptanceId}.json`,{...consent,siteId});
 const metadata={webfactory_site_id:siteId,webfactory_interval:interval,webfactory_consent_id:acceptanceId,webfactory_consent_version:consent.version,...(consent.tier?{webfactory_tier:consent.tier}:{})};
 const parameters={mode:'subscription',line_items:[{price,quantity:1}],customer_email:consent.acceptedBy,client_reference_id:siteId,metadata,subscription_data:{metadata},success_url:`${base}/client-admin?billing=success`,cancel_url:`${base}/client-admin?billing=cancelled`,integration_identifier:integrationIdentifier()};
 const prepared={interval,acceptanceId,parameters,preparedAt:clock()};
 await store.setJSON(key,prepared);
 return create(prepared);
}
