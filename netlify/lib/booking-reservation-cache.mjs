import crypto from 'node:crypto';
// Derived read cache only. Hold creation always bypasses it.
export async function reservationBlocks({store,siteId,employeeId,startDay,endDay,catalog=[],ignoreReservationId='',fresh=false,now=Date.now()}){
 const entries=[];
 for(const kind of ['bookings','holds']){
  const pages=store.list({prefix:siteId+'/'+kind+'/',paginate:true});
  for await(const page of pages[Symbol.asyncIterator]?pages:[await pages])for(const blob of page.blobs||[])entries.push({...blob,kind});
 }
 const canCache=!fresh&&entries.every(x=>typeof x.etag==='string'&&x.etag.length>0)&&entries.length<=20000;
 const range=JSON.stringify([siteId,employeeId,startDay,endDay,catalog.map(x=>[x.id,x.bufferMinutes])]);
 const key=siteId+'/derived-booking-blocks/'+crypto.createHash('sha256').update(range).digest('hex')+'.json';
 const fingerprint=canCache?crypto.createHash('sha256').update(JSON.stringify(entries.map(x=>[x.key,x.etag]).sort((a,b)=>a[0].localeCompare(b[0])))).digest('hex'):'';
 let blocks=null;
 if(canCache){try{const saved=await store.get(key,{type:'json'});if(saved?.version===1&&saved.siteId===siteId&&saved.fingerprint===fingerprint&&saved.expiresAt>now&&Array.isArray(saved.blocks))blocks=saved.blocks;}catch{/* Cache failure falls back to canonical reads. */}}
 if(!blocks){
  blocks=[];
  for(let i=0;i<entries.length;i+=20){
   const batch=await Promise.all(entries.slice(i,i+20).map(async entry=>({entry,row:await store.get(entry.key,{type:'json'})})));
   for(const {entry,row} of batch){
    if(!row||row.siteId&&row.siteId!==siteId||row.employeeId!==employeeId||['cancelled','failed'].includes(row.status))continue;
    const start=Date.parse(row.start)-Math.max(0,Number(row.bufferBeforeMinutes??0))*60000;
    const end=Date.parse(row.end)+Math.max(0,Number(row.bufferMinutes??catalog.find(x=>x.id===row.serviceId)?.bufferMinutes??0))*60000;
    if(Number.isFinite(start)&&Number.isFinite(end)&&start<endDay&&end>startDay)blocks.push({start,end,reservationId:row.holdId||row.transactionId||entry.key,holdId:row.holdId,transactionId:row.transactionId,expiresAt:entry.kind==='holds'?Date.parse(row.expiresAt||''):null});
   }
  }
  if(canCache&&blocks.length<=2000){try{await store.setJSON(key,{version:1,siteId,fingerprint,expiresAt:now+30000,blocks})}catch{/* Cache writes never fail the booking query. */}}
 }
 const visible=blocks.filter(x=>(x.expiresAt===null||Number.isFinite(x.expiresAt)&&x.expiresAt>now)&&(!ignoreReservationId||x.holdId!==ignoreReservationId&&x.transactionId!==ignoreReservationId));
 return [...new Map(visible.map(x=>[x.reservationId,{start:x.start,end:x.end,reservationId:x.reservationId}])).values()];
}
