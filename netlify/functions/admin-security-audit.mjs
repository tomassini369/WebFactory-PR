import {requirePlatformAdmin} from '../lib/client-auth.mjs';
import {mfaStore} from '../lib/mfa-security.mjs';
import {authHeaders,authJson} from '../lib/auth-gateway.mjs';
export default async req=>{
 if(req.method!=='GET')return new Response(null,{status:405,headers:{...authHeaders,Allow:'GET'}});
 try{
  await requirePlatformAdmin();const store=mfaStore(),rows=[],started=Date.now();let count=0;
  for await(const page of store.list({prefix:'support-resets/',paginate:true}))for(const {key} of page.blobs||[]){
   if(++count>5000||Date.now()-started>10000)throw Object.assign(Error(),{status:503});
   if(!/^support-resets\/[a-f0-9-]{36}\.json$/.test(key))continue;
   const row=await store.get(key,{type:'json'});if(!row)continue;
   rows.push({auditId:row.requestId,siteId:row.siteId,requestReference:row.requestReference,createdAt:row.createdAt,status:row.status,notification:row.notification});
  }
  return authJson({ok:true,rows:rows.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,30)});
 }catch(error){return authJson({ok:false,message:'Unable to read security audit.'},[401,403].includes(error.status)?error.status:503)}
};
