import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {getStore} from '@netlify/blobs';
import {bookingIcs,calendarLinks} from './booking-calendar-export.mjs';
import {sendCustomerCommerceEmail,sendBookingConfirmationEmails} from './client-notifications.mjs';
import endpoint from '../functions/booking-calendar-file.mjs';
const site={siteId:'a',business:{name:'Negocio <test>',email:'owner@example.invalid'},settings:{timezone:'America/Puerto_Rico'},employees:[]};
const record={siteId:'a',kind:'booking',status:'confirmed',transactionId:'txn-a',start:'2099-10-05T09:00:00-04:00',end:'2099-10-05T09:30:00-04:00',createdAt:'2099-10-01T00:00:00Z',items:[{name:'Corte, barba; 🎉'.repeat(10)}],customer:{email:'customer@example.invalid'},paymentStatus:'due',calendarToken:'a'.repeat(43),language:'es'};
test('calendar export preserves UTC instants, escapes text, folds UTF8 and includes two alarms without personal data',()=>{
 const ics=bookingIcs(site,record);assert.match(ics,/DTSTART:20991005T130000Z/);assert.match(ics,/DTEND:20991005T133000Z/);assert.match(ics,/TRIGGER:-PT24H/);assert.match(ics,/TRIGGER:-PT4H/);assert.match(ics,/Corte\\, barba\\;/);assert.ok(ics.split('\r\n').every(x=>Buffer.byteLength(x)<=75));assert.ok(!ics.includes(record.customer.email));assert.equal(bookingIcs(site,record),ics);
 const links=calendarLinks(site,record);assert.equal(new URL(links.google).searchParams.get('dates'),'20991005T130000Z/20991005T133000Z');assert.equal(new URL(links.outlook).searchParams.get('startdt'),'2099-10-05T13:00:00.000Z');
});
test('pending and cancelled appointments cannot be exported',()=>{for(const status of ['payment_pending','cancelled','failed'])assert.equal(bookingIcs(site,{...record,status}),null)});
function mailFixture(){
 const sent=[];const deliver=async(_site,mail)=>{sent.push(mail);return {messageId:'test',accepted:[Array.isArray(mail.to)?mail.to[0]:mail.to]}};return {sent,deliver};
}
test('booking confirmation has safe HTML calendar button and ICS attachment and describes unpaid booking correctly',async t=>{
 const {sent,deliver}=mailFixture();await sendCustomerCommerceEmail(site,record,deliver);assert.equal(sent.length,1);assert.match(sent[0].html,/Añadir al calendario/);assert.match(sent[0].html,/Negocio &lt;test&gt;/);assert.equal(sent[0].attachments[0].filename,'appointment.ics');assert.match(sent[0].text,/Pago al llegar/);assert.ok(!sent[0].text.includes('verified securely by Stripe'));
});
test('failed confirmation does not cancel reservation and successful recipients are not replayed',async t=>{
 const {sent}=mailFixture();let fail=true;const deliver=async(_site,mail)=>{const to=Array.isArray(mail.to)?mail.to:[mail.to];if(to.includes('customer@example.invalid')&&fail)throw Error('offline');sent.push({...mail,to});return {messageId:'test',accepted:[to[0]]}};const writes=[];
 let r=await sendBookingConfirmationEmails(site,record,async v=>writes.push(v),{deliver});assert.equal(r.status,'confirmed');assert.equal(r.customerEmailSent,undefined);assert.equal(r.businessEmailSent,true);fail=false;
 r=await sendBookingConfirmationEmails(site,r,async v=>writes.push(v),{deliver});assert.equal(r.customerEmailSent,true);assert.equal(sent.length,2);assert.equal(writes.length,2);
});
test('calendar link requires unguessable token, refuses cancelled bookings and returns safe chooser and private ICS',async t=>{
 globalThis.Netlify={env:{get:()=>''}};globalThis.netlifyBlobsContext=Buffer.from(JSON.stringify({siteID:'test',token:'test',deployID:'test'})).toString('base64');t.after(()=>{delete globalThis.Netlify;delete globalThis.netlifyBlobsContext});
 let current=record;const hash=crypto.createHash('sha256').update(record.calendarToken).digest('hex');t.mock.method(Object.getPrototypeOf(getStore('test')),'get',async function(k){return k===`calendar/${hash}.json`?{siteId:'a',transactionId:'txn-a'}:k==='a/bookings/txn-a.json'?current:k==='sites/a.json'?site:null});
 const req=suffix=>new Request(`https://webfactorypr.com/.netlify/functions/booking-calendar-file${suffix}`);
 assert.equal((await endpoint(req('?token=txn-a'))).status,404);assert.equal((await endpoint(req(`?token=${'b'.repeat(43)}`))).status,404);
 const html=await endpoint(req(`?token=${record.calendarToken}`));assert.equal(html.status,200);assert.equal(html.headers.get('referrer-policy'),'no-referrer');const body=await html.text();assert.match(body,/Negocio &lt;test&gt;/);assert.ok(!body.includes(record.customer.email));assert.match(body,/Apple Calendar/);
 const ics=await endpoint(req(`?token=${record.calendarToken}&format=ics`));assert.match(ics.headers.get('content-type'),/text\/calendar/);assert.match(await ics.text(),/TRIGGER:-PT24H/);
 current={...record,status:'cancelled'};assert.equal((await endpoint(req(`?token=${record.calendarToken}&format=ics`))).status,409);
});
