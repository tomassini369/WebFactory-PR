import test from 'node:test';
import assert from 'node:assert/strict';
import {joinWaitlist,offerWaitlist,cancelWaitlist,tokenHash} from './booking-waitlist.mjs';
import {createWaitlistAdminHandler} from '../functions/client-booking-waitlist.mjs';
function memory(){const rows=new Map();let n=0;return {rows,get:async k=>structuredClone(rows.get(k)?.data),getWithMetadata:async k=>structuredClone(rows.get(k)),setJSON:async(k,data,options={})=>{const old=rows.get(k);if(options.onlyIfNew&&old||options.onlyIfMatch&&old?.etag!==options.onlyIfMatch)return {modified:false};rows.set(k,{data:structuredClone(data),etag:String(++n)});return {modified:true}},list:async({prefix})=>({blobs:[...rows.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))})}}
const now=Date.parse('2028-01-01T12:00Z');
const site={siteId:'business-a',slug:'sample',settings:{waitlistEnabled:true},catalog:[{id:'cut',active:true,requiresAppointment:true}],employees:[{id:'alex',serviceIds:['cut'],locationIds:['one']}],business:{name:'Test',locations:[{id:'one'}]}};
const input={serviceId:'cut',employeeId:'alex',locationId:'one',from:'2028-01-02',until:'2028-01-04',name:'Synthetic',email:'test@example.invalid',consent:true};
const booking={status:'cancelled',start:'2028-01-02T15:00:00.000Z',employeeId:'alex',locationId:'one'};
test('waitlist validates explicit consent, dates, service/employee/location and applies atomic email throttle',async()=>{
 const store=memory();for(const patch of [{consent:false},{from:'2028-02-31'},{employeeId:'outsider'},{locationId:'other'},{until:'2029-01-01'}])await assert.rejects(joinWaitlist(site,{...input,...patch},{store,now}),{status:400});
 const results=await Promise.allSettled([joinWaitlist(site,input,{store,now}),joinWaitlist(site,input,{store,now})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.status,429);
 const result=results.find(r=>r.status==='fulfilled').value;assert.equal(result.token.length,43);assert.ok(!JSON.stringify([...store.rows.values()]).includes(result.token));
});
test('matching invitation is at most once, expiring and never creates a booking',async()=>{
 const store=memory();await joinWaitlist(site,input,{store,now});let sends=0;
 const options={store,now,baseUrl:'https://preview.example.invalid',available:async()=>[{start:booking.start}],send:async()=>{sends++}};
 await Promise.all([offerWaitlist(site,booking,options),offerWaitlist(site,booking,options)]);await offerWaitlist(site,booking,options);
 assert.equal(sends,1);assert.equal([...store.rows.keys()].filter(k=>k.includes('/bookings/')).length,0);
 const invite=[...store.rows.entries()].find(([k])=>k.includes('/waitlist-invitations/'))[1].data;assert.ok(Date.parse(invite.expiresAt)<=now+86400000);
});
test('uncertain email is recorded and never retried automatically; cancellation suppresses future offers and clears contact',async()=>{
 const store=memory(),result=await joinWaitlist(site,input,{store,now});let sends=0;
 const options={store,now,baseUrl:'https://preview.example.invalid',available:async()=>[{start:booking.start}],send:async()=>{sends++;throw Error('uncertain')}};
 await offerWaitlist(site,booking,options);await offerWaitlist(site,booking,options);assert.equal(sends,1);
 const id=tokenHash(result.token);assert.equal((await store.get('business-a/waitlist/'+id+'.json')).deliveryStatus,'uncertain');
 await assert.rejects(cancelWaitlist('business-b',id,{store}),{status:404});await cancelWaitlist(site.siteId,id,{store});await offerWaitlist(site,booking,options);assert.equal(sends,1);assert.equal((await store.get('business-a/waitlist/'+id+'.json')).customer,null);
});
test('expired requests, nonmatching branches and unavailable slots do not send',async()=>{
 for(const [time,change,slots] of [[now+40*86400000,{},[{start:booking.start}]],[now,{locationId:'two'},[{start:booking.start}]],[now,{},[]]]){
  const store=memory();await joinWaitlist(site,input,{store,now});let sends=0;
  await offerWaitlist(site,{...booking,...change},{store,now:time,baseUrl:'https://preview.example.invalid',available:async()=>slots,send:async()=>{sends++}});assert.equal(sends,0);
 }
});
test('employee cannot read owner waitlist contact information',async()=>{
 const handler=createWaitlistAdminHandler({authorize:async()=>({site,membership:{role:'employee'}}),getStore:memory});
 assert.equal((await handler(new Request('https://example.invalid/api?siteId=business-a'))).status,403);
});

test('waitlist pages include requests beyond 500 without returning private contacts from another tenant',async()=>{
 const {readWaitlistPage}=await import('./booking-waitlist.mjs');const store=memory();
 for(let i=0;i<505;i++){const id=i.toString(16).padStart(64,'0');await store.setJSON('business-a/waitlist/'+id+'.json',{siteId:'business-a',id,status:'waiting',expiresAt:'2028-02-01T12:00Z',customer:{email:'synthetic@example.invalid'}})}
 let after='',count=0;do{const page=await readWaitlistPage(site,{store,after,now});assert.ok(page.requests.length<=50);count+=page.requests.length;after=page.nextCursor;}while(after);
 assert.equal(count,505);await assert.rejects(readWaitlistPage(site,{store,after:'../other'}),{status:400});
});
test('expiry erases contact with CAS and recycles only delivered invitations within the consent window',async()=>{
 const {maintainWaitlistEntry}=await import('./booking-waitlist.mjs');const store=memory(),key='business-a/waitlist/test.json';
 const row={siteId:'business-a',status:'invited',customer:{name:'Synthetic',email:'test@example.invalid'},expiresAt:'2028-02-01T12:00Z',invitationExpiresAt:'2027-12-31T12:00Z',invitationHash:'old',deliveryStatus:'sent'};
 await store.setJSON(key,row);assert.equal((await maintainWaitlistEntry(site.siteId,key,{store,now})).status,'waiting');
 await store.setJSON(key,{...row,deliveryStatus:'uncertain'});assert.equal((await maintainWaitlistEntry(site.siteId,key,{store,now})).status,'invited');
 await store.setJSON(key,{...row,expiresAt:'2027-12-31T12:00Z'});const expired=await maintainWaitlistEntry(site.siteId,key,{store,now});assert.equal(expired.status,'expired');assert.equal(expired.customer,null);
});

test('maintenance resumes tenant pages and preview does not execute scheduled writes',async()=>{
 const {maintainWaitlists,default:scheduled}=await import('../functions/booking-waitlist-maintenance.mjs');
 const store=memory();store.delete=async key=>store.rows.delete(key);
 const sites={list:async()=>({blobs:[{key:'sites/business-a.json'}]}),get:async()=>site};
 for(let i=0;i<55;i++){const id=i.toString(16).padStart(64,'0');await store.setJSON('business-a/waitlist/'+id+'.json',{siteId:'business-a',id,status:'waiting',customer:{email:'synthetic@example.invalid'},expiresAt:'2027-12-31T12:00Z'})}
 assert.equal((await maintainWaitlists({sites,store,clock:()=>now})).processed,50);
 await maintainWaitlists({sites,store,clock:()=>now});
 assert.equal((await maintainWaitlists({sites,store,clock:()=>now})).processed,5);
 const values=[...store.rows.values()].map(r=>r.data).filter(r=>r.status==='expired');assert.equal(values.length,55);assert.ok(values.every(r=>r.customer===null));
 await scheduled(new Request('https://preview.invalid'),{deploy:{context:'deploy-preview',published:false}});
});
