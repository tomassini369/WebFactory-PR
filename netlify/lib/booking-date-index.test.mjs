import test from 'node:test';import assert from 'node:assert/strict';
import {indexedCommerceStore,buildBookingIndexPage,indexedBookingEntries,indexStateKey} from './booking-date-index.mjs';
import {reservationBlocks} from './booking-reservation-cache.mjs';
import {createBookingIndexHandler} from '../functions/client-booking-index.mjs';
function fixture(){const rows=new Map();let n=0,gets=0;const raw={list:async({prefix=''})=>({blobs:[...rows].filter(([k])=>k.startsWith(prefix)).map(([key,v])=>({key,etag:v.etag}))}),get:async k=>{gets++;return structuredClone(rows.get(k)?.data||null)},getWithMetadata:async k=>structuredClone(rows.get(k)||null),delete:async k=>rows.delete(k),setJSON:async(k,data,o={})=>{const old=rows.get(k);if(o.onlyIfNew&&old||o.onlyIfMatch&&old?.etag!==o.onlyIfMatch)return {modified:false};rows.set(k,{data:structuredClone(data),etag:String(++n)});return {modified:true}}};return {rows,raw,store:indexedCommerceStore(raw),reads:()=>gets,reset:()=>{gets=0}}}
const row={siteId:'a',employeeId:'alex',transactionId:'one',start:'2028-02-01T15:00:00Z',end:'2028-02-01T15:30:00Z',status:'confirmed'};
const query=f=>({store:f.store,siteId:'a',employeeId:'alex',startDay:Date.parse('2028-02-01'),endDay:Date.parse('2028-02-02'),fresh:true});
async function complete(f){let state;for(let i=0;i<30;i++){state=await buildBookingIndexPage(f.store,'a',{limit:200});if(state.status==='ready')return state}throw Error('Not completed')}
test('historical backfill gates index readiness and date queries avoid unrelated historical records',async()=>{
 const f=fixture();for(let i=0;i<1000;i++)await f.raw.setJSON('a/bookings/'+String(i).padStart(4,'0')+'.json',{...row,transactionId:String(i),start:'2027-01-01T15:00Z',end:'2027-01-01T15:30Z'});
 await f.raw.setJSON('a/bookings/current.json',row);assert.equal(await indexedBookingEntries(f.store,'a','alex',Date.parse('2028-02-01'),Date.parse('2028-02-02')),null);
 assert.equal((await buildBookingIndexPage(f.store,'a',{limit:10})).status,'building');await complete(f);
 f.reset();const blocks=await reservationBlocks(query(f));assert.equal(blocks.length,1);assert.equal(f.reads(),2);assert.equal((await f.store.get(indexStateKey('a'))).status,'ready');
});
test('write-ahead references preserve conflicts after reschedule and validate cancelled or deleted records',async()=>{
 const f=fixture();await f.store.setJSON('a/bookings/one.json',row);await complete(f);assert.equal((await reservationBlocks(query(f))).length,1);
 await f.store.setJSON('a/bookings/one.json',{...row,start:'2028-02-05T15:00Z',end:'2028-02-05T15:30Z'});assert.equal((await reservationBlocks(query(f))).length,0);
 const next={...query(f),startDay:Date.parse('2028-02-05'),endDay:Date.parse('2028-02-06')};assert.equal((await reservationBlocks(next)).length,1);
 await f.store.setJSON('a/bookings/one.json',{...row,status:'cancelled'});assert.equal((await reservationBlocks(next)).length,0);
 await f.store.delete('a/bookings/one.json');assert.equal((await reservationBlocks(query(f))).length,0);
});
test('a failed index write cannot commit a booking and legacy oversized catalog buffers fall back',async()=>{
 const f=fixture(),write=f.raw.setJSON;f.raw.setJSON=async(k,...args)=>{if(k.includes('/booking-index-v1/'))throw Error('isolated storage failure');return write(k,...args)};
 await assert.rejects(f.store.setJSON('a/bookings/one.json',row));assert.equal(await f.raw.get('a/bookings/one.json'),null);
 assert.equal(await indexedBookingEntries(f.store,'a','alex',0,86400000,[{bufferMinutes:2000}]),null);
});
test('tenant mismatch and employee attempts to build another business index are rejected',async()=>{
 const f=fixture();await assert.rejects(f.store.setJSON('a/bookings/one.json',{...row,siteId:'b'}),{status:409});
 const handler=createBookingIndexHandler({authorize:async()=>({site:{siteId:'a'},membership:{role:'employee'}}),getStore:()=>f.store});
 const req=new Request('https://preview.invalid/api',{method:'POST',headers:{Origin:'https://preview.invalid'},body:JSON.stringify({siteId:'a'})});assert.equal((await handler(req)).status,403);assert.equal(f.rows.size,0);
});

test('canonical booking writes share the professional lock with hold validation',async()=>{
 const {withBookingLock}=await import('./booking-lock.mjs');const {bookingSlotLockKey}=await import('./booking-date-index.mjs');const f=fixture();
 await withBookingLock(f.raw,bookingSlotLockKey('a','alex'),async()=>{
  await assert.rejects(f.store.setJSON('a/bookings/one.json',row),{status:409});assert.equal(await f.raw.get('a/bookings/one.json'),null);
 });
 await f.store.setJSON('a/bookings/one.json',row);assert.equal((await f.raw.get('a/bookings/one.json')).transactionId,'one');
});
