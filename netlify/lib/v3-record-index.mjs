import crypto from 'node:crypto';
const json={type:'json'},version=1;
const pattern=/^([^/]+)\/v3\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)\.json$/;
export const v3IndexStateKey=(site,collection)=>`${site}/v3-order-v1/${collection}/state.json`;
const prefix=(site,collection)=>`${site}/v3-order-v1/${collection}/rows/`;
export const paymentLinkTokenKey=(site,token)=>`${site}/payment-link-tokens-v1/${crypto.createHash('sha256').update(token).digest('hex')}.json`;
function reference(key,row){
 const match=pattern.exec(key);if(!match||!row||row.siteId!==match[1])return null;
 const stamp=Date.parse(row.updatedAt||row.createdAt||'');
 const reversed=String(9999999999999-(Number.isFinite(stamp)?Math.max(0,Math.min(9999999999999,stamp)):0)).padStart(13,'0');
 return {key:prefix(match[1],match[2])+reversed+'/'+match[3]+'.json',siteId:match[1],collection:match[2],id:match[3]};
}
async function writeReference(store,key,row,{backfill=false}={}){
 const ref=reference(key,row);if(!ref)return;
 await store.setJSON(ref.key,{version},{onlyIfNew:true});
 if(ref.collection==='payment-links'&&typeof row.token==='string'&&row.token.length<=200){
  const pointerKey=paymentLinkTokenKey(ref.siteId,row.token),previous=await store.getWithMetadata(pointerKey,json);
  if(previous?.data?.paymentLinkId===ref.id&&previous.data.siteId===ref.siteId)return;
  if(previous){
   if(!previous.etag)throw Object.assign(new Error('Payment link index unavailable.'),{status:503});
   const oldId=previous.data?.paymentLinkId;
   const old=typeof oldId==='string'&&/^[a-zA-Z0-9_.-]+$/.test(oldId)?await store.get(`${ref.siteId}/v3/payment-links/${oldId}.json`,json):null;
   if(old?.siteId===ref.siteId&&old.token===row.token){if(!backfill)throw Object.assign(new Error('Payment link token already exists.'),{status:409});if((Date.parse(old.updatedAt||old.createdAt)||0)>=(Date.parse(row.updatedAt||row.createdAt)||0))return;}
  }
  const result=await store.setJSON(pointerKey,{siteId:ref.siteId,paymentLinkId:ref.id},previous?{onlyIfMatch:previous.etag}:{onlyIfNew:true});
  if(result.modified===false)throw Object.assign(new Error('Payment link changed. Please retry.'),{status:409});
 }
}
// References precede canonical writes; readers verify every reference against the canonical row.
export function withV3RecordIndex(store){return new Proxy(store,{get(target,property){if(property==='setJSON')return async(key,row,options)=>{if(pattern.test(key))await writeReference(target,key,row);return target.setJSON(key,row,options)};const value=Reflect.get(target,property,target);return typeof value==='function'?value.bind(target):value}});}
async function keys(store,start){
 const result=[],pages=store.list({prefix:start,paginate:true});
 for await(const page of pages[Symbol.asyncIterator]?pages:[await pages])for(const blob of page.blobs||[])result.push(blob.key);
 return result.sort();
}
export async function prepareV3Index(store,site,collection,{clock=Date.now,budgetMs=5000}={}){
 const stateKey=v3IndexStateKey(site,collection),saved=await store.getWithMetadata(stateKey,json);
 if(saved?.data?.version===version&&saved.data.siteId===site&&saved.data.status==='ready')return true;
 if(saved&&!saved.etag)throw Object.assign(new Error('History concurrency metadata unavailable.'),{status:503});
 const after=saved?.data?.version===version?saved.data.after||'':'';
 const pending=(await keys(store,`${site}/v3/${collection}/`)).filter(key=>key>after),started=clock();
 let last=after,processed=0;
 for(let offset=0;offset<pending.length;offset+=8){
  const batch=pending.slice(offset,offset+8);
  await Promise.all(batch.map(async key=>{const row=await store.get(key,json);await writeReference(store,key,row,{backfill:true})}));
  last=batch.at(-1);processed+=batch.length;
  if(clock()-started>=budgetMs)break;
 }
 const ready=processed===pending.length;
 const result=await store.setJSON(stateKey,{version,siteId:site,status:ready?'ready':'building',after:last},saved?{onlyIfMatch:saved.etag}:{onlyIfNew:true});
 return ready&&result.modified!==false;
}
export async function listIndexedV3Records(store,site,collection,{limit=250,cursor='',clock=Date.now}={}){
 if(!await prepareV3Index(store,site,collection,{clock}))throw Object.assign(new Error('El historial se está preparando. Intenta nuevamente. / History is being prepared. Please retry.'),{status:503});
 const size=Math.max(1,Math.min(1000,Math.floor(Number(limit)||250))),start=prefix(site,collection);
 if(cursor&&(!cursor.startsWith(start)||!/^\d{13}\/[a-zA-Z0-9_.-]+\.json$/.test(cursor.slice(start.length))))throw Object.assign(new Error('Invalid history cursor.'),{status:400});
 const refs=(await keys(store,start)).filter(key=>!cursor||key>cursor),cache=new Map(),rows=[];
 for(let offset=0;offset<refs.length&&rows.length<=size;offset+=8){
  const batch=refs.slice(offset,offset+8);
  const loaded=await Promise.all(batch.map(async key=>{
   const suffix=key.slice(start.length),match=/^\d{13}\/([a-zA-Z0-9_.-]+)\.json$/.exec(suffix);if(!match)return null;
   const canonical=`${site}/v3/${collection}/${match[1]}.json`;
   if(!cache.has(canonical))cache.set(canonical,store.get(canonical,json));
   const row=await cache.get(canonical);return row&&reference(canonical,row)?.key===key?{row,key}:null;
  }));rows.push(...loaded.filter(Boolean));
 }
 return {records:rows.slice(0,size).map(entry=>entry.row),nextCursor:rows.length>size?rows[size-1].key:null};
}
export async function findIndexedPaymentLink(store,site,token){
 if(typeof token!=='string'||!token||token.length>200)return null;
 const lookup=async()=>{const pointer=await store.get(paymentLinkTokenKey(site,token),json);if(pointer?.siteId!==site||typeof pointer.paymentLinkId!=='string'||!/^[a-zA-Z0-9_.-]+$/.test(pointer.paymentLinkId))return null;const row=await store.get(`${site}/v3/payment-links/${pointer.paymentLinkId}.json`,json);return row?.siteId===site&&row.token===token?row:null};
 const existing=await lookup();if(existing)return existing;
 if(!await prepareV3Index(store,site,'payment-links'))throw Object.assign(new Error('El enlace se está preparando. Intenta nuevamente. / This link is being prepared. Please retry.'),{status:503});
 return lookup();
}
