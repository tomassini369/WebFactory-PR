import {requireSiteCapability,errorResponse} from '../lib/client-auth.mjs';
import {clientCommerceStore,commerceKey} from '../lib/client-store.mjs';
export function createPosAttemptStatusHandler({authorize=requireSiteCapability,getStore=clientCommerceStore}={}){return async req=>{
 try{
  if(req.method!=='GET')return new Response(null,{status:405,headers:{Allow:'GET'}});
  const url=new URL(req.url),id=url.searchParams.get('saleAttemptId');
  if(!/^[a-zA-Z0-9_-]{8,120}$/.test(id||''))throw Object.assign(new Error('Invalid sale attempt.'),{status:400});
  const {site}=await authorize(url.searchParams.get('siteId'),'pos');
  const marker=await getStore().get(commerceKey(site.siteId,'pos-attempts',id),{type:'json'});
  if(marker&&marker.siteId!==site.siteId)throw Object.assign(new Error('POS attempt not found.'),{status:404});
  return Response.json({ok:true,status:marker?.status||'unknown',receiptId:marker?.status==='completed'?marker.receiptId||'':'',transactionId:marker?.transactionId||''},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return errorResponse(error)}
}}
export default createPosAttemptStatusHandler();
export const config={rateLimit:{windowLimit:60,windowSize:60,aggregateBy:['ip']}};
