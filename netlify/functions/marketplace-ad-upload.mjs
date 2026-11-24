import {uploadKey} from '../lib/promotion-upload-access.mjs';
import crypto from 'node:crypto';
import {assertSameOrigin,errorResponse,requireMarketplaceUser,requireSiteAccess} from '../lib/client-auth.mjs';
import {clientSiteStore,clientAssetStore} from '../lib/client-store.mjs';
import {adFail} from '../lib/marketplace-ads.mjs';
import {maxMedia,prepareMedia} from '../lib/promotion-media.mjs';
export function createUploadHandler({assets=clientAssetStore,profiles=clientSiteStore,owner=requireSiteAccess,consumer=requireMarketplaceUser}={}){return async req=>{
 try{
  assertSameOrigin(req);
  const url=new URL(req.url),key=await uploadKey(url,{profiles,owner,consumer}),db=assets();
  const headers={'Tus-Resumable':'1.0.0','Cache-Control':'private, no-store'};
  const original=url.searchParams.get('video')==='1';
  if(req.method==='GET'){
   const entry=await db.getMetadata(key),meta=entry?.metadata;
   if(!meta||meta.id!==url.searchParams.get('upload')||meta.expires<Date.now())throw adFail('Upload expired.',404);
   if(url.searchParams.has('asset')){
    if(meta.type!=='video/mp4')throw adFail('Not ready.',409);
    const data=await db.getWithMetadata(key,{type:'arrayBuffer'});
    if(data?.metadata?.id!==meta.id||data.metadata.type!=='video/mp4')throw adFail('Upload changed.',409);
    return new Response(data.data,{headers:{...headers,'Content-Type':'video/mp4'}});
   }
   return Response.json({state:meta.type?'ready':meta.state||'uploading'},{headers});
  }
  if(req.method==='POST'){
   const length=Number(req.headers.get('Upload-Length'));
   if(!Number.isSafeInteger(length)||length<1||length>(original?32*1024*1024:maxMedia))throw adFail('File exceeds the upload limit.',413);
   const id=crypto.randomUUID();url.searchParams.set('upload',id);
   await db.set(key,new ArrayBuffer(0),{metadata:{id,length,original,offset:0,expires:Date.now()+86400000}});
   return new Response(null,{status:201,headers:{...headers,Location:url.pathname+url.search}});
  }
  if(!['HEAD','PATCH'].includes(req.method))throw adFail('Method not supported.',405);
  const draft=await db.getWithMetadata(key,{type:'arrayBuffer'}),meta=draft?.metadata;
  if(!meta||meta.id!==url.searchParams.get('upload')||meta.expires<Date.now())throw adFail('Upload expired.',404);
  if(req.method==='HEAD')return new Response(null,{headers:{...headers,'Upload-Length':String(meta.length),'Upload-Offset':String(meta.offset)}});
  if(!draft.etag||!req.headers.has('Upload-Offset')||Number(req.headers.get('Upload-Offset'))!==meta.offset||meta.type||meta.state)throw adFail('Upload offset changed.',409);
  if(req.headers.get('content-type')!=='application/offset+octet-stream')throw adFail('Unsupported content.',415);
  const reader=req.body?.getReader();if(!reader)throw adFail('Empty upload.');
  const parts=[Buffer.from(draft.data)];let offset=meta.offset;
  while(true){const {done,value}=await reader.read();if(done)break;offset+=value.length;if(offset>meta.length||offset-meta.offset>1024*1024){await reader.cancel();throw adFail('Chunk too large.',413)}parts.push(Buffer.from(value))}
  const raw=Buffer.concat(parts),result=offset===meta.length&&!meta.original?await prepareMedia(raw):{bytes:raw};
  const saved=await db.set(key,Uint8Array.from(result.bytes).buffer,{onlyIfMatch:draft.etag,metadata:{...meta,offset,...(meta.original&&offset===meta.length?{state:'queued'}:{}),...(result.type?{type:result.type}:{})}});
  if(!saved.modified)throw adFail('Upload changed.',409);
  return new Response(null,{status:204,headers:{...headers,'Upload-Offset':String(offset)}});
 }catch(error){return errorResponse(error)}
}}
export default createUploadHandler();
export const config={rateLimit:{windowLimit:160,windowSize:60,aggregateBy:['ip']}};
