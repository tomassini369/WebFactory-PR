import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeBookingPolicy,bookingPolicy} from './booking-policy.mjs';
import {zonedToUtc,monthAvailabilityFromBlocks} from './booking-engine.mjs';
import {canManageBooking} from './booking-management.mjs';
import {createBookingAgendaHandler} from '../functions/client-booking-agenda.mjs';
import {normalizeClientSection} from '../functions/client-admin.mjs';

test('booking policy preserves defaults and rejects unbounded or coerced values',()=>{
 assert.equal(bookingPolicy({}).minimumNoticeMinutes,60);
 assert.equal(bookingPolicy({}).slotIntervalMinutes,15);
 for(const input of [{slotIntervalMinutes:0},{slotIntervalMinutes:'15'},{minimumNoticeMinutes:-1},{maximumAdvanceDays:366},{bufferBeforeMinutes:NaN},{bufferAfterMinutes:Infinity},{rescheduleNoticeMinutes:1.5}])assert.throws(()=>normalizeBookingPolicy(input),{status:400});
 assert.equal(normalizeBookingPolicy({slotIntervalMinutes:30},{minimumNoticeMinutes:90}).minimumNoticeMinutes,90);
});
test('settings sanitizer validates policy on server and preserves existing fields',()=>{
 const site={settings:{timezone:'America/Puerto_Rico',bookingPolicy:{minimumNoticeMinutes:90}}};
 const value=normalizeClientSection(site,'settings',{bookingPolicy:{slotIntervalMinutes:30}}, {},{role:'owner'});
 assert.equal(value.bookingPolicy.minimumNoticeMinutes,90);assert.equal(value.bookingPolicy.slotIntervalMinutes,30);
 assert.throws(()=>normalizeClientSection(site,'settings',{bookingPolicy:{slotIntervalMinutes:0}}, {},{role:'owner'}),{status:400});
});
test('DST conversion rejects nonexistent local times and consistently chooses first repeated time',()=>{
 assert.equal(zonedToUtc('2028-03-12','09:00','America/New_York').toISOString(),'2028-03-12T13:00:00.000Z');
 assert.equal(zonedToUtc('2028-11-05','09:00','America/New_York').toISOString(),'2028-11-05T14:00:00.000Z');
 assert.equal(zonedToUtc('2028-11-05','01:30','America/New_York').toISOString(),'2028-11-05T05:30:00.000Z');
 assert.ok(Number.isNaN(zonedToUtc('2028-03-12','02:30','America/New_York').getTime()));
 assert.equal(zonedToUtc('2028-03-12','09:00','America/Puerto_Rico').toISOString(),'2028-03-12T13:00:00.000Z');
});
test('server cancellation and rescheduling enforce independently configured cutoffs',()=>{
 const now=Date.now(),record={kind:'booking',status:'confirmed',start:new Date(now+90*60000).toISOString()};
 const site={status:'active',settings:{bookingPolicy:{cancellationNoticeMinutes:120,rescheduleNoticeMinutes:60}}};
 assert.equal(canManageBooking(site,record,'cancel',now),false);assert.equal(canManageBooking(site,record,'reschedule',now),true);
});
test('slot interval, before/after buffers and booking horizon constrain the same engine',()=>{
 const site={hours:{Tuesday:{enabled:true,open:'10:00',close:'12:00'}},settings:{bookingPolicy:{slotIntervalMinutes:30,bufferBeforeMinutes:15,bufferAfterMinutes:15}}};
 const args={month:'2028-02',timeZone:'America/Puerto_Rico',service:{duration:30},employee:{},site,blocks:[]};
 assert.equal(monthAvailabilityFromBlocks(args)['2028-02-01'],3);
 assert.equal(monthAvailabilityFromBlocks({...args,blocks:[{start:Date.parse('2028-02-01T14:00Z'),end:Date.parse('2028-02-01T15:00Z')} ]})['2028-02-01'],1);
 assert.equal(Object.keys(monthAvailabilityFromBlocks({...args,site:{...site,settings:{bookingPolicy:{maximumAdvanceDays:1}}}})).length,0);
});
test('agenda range reads preserve tenant, employee and branch isolation beyond recent 250 records',async()=>{
 const site={siteId:'a',business:{locations:[{id:'one'}]}},member={role:'employee',employeeId:'alex',locationIds:['one']};
 const rows=Array.from({length:300},(_,i)=>({transactionId:String(i),siteId:'a',kind:'booking',employeeId:'alex',locationId:'one',start:'2028-02-01T15:00Z',calendarToken:'secret',customer:{name:'Synthetic'}}));
 rows.push({...rows[0],siteId:'b'},{...rows[0],employeeId:'bob'},{...rows[0],locationId:'two'});
 const store={list:async()=>({blobs:rows.map((_,i)=>({key:String(i)}))}),get:async key=>rows[Number(key)]};
 const handler=createBookingAgendaHandler({authorize:async()=>({site,membership:member}),getStore:()=>store});
 const response=await handler(new Request('https://example.invalid/api?siteId=a&start=2028-02-01&end=2028-02-02'));
 assert.equal(response.status,200);const data=await response.json();assert.equal(data.bookings.length,300);assert.ok(data.bookings.every(r=>!r.calendarToken&&r.siteId==='a'&&r.employeeId==='alex'));
 assert.equal((await handler(new Request('https://example.invalid/api?siteId=a&start=2028-02-01&end=2029-02-02'))).status,400);
});
