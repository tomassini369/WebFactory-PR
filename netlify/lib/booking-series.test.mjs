import test from 'node:test';import assert from 'node:assert/strict';
import {expandBookingSeries,processBookingSeries,cancelFutureSeries} from './booking-series.mjs';
function memory(){const rows=new Map();let n=0;return {rows,get:async k=>structuredClone(rows.get(k)?.data),getWithMetadata:async k=>structuredClone(rows.get(k)),delete:async k=>rows.delete(k),setJSON:async(k,data,o={})=>{const old=rows.get(k);if(o.onlyIfNew&&old||o.onlyIfMatch&&old?.etag!==o.onlyIfMatch)return {modified:false};rows.set(k,{data:structuredClone(data),etag:String(++n)});return {modified:true}}}}
const now=Date.parse('2028-01-01T12:00Z'),site={siteId:'tenant-a',settings:{timezone:'America/New_York'},paymentRules:{bookingPayment:'in_person'}};
const input={id:'series-fixture',frequency:'weekly',date:'2028-01-03',time:'10:00',count:5,serviceId:'cut',employeeId:'alex',customer:{name:'Synthetic',email:'synthetic@example.invalid'}};
test('recurrence is bounded, monthly dates clamp without drifting, and local hour survives DST',()=>{
 const monthly=expandBookingSeries({...input,date:'2028-01-31',frequency:'monthly',count:3},site.settings.timezone,now);assert.deepEqual(monthly.map(r=>r.date),['2028-01-31','2028-02-29','2028-03-31']);
 const dst=expandBookingSeries({...input,date:'2028-03-05',time:'09:00',count:2},site.settings.timezone,now);assert.deepEqual(dst.map(r=>r.start),['2028-03-05T14:00:00.000Z','2028-03-12T13:00:00.000Z']);
 assert.equal(expandBookingSeries({...input,date:'2028-03-12',time:'02:30',count:1},site.settings.timezone,now)[0].status,'conflict');
 assert.throws(()=>expandBookingSeries({...input,count:13},site.settings.timezone,now),{status:400});
 assert.equal(expandBookingSeries({...input,until:'2028-01-10'},site.settings.timezone,now).length,2);
});
test('series batches use stable occurrence IDs, skip conflicts and do not repeat completed occurrences',async()=>{
 const store=memory(),ids=[];const checkout=async(req,options)=>{ids.push(options.series.transactionId);const payload=await req.json();assert.equal(payload.siteId,site.siteId);assert.equal(options.series.id,input.id);return options.series.occurrence===1?Response.json({message:'Conflict'},{status:409}):Response.json({ok:true})};
 let series=await processBookingSeries(site,input,'https://preview.example.invalid',{store,checkout,now});assert.equal(ids.length,3);assert.equal(series.occurrences[1].status,'conflict');
 series=await processBookingSeries(site,{id:input.id},'https://preview.example.invalid',{store,checkout,now});assert.equal(ids.length,5);assert.equal(new Set(ids).size,5);
 await processBookingSeries(site,{id:input.id},'https://preview.example.invalid',{store,checkout,now});assert.equal(ids.length,5);
 await assert.rejects(processBookingSeries({...site,paymentRules:{bookingPayment:'deposit'}},input,'https://preview.example.invalid',{store,checkout,now}),{status:409});
});
test('series cancellation preserves independent booking policies and stops future pending creation',async()=>{
 const store=memory();const series=await processBookingSeries(site,input,'https://preview.example.invalid',{store,checkout:async()=>Response.json({ok:true}),now});
 for(const row of series.occurrences.filter(r=>r.status==='created'))await store.setJSON(site.siteId+'/bookings/'+row.transactionId+'.json',{...row,seriesId:series.id,calendarToken:row.transactionId,kind:'booking',status:'confirmed'});
 let calls=0;const result=await cancelFutureSeries(site,series.id,{store,now,change:async()=>{calls++}});assert.equal(calls,3);assert.ok(result.occurrences.every(r=>r.status==='cancelled'));
 await assert.rejects(processBookingSeries(site,{id:series.id},'https://preview.example.invalid',{store,now}),{status:409});
 await assert.rejects(cancelFutureSeries({...site,siteId:'tenant-b'},series.id,{store,now}),{status:404});
});
