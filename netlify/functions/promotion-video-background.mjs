import {assertSameOrigin} from '../lib/client-auth.mjs';
import {clientAssetStore} from '../lib/client-store.mjs';
import {uploadKey} from '../lib/promotion-upload-access.mjs';
import {encodePromotionVideo} from '../lib/encode-promotion-video.mjs';

export default async req=>{
 if(req.method!=='POST')return;
 assertSameOrigin(req);
 const url=new URL(req.url),key=await uploadKey(url),db=clientAssetStore();
 const draft=await db.getWithMetadata(key,{type:'arrayBuffer'}),meta=draft?.metadata;
 if(!draft?.etag||meta.id!==url.searchParams.get('upload')||meta.state!=='queued'||meta.expires<Date.now())return;
 const processing={...meta,state:'processing'};
 const lock=await db.set(key,draft.data,{onlyIfMatch:draft.etag,metadata:processing});
 if(!lock.modified)return;
 const lease=await db.getMetadata(key);
 if(!lease?.etag||lease.metadata.id!==meta.id||lease.metadata.state!=='processing')return;
 try{
  const {bytes,type}=await encodePromotionVideo(draft.data);
  await db.set(key,Uint8Array.from(bytes).buffer,{onlyIfMatch:lease.etag,metadata:{...processing,type,state:'ready'}});
 }catch{
  await db.set(key,new ArrayBuffer(0),{onlyIfMatch:lease.etag,metadata:{...processing,state:'failed'}});
 }
};
