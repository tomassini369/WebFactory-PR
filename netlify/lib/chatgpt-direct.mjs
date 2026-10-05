import {clientOAuthStore} from './client-store.mjs';
import {oauthError} from './chatgpt-oauth.mjs';
import {prepareProposal,proposalKey,executeProposal} from './chatgpt-proposals.mjs';
import {confirmExecutableProposal,executeConfirmedProposal} from './chatgpt-execution.mjs';
import {safeOutput} from './chatgpt-operations.mjs';

const finished=new Set(['executed','completed','failed','review_required','cancelled','expired','rejected']);

function priorResult(p){
 if(p.status==='executed'){
  const receipt=p.result||{};
  return {ok:Boolean(receipt.success),status:p.status,verified:Boolean(receipt.verified),auditId:p.auditId||receipt.auditId||null,actionId:p.id,result:safeOutput(receipt)};
 }
 return {ok:p.status==='completed',status:p.status,actionId:p.id,result:safeOutput(p.result||null)};
}

async function storedAction(id,user,grant){
 const p=await clientOAuthStore().get(proposalKey(id),{type:'json'});
 if(!p||p.userId!==user.id||p.grantId!==grant.id)throw oauthError('Action unavailable.',404);
 return p;
}

async function executeStored(p,user,grant,request,context){
 if(p.executeViaMcp){
  if(p.status==='pending')await confirmExecutableProposal(p.id,user,p.requiredConfirmation);
  const latest=await storedAction(p.id,user,grant);
  if(finished.has(latest.status))return priorResult(latest);
  if(latest.status!=='confirmed')throw oauthError('Action is not ready to execute.',409);
  return executeConfirmedProposal(p.id,user,grant);
 }
 if(finished.has(p.status))return priorResult(p);
 return executeProposal(p.id,user,request,context,p.requiredConfirmation);
}

export async function requestDirectAction(grant,user,{operation,siteId,input,requestId},origin,request,context={}){
 if(!grant.scopes.includes('webfactory.execute'))throw oauthError('Direct Execute permission is required.',403);
 const prepared=await prepareProposal(grant,user,{operation,siteId,input,requestId},origin);
 const p=await storedAction(prepared.id,user,grant);
 if(finished.has(p.status))return priorResult(p);
 if(p.requiresChatConfirmation){
  return {
   ok:false,
   status:'confirmation_required',
   confirmationId:p.id,
   actionId:p.id,
   operation:p.operation,
   businessName:p.businessName,
   summary:p.description||p.operation,
   requiredConfirmation:p.requiredConfirmation,
   expiresAt:p.expiresAt,
   currentState:safeOutput(p.currentState),
   proposedState:safeOutput(p.proposedState),
   diff:safeOutput(p.diff),
   next:'Ask the user to type the exact requiredConfirmation in this chat. Then call wf_confirm_action with this confirmationId and the exact user-provided text. Do not open WebFactory for approval.'
  };
 }
 return executeStored(p,user,grant,request,context);
}

export async function confirmDirectAction(grant,user,{confirmationId,confirmationText},request,context={}){
 if(!grant.scopes.includes('webfactory.execute'))throw oauthError('Direct Execute permission is required.',403);
 const p=await storedAction(confirmationId,user,grant);
 if(finished.has(p.status))return priorResult(p);
 if(!p.requiresChatConfirmation)throw oauthError('This action does not require chat confirmation.',409);
 if(p.expiresAt<=Date.now())throw oauthError('Confirmation expired. Request the action again.',409);
 if(confirmationText!==p.requiredConfirmation)throw oauthError('The confirmation text must exactly match the requested phrase.');
 return executeStored(p,user,grant,request,context);
}
