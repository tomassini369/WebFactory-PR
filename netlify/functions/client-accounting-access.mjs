import crypto from 'node:crypto';
import {assertSameOrigin,errorResponse,requireClientUser,requireSiteAccess,isPlatformAdmin,authorizeSiteUser} from '../lib/client-auth.mjs';
import {getClientSite,saveClientSite} from '../lib/client-store.mjs';
import {changeAccountingAccess,accessView} from '../lib/accounting-access.mjs';
import {sendEmail,emailConfigured} from '../lib/email.mjs';

export function createAccountingAccessHandler({currentUser=requireClientUser,authorize=requireSiteAccess,load=getClientSite,save=site=>saveClientSite(site,{financialMutation:true}),deliver=sendEmail,mailReady=emailConfigured,clock=Date.now,randomToken=()=>crypto.randomBytes(32).toString('base64url')}={}){return async req=>{
 try{
  if(!['GET','POST'].includes(req.method))return new Response(null,{status:405,headers:{Allow:'GET, POST'}});
  assertSameOrigin(req);
  const raw=req.method==='POST'?await req.text():'';if(raw.length>16000)throw Object.assign(new Error('Request too large.'),{status:413});
  const input=raw?JSON.parse(raw):{},url=new URL(req.url),siteId=req.method==='GET'?url.searchParams.get('siteId'):input.siteId;
  if(!/^[A-Za-z0-9_-]{1,120}$/.test(siteId||''))throw Object.assign(new Error('Invalid business.'),{status:400});
  const action=input.action;
  const access=action==='accept'?{user:await currentUser(),site:await load(siteId)}:await authorize(siteId,['owner']);
  if(!access.site)throw Object.assign(new Error('Business not found.'),{status:404});
  if(req.method==='GET')return Response.json({ok:true,...accessView(access.site),emailReady:mailReady()},{headers:{'Cache-Control':'private, no-store'}});
  if(action!=='accept'&&!Number.isSafeInteger(input.revision))throw Object.assign(new Error('Reload current accounting permissions before saving.'),{status:409});
  const token=action==='invite'?randomToken():'';
  if(action==='invite'&&!mailReady())throw Object.assign(new Error('Platform invitation email is not configured / El correo de invitaciones de la plataforma no está configurado.'),{status:503});
  const next=changeAccountingAccess(access.site,input,access.user,{now:clock(),token,platformAdmin:isPlatformAdmin(access.user)});
  // Revalidate against the latest canonical revision in saveClientSite. No
  // retry merges an old grant over a concurrent revoke or invitation acceptance.
  const saved=await save(next);let invitationSent;
  if(action==='invite'){
   const inviteUrl=new URL('/client-admin',url.origin);inviteUrl.hash=new URLSearchParams({accountingSite:siteId,accountingInvite:token}).toString();
   try{await deliver({to:input.email,category:'team',language:access.site.settings?.locale||'en',subject:'WebFactory — Accounting Access / Acceso contable',text:`${access.site.business?.name||siteId}\nAccounting access invitation / Invitación de acceso contable.\nSign in with the invited email. Review and accept the permissions / Inicia sesión con el email invitado. Revisa y acepta los permisos.\n${inviteUrl}\nExpires in 7 days / Vence en 7 días.`,timeoutMs:8000});invitationSent=true;}catch{invitationSent=false;}
  }
  const view=action==='accept'?{siteId,accepted:true}:accessView(saved);
  return Response.json({ok:true,...view,...(invitationSent!==undefined?{invitationSent}:{}),emailReady:mailReady()},{status:invitationSent===false?202:200,headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return errorResponse(error instanceof SyntaxError?Object.assign(new Error('Invalid JSON.'),{status:400}):error)}
};}
export default createAccountingAccessHandler();
export const config={rateLimit:{windowLimit:30,windowSize:60,aggregateBy:['ip']}};
