import test from 'node:test';import assert from 'node:assert/strict';import {getStore} from '@netlify/blobs';
import {availabilityForDate,createBookingHold} from './booking-engine.mjs';
test('a free slot beyond the old 96-start cutoff can be held once and still rejects conflicts',async t=>{
 globalThis.netlifyBlobsContext=Buffer.from(JSON.stringify({siteID:'test',token:'test',deployID:'test'})).toString('base64');globalThis.Netlify={env:{get:()=>''}};
 t.after(()=>{delete globalThis.netlifyBlobsContext;delete globalThis.Netlify});
 const rows=new Map();let revision=0;const proto=Object.getPrototypeOf(getStore('test'));
 t.mock.method(proto,'get',async key=>structuredClone(rows.get(key)?.data||null));
 t.mock.method(proto,'getWithMetadata',async key=>structuredClone(rows.get(key)||null));
 t.mock.method(proto,'setJSON',async(key,data,options={})=>{const previous=rows.get(key);if(options.onlyIfNew&&previous||options.onlyIfMatch&&previous?.etag!==options.onlyIfMatch)return {modified:false};rows.set(key,{data:structuredClone(data),etag:String(++revision)});return {modified:true}});
 t.mock.method(proto,'delete',async key=>rows.delete(key));
 t.mock.method(proto,'list',({prefix='',paginate=false}={})=>{const page={blobs:[...rows].filter(([key])=>key.startsWith(prefix)).map(([key,v])=>({key,etag:v.etag}))};return paginate?(async function*(){yield page})():Promise.resolve(page)});
 t.mock.method(globalThis,'fetch',async()=>{throw Error('Unexpected network in isolated booking regression')});
 const site={siteId:'long-day-fixture',catalog:[{id:'cut',type:'service',requiresAppointment:true,active:true,duration:30}],employees:[{id:'professional',active:true,serviceIds:['cut']}],hours:{Monday:{enabled:true,open:'09:00',close:'19:00'}},settings:{timezone:'America/Puerto_Rico',bookingPolicy:{slotIntervalMinutes:5,minimumNoticeMinutes:0}}};
 const slots=await availabilityForDate(site,'cut','professional','2028-11-06');assert.equal(slots.length,115);
 const payload={serviceId:'cut',employeeId:'professional',start:'2028-11-06T22:30:00.000Z'};assert.equal(slots.at(-1).start,payload.start);
 const hold=await createBookingHold(site,payload);assert.equal(hold.start,payload.start);assert.equal(hold.end,'2028-11-06T23:00:00.000Z');
 await assert.rejects(createBookingHold(site,payload),{status:409});
});
