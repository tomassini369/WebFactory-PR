import {admin} from '@netlify/identity';
import {assertSameOrigin,requirePlatformAdmin,isPlatformAdmin} from '../lib/client-auth.mjs';
import {getClientSite,normalizeEmail} from '../lib/client-store.mjs';
import {authHeaders,authJson,readAuthPayload} from '../lib/auth-gateway.mjs';
import {mfaStore,assertRecentSecondFactor} from '../lib/mfa-security.mjs';
import {resetClientAuthenticator,validateResetRequest} from '../lib/admin-authenticator-reset.mjs';
import {emailConfigured,sendEmail} from '../lib/email.mjs';
const fail=(message,status)=>Object.assign(Error(message),{status});
export function createAdminResetHandler({authorize=requirePlatformAdmin,getSite=getClientSite,listUsers=options=>admin.listUsers(options),securityStore=mfaStore,recent=assertRecentSecondFactor,configured=emailConfigured,notify=sendEmail}={}){return async(req,context)=>{
 if(req.method!=='POST')return new Response(null,{status:405,headers:{...authHeaders,Allow:'POST'}});
 try{
  assertSameOrigin(req);if(new URL(req.url).protocol!=='https:')throw fail('Secure origin required.',403);const actor=await authorize();const store=securityStore();await recent(actor,context,store);
  const payload=await readAuthPayload(req);validateResetRequest(payload);
  if(typeof payload.siteId!=='string'||!/^[a-zA-Z0-9_-]{1,120}$/.test(payload.siteId))throw fail('Invalid business.',400);
  const email=typeof payload.email==='string'?normalizeEmail(payload.email):'';
  const site=await getSite(payload.siteId);
  if(!site||!email||!site.members?.some(member=>normalizeEmail(member.email)===email))throw fail('Select an existing member of this business.',404);
  if(!configured())throw fail('Configure notification email before resetting Authenticator.',503);
  let target;const started=Date.now();
  for(let page=1;page<=20;page++){
   if(Date.now()-started>10000)throw fail('Identity lookup unavailable. Try later.',503);
   const users=await listUsers({page,perPage:100});if(!Array.isArray(users))throw fail('Identity unavailable.',503);
   target=users.find(user=>normalizeEmail(user.email)===email);if(target||users.length<100)break;
  }
  if(!target||isPlatformAdmin(target))throw fail('Client identity unavailable or protected.',404);
  return authJson(await resetClientAuthenticator({actor,target,siteId:site.siteId,context,store,payload,notify}));
 }catch(error){const status=[400,401,403,404,409,413,415,429,503].includes(error.status)?error.status:503;return authJson({ok:false,message:status===503?'Security service unavailable. Check audit before retrying.':error.message||'Request rejected.'},status)}
};}
export default createAdminResetHandler();
export const config={rateLimit:{windowLimit:5,windowSize:180,aggregateBy:['ip']}};
