import {requireMarketplaceUser,requireSiteAccess} from './client-auth.mjs';
import {clientSiteStore} from './client-store.mjs';
import {consumerKey,publicConsumer} from './marketplace.mjs';
import {adFail} from './marketplace-ads.mjs';
import {draftKey} from './promotion-media.mjs';

export async function uploadKey(url,{profiles=clientSiteStore,owner=requireSiteAccess,consumer=requireMarketplaceUser}={}){
 const siteId=url.searchParams.get('siteId'),slot=url.searchParams.get('slot');
 if(!/^[0-3]$/.test(slot||''))throw adFail('Invalid file slot.');
 let actor;
 if(siteId)actor=(await owner(siteId,['owner'])).user;
 else{
  actor=await consumer();
  const profile=publicConsumer(await profiles().get(consumerKey(actor.id),{type:'json'}),actor);
  if(!actor.confirmedAt||profile.restricted||profile.needsAcceptance)throw adFail('Eligible account required.',403);
 }
 return draftKey(JSON.stringify([actor.id,siteId||null]),slot);
}
