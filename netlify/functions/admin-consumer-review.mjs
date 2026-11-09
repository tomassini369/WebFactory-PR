import {requirePlatformAdmin,assertSameOrigin,errorResponse} from '../lib/client-auth.mjs';
import {readAuthPayload,authJson} from '../lib/auth-gateway.mjs';
import {clientSiteStore} from '../lib/client-store.mjs';
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const valid=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const key=id=>`marketplace/consumers/${id}.json`;
const summary=(id,row)=>({id,status:row.status,revision:Number(row.revision||0),requestedAt:row.requestedAt||null,lastReview:row.reviewHistory?.at(-1)?{decision:row.reviewHistory.at(-1).decision,at:row.reviewHistory.at(-1).at}:null});
export function createConsumerReviewHandler({authorize=requirePlatformAdmin,getStore=clientSiteStore,clock=Date.now}={}){return async req=>{
 try{
  if(!['GET','POST'].includes(req.method))return new Response(null,{status:405,headers:{Allow:'GET, POST','Cache-Control':'no-store'}});
  assertSameOrigin(req);const actor=await authorize(),store=getStore();
  if(req.method==='GET'){
   const id=new URL(req.url).searchParams.get('id');
   if(id){if(!valid(id))throw fail('Invalid review reference.');const row=await store.get(key(id),{type:'json'});if(!row||row.status!=='minor_review'&&!row.reviewHistory?.length)throw fail('Review unavailable.',404);return authJson({ok:true,request:{...summary(id,row),history:(row.reviewHistory||[]).map(({decision,at,actor,reason})=>({decision,at,actor,reason}))}});}
   const rows=[];let count=0;const start=clock();
   for await(const page of store.list({prefix:'marketplace/consumers/',paginate:true}))for(const blob of page.blobs||[]){
    if(++count>1000||clock()-start>6000)throw fail('Review list limit reached. Contact support for a scoped review.',503);
    const id=blob.key.match(/^marketplace\/consumers\/([a-f0-9]{64})\.json$/)?.[1];if(!id)continue;
    const row=await store.get(blob.key,{type:'json'});if(row?.status==='minor_review')rows.push(summary(id,row));
   }
   return authJson({ok:true,requests:rows.sort((a,b)=>String(b.requestedAt).localeCompare(String(a.requestedAt)))});
  }
  const input=await readAuthPayload(req);
  if(input.action!=='review'||!valid(input.id)||!['allow_reattest','keep_restricted'].includes(input.decision)||input.reviewCompleted!==true||!Number.isSafeInteger(input.revision)||input.revision<0)throw fail('A completed eligibility review and current request are required.');
  if(typeof input.reason!=='string'||input.reason.trim().length<10||input.reason.length>1000||/[\x00-\x1f]/.test(input.reason))throw fail('Record a concise review reason without identity documents or sensitive personal information.');
  const row=await store.getWithMetadata(key(input.id),{type:'json'});
  if(!row?.data||row.data.status!=='minor_review')throw fail('Pending review unavailable.',404);
  if(!row.etag)throw fail('Concurrency protection unavailable.',503);
  if(Number(row.data.revision||0)!==input.revision)throw fail('Review changed. Reload before deciding.',409);
  const history=row.data.reviewHistory||[];if(!Array.isArray(history)||history.length>=25)throw fail('Review history limit requires supervised archival.',409);
  const review={decision:input.decision,at:new Date(clock()).toISOString(),actor:actor.id,reason:input.reason.trim(),reviewCompleted:true};
  // A cleared restriction requires fresh self-attestation; erased profile data is never restored.
  const next={reviewEpoch:Number(row.data.reviewEpoch||0),name:'',municipality:'',favorites:[],status:input.decision==='allow_reattest'?'eligibility_reviewed':'minor_review',revision:input.revision+1,requestedAt:row.data.requestedAt,reviewHistory:[...history,review]};
  const result=await store.setJSON(key(input.id),next,{onlyIfMatch:row.etag});if(!result.modified)throw fail('Review changed. Reload before deciding.',409);
  return authJson({ok:true,request:summary(input.id,next)});
 }catch(error){return errorResponse(error)}
}}
export default createConsumerReviewHandler();
export const config={rateLimit:{windowLimit:30,windowSize:60,aggregateBy:['ip']}};
