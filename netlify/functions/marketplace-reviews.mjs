import crypto from 'node:crypto';
import {assertSameOrigin,requireClientUser,requirePlatformAdmin,errorResponse} from '../lib/client-auth.mjs';
import {readAuthPayload,authJson} from '../lib/auth-gateway.mjs';
import {clientCommerceStore,clientSiteStore,getClientSiteBySlug} from '../lib/client-store.mjs';
import {consumerKey,publicConsumer,discoverableSite} from '../lib/marketplace.mjs';
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const slugOK=s=>typeof s==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)&&s.length<=64;
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const reviewKey=(slug,id)=>`marketplace-reviews/${slug}/${hash(slug+':'+id)}.json`;
const projection=r=>({id:r.id,alias:r.alias,rating:r.rating,text:r.text,updatedAt:r.updatedAt,revision:r.revision});
const reasons=['privacy','spam','conflict','threat','irrelevant','experience_unsubstantiated'];
function text(value,min,max){if(typeof value!=='string'||value.trim().length<min||value.length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f<>]/.test(value))throw fail('Invalid review text.');return value.trim()}
export function createReviewsHandler({store=clientCommerceStore,profiles=clientSiteStore,user=requireClientUser,admin=requirePlatformAdmin,site=getClientSiteBySlug,clock=Date.now}={}){return async req=>{try{
 if(!['GET','POST'].includes(req.method))return new Response(null,{status:405,headers:{Allow:'GET, POST'}});
 assertSameOrigin(req);const url=new URL(req.url),input=req.method==='POST'?await readAuthPayload(req):Object.fromEntries(url.searchParams);
 if(!slugOK(input.slug))throw fail('Invalid business.');const business=await site(input.slug);if(!discoverableSite(business))throw fail('Business unavailable.',404);
 const db=store(),profileStore=profiles();
 if(req.method==='GET'&&input.scope==='mine'){const actor=await user();if(!actor.confirmedAt)throw fail('Confirm your email.',403);const row=await db.get(reviewKey(input.slug,actor.id),{type:'json'});return authJson({ok:true,review:row?{...projection(row),status:row.status,revision:row.revision,reason:row.reason||''}:null});}
 if(req.method==='GET'){
  if(input.scope&&input.scope!=='admin')throw fail('Invalid scope.');const internal=input.scope==='admin';if(internal)await admin();
  const offset=Number(input.offset||0);if(!Number.isSafeInteger(offset)||offset<0||offset>10000)throw fail('Invalid review page.');
  const rows=[];let scanned=0,truncated=false;outer:for await(const page of db.list({prefix:`marketplace-reviews/${input.slug}/`,paginate:true}))for(const blob of page.blobs||[]){scanned++;if(scanned<=offset)continue;if(scanned>offset+20){truncated=true;break outer}const row=await db.get(blob.key,{type:'json'});if(!row||row.slug!==input.slug)continue;
   if(internal)rows.push({...projection(row),status:row.status,revision:row.revision,reason:row.reason||'',reports:row.reports?.length||0,history:row.history||[]});
   else if(row.status==='published'){const p=await profileStore.get(row.authorKey,{type:'json'});if(p&&p.status==='active'&&Number(p.reviewEpoch||0)===Number(row.authorEpoch||0))rows.push(projection(row));}
  }
  rows.sort((a,b)=>b.updatedAt-a.updatedAt);return authJson({ok:true,reviews:rows,count:rows.length,truncated,nextOffset:truncated?offset+20:null,average:!internal&&!truncated&&offset===0&&rows.length?Math.round(rows.reduce((sum,r)=>sum+r.rating,0)/rows.length*10)/10:null});
 }
 if(input.action==='moderate'){
  const actor=await admin();if(input.reviewed!==true||!['publish','reject'].includes(input.decision)||input.decision==='reject'&&!reasons.includes(input.reason))throw fail('A neutral moderation decision is required.');
  if(typeof input.id!=='string'||!/^[a-f0-9]{64}$/.test(input.id))throw fail('Invalid reference.');
  const key=`marketplace-reviews/${input.slug}/${input.id}.json`,saved=await db.getWithMetadata(key,{type:'json'});if(!saved?.data||saved.data.slug!==input.slug)throw fail('Review unavailable.',404);if(saved.data.status==='withdrawn')throw fail('Withdrawn review.',409);
  return await save(key,saved,{...saved.data,status:input.decision==='publish'?'published':'rejected',reason:input.decision==='publish'?'compliant':input.reason,history:[...(saved.data.history||[]),{at:clock(),actor:actor.id,decision:input.decision,reason:input.decision==='publish'?'compliant':input.reason}]},input.revision);
 }
 const actor=await user();if(!actor.confirmedAt)throw fail('Confirm your email.',403);const profile=await profileStore.get(consumerKey(actor.id),{type:'json'}),eligible=publicConsumer(profile,actor);if(eligible.needsAcceptance||eligible.restricted)throw fail('Consumer eligibility and policy acceptance required.',403);
 if(input.action==='report'){
  if(!/^[a-f0-9]{64}$/.test(input.id||'')||!reasons.includes(input.reason))throw fail('Select a reporting reason.');const key=`marketplace-reviews/${input.slug}/${input.id}.json`,row=await db.getWithMetadata(key,{type:'json'});if(!row?.data||row.data.status!=='published')throw fail('Review unavailable.',404);const reporter=hash(actor.id);if(row.data.reports?.some(r=>r.reporter===reporter))return authJson({ok:true});if((row.data.reports||[]).length>=50)throw fail('Report limit reached.',409);
  return await save(key,row,{...row.data,reports:[...(row.data.reports||[]),{reporter,reason:input.reason,at:clock()}]},input.revision);
 }
 const key=reviewKey(input.slug,actor.id),saved=await db.getWithMetadata(key,{type:'json'});
 if(input.action==='withdraw')return await save(key,saved,{...saved?.data,id:hash(input.slug+':'+actor.id),slug:input.slug,authorKey:consumerKey(actor.id),alias:'',text:'',rating:0,status:'withdrawn',reason:'author_withdrawal'},input.revision);
 if(input.action!=='submit')throw fail('Invalid action.');if(input.experienced!==true||input.independent!==true)throw fail('Confirm an independent actual experience.');
 if((business.members||[]).some(m=>String(m.email||'').toLowerCase()===String(actor.email).toLowerCase()||m.userId===actor.id))throw fail('Business insiders cannot submit a review here.',403);
 if(!Number.isInteger(input.rating)||input.rating<1||input.rating>5)throw fail('Rating must be 1–5.');
 const next={...saved?.data,authorEpoch:Number(profile.reviewEpoch||0),id:hash(input.slug+':'+actor.id),slug:input.slug,authorKey:consumerKey(actor.id),alias:text(input.alias,2,40),text:text(input.text,20,2000),rating:input.rating,status:'pending',reason:'',attestationVersion:'2026-10-25-r1',createdAt:saved?.data?.createdAt||clock()};
 return await save(key,saved,next,input.revision);
 async function save(key,saved,next,revision){
  if(!Number.isSafeInteger(revision)||revision!==(saved?.data?.revision||0))throw fail('Review changed; reload.',409);if(saved&&!saved.etag)throw fail('Concurrency unavailable.',503);if((next.history||[]).length>50)throw fail('Administrative archival required.',409);
  next={...next,revision:revision+1,updatedAt:clock()};const result=await db.setJSON(key,next,saved?{onlyIfMatch:saved.etag}:{onlyIfNew:true});if(!result.modified)throw fail('Review changed; reload.',409);return authJson({ok:true});
 }
 }catch(error){return errorResponse(error)}}}
export default createReviewsHandler();
export const config={rateLimit:{windowLimit:20,windowSize:60,aggregateBy:['ip']}};
