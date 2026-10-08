import test from 'node:test';
import assert from 'node:assert/strict';
import {renderReceiptEmail} from './receipt-email-template.mjs';
import {sendCustomerCommerceEmail,sendCommerceConfirmationEmails} from './client-notifications.mjs';
const site={siteId:'mail-a',slug:'mail-a',business:{name:'Negocio A',email:'owner@example.invalid',logoAssetKey:'sites/mail-a/logo.png'},settings:{locale:'es',timezone:'America/Puerto_Rico'}};
const record={siteId:'mail-a',transactionId:'sale-a',receiptId:'rcpt-a',kind:'order',status:'confirmed',paymentStatus:'paid',customer:{name:'Cliente <test>',email:'buyer@example.invalid'},items:[{name:'Wrong live price',quantity:1,unitAmount:99999}],amountTotal:99999,language:'es'};
const receipt={siteId:'mail-a',receiptId:'rcpt-a',transactionId:'sale-a',paymentStatus:'paid',customer:record.customer,createdAt:'2026-10-08T16:00:00Z',items:Array.from({length:5},(_,i)=>({name:`Producto ${i} <script>`,quantity:2,unitAmount:1100,amount:2200})),subtotal:11000,discounts:100,tax:241,tip:200,total:11341};
const readReceipt=async(siteId,collection,id)=>{assert.equal(siteId,'mail-a');assert.equal(collection,'receipts');assert.equal(id,'rcpt-a');return receipt};
test('automatic receipt email uses stored amounts, all items, tenant logo and business time, with escaped static HTML',async()=>{
 const mails=[];await sendCustomerCommerceEmail(site,record,async(_site,mail)=>mails.push(mail),{readReceipt});assert.equal(mails.length,1);const mail=mails[0];assert.equal(mail.to,'buyer@example.invalid');assert.match(mail.subject,/Tu recibo rcpt-a/);assert.match(mail.text,/Total: \$113\.41/);assert.match(mail.text,/Descuentos: -\$1\.00/);assert.match(mail.text,/Producto 4/);assert.match(mail.text,/12:00:00/);assert.doesNotMatch(mail.text,/999\.99|Wrong live price/);assert.match(mail.html,/siteId=mail-a/);assert.match(mail.html,/Producto 4 &lt;script&gt;/);assert.doesNotMatch(mail.html,/<script>|onclick=|webfactory-email-logo/);
});
test('booking receipt shares the original confirmation and retains calendar controls and ICS',async()=>{
 const mails=[];await sendCustomerCommerceEmail(site,{...record,kind:'booking',start:'2099-10-05T13:00:00Z',end:'2099-10-05T13:30:00Z',calendarToken:'a'.repeat(43)},async(_site,mail)=>mails.push(mail),{readReceipt});assert.equal(mails.length,1);assert.match(mails[0].html,/Añadir al calendario/);assert.match(mails[0].text,/Recibo: rcpt-a/);assert.match(mails[0].text,/Total: \$113\.41/);assert.equal(mails[0].attachments[0].filename,'appointment.ics');
});
test('a mismatched stored receipt is never sent to another buyer or tenant',async()=>{
 for(const other of [{...receipt,siteId:'mail-b'},{...receipt,transactionId:'other'},{...receipt,customer:{email:'other@example.invalid'}},{...receipt,paymentStatus:'due'},null]){
  let sent=false;await assert.rejects(()=>sendCustomerCommerceEmail(site,record,async()=>{sent=true},{readReceipt:async()=>other}));assert.equal(sent,false);
 }
});
test('confirmed online orders send immediately; retry only sends the previously failed recipient',async()=>{
 const sent=[],saved=[];let failBusiness=true;const deliver=async(_site,mail)=>{if(mail.to===site.business.email&&failBusiness)throw Error('offline');sent.push(mail.to)};
 let r=await sendCommerceConfirmationEmails(site,record,async value=>saved.push(value),{deliver,readReceipt});assert.equal(r.customerEmailSent,true);assert.equal(r.businessEmailSent,undefined);assert.deepEqual(sent,['buyer@example.invalid']);
 failBusiness=false;r=await sendCommerceConfirmationEmails(site,r,async value=>saved.push(value),{deliver,readReceipt});assert.equal(r.businessEmailSent,true);assert.deepEqual(sent,['buyer@example.invalid','owner@example.invalid']);assert.equal(saved.length,2);
 await sendCommerceConfirmationEmails(site,r,async()=>assert.fail('completed delivery must not replay'),{deliver,readReceipt});assert.equal(sent.length,2);
});
test('unconfirmed orders never enter the automatic receipt delivery path',async()=>{
 for(const extra of [{paymentStatus:'pending'},{status:'cancelled'},{status:'inventory_review_required'}])await sendCommerceConfirmationEmails(site,{...record,...extra},async()=>assert.fail('unexpected write'),{deliver:async()=>assert.fail('unexpected mail'),readReceipt});
});
test('receipt email branding is isolated for another business',()=>{
 const other=renderReceiptEmail({...site,siteId:'mail-b',business:{name:'Negocio B',logoAssetKey:'sites/mail-b/logo.png'}},{...receipt,siteId:'mail-b'});assert.match(other.html,/Negocio B/);assert.match(other.html,/siteId=mail-b/);assert.doesNotMatch(other.html,/Negocio A|siteId=mail-a/);
});
