import { requirePlatformAdmin,errorResponse } from '../lib/client-auth.mjs';
import { clientAssetStore,clientEventStore,clientCommerceStore,getClientSite } from '../lib/client-store.mjs';
import { buildTenantBackup,createSiteBackup,backupResponse } from '../lib/backup-recovery.mjs';
export default async req=>{
  try{
    if(req.method!=='GET')return new Response(null,{status:405,headers:{Allow:'GET'}});
    const admin=await requirePlatformAdmin();
    const siteId=new URL(req.url).searchParams.get('siteId');
    if(!/^[a-zA-Z0-9_-]{1,120}$/.test(siteId||''))throw Object.assign(new Error('Valid siteId required.'),{status:400});
    const site=await getClientSite(siteId);
    if(!site)throw Object.assign(new Error('Client site not found.'),{status:404});
    const tenant=await buildTenantBackup(site,{assets:clientAssetStore(),events:clientEventStore(),commerce:clientCommerceStore()});
    return backupResponse(createSiteBackup(tenant,admin.email),`webfactory-${siteId}-backup.json`);
  }catch(error){return errorResponse(error);}
};
