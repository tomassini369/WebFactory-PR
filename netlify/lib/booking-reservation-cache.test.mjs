import test from 'node:test';import assert from 'node:assert/strict';import {reservationBlocks} from './booking-reservation-cache.mjs';
function fixture(){const rows=new Map();let version=0,reads=0;const store={list:async({prefix})=>({blobs:[...rows].filter(([k])=>k.startsWith(prefix)).map(([key,value])=>({key,etag:value.etag}))}),get:async key=>{reads++;return structuredClone(rows.get(key)?.value)},setJSON:async(key,value)=>{rows.set(key,{value:structuredClone(value),etag:String(++version)});return {modified:true}}};const options={store,siteId:'a',employeeId:'alex',startDay:0,endDay:86400000,now:1000};return {store,rows,options,reads:()=>reads,reset:()=>{reads=0}}}
const row={siteId:'a',employeeId:'alex',transactionId:'one',start:new Date(10000).toISOString(),end:new Date(20000).toISOString(),status:'confirmed'};
test('warm availability avoids historical blob reads; changed etags invalidate it',async()=>{
 const f=fixture();for(let i=0;i<300;i++)await f.store.setJSON('a/bookings/'+i+'.json',{...row,transactionId:String(i),employeeId:i===0?'alex':'other'});
 const first=await reservationBlocks(f.options);assert.equal(first.length,1);assert.equal(f.reads(),302);
 f.reset();assert.deepEqual(await reservationBlocks(f.options),first);assert.equal(f.reads(),2);
 await f.store.setJSON('a/bookings/0.json',{...row,status:'cancelled'});f.reset();assert.deepEqual(await reservationBlocks(f.options),[]);assert.equal(f.reads(),302);
});
test('authoritative reads bypass cache, expired holds disappear, and tenants remain separate',async()=>{
 const f=fixture();await f.store.setJSON('a/holds/one.json',{...row,holdId:'hold',expiresAt:new Date(1500).toISOString()});await f.store.setJSON('a/bookings/foreign.json',{...row,siteId:'b'});
 assert.equal((await reservationBlocks(f.options)).length,1);assert.equal((await reservationBlocks({...f.options,now:1600})).length,0);
 assert.equal((await reservationBlocks({...f.options,ignoreReservationId:'hold'})).length,0);
 // Simulate an untrusted/corrupt cache: fresh reads must ignore it.
 for(const [key,saved] of f.rows)if(key.includes('derived-booking'))saved.value.blocks=[];
 assert.equal((await reservationBlocks({...f.options,fresh:true})).length,1);
});
test('cache errors preserve canonical availability and missing etags disable caching',async()=>{
 const f=fixture();await f.store.setJSON('a/bookings/one.json',row);f.rows.get('a/bookings/one.json').etag=undefined;
 assert.equal((await reservationBlocks(f.options)).length,1);assert.equal([...f.rows.keys()].some(k=>k.includes('derived-booking')),false);
});
