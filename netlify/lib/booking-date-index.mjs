import {withBookingLock} from './booking-lock.mjs';
import crypto from 'node:crypto';
const DAY=86400000;
export const indexStateKey=siteId=>siteId+'/booking-index-state-v1.json';
const employeeKey=id=>crypto.createHash('sha256').update(String(id)).digest('hex');
export const bookingSlotLockKey=(siteId,employeeId)=>`${siteId}/booking-slot-locks/${employeeKey(employeeId)}`;
const canonicalPattern=/^([^/]+)\/(bookings|holds)\/[^/]+\.json$/;
function bounds(row){
 const start=Date.parse(row?.start)-Math.max(0,Number(row?.bufferBeforeMinutes||0))*60000;
 const end=Date.parse(row?.end)+Math.max(0,Number(row?.bufferMinutes||0))*60000;
 if(!row?.employeeId||!Number.isFinite(start)||!Number.isFinite(end)||end<start)return null;
 // One day of padding covers legacy service buffers; larger catalog buffers use fallback.
 const first=Math.floor(start/DAY)-1,last=Math.floor(end/DAY)+1;
 if(last-first>400)throw Object.assign(Error('Booking date range requires review before indexing.'),{status:409});
 return {first,last};
}
export async function writeBookingIndex(store,key,row){
 const match=canonicalPattern.exec(key);if(!match)return;
 const range=bounds(row);if(!range)return;
 const [,siteId,kind]=match,reference=Buffer.from(key).toString('base64url');
 if(row.siteId&&row.siteId!==siteId)throw Object.assign(Error('Booking tenant mismatch.'),{status:409});
 await Promise.all(Array.from({length:range.last-range.first+1},(_,i)=>{
  const date=new Date((range.first+i)*DAY).toISOString().slice(0,10);
  return store.setJSON(`${siteId}/booking-index-v1/${kind}/${date}/${employeeKey(row.employeeId)}/${reference}.json`,{version:1});
 }));
}
export function indexedCommerceStore(store){return new Proxy(store,{get(target,property){
 if(property==='setJSON')return async(key,row,options)=>{const match=canonicalPattern.exec(key);const write=async()=>{await writeBookingIndex(target,key,row);return target.setJSON(key,row,options)};return match?.[2]==='bookings'&&row?.employeeId?withBookingLock(target,bookingSlotLockKey(match[1],row.employeeId),write):write()};
 const value=Reflect.get(target,property,target);return typeof value==='function'?value.bind(target):value;
}})}
export async function indexedBookingEntries(store,siteId,employeeId,startDay,endDay,catalog=[]){
 if(catalog.some(x=>Number(x.bufferMinutes||0)>1440))return null;
 const state=await store.get(indexStateKey(siteId),{type:'json'});if(state?.version!==1||state.siteId!==siteId||state.status!=='ready')return null;
 const first=Math.floor(startDay/DAY),last=Math.floor((endDay-1)/DAY),entries=new Map();
 if(last-first>42)return null;
 for(const kind of ['bookings','holds'])for(let day=first;day<=last;day++){
  const prefix=`${siteId}/booking-index-v1/${kind}/${new Date(day*DAY).toISOString().slice(0,10)}/${employeeId==null?'':employeeKey(employeeId)+'/'}`;
  const pages=store.list({prefix,paginate:true});
  for await(const page of pages[Symbol.asyncIterator]?pages:[await pages])for(const blob of page.blobs||[]){
   let key;try{key=Buffer.from(blob.key.slice(prefix.length).split('/').at(-1).replace(/\.json$/,''),'base64url').toString()}catch{return null}
   if(!key.startsWith(siteId+'/'+kind+'/')||!canonicalPattern.test(key))return null;
   entries.set(key,{key,kind});
  }
 }
 return [...entries.values()];
}
export async function buildBookingIndexPage(store,siteId,{limit=100,clock=Date.now}={}){
 const stateKey=indexStateKey(siteId),started=clock();let state=await store.get(stateKey,{type:'json'});
 if(state?.status==='ready'&&state.version===1&&state.siteId===siteId)return state;
 state={version:1,siteId,status:'building',kind:'bookings',after:'',processed:0,...state};
 const pages=store.list({prefix:siteId+'/'+state.kind+'/',paginate:true}),keys=[];
 for await(const page of pages[Symbol.asyncIterator]?pages:[await pages])for(const blob of page.blobs||[])if(blob.key>state.after)keys.push(blob.key);
 keys.sort();let processed=0;
 for(const key of keys){
  const row=await store.get(key,{type:'json'});if(row)await writeBookingIndex(store,key,row);
  state={...state,after:key,processed:state.processed+1};await store.setJSON(stateKey,state);processed++;
  if(processed>=limit||clock()-started>20000)return state;
 }
 state=state.kind==='bookings'?{...state,kind:'holds',after:''}:{...state,status:'ready',completedAt:new Date(clock()).toISOString()};
 await store.setJSON(stateKey,state);return state;
}
