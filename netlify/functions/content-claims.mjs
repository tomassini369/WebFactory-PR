import crypto from 'node:crypto';
import {assertSameOrigin,requirePlatformAdmin,requireSiteAccess,errorResponse} from '../lib/client-auth.mjs';
import {clientCommerceStore,getClientSiteBySlug} from '../lib/client-store.mjs';
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const key=id=>`content-claims/${id}.json`;
const summary=row=>({id:row.id,siteId:row.siteId,status:row.status,createdAt:row.createdAt,updatedAt:row.updatedAt,hasCounter:Boolean(row.counter),revision:Number(row.revision||0)});
const ownerView=row=>({...summary(row),work:row.work,contentUrl:row.contentUrl,statement:row.statement,counterSubmitted:Boolean(row.counter),history:(row.history||[]).map(({action,at})=>({action,at}))});
const valid=id=>/^[a-f0-9-]{36}$/.test(id||'');
function text(input,name,max,min=1){const value=input[name];if(typeof value!=='string'||value.trim().length<min||value.length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value))throw fail(`Invalid ${name} / Revisa ${name}.`);return value.trim()}
function attest(input,names){for(const name of names)if(input[name]!==true)throw fail('All legal declarations are required / Se requieren las declaraciones legales.');}
export function createContentClaimsHandler({getStore=clientCommerceStore,admin=requirePlatformAdmin,owner=id=>requireSiteAccess(id,['owner']),getSiteBySlug=getClientSiteBySlug,clock=Date.now,uuid=crypto.randomUUID,allowSubmit=true,intakeOnly=false}={}){return async req=>{
 try{
  if(!['GET','POST'].includes(req.method))return new Response(null,{status:405,headers:{...headers,Allow:'GET, POST'}});
  if(intakeOnly&&req.method!=='POST')return new Response(null,{status:405,headers:{...headers,Allow:'POST'}});
  assertSameOrigin(req);const store=getStore(),url=new URL(req.url);
  if(req.method==='GET'){
   const siteId=url.searchParams.get('siteId');if(siteId)await owner(siteId);else await admin();const id=url.searchParams.get('id');
   if(id){if(!valid(id))throw fail('Invalid reference.');const row=await store.get(key(id),{type:'json'});if(!row||siteId&&row.siteId!==siteId)throw fail('Not found.',404);return Response.json({ok:true,claim:siteId?ownerView(row):{...row,revision:Number(row.revision||0)}},{headers});}
   const rows=[];let count=0;for await(const page of store.list({prefix:'content-claims/',paginate:true}))for(const blob of page.blobs||[]){if(++count>1000)throw fail('Use a case reference / Usa una referencia de caso.',503);const row=await store.get(blob.key,{type:'json'});if(row&&(!siteId||row.siteId===siteId))rows.push(summary(row));}
   return Response.json({ok:true,claims:rows.sort((a,b)=>b.createdAt-a.createdAt)},{headers});
  }
  const raw=await req.text();if(raw.length>16000)throw fail('Request too large.',413);const input=JSON.parse(raw);if(!input||typeof input!=='object'||Array.isArray(input))throw fail('Invalid request.');
  if(intakeOnly&&input.action!=='submit')throw fail('Intake accepts notices only.',405);
  if(input.action==='submit'){
   if(!allowSubmit)throw fail('Use the copyright intake form.',405);
   if(input.website)throw fail('Invalid request.');
   const contentUrl=text(input,'contentUrl',1500);let target;try{target=new URL(contentUrl)}catch{throw fail('Use the business content URL / Usa la URL del contenido del negocio.');}
   const match=target.pathname.match(/^\/sites\/([a-z0-9-]+)(?:\/|$)/);if(target.origin!==url.origin||!match)throw fail('Use a business storefront URL on this platform / Usa una URL del negocio en esta plataforma.');
   const site=await getSiteBySlug(match[1]);if(!site||site.deletedAt)throw fail('Business unavailable / Negocio no disponible.',404);
   const email=text(input,'email',320);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw fail('Invalid email.');
   attest(input,['goodFaith','accuracyAuthority','legalConsent']);
   const id=uuid(),now=clock(),row={id,revision:1,siteId:site.siteId,status:'received',createdAt:now,updatedAt:now,claimant:{name:text(input,'claimantName',180),email,phone:text(input,'phone',80),address:text(input,'address',1000)},work:text(input,'work',4000,10),contentUrl,statement:text(input,'statement',4000,10),signature:text(input,'signature',180),noticeVersion:'2026-10-25-preview',declarations:{goodFaith:true,accuracyAuthority:true,legalConsent:true},history:[{action:'received',at:now}]};
   const saved=await store.setJSON(key(id),row,{onlyIfNew:true});if(!saved.modified)throw fail('Please retry / Intenta nuevamente.',409);
   return Response.json({ok:true,claimId:id,status:'received'},{status:201,headers});
  }
  if(!valid(input.id))throw fail('Invalid reference.');
  // Authenticate before reading a case: opaque references are not credentials.
  let actor;if(input.action==='review')actor=await admin();else if(input.action==='counter'){if(typeof input.siteId!=='string')throw fail('Business required.');actor=(await owner(input.siteId)).user;}else throw fail('Invalid action.');
  const saved=await store.getWithMetadata(key(input.id),{type:'json'});if(!saved?.data)throw fail('Not found.',404);if(!saved.etag)throw fail('Concurrency metadata unavailable.',503);const current=saved.data,now=clock();if(!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision!==Number(current.revision||0))throw fail('Case changed; reload before retrying.',409);let next;
  if(input.action==='counter'){
   if(current.siteId!==input.siteId)throw fail('Access denied.',403);
   attest(input,['consentJurisdiction','perjury','serviceConsent']);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(input.email||'')))throw fail('Invalid email.');if(current.counter)throw fail('Counter-notice already recorded.',409);
   next={...current,counter:{name:text(input,'claimantName',180),email:text(input,'email',320),address:text(input,'address',1000),phone:text(input,'phone',80),removedUrl:text(input,'removedUrl',1500),statement:text(input,'statement',4000,10),signature:text(input,'signature',180),consentJurisdiction:true,perjury:true,serviceConsent:true,at:now},status:'counter_received'};
  }else{
   if(!['under_review','rejected','restriction_requested','restoration_requested','closed'].includes(input.status))throw fail('Invalid review status.');
   if(current.history.length>=200)throw fail('Case history limit; administrative archival required.',409);
   next={...current,status:input.status};
  }
  const reason=input.action==='review'?text(input,'reason',2000,10):'Counter-notice submitted by authenticated business owner';
  next.revision=Number(current.revision||0)+1;next.updatedAt=now;next.history=[...current.history,{action:next.status,at:now,actor:actor.id,reason}];
  const changed=await store.setJSON(key(input.id),next,{onlyIfMatch:saved.etag});if(!changed.modified)throw fail('Case changed; reload before retrying.',409);
  return Response.json({ok:true,claimId:next.id,status:next.status},{headers});
 }catch(error){return errorResponse(error instanceof SyntaxError?fail('Invalid JSON.'):error)}
}}
export default createContentClaimsHandler({allowSubmit:false});
export const config={rateLimit:{windowLimit:60,windowSize:60,aggregateBy:['ip']}};
