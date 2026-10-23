import {assertSameOrigin} from './client-auth.mjs';
import {authJson,readAuthPayload} from './auth-gateway.mjs';
import {validEmail} from './platform-utils.mjs';
export function consumerRegistration(identity){return async(req,context)=>{
 try{
  if(req.method!=='POST')return new Response(null,{status:405,headers:{Allow:'POST'}});
  assertSameOrigin(req);
  const p=await readAuthPayload(req);
  if(p.action==='confirm'){
   if(typeof p.token!=='string'||!p.token||p.token.length>2048)return authJson({ok:false},400);
   await identity.confirm(p.token,context);
   return authJson({ok:true});
  }
  const email=typeof p.email==='string'?p.email.trim().toLowerCase():'';
  if(!validEmail(email)||email.length>320||typeof p.password!=='string'||Array.from(p.password).length<15||p.password.length>1024||typeof p.name!=='string'||!p.name.trim()||p.name.length>100||p.acceptedTerms!==true)return authJson({ok:false,message:'Check the registration fields.'},400);
  const settings=await identity.settings();
  if(settings.disableSignup)return authJson({ok:false,message:'Registration is currently unavailable.'},503);
  try{await identity.signup(email,p.password,{full_name:p.name.trim()},context)}
  catch(error){if(Number(error?.status)!==422)throw error}
  // Same result for existing accounts and pending confirmations. No roles or
  // business membership are accepted from the browser or granted by signup.
  return authJson({ok:true,confirmationRequired:true},202);
 }catch(error){return authJson({ok:false,message:'Unable to complete registration.'},[403,413,415,429].includes(error?.status)?error.status:503)}
}}
