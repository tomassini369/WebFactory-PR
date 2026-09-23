import Stripe from "stripe";
import { admin } from "@netlify/identity";
import { clientAssetStore, clientCommerceStore, clientEventStore, clientOAuthStore, clientSiteStore, emailHash, getClientSite, normalizeEmail, saveClientSite, siteKey, slugify } from "./client-store.mjs";
import { decryptToken } from "./google-calendar.mjs";

function env(name){return globalThis.Netlify?.env?.get(name)||"";}

async function deletePrefix(store,prefix){
  const listed=await store.list({prefix});
  for(const blob of listed.blobs||[]) await store.delete(blob.key);
  return (listed.blobs||[]).length;
}

export async function disconnectGoogle(site){
  const key=`tokens/${site.siteId}.json`;
  const stored=await clientOAuthStore().get(key,{type:"json"}).catch(()=>null);
  if(stored?.encrypted){
    try{
      const token=decryptToken(stored.encrypted);
      const revokeToken=token.refresh_token||token.access_token;
      if(revokeToken) await fetch("https://oauth2.googleapis.com/revoke",{
        method:"POST",
        headers:{"Content-Type":"application/x-www-form-urlencoded"},
        body:new URLSearchParams({token:revokeToken}),
      });
    }catch{}
  }
  await clientOAuthStore().delete(key).catch(()=>{});
  const employees=(site.employees||[]).map((employee)=>({...employee,calendarId:""}));
  return saveClientSite({
    ...site,
    employees,
    googleCalendar:{connected:false,calendarEmail:"",connectedAt:"",employeeCalendars:{}},
    revision:Number(site.revision||0)+1,
    updatedAt:new Date().toISOString(),
  });
}

export async function disconnectStripe(site){
  return saveClientSite({
    ...site,
    paymentRules:{
      ...(site.paymentRules||{}),
      methods:{...(site.paymentRules?.methods||{}),stripe:false},
      stripeConnectedAccountId:"",
      stripeCapabilityStatus:"not_started",
      stripeDisconnectedAt:new Date().toISOString(),
    },
    revision:Number(site.revision||0)+1,
    updatedAt:new Date().toISOString(),
  });
}

export async function disconnectAth(site){
  return saveClientSite({
    ...site,
    paymentRules:{
      ...(site.paymentRules||{}),
      methods:{...(site.paymentRules?.methods||{}),ath:false},
      ath:{...(site.paymentRules?.ath||{}),publicPath:""},
    },
    revision:Number(site.revision||0)+1,
    updatedAt:new Date().toISOString(),
  });
}

export async function cancelWebFactorySubscription(site){
  const subscriptionId=String(site.servicePlan?.stripeSubscriptionId||"").trim();
  if(!subscriptionId)return {canceled:false};
  const stripe=new Stripe(env("STRIPE_SECRET_KEY"),{apiVersion:"2026-07-29.dahlia"});
  try{
    await stripe.subscriptions.cancel(subscriptionId);
    return {canceled:true};
  }catch(error){
    if(error?.code==="resource_missing") return {canceled:false,missing:true};
    throw error;
  }
}

export async function purgeClientSite(siteId,{cancelSubscription=true}={}){
  const site=await getClientSite(siteId);
  if(!site)return {deleted:false,siteId};
  if(cancelSubscription) await cancelWebFactorySubscription(site);

  try{await disconnectGoogle(site);}catch{}

  const memberEmails=new Set((site.members||[]).map((member)=>normalizeEmail(member.email)).filter(Boolean));
  try{
    const users=await admin.listUsers({page:1,perPage:500});
    for(const user of users||[]){
      if(!memberEmails.has(normalizeEmail(user.email)))continue;
      const previousSites=Array.isArray(user.appMetadata?.webfactory_site_ids)?user.appMetadata.webfactory_site_ids:[];
      if(previousSites.includes(site.siteId)){
        await admin.updateUser(user.id,{
          app_metadata:{...(user.appMetadata||{}),webfactory_site_ids:previousSites.filter((id)=>id!==site.siteId)},
        });
      }
    }
  }catch{}

  for(const member of site.members||[]){
    const email=normalizeEmail(member.email);
    if(email) await clientSiteStore().delete(`members/${emailHash(email)}/${site.siteId}.json`).catch(()=>{});
  }
  await clientSiteStore().delete(`slugs/${slugify(site.slug)}.json`).catch(()=>{});
  await clientOAuthStore().delete(`tokens/${site.siteId}.json`).catch(()=>{});

  const deletedCommerce=await deletePrefix(clientCommerceStore(),`${site.siteId}/`);
  const deletedAssets=await deletePrefix(clientAssetStore(),`sites/${site.siteId}/`);
  await deletePrefix(clientEventStore(),`${site.siteId}/`).catch(()=>0);
  await clientSiteStore().delete(siteKey(site.siteId));

  return {deleted:true,siteId:site.siteId,deletedCommerce,deletedAssets};
}

export async function removeUserFromSite(site,email){
  const normalized=normalizeEmail(email);
  const members=(site.members||[]).filter((member)=>normalizeEmail(member.email)!==normalized);
  await clientSiteStore().delete(`members/${emailHash(normalized)}/${site.siteId}.json`).catch(()=>{});
  if(members.length===(site.members||[]).length)return site;
  return saveClientSite({...site,members,revision:Number(site.revision||0)+1,updatedAt:new Date().toISOString()});
}

export async function deleteIdentityUser(user){
  if(!user?.id)return false;
  await admin.deleteUser({ id: user.id });
  return true;
}
