import {clientSiteStore,clientCommerceStore} from '../lib/client-store.mjs';
import {readWaitlistPage} from '../lib/booking-waitlist.mjs';
import {withBookingLock} from '../lib/booking-lock.mjs';
export async function maintainWaitlists({sites=clientSiteStore(),store=clientCommerceStore(),clock=Date.now}={}){
 const started=clock();return withBookingLock(store,'maintenance/waitlist-lock',async()=>{
  const checkpoint=await store.get('maintenance/waitlist-progress',{type:'json'})||{};
  const pages=sites.list({prefix:'sites/',paginate:true});const keys=[];
  for await(const page of pages[Symbol.asyncIterator]?pages:[await pages])for(const blob of page.blobs||[])if(blob.key>String(checkpoint.siteKey||''))keys.push(blob.key);
  keys.sort();let processed=0;
  if(!keys.length){await store.setJSON('maintenance/waitlist-progress',{});return {processed:0,restarted:true};}
  for(const key of keys){
   const site=await sites.get(key,{type:'json'});if(site?.siteId){
    const progressKey=site.siteId+'/waitlist-maintenance-progress';const progress=await store.get(progressKey,{type:'json'});
    const page=await readWaitlistPage(site,{store,after:progress?.after||'',now:clock()});
    await store.setJSON(progressKey,{after:page.nextCursor||''});processed+=page.requests.length;
   }
   await store.setJSON('maintenance/waitlist-progress',{siteKey:key});
   if(processed>=250||clock()-started>=20000)break;
  }
  return {processed};
 });
}
export default async(_req,context)=>{
 if(context.deploy?.context!=='production'||!context.deploy?.published)return;
 await maintainWaitlists();
};
export const config={schedule:'*/15 * * * *'};
