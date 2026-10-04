import test from 'node:test';
import assert from 'node:assert/strict';
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
 t.mock.method(proto,'delete',async function(k){rows.delete(`${this.name}/${k}`)});const mails=[];t.mock.method(nodemailer,'createTransport',()=>({close:()=>{},sendMail:async mail=>{mails.push(mail);return {messageId:'test',accepted:[mail.to[0]]}}}));return {rows,mails};
}
test('24h and 4h windows exclude premature, obsolete, cancelled and short-notice reminders',()=>{
 assert.deepEqual(dueBookingReminders(record,start-24*3600000),[24]);assert.deepEqual(dueBookingReminders(record,start-4*3600000+5*60000),[4]);assert.deepEqual(dueBookingReminders(record,start-25*3600000),[]);assert.deepEqual(dueBookingReminders(record,start-24*3600000+31*60000),[]);
 assert.deepEqual(dueBookingReminders({...record,createdAt:new Date(start-8*3600000).toISOString()},start-24*3600000),[]);assert.deepEqual(dueBookingReminders({...record,status:'cancelled'},start-4*3600000),[]);
});
test('business and customer each get one reminder at both intervals; repeat invocations do not duplicate',async t=>{
 const f=fixture(t);await clientCommerceStore().setJSON(commerceKey(site.siteId,'bookings',record.transactionId),record);
 assert.equal(await sendBookingReminders(site,record,start-24*3600000,Infinity,{send:f.send}),2);assert.equal(await sendBookingReminders(site,record,start-24*3600000+5*60000,Infinity,{send:f.send}),0);assert.equal(await sendBookingReminders(site,record,start-4*3600000,Infinity,{send:f.send}),2);assert.equal(f.mails.length,4);assert.equal(f.mails.filter(m=>m.to[0]===record.customer.email).length,2);assert.match(f.mails[0].text,/9:00/);assert.match(f.mails[0].text,/America\/Puerto_Rico/);
});
test('recipient deduplication and last-minute cancellation prevent unwanted reminder sends',async t=>{
 const f=fixture(t);await clientCommerceStore().setJSON(commerceKey(site.siteId,'bookings',record.transactionId),record);assert.equal(await sendBookingReminders({...site,business:{email:record.customer.email}},record,start-24*3600000,Infinity,{send:f.send}),1);
 await clientCommerceStore().setJSON(commerceKey(site.siteId,'bookings',record.transactionId),{...record,status:'cancelled'});assert.equal(await sendBookingReminders(site,record,start-4*3600000,Infinity,{send:f.send}),0);assert.equal(f.mails.length,1);
});
test('uncertain SMTP responses preserve the claim and never auto-retry',async t=>{
 const f=fixture(t);await clientCommerceStore().setJSON(commerceKey(site.siteId,'bookings',record.transactionId),record);let attempts=0;t.mock.method(nodemailer,'createTransport',()=>({close:()=>{},sendMail:async()=>{attempts++;throw Error('SMTP response lost')}}));assert.equal(await sendBookingReminders(site,record,start-24*3600000,Infinity,{send:f.send}),0);
 assert.equal(await sendBookingReminders(site,record,start-24*3600000+15*60000,Infinity,{send:f.send}),0);assert.equal(attempts,2);assert.equal([...f.rows.values()].filter(x=>x.value.status==='delivery_uncertain').length,2);
});
test('crashed sending claims become uncertain without re-sending and concurrent workers send once',async t=>{
 const f=fixture(t);await clientCommerceStore().setJSON(commerceKey(site.siteId,'bookings',record.transactionId),record);
 const results=await Promise.all([sendBookingReminders(site,record,start-24*3600000,Infinity,{send:f.send}),sendBookingReminders(site,record,start-24*3600000,Infinity,{send:f.send})]);assert.equal(results.reduce((a,b)=>a+b,0),2);assert.equal(f.mails.length,2);
 for(const row of f.rows.values())if(row.value.status==='sent')row.value={...row.value,status:'sending',startedAt:new Date(start-24*3600000).toISOString()};
 await sendBookingReminders(site,record,start-24*3600000+15*60000,Infinity,{send:f.send});assert.equal(f.mails.length,2);assert.equal([...f.rows.values()].filter(x=>x.value.status==='delivery_uncertain').length,2);
});
test('failure to persist sent confirmation retains uncertain evidence',async t=>{
 const f=fixture(t);await clientCommerceStore().setJSON(commerceKey(site.siteId,'bookings',record.transactionId),record);const proto=Object.getPrototypeOf(clientCommerceStore()),original=proto.setJSON;t.mock.method(proto,'setJSON',async function(k,v,options){if(v.status==='sent')throw Error('write failed');return original.call(this,k,v,options)});
 assert.equal(await sendBookingReminders(site,record,start-24*3600000,Infinity,{send:f.send}),0);await sendBookingReminders(site,record,start-24*3600000+5*60000,Infinity,{send:f.send});assert.equal(f.mails.length,2);assert.equal([...f.rows.values()].filter(x=>x.value.status==='delivery_uncertain').length,2);
});
