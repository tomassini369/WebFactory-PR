import test from 'node:test';import assert from 'node:assert/strict';import {createAttendanceHandler} from '../functions/client-booking-attendance.mjs';
const request=(origin='https://preview.invalid')=>new Request('https://preview.invalid/api',{method:'POST',headers:{Origin:origin},body:JSON.stringify({siteId:'a',email:'Synthetic@example.invalid'})});
test('attendance counts canonical client states across pages and excludes other tenants and clients',async()=>{
 const seed={siteId:'a',kind:'booking',customer:{email:'synthetic@example.invalid'},start:'2028-01-01T12:00Z'};
 const rows=[{...seed,status:'completed'},{...seed,status:'no_show'},{...seed,status:'cancelled',lateCancellation:true},{...seed,siteId:'b',status:'completed'},{...seed,customer:{email:'other@example.invalid'},status:'completed'}];
 const store={list:()=>({async *[Symbol.asyncIterator](){yield {blobs:[{key:'0'},{key:'1'}]};yield {blobs:[{key:'2'},{key:'3'},{key:'4'}]}}}),get:async k=>rows[+k]};
 const handler=createAttendanceHandler({authorize:async()=>({site:{siteId:'a'},membership:{role:'owner'}}),getStore:()=>store});const response=await handler(request());assert.equal(response.status,200);const body=await response.json();assert.deepEqual(body.summary,{total:3,completed:1,noShow:1,cancelled:1,lateCancellation:1});assert.equal(body.bookings.length,3);assert.ok(!JSON.stringify(body).includes('email'));
});
test('attendance rejects employee and cross-origin access before reading storage',async()=>{
 let reads=0;const handler=createAttendanceHandler({authorize:async()=>({site:{siteId:'a'},membership:{role:'employee'}}),getStore:()=>{reads++;throw Error('Unexpected read')}});
 assert.equal((await handler(request())).status,403);assert.equal((await handler(request('https://other.invalid'))).status,403);assert.equal(reads,0);
});
