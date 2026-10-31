import crypto from 'node:crypto';
import {zonedToUtc} from './booking-engine.mjs';
import {withBookingLock} from './booking-lock.mjs';
import {clientCommerceStore,commerceKey} from './client-store.mjs';
import {performCheckout} from '../functions/create-client-checkout.mjs';
import {changePrivateBooking,bookingVersion} from './booking-management.mjs';
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
export function expandBookingSeries(input,timeZone,now=Date.now()){
 if(!['weekly','fortnightly','monthly'].includes(input.frequency)||!/^\d{4}-\d{2}-\d{2}$/.test(input.date||'')||!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time||''))throw fail('Invalid recurrence.');
 const anchor=new Date(input.date+'T12:00:00Z');if(!Number.isFinite(+anchor)||anchor.toISOString().slice(0,10)!==input.date)throw fail('Invalid date.');
 const count=input.count??12;if(!Number.isInteger(count)||count<1||count>12)throw fail('Choose 1 to 12 occurrences.');
 if(input.until&&(!/^\d{4}-\d{2}-\d{2}$/.test(input.until)||input.until<input.date||!Number.isFinite(Date.parse(input.until))))throw fail('Invalid end date.');
 const occurrences=[];
 for(let i=0;i<count;i++){
  let date=new Date(+anchor);
  if(input.frequency==='monthly'){const month=anchor.getUTCMonth()+i;date=new Date(Date.UTC(anchor.getUTCFullYear(),month,Math.min(anchor.getUTCDate(),new Date(Date.UTC(anchor.getUTCFullYear(),month+1,0)).getUTCDate()),12));}
  else date.setUTCDate(date.getUTCDate()+i*(input.frequency==='weekly'?7:14));
  const localDate=date.toISOString().slice(0,10);if(input.until&&localDate>input.until)break;
  const instant=zonedToUtc(localDate,input.time,timeZone);
  if(!Number.isFinite(+instant)){occurrences.push({date:localDate,start:null,status:'conflict',reason:'Local time does not exist (DST).'});continue}
  if(+instant<=now||+instant>now+365*86400000)throw fail('Series must be within the next 365 days.');
  occurrences.push({date:localDate,start:instant.toISOString(),status:'pending'});
 }
 if(!occurrences.length)throw fail('No occurrences in this range.');return occurrences;
}
export async function processBookingSeries(site,input,requestUrl,{store=clientCommerceStore(),checkout=performCheckout,now=Date.now()}={}){
 if(site.paymentRules?.bookingPayment!=='in_person')throw fail('Recurring appointments require payment in person; no automatic charges are made.',409);
 if(!/^[a-zA-Z0-9_-]{8,100}$/.test(input.id||''))throw fail('Invalid series identifier.');
 const key=commerceKey(site.siteId,'booking-series',input.id);
 return withBookingLock(store,commerceKey(site.siteId,'booking-series-locks',input.id),async()=>{
  let series=await store.get(key,{type:'json'});
  if(!series){
   const occurrences=expandBookingSeries(input,site.settings?.timezone||'America/Puerto_Rico',now);
   const customer={name:String(input.customer?.name||'').trim().slice(0,180),email:String(input.customer?.email||'').trim().slice(0,320),phone:String(input.customer?.phone||'').trim().slice(0,80)};
   if(!customer.name||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(customer.email))throw fail('Name and valid email required.');
   series={id:input.id,siteId:site.siteId,serviceId:String(input.serviceId||''),employeeId:String(input.employeeId||''),locationId:String(input.locationId||''),customer,lang:input.lang==='es'?'es':'en',frequency:input.frequency,timeZone:site.settings?.timezone||'America/Puerto_Rico',createdAt:new Date(now).toISOString(),occurrences:occurrences.map((row,i)=>({...row,transactionId:'txn_series_'+hash(site.siteId+':'+input.id+':'+i).slice(0,32)}))};
   await store.setJSON(key,series,{onlyIfNew:true});
  }else if(series.siteId!==site.siteId)throw fail('Series unavailable.',404);
  if(series.cancelRequestedAt)throw fail('Series cancellation already requested.',409);
  let processed=0;
  for(let i=0;i<series.occurrences.length&&processed<3;i++){
   const occurrence=series.occurrences[i];if(occurrence.status!=='pending')continue;processed++;
   const url=new URL('/.netlify/functions/create-client-checkout',requestUrl);
   const response=await checkout(new Request(url,{method:'POST',headers:{'Content-Type':'application/json',Origin:url.origin},body:JSON.stringify({siteId:site.siteId,customer:series.customer,lang:series.lang,locationId:series.locationId,booking:{serviceId:series.serviceId,employeeId:series.employeeId,locationId:series.locationId,start:occurrence.start}})}),{series:{id:series.id,occurrence:i,transactionId:occurrence.transactionId}});
   const result=await response.json();
   if(response.ok)series.occurrences[i]={...occurrence,status:'created'};
   else if([400,404,409].includes(response.status))series.occurrences[i]={...occurrence,status:'conflict',reason:result.message||'Unavailable'};
   else {await store.setJSON(key,series);throw fail('Occurrence pending recovery. Retry the same series identifier.',503)}
   await store.setJSON(key,series);
  }
  return series;
 });
}
export async function cancelFutureSeries(site,id,{store=clientCommerceStore(),change=changePrivateBooking,now=Date.now()}={}){
 if(!/^[a-zA-Z0-9_-]{8,100}$/.test(id||''))throw fail('Invalid series identifier.');
 const key=commerceKey(site.siteId,'booking-series',id);
 return withBookingLock(store,commerceKey(site.siteId,'booking-series-locks',id),async()=>{
  const series=await store.get(key,{type:'json'});if(!series||series.siteId!==site.siteId)throw fail('Series unavailable.',404);
  series.cancelRequestedAt ||= new Date(now).toISOString();let changed=0;
  for(const row of series.occurrences){
   if(row.status==='pending'){row.status='cancelled';continue}
   if(row.status!=='created'||Date.parse(row.start)<=now||changed>=3)continue;
   const record=await store.get(commerceKey(site.siteId,'bookings',row.transactionId),{type:'json'});
   if(record?.status==='cancelled'){row.status='cancelled';continue}
   if(!record?.calendarToken||record.seriesId!==id){row.cancellationError='Booking requires review.';continue}
   changed++;
   try{await change(record.calendarToken,{action:'cancel',version:bookingVersion(record),acknowledged:'yes'});row.status='cancelled';delete row.cancellationError}catch{row.cancellationError='Policy, payment or concurrency conflict. Review this occurrence.'}
   await store.setJSON(key,series);
  }
  await store.setJSON(key,series);return series;
 });
}
