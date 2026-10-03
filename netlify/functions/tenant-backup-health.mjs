import {requirePlatformAdmin,errorResponse} from '../lib/client-auth.mjs';
import {clientBackupStore} from '../lib/client-store.mjs';
export default async(req,context)=>{
 try{
  if(req.method!=='GET')return new Response(null,{status:405,headers:{Allow:'GET','Cache-Control':'no-store'}});await requirePlatformAdmin();
  const health=await clientBackupStore().get('maintenance/health.json',{type:'json'});
  const safe=health?Object.fromEntries(['lastRunAt','tenants','ok','issue','assets','assetBytes','elapsedMs'].filter(k=>health[k]!==undefined).map(k=>[k,health[k]])):null;
  return Response.json({ok:true,enabled:context.deploy?.context==='production'&&context.deploy?.published===true&&globalThis.Netlify?.env?.get('WEBFACTORY_BACKUP_SCHEDULE_ENABLED')==='true',health:safe},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return errorResponse(error)}
};
