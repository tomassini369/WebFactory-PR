import Stripe from 'stripe';
import {requireSiteAccess,errorResponse} from '../lib/client-auth.mjs';
import {clientEventStore} from '../lib/client-store.mjs';
import {assertStripeWriteAllowed} from '../lib/stripe-runtime.mjs';
import {assertSubscriptionBelongsToSite} from '../lib/subscription-consent.mjs';
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
const fail=(message,status=403)=>Object.assign(new Error(message),{status});
// Inspect only: no create/expire/update, no new charge and no entitlement change.
export function createSubscriptionReconciliationHandler({authorize=id=>requireSiteAccess(id,['owner']),getStore=clientEventStore,guard=req=>assertStripeWriteAllowed({requestUrl:req.url}),getStripe=()=>new Stripe(globalThis.Netlify?.env?.get('STRIPE_SECRET_KEY')||'',{apiVersion:'2026-07-29.dahlia'}),clock=Date.now}={}){return async req=>{
 try{
  if(req.method!=='GET')return new Response(null,{status:405,headers:{...headers,Allow:'GET'}});
  const {site}=await authorize(new URL(req.url).searchParams.get('siteId')||'');
  const plan=site.servicePlan||{},base={savedStatus:plan.subscriptionStatus||'not_started',providerStatus:null,matches:null,checkedAt:new Date(clock()).toISOString(),checkout:{state:'none',requiresReview:false}};
  if(plan.billingModel!=='subscription')return Response.json({ok:true,...base,applicable:false},{headers});
  guard(req);const stripe=getStripe();let result={...base,applicable:true};
  if(plan.stripeSubscriptionId){
   const subscription=await stripe.subscriptions.retrieve(plan.stripeSubscriptionId);assertSubscriptionBelongsToSite(subscription,site);
   const end=subscription.items?.data?.[0]?.current_period_end||subscription.current_period_end;
   result={...result,providerStatus:subscription.status,matches:subscription.status===plan.subscriptionStatus&&Boolean(subscription.cancel_at_period_end)===Boolean(plan.cancelAtPeriodEnd),cancelAtPeriodEnd:Boolean(subscription.cancel_at_period_end),currentPeriodEnd:Number.isSafeInteger(end)?new Date(end*1000).toISOString():''};
  }
  const saved=await getStore().get(`${site.siteId}/billing-checkout.json`,{type:'json'});
  if(saved?.sessionId){
   const session=await stripe.checkout.sessions.retrieve(saved.sessionId);
   if(session.mode!=='subscription'||session.client_reference_id!==site.siteId||session.metadata?.webfactory_site_id!==site.siteId)throw fail('Checkout does not belong to this business.');
   result.checkout={state:['open','complete','expired'].includes(session.status)?session.status:'unknown',requiresReview:session.status==='complete'&&!['active','trialing'].includes(plan.subscriptionStatus)||!['open','complete','expired'].includes(session.status)};
  }else if(saved?.acceptanceId){
   // Never recreate an unknown Checkout from a status inquiry, even within the retry window.
   result.checkout={state:'unknown',requiresReview:true};
  }
  return Response.json({ok:true,...result},{headers});
 }catch(error){return errorResponse(error)}
};}
export default createSubscriptionReconciliationHandler();
export const config={rateLimit:{windowLimit:10,windowSize:60,aggregateBy:['ip']}};
