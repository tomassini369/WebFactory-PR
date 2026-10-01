import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import {getStore} from '@netlify/blobs';
import {clientSiteStore,clientCommerceStore,clientOAuthStore,commerceKey} from './client-store.mjs';
import {bookingVersion,changePrivateBooking,finishBookingChange,canManageBooking} from './booking-management.mjs';
import {renderBookingEmail,safeWebUrl} from './booking-email-template.mjs';
import {createBookingHold,availabilityForDate} from './booking-engine.mjs';
import {syncBookingCalendar} from './booking-calendar.mjs';
import {encryptToken} from './google-calendar.mjs';
import manage from '../functions/manage-booking.mjs';
import retry from '../functions/retry-client-commerce.mjs';
function nextMonday(){let d=new Date(Date.now()+7*86400000);while(d.getUTCDay()!==1)d=new Date(+d+86400000);return d.toISOString().slice(0,10)}
function fixture(t){
 globalThis.netlifyBlobsContext=Buffer.from(JSON.stringify({siteID:'test',token:'test',deployID:'test'})).toString('base64');
 globalThis.Netlify={env:{get:n=>({URL:'https://webfactorypr.com',WEBFACTORY_EMAIL_PROVIDER:'gmail',WEBFACTORY_GMAIL_USER:'sender@example.invalid',WEBFACTORY_GMAIL_APP_PASSWORD:'test',WEBFACTORY_TOKEN_ENCRYPTION_KEY:'test-only'})[n]||''}};
 t.after(()=>{delete globalThis.Netlify;delete globalThis.netlifyBlobsContext});
 const rows=new Map(),proto=Object.getPrototypeOf(getStore('test')),mails=[],calls=[];let etag=0;
 t.mock.method(proto,'get',async function(k){const row=rows.get(`${this.name}/${k}`);return row?structuredClone(row.data):null});
 t.mock.method(proto,'getWithMetadata',async function(k){const row=rows.get(`${this.name}/${k}`);return row?structuredClone(row):null});
 t.mock.method(proto,'setJSON',async function(k,v,opts={}){const key=`${this.name}/${k}`,old=rows.get(key);if((opts.onlyIfNew&&old)||(opts.onlyIfMatch&&old?.etag!==opts.onlyIfMatch))return {modified:false};rows.set(key,{data:structuredClone(v),etag:String(++etag)});return {modified:true}});
 t.mock.method(proto,'delete',async function(k){rows.delete(`${this.name}/${k}`)});
 t.mock.method(proto,'list',async function({prefix=''}){return {blobs:[...rows.keys()].filter(k=>k.startsWith(`${this.name}/${prefix}`)).map(k=>({key:k.slice(this.name.length+1)}))}});
 t.mock.method(nodemailer,'createTransport',()=>({sendMail:async mail=>{mails.push(mail);return {messageId:'test'}}}));
 t.mock.method(globalThis,'fetch',async(url,opts)=>{calls.push({url,opts});throw Error('Unexpected external API')});
 const date=nextMonday(),token=crypto.randomBytes(32).toString('base64url');
 const site={siteId:'manage-business',slug:'manage-business',status:'active',business:{name:'Nova <Fade>',logoUrl:'https://example.invalid/logo.png',email:'business@example.invalid',address:'Arecibo',phone:'7875551234',locations:[{id:'one',address:'Camuy',name:'Local 1'}]},settings:{timezone:'America/Puerto_Rico'},hours:{Lunes:{enabled:true,open:'09:00',close:'17:00'}},employees:[{id:'alex',name:'Alex Rivera',active:true,serviceIds:['haircut'],locationIds:['one'],schedule:{}}],catalog:[{id:'haircut',type:'service',name:'Haircut',requiresAppointment:true,active:true,duration:30,price:25}],googleCalendar:{connected:false}};
 const record={siteId:site.siteId,transactionId:'txn-manage',bookingCode:'ABC12345',calendarToken:token,language:'es',kind:'booking',status:'confirmed',paymentStatus:'paid',amountTotal:2500,serviceId:'haircut',employeeId:'alex',start:`${date}T13:00:00.000Z`,end:`${date}T13:30:00.000Z`,locationId:'one',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),customer:{name:'Test',email:'customer@example.invalid'},items:[{name:'Haircut',unitAmount:2500,quantity:1}],customerEmailSent:true,businessEmailSent:true};
 const key=commerceKey(site.siteId,'bookings',record.transactionId),store=clientCommerceStore();
 const prepare=async()=>{await clientSiteStore().setJSON(`sites/${site.siteId}.json`,site);await store.setJSON(key,record);await store.setJSON(commerceKey(site.siteId,'transactions',record.transactionId),record);await store.setJSON(`calendar/${crypto.createHash('sha256').update(token).digest('hex')}.json`,{siteId:site.siteId,transactionId:record.transactionId})};
 return {site,record,token,date,key,store,rows,mails,calls,prepare};
}
const get=token=>new Request(`https://webfactorypr.com/.netlify/functions/manage-booking?token=${token}`);
const post=(token,data,origin='https://webfactorypr.com')=>new Request('https://webfactorypr.com/.netlify/functions/manage-booking',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token,...data})});
test('branded email localizes fields, uses actual location/professional and rejects unsafe image/map URLs',async t=>{
 const f=fixture(t), r={...f.record,locationId:'one'};const mail=renderBookingEmail(f.site,r);assert.match(mail.html,/Nova &lt;Fade&gt;/);assert.match(mail.html,/logo.png/);assert.match(mail.text,/Alex Rivera/);assert.match(mail.text,/Camuy/);assert.match(mail.text,/ABC12345/);assert.match(mail.html,/Administrar reserva/);assert.match(mail.html,/Añadir al calendario/);assert.match(mail.html,/Cómo llegar/);assert.ok(!mail.html.includes('Write a review'));assert.match(renderBookingEmail(f.site,{...r,language:'en'}).html,/Manage booking/);assert.equal(safeWebUrl('javascript:alert(1)'), '');assert.equal(safeWebUrl('https://secret:secret@example.invalid'),'');
});
test('private management page is read only, requires token and shields it from referrers; cross-origin posts are refused',async t=>{
 const f=fixture(t);await f.prepare();assert.equal((await manage(get('txn-manage'))).status,404);const res=await manage(get(f.token));assert.equal(res.status,200);assert.equal(res.headers.get('referrer-policy'),'no-referrer');assert.match(await res.text(),/Administrar reserva/);assert.equal(f.mails.length,0);assert.equal((await manage(post(f.token,{action:'cancel',acknowledged:'yes',version:bookingVersion(f.record)},'https://evil.invalid'))).status,403);assert.equal((await f.store.get(f.key,{type:'json'})).status,'confirmed');
});
test('customer cancellation commits local state, preserves payment, notifies both and cannot be replayed or revived by stale transaction retry',async t=>{
 const f=fixture(t);await f.prepare();const body={action:'cancel',acknowledged:'yes',version:bookingVersion(f.record)};const res=await manage(post(f.token,body));assert.equal(res.status,303);let r=await f.store.get(f.key,{type:'json'});assert.equal(r.status,'cancelled');assert.equal(r.paymentStatus,'paid');assert.equal(f.mails.length,2);assert.match(f.mails[0].text,/no realiza un reembolso/);assert.equal((await manage(post(f.token,body))).status,409);assert.equal(f.mails.length,2);assert.equal(f.calls.length,0);await f.store.setJSON(commerceKey(f.site.siteId,'transactions',r.transactionId),f.record);await retry();r=await f.store.get(f.key,{type:'json'});assert.equal(r.status,'cancelled');assert.equal(f.mails.length,2);
});
test('reschedule validates availability server-side, preserves payment/professional and releases its hold',async t=>{
 const f=fixture(t);await f.prepare();const start=`${f.date}T15:00:00.000Z`;const r=await changePrivateBooking(f.token,{action:'reschedule',start,acknowledged:'yes',version:bookingVersion(f.record)});assert.equal(r.start,start);assert.equal(r.end,`${f.date}T15:30:00.000Z`);assert.equal(r.paymentStatus,'paid');assert.equal(r.employeeId,f.record.employeeId);assert.equal(r.bookingCode,f.record.bookingCode);assert.equal(f.mails.length,2);assert.match(f.mails[0].text,/reprogramada/);assert.match(f.mails[0].attachments[0].content,/DTSTART:/);assert.equal((await f.store.list({prefix:`${f.site.siteId}/holds/`})).blobs.length,0);assert.equal((await f.store.get(commerceKey(f.site.siteId,'transactions',r.transactionId),{type:'json'})).start,start);
});
test('busy slots, absent acknowledgement and stale forms cannot alter the booking',async t=>{
 const f=fixture(t);await f.prepare();const start=`${f.date}T15:00:00.000Z`;await createBookingHold(f.site,{serviceId:'haircut',employeeId:'alex',start,locationId:'one'});const args={action:'reschedule',start,acknowledged:'yes',version:bookingVersion(f.record)};await assert.rejects(changePrivateBooking(f.token,args),e=>e.status===409);await assert.rejects(changePrivateBooking(f.token,{...args,version:'old'}),e=>e.status===409);await assert.rejects(changePrivateBooking(f.token,{...args,acknowledged:'no'}),e=>e.status===400);assert.equal((await f.store.get(f.key,{type:'json'})).start,f.record.start);assert.equal(f.mails.length,0);
});
test('concurrent holds for the same professional/day cannot both reserve one slot',async t=>{
 const f=fixture(t);await f.prepare();const input={serviceId:'haircut',employeeId:'alex',start:`${f.date}T15:00:00.000Z`,locationId:'one'};const results=await Promise.allSettled([createBookingHold(f.site,input),createBookingHold(f.site,input)]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal((await f.store.list({prefix:`${f.site.siteId}/holds/`})).blobs.length,1);
});
test('CAS conflict releases new hold and keeps original appointment intact',async t=>{
 const f=fixture(t);await f.prepare();const proto=Object.getPrototypeOf(f.store),base=proto.setJSON;t.mock.method(proto,'setJSON',async function(k,v,opts){if(k===f.key&&opts?.onlyIfMatch)return {modified:false};return base.call(this,k,v,opts)});await assert.rejects(changePrivateBooking(f.token,{action:'reschedule',start:`${f.date}T15:00:00.000Z`,acknowledged:'yes',version:bookingVersion(f.record)}),e=>e.status===409);assert.equal((await f.store.get(f.key,{type:'json'})).start,f.record.start);assert.equal((await f.store.list({prefix:`${f.site.siteId}/holds/`})).blobs.length,0);
});
test('past/completed bookings and business-disabled actions cannot be changed',async t=>{
 const f=fixture(t);for(const status of ['completed','cancelled','payment_pending','refunded'])assert.equal(canManageBooking(f.site,{...f.record,status},'cancel'),false);assert.equal(canManageBooking(f.site,{...f.record,start:new Date(Date.now()-1000).toISOString()},'cancel'),false);assert.equal(canManageBooking({...f.site,settings:{allowCustomerCancellation:false}},f.record,'cancel'),false);assert.equal(canManageBooking({...f.site,settings:{allowCustomerRescheduling:false}},f.record,'reschedule'),false);
});
test('calendar cancellation failure is retried without restoring the booking or resending delivered change emails',async t=>{
 const f=fixture(t);f.site.googleCalendar.connected=true;f.record.googleEventId='existing';f.record.googleCalendarId='primary';await f.prepare();await clientOAuthStore().setJSON(`tokens/${f.site.siteId}.json`,{encrypted:encryptToken({access_token:'test',expires_at:Date.now()+3600000})});let failed=true;t.mock.method(globalThis,'fetch',async(url,opts)=>{f.calls.push({url,opts});return failed?Response.json({error:{message:'offline'}},{status:503}):new Response(null,{status:204})});let r=await changePrivateBooking(f.token,{action:'cancel',acknowledged:'yes',version:bookingVersion(f.record)});assert.equal(r.status,'cancelled');assert.equal(r.calendarCancellationPending,true);assert.equal(f.mails.length,2);failed=false;r=await finishBookingChange(f.site,r);assert.equal(r.calendarCancellationPending,false);assert.equal(f.mails.length,2);assert.ok(f.calls.every(x=>String(x.url).endsWith('?sendUpdates=all')));
});
test('Google reschedule patches the original event with guest updates and repeats without another update',async t=>{
 const f=fixture(t);f.site.googleCalendar.connected=true;f.site.employees[0].calendarId='primary';await f.prepare();await clientOAuthStore().setJSON(`tokens/${f.site.siteId}.json`,{encrypted:encryptToken({access_token:'test',expires_at:Date.now()+3600000})});let event={id:'existing',start:{dateTime:f.record.start},end:{dateTime:f.record.end},attendees:[{email:f.record.customer.email,responseStatus:'accepted'}],extendedProperties:{private:{webfactoryTransactionId:f.record.transactionId}}};t.mock.method(globalThis,'fetch',async(url,opts)=>{f.calls.push({url,opts});if(opts?.method==='PATCH'){const body=JSON.parse(opts.body);assert.equal(body.attendees,undefined);event={...event,...body};}return Response.json(event)});const r={...f.record,googleEventId:'existing',googleCalendarId:'primary',calendarUpdatePending:true,start:`${f.date}T15:00:00.000Z`,end:`${f.date}T15:30:00.000Z`};const synced=await syncBookingCalendar(f.site,r);assert.equal(synced.calendarUpdatePending,false);assert.equal(synced.googleEventId,'existing');assert.equal(f.calls.filter(x=>x.opts?.method==='PATCH').length,1);assert.match(f.calls[1].url,/sendUpdates=all/);await syncBookingCalendar(f.site,r);assert.equal(f.calls.filter(x=>x.opts?.method==='PATCH').length,1);assert.equal(event.attendees[0].responseStatus,'accepted');
});
test('Google availability errors block rescheduling instead of advertising unchecked slots',async t=>{
 const f=fixture(t);f.site.googleCalendar.connected=true;f.site.employees[0].calendarId='primary';await f.prepare();await assert.rejects(availabilityForDate(f.site,'haircut','alex',f.date,'one',{strictGoogle:true}),e=>e.status===503);
});
