import test from 'node:test';
import assert from 'node:assert/strict';
import {getStore} from '@netlify/blobs';
import {syncBookingCalendar} from './booking-calendar.mjs';
import {encryptToken} from './google-calendar.mjs';
import {clientOAuthStore,clientSiteStore,clientCommerceStore,commerceKey} from './client-store.mjs';
import checkout from '../functions/create-client-checkout.mjs';
import admin from '../functions/client-commerce-admin.mjs';
import {availabilityForDate} from './booking-engine.mjs';
function fixture(t){
 globalThis.netlifyBlobsContext=Buffer.from(JSON.stringify({siteID:'test',token:'test',deployID:'test'})).toString('base64');
 globalThis.Netlify={env:{get:n=>n==='WEBFACTORY_TOKEN_ENCRYPTION_KEY'?'test-encryption':n==='URL'?'https://webfactorypr.com':''}};
 globalThis.netlifyIdentityContext={user:{email:'owner@example.invalid',sub:'owner',app_metadata:{}}};
 t.after(()=>{delete globalThis.Netlify;delete globalThis.netlifyIdentityContext;delete globalThis.netlifyBlobsContext});
 const rows=new Map(),proto=Object.getPrototypeOf(getStore('test'));const calls=[];
 t.mock.method(proto,'get',async function(k){return structuredClone(rows.get(`${this.name}/${k}`)||null)});
 t.mock.method(proto,'setJSON',async function(k,v){rows.set(`${this.name}/${k}`,structuredClone(v));return {modified:true}});
 t.mock.method(proto,'delete',async function(k){rows.delete(`${this.name}/${k}`)});
 t.mock.method(proto,'list',async function({prefix=''}){return {blobs:[...rows.keys()].filter(k=>k.startsWith(`${this.name}/${prefix}`)).map(k=>({key:k.slice(this.name.length+1)}))}});
 t.mock.method(globalThis,'fetch',async(url,options)=>{calls.push({url,options});if(String(url).endsWith('/freeBusy'))return Response.json({calendars:{primary:{busy:[]}}});return Response.json({id:JSON.parse(options.body).id})});
 const site={siteId:'booking-business',slug:'booking-business',status:'active',servicePlan:{subscriptionStatus:'active'},members:[{email:'owner@example.invalid',role:'owner'}],features:{bookings:true},business:{},settings:{timezone:'America/Puerto_Rico'},googleCalendar:{connected:true},catalog:[{id:'haircut',name:'Haircut',type:'service',active:true,requiresAppointment:true,duration:30,price:25}],employees:[{id:'alex',name:'Alex',active:true,serviceIds:['haircut'],calendarId:'primary',dailyLimit:10,schedule:{}}],hours:{Lunes:{enabled:true,open:'09:00',close:'17:00'}},paymentRules:{bookingPayment:'in_person'}};
 const record={transactionId:'txn-booking-test',kind:'booking',status:'confirmed',paymentStatus:'due',employeeId:'alex',start:'2099-10-05T13:00:00Z',end:'2099-10-05T13:30:00Z',items:[{name:'Haircut'}],customer:{name:'Test'}};
 return {site,record,calls,rows};
}
async function prepare(f){await clientSiteStore().setJSON(`sites/${f.site.siteId}.json`,f.site);await clientOAuthStore().setJSON(`tokens/${f.site.siteId}.json`,{encrypted:encryptToken({access_token:'test-token',expires_at:Date.now()+3600000})})}
const request=(body)=>new Request('https://webfactorypr.com/.netlify/functions/client-commerce-admin',{method:'POST',headers:{Origin:'https://webfactorypr.com','Content-Type':'application/json'},body:JSON.stringify(body)});
test('confirmed unpaid bookings sync and repeat safely after a lost response',async t=>{
 const f=fixture(t);await prepare(f);const one=await syncBookingCalendar(f.site,f.record);assert.equal(one.calendarSyncStatus,'synced');assert.match(one.googleEventId,/^bf[0-9a-f]{64}$/);
 await syncBookingCalendar(f.site,one);assert.equal(f.calls.length,1);
 const id=one.googleEventId;t.mock.method(globalThis,'fetch',async(url,opts)=>opts?.method==='POST'?Response.json({error:{message:'exists'}},{status:409}):Response.json({id,extendedProperties:{private:{webfactoryTransactionId:f.record.transactionId}}}));
 const retry=await syncBookingCalendar(f.site,f.record);assert.equal(retry.googleEventId,id);assert.equal(retry.calendarSyncPending,false);
});
test('cancelled or pending payment bookings cannot create events; missing configuration is explicit',async t=>{
 const f=fixture(t);await prepare(f);for(const status of ['cancelled','payment_pending','failed','refunded'])assert.equal((await syncBookingCalendar(f.site,{...f.record,status})).googleEventId,undefined);
 assert.equal((await syncBookingCalendar({...f.site,googleCalendar:{connected:false}},f.record)).calendarSyncStatus,'not_connected');
 assert.equal((await syncBookingCalendar({...f.site,employees:[{id:'alex'}]},f.record)).calendarSyncStatus,'unassigned');assert.equal(f.calls.length,0);
});
test('calendar failure preserves confirmed reservation for retry',async t=>{
 const f=fixture(t);await prepare(f);t.mock.method(globalThis,'fetch',async()=>Response.json({error:{message:'unavailable'}},{status:503}));const out=await syncBookingCalendar(f.site,f.record);assert.equal(out.status,'confirmed');assert.equal(out.calendarSyncStatus,'pending');assert.equal(out.calendarSyncPending,true);
});
test('in-person checkout writes confirmed booking, blocks availability, and syncs Google',async t=>{
 const f=fixture(t);await prepare(f);const day='2099-10-05';assert.equal(new Date(`${day}T12:00:00Z`).getUTCDay(),1);
 const res=await checkout(request({siteId:f.site.siteId,kind:'booking',booking:{serviceId:'haircut',employeeId:'alex',start:f.record.start},customer:{name:'Test',email:'test@example.invalid'}}));const body=await res.json();assert.equal(res.status,200,JSON.stringify(body));assert.equal(body.calendarSyncStatus,'synced');
 const stored=await clientCommerceStore().get(commerceKey(f.site.siteId,'bookings',body.transactionId),{type:'json'});assert.equal(stored.paymentStatus,'due');assert.ok(stored.googleEventId);
 const slots=await availabilityForDate(f.site,'haircut','alex',day);assert.ok(!slots.some(s=>s.start===f.record.start));
});
test('owner repairs existing due booking, repeat does not duplicate, and cancelled booking cannot be marked paid',async t=>{
 const f=fixture(t);await prepare(f);const key=commerceKey(f.site.siteId,'bookings',f.record.transactionId);await clientCommerceStore().setJSON(key,f.record);
 const payload={siteId:f.site.siteId,kind:'booking',transactionId:f.record.transactionId,action:'sync_calendar'};
 assert.equal((await admin(request(payload))).status,200);assert.equal((await admin(request(payload))).status,200);assert.equal(f.calls.length,1);
 await clientCommerceStore().setJSON(key,{...f.record,status:'cancelled'});assert.equal((await admin(request({...payload,action:'mark_paid'}))).status,409);
 globalThis.netlifyIdentityContext.user.email='other@example.invalid';assert.equal((await admin(request(payload))).status,403);
});
test('new bookings invite their customer with explicit updates and 24h/4h business reminders',async t=>{
 const f=fixture(t);await prepare(f);t.mock.method(globalThis,'fetch',async(url,options)=>{f.calls.push({url,options});const body=JSON.parse(options.body);return Response.json({...body,id:body.id})});
 const out=await syncBookingCalendar(f.site,{...f.record,customer:{name:'Test',email:'client@example.invalid'},customerCalendarInviteRequested:true});
 assert.equal(out.customerCalendarInviteStatus,'sent');assert.equal(out.customerCalendarInviteEmail,'client@example.invalid');assert.match(f.calls[0].url,/sendUpdates=all/);
 const body=JSON.parse(f.calls[0].options.body);assert.deepEqual(body.attendees,[{email:'client@example.invalid',displayName:'Test',responseStatus:'needsAction'}]);assert.deepEqual(body.reminders.overrides.map(x=>x.minutes),[1440,240]);
 await syncBookingCalendar(f.site,out);assert.equal(f.calls.length,1);
});
test('existing event adds only the missing guest, preserving other attendees and does not resend',async t=>{
 const f=fixture(t);await prepare(f);let event={id:'existing-event',attendees:[{email:'other@example.invalid',responseStatus:'accepted'}]};let patches=0;
 t.mock.method(globalThis,'fetch',async(url,options={})=>{if(options.method==='PATCH'){patches++;assert.match(url,/sendUpdates=all/);event={...event,...JSON.parse(options.body)}}return Response.json(event)});
 const record={...f.record,googleEventId:event.id,googleCalendarId:'primary',customer:{name:'Client',email:'client@example.invalid'},customerCalendarInviteRequested:true};
 const out=await syncBookingCalendar(f.site,record);assert.equal(out.customerCalendarInviteStatus,'sent');assert.equal(event.attendees.length,2);assert.equal(event.attendees[0].responseStatus,'accepted');
 await syncBookingCalendar(f.site,record);assert.equal(patches,1);
});
test('cancelling a booking notifies guests and leaves a retry flag on provider failure',async t=>{
 const f=fixture(t);await prepare(f);const key=commerceKey(f.site.siteId,'bookings',f.record.transactionId);await clientCommerceStore().setJSON(key,{...f.record,googleEventId:'event',googleCalendarId:'primary'});
 t.mock.method(globalThis,'fetch',async(url,options)=>{assert.equal(options.method,'DELETE');assert.match(url,/sendUpdates=all/);return new Response(null,{status:204})});
 const payload={siteId:f.site.siteId,kind:'booking',transactionId:f.record.transactionId,action:'cancel'};assert.equal((await admin(request(payload))).status,200);assert.equal((await clientCommerceStore().get(key,{type:'json'})).status,'cancelled');
 await clientCommerceStore().setJSON(key,{...f.record,googleEventId:'event',googleCalendarId:'primary'});t.mock.method(globalThis,'fetch',async()=>Response.json({error:{message:'Unavailable'}},{status:503}));await admin(request(payload));assert.equal((await clientCommerceStore().get(key,{type:'json'})).calendarCancellationPending,true);
});

 test('owner can preview a booking confirmation without modifying or sending it',async t=>{
  const f=fixture(t);await prepare(f);await clientCommerceStore().setJSON(commerceKey(f.site.siteId,'bookings',f.record.transactionId),f.record);
  const before=structuredClone([...f.rows]);const res=await admin(request({siteId:f.site.siteId,kind:'booking',transactionId:f.record.transactionId,action:'preview_confirmation'}));const body=await res.json();assert.equal(res.status,200);assert.match(body.html,/Alex/);assert.deepEqual([...f.rows],before);assert.equal(f.calls.length,0);
 });
