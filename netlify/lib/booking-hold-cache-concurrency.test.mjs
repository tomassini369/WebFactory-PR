import {buildBookingIndexPage} from './booking-date-index.mjs';
import {clientCommerceStore} from './client-store.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {getStore} from '@netlify/blobs';import {availabilityForDate,createBookingHold} from './booking-engine.mjs';
test('warm read cache cannot authorize simultaneous holds for the same professional and time',async t=>{
 globalThis.netlifyBlobsContext=Buffer.from(JSON.stringify({siteID:'test',token:'test',deployID:'test'})).toString('base64');globalThis.Netlify={env:{get:()=>''}};t.after(()=>{delete globalThis.netlifyBlobsContext;delete globalThis.Netlify});
 const rows=new Map();let n=0;const proto=Object.getPrototypeOf(getStore('test'));
 t.mock.method(proto,'get',async function(k){return structuredClone(rows.get(k)?.data||null)});
 t.mock.method(proto,'getWithMetadata',async function(k){return structuredClone(rows.get(k)||null)});
 t.mock.method(proto,'setJSON',async function(k,data,o={}){const old=rows.get(k);if(o.onlyIfNew&&old||o.onlyIfMatch&&old?.etag!==o.onlyIfMatch)return {modified:false};rows.set(k,{data:structuredClone(data),etag:String(++n)});return {modified:true}});
 t.mock.method(proto,'delete',async k=>rows.delete(k));
 t.mock.method(proto,'list',function({prefix='',paginate=false}={}){const page={blobs:[...rows].filter(([k])=>k.startsWith(prefix)).map(([key,v])=>({key,etag:v.etag}))};return paginate?(async function*(){yield page})():Promise.resolve(page)});
 const site={siteId:'tenant-a',catalog:[{id:'cut',type:'service',requiresAppointment:true,active:true,duration:30}],employees:[{id:'alex',active:true,serviceIds:['cut'],dailyLimit:100}],hours:{Martes:{enabled:true,open:'09:00',close:'17:00'}},settings:{timezone:'America/Puerto_Rico'}};
 const slots=await availabilityForDate(site,'cut','alex','2028-02-01');assert.ok(slots.length);
 for(let i=0;i<3;i++)await buildBookingIndexPage(clientCommerceStore(),site.siteId);
 const payload={serviceId:'cut',employeeId:'alex',start:slots[0].start};const results=await Promise.allSettled(Array.from({length:25},()=>createBookingHold(site,payload)));
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.ok(results.filter(x=>x.status==='rejected').every(x=>x.reason.status===409));
 await assert.rejects(createBookingHold(site,payload),{status:409});
 const refreshed=await availabilityForDate(site,'cut','alex','2028-02-01');assert.ok(!refreshed.some(s=>s.start===payload.start));
});
