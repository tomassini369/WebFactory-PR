import test from 'node:test';
import assert from 'node:assert/strict';
import {createSubscriptionReconciliationHandler} from '../functions/subscription-reconciliation.mjs';
const request=()=>new Request('https://preview.example.invalid/.netlify/functions/subscription-reconciliation?siteId=tenant_a');
function fixture(){
 const site={siteId:'tenant_a',servicePlan:{billingModel:'subscription',stripeSubscriptionId:'sub_a',stripeCustomerId:'cus_a',subscriptionStatus:'active',cancelAtPeriodEnd:false}},calls=[],rows=new Map();
 const subscription={id:'sub_a',customer:'cus_a',status:'canceled',metadata:{webfactory_site_id:'tenant_a'},cancel_at_period_end:true,items:{data:[{current_period_end:1800000000}]},privateContact:'never-show'},session={id:'cs_a',mode:'subscription',client_reference_id:'tenant_a',metadata:{webfactory_site_id:'tenant_a'},status:'complete',customer_details:{email:'never-show'}};
 const handler=createSubscriptionReconciliationHandler({authorize:async()=>({site}),getStore:()=>({get:async key=>{calls.push(['read',key]);return rows.get(key)}}),guard:()=>{},getStripe:()=>({subscriptions:{retrieve:async id=>{calls.push(['subscription',id]);return subscription}},checkout:{sessions:{retrieve:async id=>{calls.push(['checkout',id]);return session}}}}),clock:()=>1800000000000});
 return {site,calls,rows,subscription,session,handler};
}
test('owner inspection reports canonical mismatch without mutating billing or leaking provider contacts',async()=>{
 const f=fixture();f.rows.set('tenant_a/billing-checkout.json',{sessionId:'cs_a'});const r=await f.handler(request());assert.equal(r.status,200);const d=await r.json();assert.equal(d.matches,false);assert.equal(d.providerStatus,'canceled');assert.equal(d.cancelAtPeriodEnd,true);assert(!JSON.stringify(d).includes('never-show'));assert.equal(f.site.servicePlan.subscriptionStatus,'active');assert.deepEqual(f.calls,[['subscription','sub_a'],['read','tenant_a/billing-checkout.json'],['checkout','cs_a']]);assert.match(r.headers.get('cache-control'),/no-store/);
});
test('unknown protected checkout is review-only and never recreates a provider session',async()=>{
 const f=fixture();f.site.servicePlan.stripeSubscriptionId='';f.rows.set('tenant_a/billing-checkout.json',{acceptanceId:'old_unknown',preparedAt:0,parameters:{private:'never-show'}});const d=await(await f.handler(request())).json();assert.deepEqual(d.checkout,{state:'unknown',requiresReview:true});assert.deepEqual(f.calls,[['read','tenant_a/billing-checkout.json']]);assert(!JSON.stringify(d).includes('never-show'));
});
test('unrelated subscription or checkout fails closed before disclosing provider state',async()=>{
 const f=fixture();f.subscription.metadata.webfactory_site_id='tenant_b';assert.equal((await f.handler(request())).status,403);
 const g=fixture();g.rows.set('tenant_a/billing-checkout.json',{sessionId:'cs_b'});g.session.client_reference_id='tenant_b';assert.equal((await g.handler(request())).status,403);
});
test('unauthorized caller and methods cannot inspect billing; courtesy plan never calls Stripe',async()=>{
 let touched=false;const denied=createSubscriptionReconciliationHandler({authorize:async()=>{throw Object.assign(Error('Denied'),{status:401})},getStore:()=>{touched=true}});assert.equal((await denied(request())).status,401);assert.equal(touched,false);
 assert.equal((await denied(new Request(request().url,{method:'POST'}))).status,405);
 const f=fixture();f.site.servicePlan.billingModel='complimentary';const d=await(await f.handler(request())).json();assert.equal(d.applicable,false);assert.deepEqual(f.calls,[]);
});
