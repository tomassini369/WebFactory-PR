import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import {getStore} from '@netlify/blobs';
import {dueBookingReminders,sendBookingReminders} from './booking-reminders.mjs';
import {clientCommerceStore,commerceKey} from './client-store.mjs';
const start=Date.parse('2099-10-05T13:00:00Z');
const record={transactionId:'reminder-test',kind:'booking',status:'confirmed',start:new Date(start).toISOString(),createdAt:new Date(start-48*3600000).toISOString(),customer:{name:'Test',email:'customer@example.invalid'},items:[{name:'Haircut'}]};
const site={siteId:'reminder-business',status:'active',business:{name:'Business',email:'business@example.invalid'},settings:{timezone:'America/Puerto_Rico'}};
function fixture(t){
 globalThis.netlifyBlobsContext=Buffer.from(JSON.stringify({siteID:'test',token:'test',deployID:'test'})).toString('base64');globalThis.Netlify={env:{get:n=>({WEBFACTORY_EMAIL_PROVIDER:'gmail',WEBFACTORY_GMAIL_USER:'sender@example.invalid',WEBFACTORY_GMAIL_APP_PASSWORD:'test-only'})[n]||''}};t.after(()=>{delete globalThis.Netlify;delete globalThis.netlifyBlobsContext});
 const rows=new Map(),proto=Object.getPrototypeOf(getStore('test'));let etag=0;
 t.mock.method(proto,'get',async function(k){return structuredClone(rows.get(`${this.name}/${k}`)?.value||null)});
 t.mock.method(proto,'getWithMetadata',async function(k){const row=rows.get(`${this.name}/${k}`);return row?{data:structuredClone(row.value),etag:row.etag}:null});
 t.mock.method(proto,'setJSON',async function(k,v,opts={}){const key=`${this.name}/${k}`,old=rows.get(key);if((opts.onlyIfNew&&old)||(opts.onlyIfMatch&&old?.etag!==opts.onlyIfMatch))return {modified:false};rows.set(key,{value:structuredClone(v),etag:String(++etag)});return {modified:true}});
 t.mock.method(proto,'delete',async function(k){rows.delete(`${this.name}/${k}`)});const mails=[];t.mock.method(nodemailer,'createTransport',()=>({sendMail:async mail=>{mails.push(mail);return {messageId:'test'}}}));return {rows,mails};
}
test('24h and 4h windows exclude premature, obsolete, cancelled and short-notice reminders',()=>{
 assert.deepEqual(dueBookingReminders(record,start-24*3600000),[24]);assert.deepEqual(dueBookingReminders(record,start-4*3600000+5*60000),[4]);assert.deepEqual(dueBookingReminders(record,start-25*3600000),[]);assert.deepEqual(dueBookingReminders(record,start-24*3600000+31*60000),[]);
 assert.deepEqual(dueBookingReminders({...record,createdAt:new Date(start-8*3600000).toISOString()},start-24*3600000),[]);assert.deepEqual(dueBookingReminders({...record,status:'cancelled'},start-4*3600000),[]);
});
test('business and customer each get one reminder at both intervals; repeat invocations do not duplicate',async t=>{
 const f=fixture(t);await clientCommerceStore().setJSON(commerceKey(site.siteId,'bookings',record.transactionId),record);
 assert.equal(await sendBookingReminders(site,record,start-24*3600000),2);assert.equal(await sendBookingReminders(site,record,start-24*3600000+5*60000),0);assert.equal(await sendBookingReminders(site,record,start-4*3600000),2);assert.equal(f.mails.length,4);assert.equal(f.mails.filter(m=>m.to[0]===record.customer.email).length,2);assert.match(f.mails[0].text,/9:00/);assert.match(f.mails[0].text,/America\/Puerto_Rico/);
});
test('recipient deduplication and last-minute cancellation prevent unwanted reminder sends',async t=>{
 const f=fixture(t);await clientCommerceStore().setJSON(commerceKey(site.siteId,'bookings',record.transactionId),record);assert.equal(await sendBookingReminders({...site,business:{email:record.customer.email}},record,start-24*3600000),1);
 await clientCommerceStore().setJSON(commerceKey(site.siteId,'bookings',record.transactionId),{...record,status:'cancelled'});assert.equal(await sendBookingReminders(site,record,start-4*3600000),0);assert.equal(f.mails.length,1);
});
test('delivery failures release the claim so a following scheduled run can retry',async t=>{
 const f=fixture(t);await clientCommerceStore().setJSON(commerceKey(site.siteId,'bookings',record.transactionId),record);t.mock.method(nodemailer,'createTransport',()=>({sendMail:async()=>{throw Error('SMTP unavailable')}}));assert.equal(await sendBookingReminders(site,record,start-24*3600000),0);
 t.mock.method(nodemailer,'createTransport',()=>({sendMail:async mail=>{f.mails.push(mail);return {}}}));assert.equal(await sendBookingReminders(site,record,start-24*3600000+5*60000),2);
});
