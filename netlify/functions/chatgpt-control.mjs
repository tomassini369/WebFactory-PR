import {confirmExecutableProposal,cancelExecutableProposal} from '../lib/chatgpt-execution.mjs';
import {requireClientUser,assertSameOrigin,isPlatformAdmin,requireSiteAccess} from '../lib/client-auth.mjs';
import {clientOAuthStore,sitesForEmail} from '../lib/client-store.mjs';
import {consent,key,hash,oauthError,revokeGrant,revokeExecute} from '../lib/chatgpt-oauth.mjs';
import {proposalKey,executeProposal} from '../lib/chatgpt-proposals.mjs';
import {safeOutput} from '../lib/chatgpt-operations.mjs';
const json={type:'json'};
async function indexed(store,prefix,field,kind){const rows=[];for await(const page of store.list({prefix,paginate:true}))for(const blob of page.blobs||[]){if(rows.length>=100)break;const entry=await store.get(blob.key,json);const row=entry&&await store.get(kind==='proposals'?proposalKey(entry[field]):key(kind,entry[field]),json);if(row)rows.push(row);}return rows.sort((a,b)=>b.createdAt-a.createdAt);}
export default async function handler(req,context){
 const respond=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
 try{
  assertSameOrigin(req);const user=await requireClientUser(),store=clientOAuthStore(),url=new URL(req.url);
  if(req.method==='GET'){
   const requestId=url.searchParams.get('authorize'),proposalId=url.searchParams.get('proposal');
   let authorization=null,proposal=null;
   if(requestId){const r=await store.get(key('requests',requestId),json);if(!r||r.used||r.expiresAt<Date.now()||r.origin!==url.origin)throw oauthError('Authorization expired. Start again from ChatGPT.',409);authorization={scopes:r.scopes,expiresAt:r.expiresAt};}
   if(proposalId){proposal=await store.get(proposalKey(proposalId),json);if(!proposal||proposal.userId!==user.id)throw oauthError('Proposal unavailable.',404);}
   const sites=(await sitesForEmail(user.email)).filter(s=>s.status!=='deleted'&&(isPlatformAdmin(user)||s.members?.some(m=>m.email?.toLowerCase()===user.email.toLowerCase()&&m.role==='owner'))).map(s=>({siteId:s.siteId,name:s.business?.name||s.slug}));
   const grants=(await indexed(store,`chatgpt/users/${hash(user.id)}/`,'grantId','grants')).map(g=>({id:g.id,siteId:g.siteId,platform:g.platform,scopes:g.scopes,createdAt:g.createdAt,expiresAt:g.expiresAt,revoked:g.revoked}));
   const proposals=(await indexed(store,`chatgpt/proposal-users/${hash(user.id)}/`,'id','proposals')).map(p=>({id:p.id,businessName:p.businessName,operation:p.operation,status:p.status,createdAt:p.createdAt}));
   return respond({ok:true,email:user.email,platformAdmin:isPlatformAdmin(user),sites,grants,proposals,authorization,proposal:safeOutput(proposal)});
  }
  if(req.method!=='POST')return respond({ok:false,message:'Method not allowed.'},405);
  const raw=await req.text();if(raw.length>12000)throw oauthError('Request too large.',413);const body=JSON.parse(raw);
  if(body.action==='consent'){
   const r=await store.get(key('requests',body.requestId),json);if(!r||r.origin!==url.origin)throw oauthError('Invalid authorization request.');
   if(body.platform===true){if(!isPlatformAdmin(user))throw oauthError('Administrator access required.',403);}else {const {site}=await requireSiteAccess(body.siteId,['owner']);if(site.status==='deleted')throw oauthError('Business unavailable.',404);}
   return respond({ok:true,...await consent(store,body.requestId,user,{siteId:body.siteId,platform:body.platform===true,allowWrites:body.allowWrites===true,allowExecute:body.allowExecute===true})});
  }
  if(body.action==='revoke'){const g=await store.get(key('grants',body.grantId),json);if(!g||g.userId!==user.id)throw oauthError('Connection unavailable.',404);await revokeGrant(store,g.id);return respond({ok:true});}
  if(body.action==='revoke_execute'){const g=await store.get(key('grants',body.grantId),json);if(!g||g.userId!==user.id)throw oauthError('Connection unavailable.',404);await revokeExecute(store,g.id);return respond({ok:true});}
  if(body.action==='approve'){
   const p=await store.get(proposalKey(body.proposalId),json);
   if(p?.executeViaMcp)return respond(await confirmExecutableProposal(body.proposalId,user,body.confirmation));
   return respond(await executeProposal(body.proposalId,user,req,context,body.confirmation));
  }
  if(body.action==='cancel')return respond({ok:true,...await cancelExecutableProposal(body.proposalId,user)});
  if(body.action==='reject'){const existing=await store.get(proposalKey(body.proposalId),json);if(existing?.executeViaMcp)return respond({ok:true,...await cancelExecutableProposal(body.proposalId,user)});const k=proposalKey(body.proposalId),saved=await store.getWithMetadata(k,json);if(!saved?.data||saved.data.userId!==user.id)throw oauthError('Proposal unavailable.',404);if(saved.data.status!=='pending')throw oauthError('Proposal no longer pending.',409);const result=await store.setJSON(k,{...saved.data,status:'rejected'},{onlyIfMatch:saved.etag});if(!result.modified)throw oauthError('Proposal changed.',409);return respond({ok:true});}
  throw oauthError('Unknown action.');
 }catch(e){return respond({ok:false,message:e.status&&e.status<500?e.message:'Unable to complete request.'},e.status||500);}
}
