import test from 'node:test';
import assert from 'node:assert/strict';
import {effectiveSchedule,slotsForSchedule,reservationsForEmployee,monthAvailabilityFromBlocks,availabilityForDate,availabilityForMonth,createBookingHold} from './booking-engine.mjs';
import {publicClientSite,clientCommerceStore} from './client-store.mjs';
import {getStore} from '@netlify/blobs';
import {records} from '../functions/webfactory-admin-overview.mjs';
const tz='America/Puerto_Rico',date='2030-01-07';
const schedule={enabled:true,open:'09:00',close:'11:00'};
const slots=(overrides={})=>slotsForSchedule({date,schedule,service:{duration:30},blocks:[],timeZone:tz,...overrides});
test('absence blocks a full local day, including a date-only final day',()=>{
 assert.equal(slots({employee:{timeOff:[{start:date,end:date}]}}).length,0);
 assert.equal(slots({employee:{timeOff:[{start:date+'T13:00:00Z',end:date+'T14:00:00Z'}]}})[0].start,date+'T14:00:00.000Z');
});
test('daily limit counts reservations and active holds, not external calendar blocks or other days',()=>{
 const block={start:Date.parse(date+'T13:00:00Z'),end:Date.parse(date+'T13:30:00Z'),countsTowardLimit:true};
 assert.equal(slots({blocks:[block],employee:{dailyLimit:1}}).length,0);
 assert.ok(slots({blocks:[{...block,countsTowardLimit:false}],employee:{dailyLimit:1}}).length>0);
 assert.ok(slots({blocks:[{...block,start:0,end:1}],employee:{dailyLimit:1}}).length>0);
});
test('employee hours intersect business or branch hours and cannot open a closed base schedule',()=>{
 const employee={schedule:{Lunes:{enabled:true,open:'08:00',close:'18:00'}}};
 assert.deepEqual(effectiveSchedule({hours:{Lunes:schedule}},employee,'Lunes'),schedule);
 assert.equal(effectiveSchedule({hours:{Lunes:{...schedule,enabled:false}}},employee,'Lunes').enabled,false);
 assert.deepEqual(effectiveSchedule({hours:{Lunes:{enabled:false}},business:{locations:[{id:'east',hours:{Lunes:schedule}}]}},employee,'Lunes','east'),schedule);
});
test('daily and monthly availability enforce the same absence policy',()=>{
 const available=monthAvailabilityFromBlocks({month:'2030-01',timeZone:tz,service:{duration:30},employee:{timeOff:[{start:date,end:date}]},site:{hours:{Lunes:schedule}},blocks:[]});
 assert.equal(available[date],undefined);assert.ok(available['2030-01-14']>0);
});
test('new appointments leave the configured buffer before closing',()=>{
 const times=slots({service:{duration:30,bufferMinutes:30}});
 assert.equal(times.at(-1).start,date+'T14:00:00.000Z');
});
test('stored buffers survive catalog changes, mirrored holds count once and reschedules can exclude themselves',async()=>{
 const site={siteId:'a',catalog:[{id:'cut',bufferMinutes:0}]};
 const booking={employeeId:'e',transactionId:'one',holdId:'h',serviceId:'cut',start:date+'T13:00:00Z',end:date+'T13:30:00Z',bufferMinutes:30,status:'confirmed'};
 const values={'a/bookings/one.json':booking,'a/holds/h.json':{...booking,transactionId:undefined,holdId:'h',expiresAt:new Date(Date.now()+60000).toISOString()}};
 const store={list:async({prefix})=>({blobs:Object.keys(values).filter(key=>key.startsWith(prefix)).map(key=>({key}))}),get:async key=>values[key]};
 const blocks=await reservationsForEmployee(site,'e',Date.parse(date+'T00:00:00Z'),Date.parse(date+'T23:59:00Z'),{store});
 assert.equal(blocks.length,1);assert.equal(blocks[0].end,Date.parse(date+'T14:00:00Z'));
 assert.ok(!slots({blocks}).some(slot=>slot.start===date+'T13:30:00.000Z'));
 assert.equal((await reservationsForEmployee(site,'e',0,Date.parse('2031-01-01'),{store,excludeBookingId:'one'})).length,0);
});
test('history reads overlap but stay bounded; storage failures never become available slots',async()=>{
 let active=0,max=0;
 const store={list:async({prefix})=>({blobs:prefix.includes('bookings')?Array.from({length:45},(_,i)=>({key:String(i)})):[]}),get:async()=>{max=Math.max(max,++active);await new Promise(resolve=>setTimeout(resolve,1));active--;return null}};
 await reservationsForEmployee({siteId:'a'},'e',0,1,{store});assert.ok(max>1&&max<=20);
 await assert.rejects(reservationsForEmployee({siteId:'a'},'e',0,1,{store:{...store,get:async()=>{throw Error('unavailable')}}}));
});
test('public DTO preserves only safe locale and timezone settings',()=>{
 const dto=publicClientSite({settings:{locale:'es',timezone:'America/New_York',internalSecret:'never-public'}});
 assert.deepEqual(dto.settings,{locale:'es',timezone:'America/New_York'});
 assert.ok(!JSON.stringify(dto).includes('never-public'));
});
test('admin overview loads beyond 300 with bounded batches and selects transaction documents',async()=>{
 let active=0,max=0;
 const store={list:async()=>({blobs:[...Array.from({length:350},(_,i)=>({key:`a/transactions/${i}.json`})),{key:'a/bookings/duplicate.json'}]}),get:async key=>{max=Math.max(max,++active);await Promise.resolve();active--;return {key}}};
 assert.equal((await records(store,'',key=>key.includes('/transactions/'))).length,350);assert.ok(max<=20);
 await assert.rejects(records({...store,get:async()=>{throw Error('read failed')}}));
});
test('default daily/monthly reads and holds fail closed when the connected Google calendar is unavailable',async t=>{
 globalThis.netlifyBlobsContext=Buffer.from(JSON.stringify({siteID:'test',token:'test',deployID:'test'})).toString('base64');
 t.after(()=>{delete globalThis.netlifyBlobsContext});
 const proto=Object.getPrototypeOf(getStore('test'));let holdWrites=0;
 t.mock.method(proto,'get',async()=>null);t.mock.method(proto,'list',async()=>({blobs:[]}));
 t.mock.method(proto,'setJSON',async(key)=>{if(key.includes('/holds/'))holdWrites++;return {modified:true}});
 const site={siteId:'test',settings:{timezone:tz},hours:{Lunes:schedule},catalog:[{id:'cut',type:'service',requiresAppointment:true,duration:30}],employees:[{id:'e',serviceIds:['cut'],calendarId:'primary'}],googleCalendar:{connected:true}};
 await assert.rejects(availabilityForDate(site,'cut','e',date),e=>e.status===503);
 await assert.rejects(availabilityForMonth(site,'cut','e','2030-01'),e=>e.status===503);
 await assert.rejects(createBookingHold(site,{serviceId:'cut',employeeId:'e',start:date+'T13:00:00Z'}),e=>e.status===503);
 assert.equal(holdWrites,0);
});
