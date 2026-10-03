import {assertSameOrigin,requirePlatformAdmin} from '../lib/client-auth.mjs';
import {emailProvider} from '../lib/email.mjs';
import {verifyResendCredentials} from '../lib/resend-diagnostics.mjs';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export function createResendVerifier({authorize=requirePlatformAdmin,verify=verifyResendCredentials,provider=emailProvider}={}){return async req=>{
 try{
  if(req.method!=='POST')return json({ok:false,message:'Method not allowed.'},405);
  assertSameOrigin(req);await authorize();
  const result=await verify();
  return json({ok:true,...result,activeProvider:provider(),emailSent:false});
 }catch(error){const status=[401,403].includes(error.status)?error.status:503;return json({ok:false,message:status===503?'Resend verification unavailable.':error.message},status);}
};}
export default createResendVerifier();
export const config={rateLimit:{windowLimit:3,windowSize:180,aggregateBy:['ip']}};
