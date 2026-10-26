import {consumerConsent,CONSUMER_POLICY_VERSION} from './consumer-policy.mjs';
import crypto from 'node:crypto';
import {publicClientSite} from './client-store.mjs';
import {siteEntitlement} from './subscription-billing.mjs';
import {municipalities} from '../../src/marketplace-model.ts';

const text=(v,n=160)=>typeof v==='string'?v.trim().slice(0,n):'';
const fold=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const slugPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const consumerKey=id=>`marketplace/consumers/${crypto.createHash('sha256').update(id).digest('hex')}.json`;
export function discoverableSite(site){
 return Boolean(site&&!site.deletedAt&&['active','trial'].includes(site.status)&&slugPattern.test(site.slug||'')&&siteEntitlement(site).public);
}
function categoryFor(site){
 const value=fold(site.business?.category);
 for(const [id,pattern] of [['barberias',/barber/],['belleza',/beauty|salon|belleza|cosmet/],['comida',/restaurant|food|comida|cafe|cater|bartend/],['tiendas',/retail|shop|store|tienda/],['bienestar',/health|wellness|salud|bienestar|fitness/],['talleres',/auto|carwash|mecan|taller/],['mascotas',/pet|mascot/]])if(pattern.test(value))return id;
 return 'servicios';
}
export function directoryEntry(site){
 if(!discoverableSite(site))return null;
 const pub=publicClientSite(site),b=pub.business;
 const locations=b.locations.map(l=>({name:text(l.name),address:text(l.address,350),mapsUrl:safeMap(l.mapsUrl)}));
 const towns=municipalities.filter(town=>locations.some(l=>new RegExp(`(?:^|[^a-z])${fold(town)}(?:$|[^a-z])`).test(fold(l.address))));
 return {slug:site.slug,name:text(b.name),nameEn:text(b.nameEn),nameEs:text(b.nameEs),category:categoryFor(site),categoryLabel:text(b.category),description:text(b.description,400),descriptionEn:text(b.descriptionEn,400),descriptionEs:text(b.descriptionEs,400),municipalities:towns,locations,heroUrl:b.heroUrl,logoUrl:b.logoUrl,galleryUrls:b.galleryUrls.slice(0,12),services:pub.catalog.slice(0,12).map(i=>({id:i.id,name:text(i.name),nameEn:text(i.nameEn),nameEs:text(i.nameEs),price:Number.isFinite(i.price)&&i.price>=0?i.price:null,type:i.type,imageUrl:i.imageUrl,requiresAppointment:i.requiresAppointment}))};
}
function safeMap(value){try{const url=new URL(value);return url.protocol==='https:'&&['maps.google.com','www.google.com','google.com','maps.app.goo.gl','goo.gl'].includes(url.hostname)?url.href:''}catch{return ''}}
// A bounded directory read uses only the same canonical sites as public storefronts.
// Never scan commerce, members, Identity or OAuth stores to populate discovery.
export async function readDirectory(store,{maxSites=250,budgetMs=6000,clock=Date.now}={}){
 const entries=[],start=clock();let count=0,truncated=false;
 outer:for await(const page of store.list({prefix:'sites/',paginate:true})){
  for(let i=0;i<(page.blobs||[]).length;){
   if(count>=maxSites||clock()-start>budgetMs){truncated=true;break outer}
   const batch=page.blobs.slice(i,i+Math.min(10,maxSites-count));count+=batch.length;i+=batch.length;
   const loaded=await Promise.all(batch.map(async({key})=>{
    if(!/^sites\/[a-zA-Z0-9_-]{1,120}\.json$/.test(key))return null;
    const site=await store.get(key,{type:'json'});
    if(site&&key!==`sites/${site.siteId}.json`)throw new Error('Invalid directory record.');
    return directoryEntry(site);
   }));entries.push(...loaded.filter(Boolean));
  }
 }
 return {entries:entries.sort((a,b)=>a.name.localeCompare(b.name)),truncated};
}
export function publicConsumer(profile,user){
 const restricted=profile?.status==='minor_review',deleted=profile?.status==='deleted';
 const needsAcceptance=profile?.consent?.version!==CONSUMER_POLICY_VERSION||deleted;
 if(restricted||needsAcceptance)return {name:'',municipality:'',favorites:[],following:[],revision:Number(profile?.revision||0),needsAcceptance,restricted};
 return {needsAcceptance:false,restricted:false,name:text(profile?.name||user.name,100),municipality:municipalities.includes(profile?.municipality)?profile.municipality:'',following:Array.isArray(profile?.following)?profile.following.filter(v=>typeof v==='string'&&v.length<=64&&slugPattern.test(v)).slice(0,100):[],favorites:Array.isArray(profile?.favorites)?profile.favorites.filter(v=>typeof v==='string'&&v.length<=64&&slugPattern.test(v)).slice(0,100):[],revision:Number(profile?.revision||0)};
}
export async function updateConsumer(store,user,payload,loadBySlug){
 const key=consumerKey(user.id),record=await store.getWithMetadata(key,{type:'json'});
 const current=publicConsumer(record?.data,user);
 if(!Number.isInteger(payload.revision)||payload.revision!==current.revision)throw Object.assign(new Error('Profile changed. Reload before saving.'),{status:409});
 let next;
 if(payload.action==='minor_review'||payload.action==='delete_profile'){
  if(payload.confirmation!==(payload.action==='minor_review'?'REVIEW MINOR':'DELETE PROFILE'))throw Object.assign(new Error('Confirmation required.'),{status:400});
  next={name:'',municipality:'',favorites:[],following:[],status:payload.action==='minor_review'||record?.data?.status==='minor_review'?'minor_review':'deleted',requestedAt:new Date().toISOString()};
 }else if(payload.action==='accept_policy'){
  if(record?.data?.status==='minor_review')throw Object.assign(new Error('Eligibility review required.'),{status:403});
  const consent=consumerConsent(payload);
  next={...publicConsumer({...record?.data,consent,status:'active'},user),consent,status:'active'};
 }else if(current.restricted||current.needsAcceptance)throw Object.assign(new Error('Consumer eligibility and policy acceptance required.'),{status:403});
 else if(payload.action==='profile'){
  const name=text(payload.name,100),municipality=text(payload.municipality);
  if(!name||municipality&&!municipalities.includes(municipality))throw Object.assign(new Error('Invalid profile.'),{status:400});
  next={...current,name,municipality};
 }else if(['favorite','follow'].includes(payload.action)){
  const slug=text(payload.slug,64);
  if(!slugPattern.test(slug)||typeof payload.saved!=='boolean')throw Object.assign(new Error('Invalid favorite.'),{status:400});
  if(payload.saved&&!discoverableSite(await loadBySlug(slug)))throw Object.assign(new Error('Business unavailable.'),{status:404});
  const field=payload.action==='follow'?'following':'favorites',favorites=current[field].filter(v=>v!==slug);
  if(payload.saved){if(favorites.length>=100)throw Object.assign(new Error('Favorite limit reached.'),{status:400});favorites.push(slug)}
  next={...current,[field]:favorites};
 }else throw Object.assign(new Error('Invalid profile action.'),{status:400});
 next={...(record?.data||{}),...next,revision:current.revision+1};
 if(['minor_review','delete_profile'].includes(payload.action))next={name:'',municipality:'',favorites:[],following:[],status:next.status,requestedAt:next.requestedAt,revision:next.revision,reviewEpoch:Number(record?.data?.reviewEpoch||0)+1,...(record?.data?.reviewHistory?{reviewHistory:record.data.reviewHistory}:{})};
 if(record&&!record.etag)throw Object.assign(new Error('Profile unavailable.'),{status:503});
 const result=await store.setJSON(key,next,record?{onlyIfMatch:record.etag}:{onlyIfNew:true});
 if(!result.modified)throw Object.assign(new Error('Profile changed. Reload before saving.'),{status:409});
 return publicConsumer(next,user);
}
export async function recordConsumerConsent(store,user,consent){
 const key=consumerKey(user.id);
 // Signup never overwrites an existing profile, restriction or acceptance.
 await store.setJSON(key,{name:'',municipality:'',favorites:[],following:[],revision:0,status:'active',consent},{onlyIfNew:true});
}
