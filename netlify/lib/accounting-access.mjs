import crypto from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {FINANCIAL_ROLES,normalizeFinancialPermissions,professionalCredential} from './financial-permissions.mjs';

const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const email=value=>String(value||'').trim().toLowerCase();
const text=(value,max=200)=>String(value||'').trim().slice(0,max);
export const tokenHash=token=>crypto.createHash('sha256').update(String(token)).digest('hex');
export const accountingManaged=member=>Boolean(member?.financialManaged||FINANCIAL_ROLES.includes(member?.role));
const protectedFields=['financialManaged','financialRole','financialPermissions','financialUserId','financialStatus','professionalCredential'];

// Generic site editors cannot manufacture or erase grants, invitation secrets,
// or audit history. Only the dedicated, authorized CAS mutation can change them.
export function protectAccountingState(previous,next){
 if(!isDeepStrictEqual(previous?.accountingAccess,next.accountingAccess))throw fail('Use Accounting Access to change financial authorization / Usa Acceso contable.',403);
 const before=new Map((previous?.members||[]).map(member=>[email(member.email),member]));
 for(const member of next.members||[]){
  const old=before.get(email(member.email));
  for(const field of protectedFields)if(!isDeepStrictEqual(old?.[field],member[field]))throw fail('Financial permissions are server-managed / Los permisos financieros se administran en Acceso contable.',403);
  if(FINANCIAL_ROLES.includes(member.role)&&member.role!==old?.role)throw fail('Use Accounting Access for professional roles.',403);
 }
 for(const old of before.values())if(accountingManaged(old)&&!(next.members||[]).some(member=>email(member.email)===email(old.email)))throw fail('Revoke financial access through Accounting Access first / Revoca primero el acceso contable.',409);
 return next;
}
function permissions(value){
 const selected=normalizeFinancialPermissions(value);
 if(!selected.length||selected.includes('accounting.access.manage'))throw fail('Select explicit permissions. Access management remains owner-only / Selecciona permisos. Solo el propietario administra accesos.');
 return selected;
}
function role(value){if(!FINANCIAL_ROLES.includes(value))throw fail('Select a professional role / Selecciona un rol profesional.');return value;}
function audit(state,event){
 const previous=state.audit.at(-1)?.hash||'';
 const record={...event,previous};
 state.audit.push({...record,hash:tokenHash(JSON.stringify(record))});
 if(state.audit.length>2000||Buffer.byteLength(JSON.stringify(state))>1024*1024)throw fail('Access audit retention limit reached. Contact support; no records were discarded.',413);
}
export function verifyAccessAudit(records){
 let previous='';for(const row of records){const {hash,...record}=row;if(record.previous!==previous||tokenHash(JSON.stringify(record))!==hash)return false;previous=hash;}return true;
}
export function accessView(site){
 const state=site.accountingAccess||{invitations:[],audit:[]};
 return {revision:Number(site.revision||0),members:(site.members||[]).filter(accountingManaged).map(member=>({email:member.email,role:member.financialRole||member.role,permissions:member.financialPermissions||[],status:member.financialStatus||'active',credential:professionalCredential(member)})),invitations:(state.invitations||[]).map(({tokenHash:secret,...invitation})=>invitation),audit:state.audit||[]};
}

