import {clientAssetStore,clientCommerceStore,getClientSiteBySlug} from '../lib/client-store.mjs';
import {errorResponse,requirePlatformAdmin,requireMarketplaceUser,requireSiteAccess} from '../lib/client-auth.mjs';
import {adId,adKey,adFail} from '../lib/marketplace-ads.mjs';
import {discoverableSite} from '../lib/marketplace.mjs';
import {assetKey} from '../lib/promotion-media.mjs';
import {musicResponse} from './client-asset.mjs';
export default async req=>{
 try{
  if(!['GET','HEAD'].includes(req.method))throw adFail('Method not allowed.',405);
  const params=new URL(req.url).searchParams,id=params.get('id'),index=params.get('index');
  if(!adId(id)||!/^[0-3]$/.test(index||''))throw adFail('Invalid file.',404);
  const row=await clientCommerceStore().get(adKey(id),{type:'json'}),entry=row?.media?.[index];
  if(!entry)throw adFail('File unavailable.',404);
  if(params.get('review')==='1')await requirePlatformAdmin();
  else if(params.get('own')==='1'){
   if(row.kind==='external'){if((await requireMarketplaceUser()).id!==row.createdBy)throw adFail('Unavailable.',404)}
   else await requireSiteAccess(row.siteId,['owner']);
  }else{
   if(row.moderation!=='approved'||row.status!=='paid'||!row.paidAt||!(row.endsAt>Date.now()))throw adFail('Unavailable.',404);
   if(row.kind!=='external'){const site=await getClientSiteBySlug(row.slug);if(!discoverableSite(site)||site.siteId!==row.siteId)throw adFail('Unavailable.',404)}
  }
  const bytes=await clientAssetStore().get(assetKey(id,index),{type:'arrayBuffer'});if(!bytes)throw adFail('Unavailable.',404);
  const response=musicResponse(bytes,req.headers.get('Range'),false);response.headers.set('Content-Type',entry.type);
  return req.method==='HEAD'?new Response(null,{headers:response.headers,status:response.status}):response;
 }catch(error){return errorResponse(error)}
};
