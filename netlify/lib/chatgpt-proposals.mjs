import crypto from 'node:crypto';
import {clientOAuthStore,clientCommerceStore,getClientSite,patchClientSite,publicClientSite} from './client-store.mjs';
import {authorizeGrant,parseOperation,operationCapability,redesignSite,safeOutput} from './chatgpt-operations.mjs';
import {key,oauthError,hash,getGrant} from './chatgpt-oauth.mjs';
const handlers={
 'client-admin':()=>import('../functions/client-admin.mjs'),
 'client-commerce-admin':()=>import('../functions/client-commerce-admin.mjs'),
 'client-v3-admin':()=>import('../functions/client-v3-admin.mjs'),
 'client-member-access':()=>import('../functions/client-member-access.mjs'),
 'client-integration-management':()=>import('../functions/client-integration-management.mjs'),
 'client-pos-sale-idempotent':()=>import('../functions/client-pos-sale-idempotent.mjs'),
 'create-client-checkout':()=>import('../functions/create-client-checkout.mjs'),
 'cancel-subscription-renewal':()=>import('../functions/cancel-subscription-renewal.mjs'),
 'client-business-accounting':()=>import('../functions/client-business-accounting.mjs'),
 'create-trial-invite':()=>import('../functions/create-trial-invite.mjs'),
 'create-complimentary-invite':()=>import('../functions/create-complimentary-invite.mjs'),
 'manage-complimentary-access':()=>import('../functions/manage-complimentary-access.mjs'),
 'client-delete-account':()=>import('../functions/client-delete-account.mjs'),
 'admin-delete-client-site':()=>import('../functions/admin-delete-client-site.mjs'),
};
export function proposalKey(id){if(!/^[a-f0-9-]{36}$/.test(id||''))throw oauthError('Invalid proposal.');return key('proposals',id);}
export async function prepareProposal(grant,user,{operation,siteId,input,requestId},origin){
 if(!grant.scopes.includes('webfactory.propose'))throw oauthError('This connection is read-only.',403);
 if(!/^[a-f0-9-]{36}$/.test(requestId||''))throw oauthError('A UUID requestId is required for safe retries.');
 const {op,input:parsed}=parseOperation(operation,input),target=grant.platform?siteId:grant.siteId;
 if(!grant.platform&&siteId&&siteId!==target)throw oauthError('Cross-business access denied.',403);
 if(!target&&!['invite_trial','invite_complimentary'].includes(operation))throw oauthError('Select a business siteId.');
 const {site}=await authorizeGrant(grant,user,target,operationCapability(op,parsed),op);
 const store=clientOAuthStore(),id=crypto.createHash('sha256').update(grant.id+requestId).digest('hex').slice(0,32).replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/,'$1-$2-$3-$4-$5');
 const fingerprint=hash(JSON.stringify({operation,siteId:target,input:parsed}));
 const old=await store.get(proposalKey(id),{type:'json'});
 if(old){if(old.fingerprint!==fingerprint)throw oauthError('Use a new requestId for changed instructions.',409);return {id:old.id,status:old.status,approvalUrl:origin+'/chatgpt?proposal='+old.id};}
 const preview=operation==='redesign'?publicClientSite(redesignSite(site,parsed)):null;
 const ledger=operation==='accounting_entry'?await clientCommerceStore().get(`${target}/accounting/ledger.json`,{type:'json'}):null;
 const proposal={id,grantId:grant.id,userId:user.id,siteId:target||'',operation,input:parsed,description:op.description,siteRevision:site?.revision??null,ledgerRevision:ledger?.revision||0,businessName:site?.business?.name||'WebFactory PR',createdAt:Date.now(),expiresAt:Date.now()+3600000,status:'pending',fingerprint,preview};
 const saved=await store.setJSON(proposalKey(id),proposal,{onlyIfNew:true});if(!saved.modified)throw oauthError('Proposal already being prepared. Retry with the same requestId.',409);
 await store.setJSON(`chatgpt/proposal-users/${hash(user.id)}/${id}.json`,{id,userId:user.id});
 return {id,status:'pending',approvalUrl:origin+'/chatgpt?proposal='+id,requiresHumanConfirmation:true,summary:op.description||operation};
}
export async function executeProposal(id,user,request,context,confirmation){
 const store=clientOAuthStore(),k=proposalKey(id),stored=await store.getWithMetadata(k,{type:'json'}),p=stored?.data;
 if(!p||p.userId!==user.id)throw oauthError('Proposal unavailable.',404);
 if(p.status!=='pending')return {ok:p.status==='completed',status:p.status,result:p.result||null};
 if(p.expiresAt<Date.now())throw oauthError('Proposal expired. Request a new proposal.',409);
 const grant=await getGrant(store,p.grantId);
 const {op,input}=parseOperation(p.operation,p.input);
 const {site}=await authorizeGrant(grant,user,p.siteId,operationCapability(op,input),op);
 if(site&&site.revision!==p.siteRevision)throw oauthError('Business changed since this proposal. Generate a fresh preview.',409);
 const destructive=p.operation.includes('delete_business_page');
 if(confirmation!==(destructive?'DELETE PAGE':'CONFIRM'))throw oauthError('Type the required confirmation in WebFactory.');
 const claim=await store.setJSON(k,{...p,status:'processing',approvedAt:Date.now(),approvedBy:user.email},{onlyIfMatch:stored.etag});if(!claim.modified)throw oauthError('Proposal already being processed.',409);
 let result,status;
 try{
  if(p.operation==='redesign'){
   if(!['active','trialing','trial','complimentary'].includes(site.servicePlan?.subscriptionStatus))throw oauthError('An active plan is required for redesign.',403);
   const next=redesignSite(site,input);
   const updated=await patchClientSite(site.siteId,{business:next.business,design:next.design,features:next.features},{expectedRevision:p.siteRevision});
   result={ok:true,siteId:updated.siteId,url:new URL(request.url).origin+'/sites/'+updated.slug};
  }else{
   let body={...input,siteId:p.siteId,revision:p.siteRevision,...(op.action?{action:op.action}:{})};
   if(p.operation.startsWith('update_'))body.section=p.operation.slice(7);
   if(p.operation==='adjust_inventory')body.adjustmentId=p.id;
   if(p.operation==='record_pos_sale')body.saleAttemptId=p.id;
   if(p.operation==='accounting_entry')body={...input.entry,siteId:p.siteId,id:p.id,revision:p.ledgerRevision};
   if(destructive)body.confirmation='DELETE PAGE';
   const handler=(await handlers[op.endpoint]()).default;
   const origin=new URL(request.url).origin;
   const response=await handler(new Request(origin+'/.netlify/functions/'+op.endpoint,{method:op.method,headers:{'Content-Type':'application/json',origin},body:JSON.stringify(body)}),context);
   const output=await response.json();
   if(!response.ok||output.ok===false)throw oauthError(output.message||'Operation requires review.',response.status);
   result=safeOutput(output);
  }
  status='completed';
 }catch(error){status='review_required';result={ok:false,message:error.status&&error.status<500?error.message:'The outcome needs review in the portal. Do not retry automatically.'};}
 await store.setJSON(k,{...p,status,approvedAt:Date.now(),approvedBy:user.email,finishedAt:Date.now(),result});
 return {ok:status==='completed',status,result};
}
