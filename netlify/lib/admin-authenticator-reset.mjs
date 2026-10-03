import {renderSecurityResetEmail} from "./platform-email-template.mjs";
import crypto from 'node:crypto';
import {assertRecentSecondFactor,userPrefix} from './mfa-security.mjs';
import {isPlatformAdmin} from './client-auth.mjs';
import {withBookingLock} from './booking-lock.mjs';
const fail=(message,status=400)=>Object.assign(Error(message),{status});
export function validateResetRequest(payload){
 if(typeof payload.requestId!=='string'||!/^[a-f0-9-]{36}$/.test(payload.requestId))throw fail('Invalid request ID.');
 if(payload.confirmation!=='RESET AUTHENTICATOR'||payload.requestedByClient!==true||payload.identityVerified!==true||payload.verificationMethod!=='registered-contact-and-business-verification')throw fail('Client request and independent identity verification are required.');
 for(const name of ['reason','requestReference'])if(typeof payload[name]!=='string'||payload[name].trim().length<8||payload[name].length>300||/[\x00-\x1f]/.test(payload[name]))throw fail('Provide a reason and support reference without sensitive documents.');
 return {requestId:payload.requestId,reason:payload.reason.trim(),requestReference:payload.requestReference.trim(),verificationMethod:payload.verificationMethod};
}
export async function resetClientAuthenticator({actor,target,siteId,context,store,payload,notify,clock=Date.now}){
 const input=validateResetRequest(payload);
 if(!isPlatformAdmin(actor)||!actor?.id||!target?.id||!target.email||isPlatformAdmin(target)||actor.id===target.id)throw fail('Only client accounts may be reset by an authorized platform administrator.',403);
 await assertRecentSecondFactor(actor,context,store,clock());
 return withBookingLock(store,`${userPrefix(target)}lock`,async()=>{
  await assertRecentSecondFactor(actor,context,store,clock());
  const profileKey=`${userPrefix(target)}profile.json`,auditKey=`support-resets/${input.requestId}.json`;
  const previous=await store.get(auditKey,{type:'json'}),profile=await store.get(profileKey,{type:'json'});
  if(previous){
   if(previous.targetId!==target.id||previous.actorId!==actor.id||previous.siteId!==siteId||previous.requestReference!==input.requestReference)throw fail('Reset reference already used.',409);
   if(profile?.lastResetAuditId!==input.requestId)throw fail('Previous reset did not complete. Review audit before using a new request.',409);
   return {ok:true,auditId:input.requestId,notification:previous.notification==='accepted'?'accepted':'review_required',passkeysPreserved:profile.credentials?.length||0};
  }
  if(!profile?.totp)throw fail('This client has no configured Authenticator.',409);
  const at=new Date(clock()).toISOString();
  const audit={...input,siteId,targetId:target.id,actorId:actor.id,createdAt:at,status:'prepared',notification:'not_attempted'};
  const claim=await store.setJSON(auditKey,audit,{onlyIfNew:true});if(!claim.modified)throw fail('Reset request already in progress.',409);
  const next={...profile,version:crypto.randomUUID(),resetEpoch:crypto.randomUUID(),forceMfa:true,codes:[],lastResetAuditId:input.requestId};delete next.totp;
  await store.setJSON(profileKey,next);
  const verified=await store.get(profileKey,{type:'json'});if(verified?.resetEpoch!==next.resetEpoch||verified?.totp)throw fail('Reset could not be verified. Review the audit.',503);
  // Persist the notification claim before SMTP. An uncertain send is never retried.
  await store.setJSON(auditKey,{...audit,status:'reset',notification:'sending'});
  let notification='review_required';
  try{const sent=await notify({category:'support',to:target.email,...renderSecurityResetEmail({requestId:input.requestId,at}),timeoutMs:6000});if(sent?.accepted?.some(email=>String(email).toLowerCase()===target.email.toLowerCase()))notification='accepted';}catch{}
  await store.setJSON(auditKey,{...audit,status:'reset',notification,completedAt:new Date(clock()).toISOString()});
  return {ok:true,auditId:input.requestId,notification,passkeysPreserved:next.credentials?.length||0};
 });
}
