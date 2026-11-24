import crypto from 'node:crypto';
import {assertSameOrigin,errorResponse,requireMarketplaceUser,requireSiteAccess} from '../lib/client-auth.mjs';
import {clientSiteStore,clientAssetStore} from '../lib/client-store.mjs';
import {consumerKey,publicConsumer} from '../lib/marketplace.mjs';
import {adFail} from '../lib/marketplace-ads.mjs';
import {maxMedia,draftKey,prepareMedia} from '../lib/promotion-media.mjs';
export function createUploadHandler({assets=clientAssetStore,profiles=clientSiteStore,owner=requireSiteAccess,consumer=requireMarketplaceUser}={}){return async req=>{
 try{
  assertSameOrigin(req);
  const url=new URL(req.url),siteId=url.searchParams.get('siteId');
  let actor;
  if(siteId)actor=(await owner(siteId,['owner'])).user;
  else{
   actor=await consumer();
   const profile=publicConsumer(await profiles().get(consumerKey(actor.id),{type:'json'}),actor);
   if(!actor.confirmedAt||profile.restricted||profile.needsAcceptance)throw adFail('Eligible account required.',403);
  }
  const db=assets(),headers={'Tus-Resumable':'1.0.0','Cache-Control':'private, no-store'};
  const slot=url.searchParams.get('slot');
  if(!/^[0-3]$/.test(slot||''))throw adFail('Invalid file slot.');
  const key=draftKey(JSON.stringify([actor.id,siteId||null]),slot);
  if(req.method==='POST'){
   const length=Number(req.headers.get('Upload-Length'));
   if(!Number.isSafeInteger(length)||length<1||length>maxMedia)throw adFail('Maximum file size is 4 MB.',413);
   const id=crypto.randomUUID();url.searchParams.set('upload',id);
   await db.set(key,new ArrayBuffer(0),{metadata:{id,length,offset:0,expires:Date.now()+86400000}});
   return new Response(null,{status:201,headers:{...headers,Location:url.pathname+url.search}});
  }
  if(!['HEAD','PATCH'].includes(req.method))throw adFail('Method not supported.',405);
  const draft=await db.getWithMetadata(key,{type:'arrayBuffer'}),meta=draft?.metadata;
  if(!meta||meta.id!==url.searchParams.get('upload')||meta.expires<Date.now())throw adFail('Upload expired.',404);
  if(req.method==='HEAD')return new Response(null,{headers:{...headers,'Upload-Length':String(meta.length),'Upload-Offset':String(meta.offset)}});
  if(!draft.etag||!req.headers.has('Upload-Offset')||Number(req.headers.get('Upload-Offset'))!==meta.offset||meta.type)throw adFail('Upload offset changed.',409);
  if(req.headers.get('content-type')!=='application/offset+octet-stream')throw adFail('Unsupported content.',415);
  const reader=req.body?.getReader();if(!reader)throw adFail('Empty upload.');
  const parts=[Buffer.from(draft.data)];let offset=meta.offset;
  while(true){const {done,value}=await reader.read();if(done)break;offset+=value.length;if(offset>meta.length||offset-meta.offset>1024*1024){await reader.cancel();throw adFail('Chunk too large.',413)}parts.push(Buffer.from(value))}
  const raw=Buffer.concat(parts),result=offset===meta.length?await prepareMedia(raw):{bytes:raw};
  const saved=await db.set(key,Uint8Array.from(result.bytes).buffer,{onlyIfMatch:draft.etag,metadata:{...meta,offset,...(result.type?{type:result.type}:{})}});
  if(!saved.modified)throw adFail('Upload changed.',409);
  return new Response(null,{status:204,headers:{...headers,'Upload-Offset':String(offset)}});
 }catch(error){return errorResponse(error)}
}}
export default createUploadHandler();
export const config={rateLimit:{windowLimit:160,windowSize:60,aggregateBy:['ip']}};
