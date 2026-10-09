import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { issueBuyerReceiptAccess, readBuyerReceipt } from './buyer-receipt-access.mjs';
const token='a'.repeat(32), hash=crypto.createHash('sha256').update(token).digest('hex');
function fixture(){
 const pointer={siteId:'a',transactionId:'txn-a',expiresAt:Date.now()+86400000};
 const record={siteId:'a',transactionId:'txn-a',buyerReceiptHash:hash,receiptId:'rcpt-a',paymentStatus:'paid',status:'confirmed',customer:{email:'buyer@example.invalid'}};
 const receipt={siteId:'a',transactionId:'txn-a',receiptId:'rcpt-a',paymentStatus:'paid',total:4321,subtotal:4000,tax:321,createdAt:'2026-10-08T16:00:00Z',customer:record.customer,secret:'never-return',items:[{name:'Saved item',quantity:1,unitAmount:4000,amount:4000}]};
 const site={siteId:'a',slug:'a',business:{name:'Business A',logoAssetKey:'sites/a/logo.png'},settings:{timezone:'America/Puerto_Rico'},catalog:[],employees:[]};
 const store={get:async key=>key.startsWith('buyer-receipts/')?pointer:record};
 const options={store,readReceipt:async()=>receipt,readSite:async()=>site,slug:'a'};
 return {pointer,record,receipt,site,options};
}
test('buyer capability returns saved totals, branding and no buyer contact or owner fields',async()=>{
 const f=fixture(),result=await readBuyerReceipt(token,f.options);assert.equal(result.status,'ready');assert.equal(result.receipt.total,4321);assert.equal(result.receipt.businessName,'Business A');assert.match(result.receipt.logoUrl,/siteId=a/);assert.deepEqual(result.receipt.customer,{name:'',email:''});assert.equal(result.receipt.secret,undefined);
});
test('forged, expired, cross-tenant, mismatched buyer and receipt pointers fail closed',async()=>{
 for(const alter of [f=>f.pointer.expiresAt=0,f=>f.record.siteId='b',f=>f.record.transactionId='other',f=>f.record.buyerReceiptHash='other',f=>f.receipt.siteId='b',f=>f.receipt.transactionId='other',f=>f.receipt.receiptId='other',f=>f.receipt.customer={email:'other@example.invalid'},f=>f.site.siteId='b',f=>f.options.slug='b']){
  const f=fixture();alter(f);await assert.rejects(()=>readBuyerReceipt(token,f.options),error=>error.status===404);
 }
 await assert.rejects(()=>readBuyerReceipt('invalid',fixture().options),error=>error.status===404);
});
test('pending, failed and missing receipt never expose a paid receipt',async()=>{
 const f=fixture();f.record.paymentStatus='pending';assert.deepEqual(await readBuyerReceipt(token,f.options),{status:'pending'});f.record.paymentStatus='failed';assert.deepEqual(await readBuyerReceipt(token,f.options),{status:'failed'});f.record.paymentStatus='paid';f.options.readReceipt=async()=>null;assert.deepEqual(await readBuyerReceipt(token,f.options),{status:'pending'});
});
test('issued capabilities are random, hashed and bounded to seven days',async()=>{
 const rows=[];const result=await issueBuyerReceiptAccess('a','txn-a',{setJSON:async(key,value)=>rows.push({key,value})});assert.match(result.token,/^[A-Za-z0-9_-]{32}$/);assert.equal(result.hash,crypto.createHash('sha256').update(result.token).digest('hex'));assert.equal(JSON.stringify(rows).includes(result.token),false);assert.equal(rows[0].value.transactionId,'txn-a');assert(rows[0].value.expiresAt>Date.now()+6*86400000);
});
