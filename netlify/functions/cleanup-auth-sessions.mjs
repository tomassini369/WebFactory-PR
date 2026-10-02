import { cleanupAuthExpiry } from '../lib/auth-expiry.mjs';
import { mfaStore } from '../lib/mfa-security.mjs';
export default async (_req,context)=>{
  if(context.deploy?.context!=='production'||!context.deploy?.published)return;
  try{console.log('auth-expiry',JSON.stringify(await cleanupAuthExpiry(mfaStore())));}
  catch(error){console.error('auth-expiry',error?.status===409?'busy':'failed');throw new Error('Authentication maintenance failed.');}
};
export const config={schedule:'@hourly'};
