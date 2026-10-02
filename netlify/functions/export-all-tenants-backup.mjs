import { requirePlatformAdmin,errorResponse } from '../lib/client-auth.mjs';
import { clientAssetStore,clientEventStore,clientCommerceStore,clientSiteStore,getClientSite } from '../lib/client-store.mjs';
import { buildTenantBackup,createAllBackup,backupResponse,MAX_BACKUP_BYTES } from '../lib/backup-recovery.mjs';
export default async req=>{
  try{
    if(req.method!=='GET')return new Response(null,{status:405,headers:{Allow:'GET'}});
    const admin=await requirePlatformAdmin(),tenants=[],deadline=Date.now()+40000;
    const sites=clientSiteStore(),stores={assets:clientAssetStore(),events:clientEventStore(),commerce:clientCommerceStore()};
    let bytes=0;
    for await(const page of sites.list({prefix:'sites/',paginate:true})){
      for(const {key} of page.blobs||[]){
        if(!/^sites\/[a-zA-Z0-9_-]{1,120}\.json$/.test(key))continue;
        if(tenants.length>=100||Date.now()>deadline)throw Object.assign(new Error('Export individual business backups; this export exceeds its synchronous limit.'),{status:413});
        const site=await getClientSite(key.slice(6,-5));
        if(!site)throw Object.assign(new Error('Backup source changed. Retry the export.'),{status:409});
        const tenant=await buildTenantBackup(site,stores,{deadline});
        bytes+=Buffer.byteLength(JSON.stringify(tenant));
        if(bytes>MAX_BACKUP_BYTES)throw Object.assign(new Error('Export individual business backups; the combined export is too large.'),{status:413});
        tenants.push(tenant);
      }
    }
    return backupResponse(createAllBackup(tenants,admin.email),`webfactory-business-records-backup-${new Date().toISOString().slice(0,10)}.json`);
  }catch(error){return errorResponse(error);}
};
