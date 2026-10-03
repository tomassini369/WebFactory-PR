import {clientSiteStore,clientCommerceStore,clientEventStore,clientAssetStore,clientBackupStore,getClientSite} from '../lib/client-store.mjs';
import {captureTenantSnapshot} from '../lib/tenant-snapshot.mjs';
import {withBookingLock} from '../lib/booking-lock.mjs';
// Opt-in; hourly rotates through one tenant per run. Actual RPO depends on tenant
// count and failures. No retention deletion is enabled without an explicit policy.
export default async(req,context)=>{
 if(context.deploy?.context!=='production'||context.deploy?.published!==true||globalThis.Netlify?.env?.get('WEBFACTORY_BACKUP_SCHEDULE_ENABLED')!=='true')return;
 const destination=clientBackupStore(),started=Date.now();
 await withBookingLock(destination,'maintenance/lock',async()=>{
  const state=await destination.get('maintenance/health.json',{type:'json'})||{},keys=[];
  for await(const page of clientSiteStore().list({prefix:'sites/',paginate:true})){
   if(Date.now()-started>5000)throw Error('Backup listing budget exceeded');
   for(const row of page.blobs||[]){if(/^sites\/[a-zA-Z0-9_-]{1,120}\.json$/.test(row.key))keys.push(row.key);if(keys.length>5000)throw Error('Backup listing capacity exceeded')}
  }
  keys.sort();const key=keys.find(key=>key>(state.cursor||''))||keys[0];
  if(!key){await destination.setJSON('maintenance/health.json',{lastRunAt:new Date().toISOString(),tenants:0,ok:true});return}
  const site=await getClientSite(key.slice(6,-5));
  try{
   if(!site)throw Error('Backup source unavailable');
   const result=await captureTenantSnapshot(site,{sites:clientSiteStore(),commerce:clientCommerceStore(),events:clientEventStore(),assets:clientAssetStore()},destination,{budgetMs:Math.max(1,20000-(Date.now()-started))});
   await destination.setJSON('maintenance/health.json',{cursor:key,lastRunAt:new Date().toISOString(),tenants:keys.length,...result});
  }catch{
   await destination.setJSON('maintenance/health.json',{cursor:key,lastRunAt:new Date().toISOString(),tenants:keys.length,ok:false,issue:'snapshot_failed'});
  }
 });
};
export const config={schedule:'@hourly'};
