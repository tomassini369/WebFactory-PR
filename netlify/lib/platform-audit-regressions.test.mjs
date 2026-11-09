import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeClientSection} from '../functions/client-admin.mjs';
import {monthAvailabilityFromBlocks} from './booking-engine.mjs';
const site={siteId:'audit-fixture',business:{name:'Synthetic fixture'},catalog:[],employees:[],members:[],servicePlan:{subscriptionStatus:'active'},settings:{timezone:'America/Puerto_Rico'}};
const normalize=(section,value)=>normalizeClientSection(site,section,value,{id:'owner'},{role:'owner'});
test('five-minute booking intervals retain every valid start in a ten-hour day',()=>{
 const business={hours:{Monday:{enabled:true,open:'09:00',close:'19:00'}},settings:{bookingPolicy:{slotIntervalMinutes:5,minimumNoticeMinutes:0}}};
 const dates=monthAvailabilityFromBlocks({month:'2028-11',timeZone:'America/Puerto_Rico',service:{duration:30},employee:{},site:business,blocks:[]});
 assert.equal(dates['2028-11-06'],115);
});
test('general, branch and professional hours reject invalid clock values before saving',()=>{
 for(const [open,close] of [['09:00','25:00'],['99:00','99:59'],['09:60','17:00'],['9:00','17:00'],['','17:00'],['09:00',{}]]){
  const hours={Monday:{enabled:true,open,close}};
  for(const [section,value] of [['hours',hours],['business',{locations:[{id:'one',name:'Fixture branch',hours}]}],['employees',[{id:'one',name:'Fixture professional',schedule:hours}]]])assert.throws(()=>normalize(section,value),{status:400},`${section}: ${JSON.stringify(hours)}`);
 }
});
test('enabled hours require closing after opening without silently scheduling overnight',()=>{
 for(const [open,close] of [['17:00','09:00'],['09:00','09:00']])assert.throws(()=>normalize('hours',{Monday:{enabled:true,open,close}}),{status:400});
 assert.deepEqual(normalize('hours',{Monday:{enabled:false,open:'00:00',close:'00:00'}}).Monday,{enabled:false,open:'00:00',close:'00:00',breaks:[]});
 assert.equal(normalize('hours',{Monday:{enabled:false,open:'',close:''}}).Monday.open,'09:00');
});
test('legacy invalid hours do not advertise slots on a different local day',()=>{
 const dates=monthAvailabilityFromBlocks({month:'2028-11',timeZone:'America/Puerto_Rico',service:{duration:30},employee:{},site:{hours:{Monday:{enabled:true,open:'09:00',close:'25:00'}}},blocks:[]});
 assert.deepEqual(dates,{});
});

test('long-day availability still excludes existing bookings instead of trimming free late slots',()=>{
 const business={hours:{Monday:{enabled:true,open:'09:00',close:'19:00'}},settings:{bookingPolicy:{slotIntervalMinutes:5,minimumNoticeMinutes:0}}};
 const dates=monthAvailabilityFromBlocks({month:'2028-11',timeZone:'America/Puerto_Rico',service:{duration:30},employee:{},site:business,blocks:[{start:Date.parse('2028-11-06T21:00:00Z'),end:Date.parse('2028-11-06T23:00:00Z')}]});
 assert.equal(dates['2028-11-06'],91);assert.equal(dates['2028-11-13'],115);
});
test('new business creation rejects the same invalid clock windows as the existing-site editor',async()=>{
 const {sanitizeBuilderRequest}=await import('./builder-request.mjs');
 const request=hours=>({draftId:'synthetic-audit-draft-0001',orderData:{business:{name:'Synthetic business'},client:{name:'Synthetic owner',email:'owner@example.invalid'},hours}});
 for(const [open,close] of [['09:00','25:00'],['99:00','99:59'],['17:00','09:00']])assert.throws(()=>sanitizeBuilderRequest(request({Monday:{enabled:true,open,close}})),{status:400});
 const hours={Monday:{enabled:true,open:'09:00',close:'17:00'}};assert.deepEqual(sanitizeBuilderRequest(request(hours)).hours,hours);
});
