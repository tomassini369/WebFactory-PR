import { getUser } from '@netlify/identity';
import { assertSameOrigin } from '../lib/client-auth.mjs';
import { authHeaders, authJson, readAuthPayload } from '../lib/auth-gateway.mjs';
import { createMfaService, mfaStore } from '../lib/mfa-security.mjs';

export default async (req, context) => {
  if(req.method!=='POST')return new Response(null,{status:405,headers:{...authHeaders,Allow:'POST'}});
  try {
    assertSameOrigin(req);
    const user=await getUser();
    if(!user?.id||!user.email)return authJson({ok:false,message:'Authentication required.'},401);
    const payload=await readAuthPayload(req);
    const origin=new URL(req.url).origin;
    if(!origin.startsWith('https://'))return authJson({ok:false,message:'Secure origin required.'},403);
    const service=createMfaService(mfaStore(),await import('@simplewebauthn/server'));
    if(payload.action==='totp-setup'){
      const setup=await service.beginTotp(user,context,origin);
      const {default:QR}=await import('qrcode');
      return authJson({ok:true,...setup,qr:await QR.toDataURL(setup.uri,{errorCorrectionLevel:'M',margin:4,width:300})});
    }
    if(payload.action==='totp-confirm')return authJson(await service.confirmTotp(user,context,payload.challengeId,payload.code,origin));
    if(payload.action==='totp-verify')return authJson(await service.authenticateTotp(user,context,payload.code,origin));
    if(payload.action==='totp-cancel')return authJson(await service.cancelTotp(user,context,payload.challengeId,origin));
    if(payload.action==='totp-remove')return authJson(await service.removeTotp(user,context,origin));
    if(payload.action==='disable')return authJson(await service.disableMfa(user,context,origin));
    if(payload.action==='register-options')return authJson({ok:true,...await service.options(user,context,'register',origin)});
    if(payload.action==='authenticate-options')return authJson({ok:true,...await service.options(user,context,'authenticate',origin)});
    if(payload.action==='register-verify')return authJson(await service.verify(user,context,payload,'register',origin));
    if(payload.action==='authenticate-verify')return authJson(await service.verify(user,context,payload,'authenticate',origin));
    if(payload.action==='recovery')return authJson(await service.recover(user,context,payload.code));
    if(payload.action==='rotate-codes')return authJson(await service.rotateCodes(user,context));
    if(payload.action==='remove')return authJson(await service.remove(user,context,payload.id));
    return authJson({ok:false,message:'Unsupported security action.'},400);
  } catch(error) {
    return authJson({ok:false,message:'Security verification failed. Check your code, sign in again or use a recovery code.'},[400,401,403,404,409,413,415,429,503].includes(error?.status)?error.status:400);
  }
};
export const config={rateLimit:{windowLimit:10,windowSize:180,aggregateBy:['ip']}};
