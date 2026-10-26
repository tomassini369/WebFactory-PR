import test from 'node:test';
import assert from 'node:assert/strict';
import {createBookingApprovalHandler} from '../functions/client-booking-approval.mjs';
function memory(){const rows=new Map();let n=0;return {rows,get:async k=>structuredClone(rows.get(k)?.data),getWithMetadata:async k=>structuredClone(rows.get(k)),delete:async k=>rows.delete(k),setJSON:async(k,data,o={})=>{const old=rows.get(k);if(o.onlyIfNew&&old||o.onlyIfMatch&&old?.etag!==o.onlyIfMatch)return {modified:false};rows.set(k,{data:structuredClone(data),etag:String(++n)});return {modified:true}}}}
const req=()=>new Request('https://preview.example.invalid/api',{method:'POST',headers:{Origin:'https://preview.example.invalid'},body:JSON.stringify({siteId:'a',transactionId:'test'})});
const row={siteId:'a',transactionId:'test',kind:'booking',status:'pending_approval',paymentStatus:'due',serviceId:'cut',employeeId:'alex',start:'2028-02-01T15:00:00.000Z',end:'2028-02-01T15:30:00.000Z'};
test('approval is owner-only and tenant-scoped before availability or notifications',async()=>{
 for(const [role,tenant,status] of [['employee','a',403],['owner','b',404]]){
  const store=memory();await store.setJSON('a/bookings/test.json',row);let called=0;
  const handler=createBookingApprovalHandler({authorize:async()=>({site:{siteId:tenant},membership:{role}}),getStore:()=>store,hold:async()=>{called++},sync:async()=>{called++},send:async()=>{called++}});
  assert.equal((await handler(req())).status,status);assert.equal(called,0);
 }
});
test('simultaneous approvals serialize and retries do not duplicate confirmation',async()=>{
 const store=memory();await store.setJSON('a/bookings/test.json',row);let held=0,sent=0;
 const handler=createBookingApprovalHandler({authorize:async()=>({site:{siteId:'a'},membership:{role:'owner'}}),getStore:()=>store,hold:async()=>{held++;await new Promise(r=>setTimeout(r,20));return {holdId:'hold',end:row.end}},sync:async(s,r)=>r,send:async(s,r)=>{sent++;return r}});
 const responses=await Promise.all([handler(req()),handler(req())]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
 assert.equal((await handler(req())).status,200);assert.equal(held,1);assert.equal(sent,1);
 assert.equal((await store.get('a/bookings/test.json')).status,'confirmed');
});
test('approval revalidates duration and leaves conflicting requests pending',async()=>{
 const store=memory();await store.setJSON('a/bookings/test.json',row);
 const handler=createBookingApprovalHandler({authorize:async()=>({site:{siteId:'a'},membership:{role:'owner'}}),getStore:()=>store,hold:async()=>({holdId:'hold',end:'2028-02-01T16:00:00.000Z'})});
 assert.equal((await handler(req())).status,409);assert.equal((await store.get('a/bookings/test.json')).status,'pending_approval');
});
