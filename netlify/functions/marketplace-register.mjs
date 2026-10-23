import {signup,getIdentityConfig,getSettings} from '@netlify/identity';
import {consumerRegistration} from '../lib/consumer-registration.mjs';
import {withHttpOnlyIdentityCookies} from '../lib/http-only-auth.mjs';
import {issuePrimarySession} from '../lib/mfa-security.mjs';
export default consumerRegistration({
 settings:getSettings,
 signup:(email,password,data,context)=>withHttpOnlyIdentityCookies(context,async()=>{const user=await signup(email,password,data);if(user.confirmedAt)await issuePrimarySession(user,context);return user}),
 // As with portal-complete-access, do not use the SDK's browser-style shared
 // confirmation user on a server. Verify, discard tokens, then require login.
 confirm:async token=>{
  const url=getIdentityConfig()?.url;
  if(!url||new URL(url).protocol!=='https:')throw new Error('Identity unavailable.');
  const response=await fetch(url+'/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'signup',token}),signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw new Error('Confirmation failed.');
 },
});
export const config={rateLimit:{windowLimit:5,windowSize:60,aggregateBy:['ip']}};