export function changeAccountingAccess(site,input,user,{now=Date.now(),token='',platformAdmin=false}={}){
 const actor=email(user?.email),subject=String(user?.id||user?.sub||'');
 if(!actor||!subject)throw fail('Verified identity required.',401);
 const owner=(site.members||[]).some(member=>email(member.email)===actor&&member.role==='owner'&&!member.revokedAt&&!member.suspendedAt);
 const action=input.action;
 if(action!=='accept'&&!owner&&!platformAdmin)throw fail('Only the business owner can manage accounting access / Solo el propietario administra el acceso contable.',403);
 if(site.deletedAt||site.status==='deleted')throw fail('Business not found.',404);
 if(input.revision!==undefined&&input.revision!==Number(site.revision||0))throw fail('Business changed. Reload before saving / El negocio cambió. Recarga antes de guardar.',409);
 const next=structuredClone(site),state=next.accountingAccess||{version:1,invitations:[],audit:[]};next.accountingAccess=state;
 const at=new Date(now).toISOString(),target=email(input.email);
 let detail={};
 if(action==='invite'){
  if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(target))throw fail('A valid email is required / Se requiere un email válido.');
  if((site.members||[]).some(member=>email(member.email)===target&&member.role==='owner'))throw fail('The owner already has access.',409);
  if(!/^[A-Za-z0-9_-]{43,100}$/.test(token))throw fail('Secure invitation token unavailable.',503);
  for(const invitation of state.invitations)if(invitation.email===target&&invitation.status==='pending')invitation.status='replaced';
  const invitation={id:crypto.randomUUID(),email:target,role:role(input.role),permissions:permissions(input.permissions),status:'pending',createdAt:at,expiresAt:new Date(now+7*86400000).toISOString(),tokenHash:tokenHash(token)};
  state.invitations.push(invitation);detail={invitationId:invitation.id,role:invitation.role,permissions:invitation.permissions};
 }else if(action==='accept'){
  const hash=tokenHash(input.token),invitation=state.invitations.find(item=>item.tokenHash===hash);
  if(!invitation||invitation.status!=='pending'||invitation.email!==actor||Date.parse(invitation.expiresAt)<=now)throw fail('Invitation invalid, expired or already used / Invitación inválida, vencida o ya utilizada.',403);
  const existing=(next.members||[]).find(member=>email(member.email)===actor);
  if(existing?.role==='owner'||existing?.financialUserId&&existing.financialUserId!==subject)throw fail('Identity does not match the existing authorization.',403);
  const member={...(existing||{email:actor,role:invitation.role,locationIds:[]}),financialManaged:true,financialRole:invitation.role,financialPermissions:invitation.permissions,financialUserId:subject,financialStatus:'active'};
  next.members=[...(next.members||[]).filter(item=>email(item.email)!==actor),member];
  invitation.status='accepted';invitation.acceptedAt=at;invitation.acceptedBy=subject;
  detail={invitationId:invitation.id,role:invitation.role,permissions:invitation.permissions};
 }else if(action==='cancel_invite'){
  const invitation=state.invitations.find(item=>item.id===input.invitationId&&item.status==='pending');if(!invitation)throw fail('Pending invitation not found.',404);invitation.status='cancelled';detail={invitationId:invitation.id,email:invitation.email};
 }else{
  const member=(next.members||[]).find(item=>email(item.email)===target);
  if(!member||!accountingManaged(member)||member.role==='owner')throw fail('Accounting relationship not found.',404);
  if(action==='update'){
   member.financialPermissions=permissions(input.permissions);member.financialRole=role(input.role);member.financialStatus='active';
   if(FINANCIAL_ROLES.includes(member.role))member.role=member.financialRole;
   detail={role:member.financialRole,permissions:member.financialPermissions};
  }else if(action==='suspend'||action==='revoke'){
   member.financialPermissions=[];member.financialStatus=action==='suspend'?'suspended':'revoked';
   if(FINANCIAL_ROLES.includes(member.role)){if(action==='revoke')next.members=next.members.filter(item=>item!==member);else member.suspendedAt=at;}
   for(const invitation of state.invitations)if(invitation.email===target&&invitation.status==='pending')invitation.status='cancelled';
  }else if(action==='credential_submit'){
   const jurisdiction=text(input.jurisdiction,80),licenseNumber=text(input.licenseNumber,120);
   if(!jurisdiction||!licenseNumber)throw fail('Jurisdiction and license number required / Indica jurisdicción y número de licencia.');
   member.professionalCredential={jurisdiction,licenseNumber,status:'unverified',submittedAt:at};
   detail={jurisdiction,licenseNumber};
  }else if(action==='credential_review'){
   if(!platformAdmin||target===actor)throw fail('Independent platform review required / Se requiere revisión independiente de la plataforma.',403);
   const credential=member.professionalCredential,evidenceReference=text(input.evidenceReference,500);
   if(!credential?.jurisdiction||!credential?.licenseNumber||!evidenceReference||!['verified','rejected'].includes(input.status))throw fail('License evidence and review decision required.');
   if(input.expiresAt&&(!Number.isFinite(Date.parse(input.expiresAt))||Date.parse(input.expiresAt)<=now))throw fail('Invalid license expiration date.');
   member.professionalCredential={...credential,status:input.status,source:'platform_review',reviewedBy:subject,reviewedAt:at,evidenceReference,...(input.expiresAt?{expiresAt:new Date(input.expiresAt).toISOString()}:{})};
   detail={status:input.status,evidenceReference};
  }else throw fail('Unsupported accounting access action.');
 }
 if(action==='update'){const member=next.members.find(item=>email(item.email)===target);if(FINANCIAL_ROLES.includes(member.role))delete member.suspendedAt;}
 audit(state,{id:crypto.randomUUID(),siteId:site.siteId,action,actor,actorId:subject,target:action==='accept'?actor:target,at,...detail});
 next.revision=Number(site.revision||0)+1;next.updatedAt=at;
 return next;
}
