import {withBookingLock} from './booking-lock.mjs';
import {dueBookingReminders} from './booking-reminders.mjs';
export const BOOKING_HEALTH_KEY='maintenance/booking-reminders.json';
const rotate=(keys,cursor)=>[...keys.filter(k=>k>cursor),...keys.filter(k=>k<=cursor)];
async function listKeys(store,prefix,clock,deadline,max){
 const keys=[];for await(const page of store.list({prefix,paginate:true})){if(clock()>deadline)throw Error('Listing budget exceeded');for(const blob of page.blobs||[]){keys.push(blob.key);if(keys.length>max)throw Error('Listing capacity exceeded')}}return keys.sort();
}
export function createBookingReminderProcessor({sites,commerce,events,getSite,send,configured=()=>true,clock=Date.now}){
 return async({budgetMs=18000,maxSites=10,maxBookings=100,perSite=20,maxPointers=50000}={})=>withBookingLock(events,'locks/booking-reminders-batch',async()=>{
 const started=clock(),deadline=started+budgetMs,previous=await events.get(BOOKING_HEALTH_KEY,{type:'json'})||{};
 const summary={lastRunAt:new Date(started).toISOString(),siteCursor:previous.siteCursor||'',sitesVisited:0,bookingsVisited:0,sent:0,uncertain:0,suppressed:0,errors:0,paused:false,providerConfigured:configured(),deliveryReviewRequired:Boolean(previous.deliveryReviewRequired)};
 const save=()=>events.setJSON(BOOKING_HEALTH_KEY,{...summary,durationMs:clock()-started});
 if(!summary.providerConfigured){await save();return summary}
 let pointers;try{pointers=await listKeys(sites,'sites/',clock,deadline,maxPointers)}catch{summary.errors++;summary.paused=true;await save();return summary}
 summary.listedSites=pointers.length;
 for(const key of rotate(pointers.filter(k=>/^sites\/[a-zA-Z0-9_-]{1,120}\.json$/.test(k)),summary.siteCursor)){
  if(summary.sitesVisited>=maxSites||summary.bookingsVisited>=maxBookings||clock()+10000>deadline){summary.paused=true;break}
  const id=key.slice(6,-5);summary.sitesVisited++;summary.siteCursor=key;
  try{
   const site=await getSite(id);if(!site||site.status!=='active')continue;
   const cursorKey=`maintenance/booking-cursors/${id}.json`,state=await events.get(cursorKey,{type:'json'});
   const bookings=await listKeys(commerce,`${id}/bookings/`,clock,deadline,maxPointers);let visited=0;
   for(const bookingKey of rotate(bookings,state?.cursor||'')){
    if(visited>=perSite||summary.bookingsVisited>=maxBookings||clock()+10000>deadline){summary.paused=true;break}
    visited++;summary.bookingsVisited++;
    const record=await commerce.get(bookingKey,{type:'json'});
    if(record&&record.transactionId&&bookingKey===`${id}/bookings/${record.transactionId}.json`&&(!record.siteId||record.siteId===id)&&dueBookingReminders(record,started).length){
     await send(site,record,started,deadline,{outcome:kind=>{if(['sent','uncertain','suppressed'].includes(kind)){summary[kind]++;if(kind==='uncertain')summary.deliveryReviewRequired=true}}});
    }
    await events.setJSON(cursorKey,{cursor:bookingKey,updatedAt:new Date(clock()).toISOString()});
   }
  }catch{summary.errors++}
  await save();
 }
 await save();return summary;
 });
}
export function publicBookingHealth(value){if(!value)return null;return Object.fromEntries(['lastRunAt','durationMs','listedSites','sitesVisited','bookingsVisited','sent','uncertain','suppressed','errors','paused','providerConfigured','deliveryReviewRequired'].filter(k=>value[k]!==undefined).map(k=>[k,value[k]]))}
