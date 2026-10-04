import crypto from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {clientOAuthStore,getClientSite,patchClientSite} from './client-store.mjs';
import {getGrant,oauthError,hash} from './chatgpt-oauth.mjs';
import {authorizeGrant,parseOperation,operationCapability,redesignSite,safeOutput} from './chatgpt-operations.mjs';
import {normalizeClientSection} from '../functions/client-admin.mjs';

// Only explicit, existing configuration operations have a direct MCP writer.
// Money, integration disconnection and account deletion retain their portal flows.
export const executableOperations=['update_business','update_hours','update_catalog','update_employees','update_paymentRules','update_design','update_features','update_settings','redesign'];
const proposalKey=id=>{if(!/^[a-f0-9-]{36}$/.test(id||''))throw oauthError('Invalid proposal.');return 'chatgpt/proposals/'+hash(id)+'.json'};
export function configurationPatch(site,operation,input,user,membership){
 if(!executableOperations.includes(operation))throw oauthError('This operation requires its existing WebFactory portal flow.',403);
 if(operation==='redesign'){
  if(!['active','trialing','trial','complimentary'].includes(site.servicePlan?.subscriptionStatus))throw oauthError('An active plan is required for redesign.',403);
  const next=redesignSite(site,input);return {business:next.business,design:next.design,features:next.features};
 }
 const section=operation.slice(7);
 return {[section]:normalizeClientSection(site,section,input.value,user,membership)};
}
export function proposalSnapshot(site,operation,input,user,membership){
 const patch=configurationPatch(site,operation,input,user,membership);
 const currentState=safeOutput(Object.fromEntries(Object.keys(patch).map(k=>[k,site[k]??null]))),proposedState=safeOutput(patch);
 const diff=Object.keys(patch).filter(k=>!isDeepStrictEqual(currentState[k],proposedState[k])).map(path=>({path,before:currentState[path],after:proposedState[path]}));
 const removed=['catalog','employees'].some(k=>Array.isArray(currentState[k])&&currentState[k].some(x=>!proposedState[k]?.some(y=>y.id===x.id)));
 return {currentState,proposedState,diff,requiresAdditionalConfirmation:removed,requiredConfirmation:removed?'CONFIRM DELETION':'CONFIRM'};
}
export function proposalDigest(p){return hash(JSON.stringify({userId:p.userId,grantId:p.grantId,siteId:p.siteId,operation:p.operation,input:p.input,siteRevision:p.siteRevision,currentState:p.currentState,proposedState:p.proposedState,diff:p.diff,expiresAt:p.expiresAt}));}
export async function loadExecutableProposal(id,user,connection){
 const store=clientOAuthStore(),stored=await store.getWithMetadata(proposalKey(id),{type:'json'}),p=stored?.data;
 if(!p||p.userId!==user.id||(connection&&p.grantId!==connection.id))throw oauthError('Proposal unavailable.',404);
 const grant=await getGrant(store,p.grantId);
 if(connection&&(connection.siteId!==grant.siteId||connection.platform!==grant.platform))throw oauthError('Connection changed.',403);
 const {op,input}=parseOperation(p.operation,p.input);
 const access=await authorizeGrant(grant,user,p.siteId,operationCapability(op,input),op);
 if(p.expiresAt<=Date.now()&&['pending','confirmed'].includes(p.status)){
  await store.setJSON(proposalKey(id),{...p,status:'expired'},{onlyIfMatch:stored.etag});throw oauthError('Proposal expired. Prepare a new proposal.',409);
 }
 return {store,stored,p,grant,...access};
}
export async function confirmExecutableProposal(id,user,confirmation){
 const {store,stored,p,grant,site,membership}=await loadExecutableProposal(id,user);
 if(!p.executeViaMcp||!grant.scopes.includes('webfactory.execute'))throw oauthError('Explicit Execute authorization is required.',403);
 if(p.status!=='pending')throw oauthError('Proposal is no longer pending.',409);
 if(confirmation!==p.requiredConfirmation)throw oauthError('Type the exact confirmation after reviewing the changes.');
 if(site.revision!==p.siteRevision||proposalDigest(p)!==p.approvalDigest)throw oauthError('Proposal or business changed. Prepare a new proposal.',409);
 const snapshot=proposalSnapshot(site,p.operation,p.input,user,membership);
 if(!isDeepStrictEqual(snapshot.proposedState,p.proposedState))throw oauthError('Proposal changed.',409);
 const claimed=await store.setJSON(proposalKey(id),{...p,status:'confirmed',confirmedAt:Date.now(),confirmedBy:user.id},{onlyIfMatch:stored.etag});
 if(!claimed.modified)throw oauthError('Proposal changed.',409);
 return {ok:true,status:'confirmed',proposalId:id,next:'Return to ChatGPT and request execution of this proposal.'};
}
export async function getExecutableProposal(id,user,connection){const {p}=await loadExecutableProposal(id,user,connection);return safeOutput(p);}
export async function cancelExecutableProposal(id,user,connection){
 const {store,stored,p}=await loadExecutableProposal(id,user,connection);
 if(p.executionClaim||!['pending','confirmed'].includes(p.status))throw oauthError('Proposal cannot be cancelled.',409);
 const changed=await store.setJSON(proposalKey(id),{...p,status:'cancelled'},{onlyIfMatch:stored.etag});
 if(!changed.modified)throw oauthError('Proposal changed.',409);
 return {proposalId:id,status:'cancelled'};
}
export async function executeConfirmedProposal(id,user,connection){
 const {store,stored,p,grant,site,membership}=await loadExecutableProposal(id,user,connection);
 if(!grant.scopes.includes('webfactory.execute'))throw oauthError('Execute scope is required.',403);
 if(!p.executeViaMcp||p.status!=='confirmed'||p.confirmedBy!==user.id)throw oauthError('Confirm this exact proposal in WebFactory first.',409);
 if(p.approvalDigest!==proposalDigest(p))throw oauthError('Proposal integrity check failed.',409);
 if(site.revision!==p.siteRevision)throw oauthError('Business changed. Prepare a fresh proposal.',409);
 const snapshot=proposalSnapshot(site,p.operation,p.input,user,membership);
 if(!isDeepStrictEqual(snapshot.currentState,p.currentState)||!isDeepStrictEqual(snapshot.proposedState,p.proposedState))throw oauthError('Approved state changed.',409);
 if(p.executionClaim)throw oauthError('Proposal already claimed.',409);
 const auditId=crypto.randomUUID(),receiptKey='chatgpt/audit/'+auditId+'.json';
 // Claim the proposal atomically. Failed/incomplete executions cannot be replayed.
 const claim=await store.setJSON(proposalKey(id),{...p,status:'confirmed',executionClaim:auditId},{onlyIfMatch:stored.etag});
 if(!claim.modified||p.executionClaim)throw oauthError('Proposal already claimed.',409);
 const audit={auditId,proposalId:id,userId:user.id,email:user.email,role:grant.platform?'platform-admin':membership.role,actorType:grant.platform?'platform-admin action':'business-owner action',source:'chatgpt-mcp',siteId:p.siteId,action:p.operation,resource:p.resource,timestamp:new Date().toISOString(),before:p.currentState,after:null,result:'started',verified:false,success:false,sanitizedError:null};
 await store.setJSON(receiptKey,audit,{onlyIfNew:true});
 let status='failed',after=null,verified=false,sanitizedError=null;
 try{
  // Recheck live permission immediately before writing (revocation is never cached).
  const live=await getGrant(store,p.grantId);
  if(!live.scopes.includes('webfactory.execute'))throw oauthError('Execute permission revoked.',403);
  await authorizeGrant(live,user,p.siteId,operationCapability(parseOperation(p.operation,p.input).op,p.input));
  const patch=configurationPatch(site,p.operation,p.input,user,membership);
  await patchClientSite(p.siteId,patch,{expectedRevision:p.siteRevision});
  const read=await getClientSite(p.siteId);
  after=safeOutput(Object.fromEntries(Object.keys(patch).map(k=>[k,read?.[k]??null])));
  verified=isDeepStrictEqual(after,p.proposedState);
  if(!verified)throw oauthError('Read-after-write verification failed. Review the portal; do not retry automatically.',409);
  status='executed';
 }catch(error){sanitizedError=error.status&&error.status<500?error.message:'Execution outcome requires review. Do not retry automatically.';}
 const receipt={...audit,after,result:status,verified,success:status==='executed',sanitizedError,finishedAt:new Date().toISOString()};
 await store.setJSON(receiptKey,receipt);
 await store.setJSON(proposalKey(id),{...p,status,executionClaim:auditId,auditId,finishedAt:Date.now(),result:receipt});
 return {ok:receipt.success,status,verified,auditId,proposalId:id,receipt};
}
