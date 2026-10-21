import crypto from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {activeMembership} from './commercial-access.mjs';

const normalized=value=>String(value||'').trim().toLowerCase();
export function changedMembershipEmails(before=[],after=[]){
 const previous=new Map(before.map(member=>[normalized(member.email),member])),next=new Map(after.map(member=>[normalized(member.email),member]));
 return [...new Set([...previous.keys(),...next.keys()])].filter(email=>email&&!isDeepStrictEqual(previous.get(email),next.get(email)));
}
export const memberIndexKey=(email,siteId)=>`members/${crypto.createHash('sha256').update(normalized(email)).digest('hex')}/${siteId}.json`;
const currentMember=(site,email)=>site&&!site.deletedAt&&site.status!=='deleted'&&(site.members||[]).find(m=>normalized(m.email)===email&&activeMembership(m));

// Projections never authorize access. Read canonical membership even when the
// index or a still-valid Identity token contains a revoked relationship.
export async function currentIndexedSites(store,email){
 const target=normalized(email);if(!target)return [];
 const sites=new Map();
 for await(const page of store.list({prefix:memberIndexKey(target,'').replace(/\.json$/,''),paginate:true})){
  for(const blob of page.blobs||[]){
   const index=await store.get(blob.key,{type:'json'});
   if(index?.email!==target||!index.siteId)continue;
   const site=await store.get(`sites/${index.siteId}.json`,{type:'json'});
   if(currentMember(site,target))sites.set(site.siteId,site);
  }
 }
 return [...sites.values()];
}

// Tombstones retain revision ordering. An older save must not overwrite an
// index produced by a concurrent regrant. Never delete a possibly newer grant.
export async function repairMemberIndex(store,siteId,email){
 const target=normalized(email),key=memberIndexKey(target,siteId);
 for(let attempt=0;attempt<5;attempt++){
  const canonical=await store.get(`sites/${siteId}.json`,{type:'json'});
  const revision=Number(canonical?.revision||0);
  const previous=await store.getWithMetadata(key,{type:'json'});
  if(previous&&!previous.etag)throw Object.assign(new Error('Membership concurrency metadata unavailable.'),{status:503});
  if(Number(previous?.data?.revision||0)>revision)return;
  const member=currentMember(canonical,target);
  const value={siteId,email:target,revision,active:Boolean(member),...(member?{role:member.role}:{})};
  const saved=await store.setJSON(key,value,previous?{onlyIfMatch:previous.etag}:{onlyIfNew:true});
  if(!saved.modified)continue;
  const latest=await store.get(`sites/${siteId}.json`,{type:'json'});
  if(Number(latest?.revision||0)===revision)return;
 }
 throw Object.assign(new Error('Membership index changed. Reload before retrying.'),{status:409});
}
