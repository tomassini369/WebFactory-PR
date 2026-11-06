import crypto from 'node:crypto';
import {getStore} from '@netlify/blobs';
import {clientCommerceStore} from './client-store.mjs';

// Share device identity across releases, but keep each preview's sale snapshot
// separate. Catalog, orders, payments and credentials stay in their usual store.
export function scopedDisplayStore(commerce,registry,generation){
 const device=key=>/^pos-displays\/[a-f0-9]{32}\.json$/.test(key);
 const project=row=>row?{...row.metadata,...(row.snapshots?.[generation]||{sequence:0,updatedAt:0,draft:null,attemptId:''})}:null;
 return {
  async get(key,options){return device(key)?project(await registry.get(key,options)):commerce.get(key,options)},
  async getWithMetadata(key,options){
   if(!device(key))return commerce.getWithMetadata(key,options);
   const row=await registry.getWithMetadata(key,options);return row?{...row,data:project(row.data)}:null;
  },
  async setJSON(key,data,options={}){
   if(!device(key))return commerce.setJSON(key,data,options);
   const row=await registry.getWithMetadata(key,{type:'json'});
   if(options.onlyIfNew&&row||options.onlyIfMatch&&row?.etag!==options.onlyIfMatch)return {modified:false};
   const {sequence,updatedAt,draft,attemptId,...metadata}=data;
   const previous=row?.data?.snapshots||{};
   const retained=Object.keys(previous).filter(id=>id!==generation).sort((a,b)=>(previous[b].updatedAt||0)-(previous[a].updatedAt||0)).slice(0,3);
   const snapshots=Object.fromEntries(retained.map(id=>[id,previous[id]]));
   snapshots[generation]={sequence,updatedAt,draft,attemptId};
   return registry.setJSON(key,{metadata,snapshots},options);
  },
 };
}
export function customerDisplayStore(requestUrl){
 const commerce=clientCommerceStore(),deploy=globalThis.Netlify?.context?.deploy;
 if(deploy?.context!=='deploy-preview'||!deploy.id)return commerce;
 const scope=crypto.createHash('sha256').update(new URL(requestUrl).hostname).digest('hex').slice(0,24);
 const registry=getStore(`webfactory-preview-display-${scope}`,{consistency:'strong'});
 return scopedDisplayStore(commerce,registry,deploy.id);
}
