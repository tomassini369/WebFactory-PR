import test from 'node:test';
import assert from 'node:assert/strict';
import {createCustomerDisplayHandler} from '../functions/client-customer-display.mjs';
import {displayDraft,displayKey,hashDisplayToken,mutateDisplay} from './customer-display.mjs';
import {estimatePosTotals} from '../../src/pos-domain.ts';
function fixture(){
 const rows=new Map();let revision=0,now=1000000,actor='owner',role='owner';
 const site={siteId:'tenant-a',slug:'fixture',business:{name:'Isolated business'},members:[{email:'owner@example.invalid',role:'owner'}],catalog:[{id:'p',name:'Product',nameEs:'Producto',price:12.34,type:'product'},{id:'s',name:'Service',price:9,taxable:false,type:'service'}],taxConfig:{enabled:true,stateRate:10.5,municipalRate:1}};
 const user=()=>({id:actor,email:'owner@example.invalid'});
 const store={get:async key=>structuredClone(rows.get(key)?.data||null),getWithMetadata:async key=>structuredClone(rows.get(key)||null),setJSON:async(key,data,options)=>{const row=rows.get(key);if(options.onlyIfNew&&row||options.onlyIfMatch&&row?.etag!==options.onlyIfMatch)return {modified:false};rows.set(key,{data:structuredClone(data),etag:String(++revision)});return {modified:true}}};
 const handler=createCustomerDisplayHandler({renewSession:async()=>{},getStore:()=>store,getSite:async id=>id===site.siteId?site:null,authorize:async id=>{if(id!==site.siteId)throw Object.assign(Error('Wrong tenant'),{status:403});return {site,user:user(),membership:{role}}},clock:()=>now});
 const post=(input,cookie='',origin='https://example.invalid')=>handler(new Request('https://example.invalid/.netlify/functions/client-customer-display',{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(input)}));
 const get=cookie=>handler(new Request('https://example.invalid/.netlify/functions/client-customer-display',{headers:{Cookie:cookie}}));
 const create=async()=>{const r=await post({action:'create',siteId:site.siteId});assert.equal(r.status,200);const data=await r.json(),[id,token]=new URL(data.pairUrl).hash.slice(6).split('.');return {id,token}};
 const pair=async session=>{const r=await post({action:'pair',...session});assert.equal(r.status,200);const cookie=r.headers.get('set-cookie').split(';')[0];return {cookie,r}};
 const sync=(id,sequence,extra={})=>post({action:'sync',siteId:site.siteId,id,sequence,items:[{id:'p',quantity:2}],discountCents:100,tipCents:200,...extra});
 return {site,store,rows,post,get,create,pair,sync,setNow:n=>now=n,setActor:n=>actor=n,setRole:n=>role=n};
}
test('pairing uses opaque fragment, one-time redemption and secure HttpOnly device cookie, no cashier credentials',async()=>{
 const f=fixture(),s=await f.create();assert.equal(s.token.length,64);const {cookie,r}=await f.pair(s);assert.match(r.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Strict/);const data=await r.json();assert(!JSON.stringify(data).includes(s.token));assert(!JSON.stringify(data).includes('owner@example.invalid'));assert.equal((await f.post({action:'pair',...s})).status,401);assert.equal((await f.post({action:'pair',...s},cookie)).status,200);assert.equal((await f.get(cookie)).status,200);assert.equal((await f.get('')).status,401);
});
test('simultaneous pair requests bind exactly one device',async()=>{const f=fixture(),s=await f.create();const responses=await Promise.all(Array.from({length:12},()=>f.post({action:'pair',...s})));assert.equal(responses.filter(r=>r.status===200).length,1);assert.equal(responses.filter(r=>r.status===401).length,11)});
test('synchronization validates trusted role, tenant, operator and sequence; catalog prices replace browser values',async()=>{
 const f=fixture(),s=await f.create(),{cookie}=await f.pair(s);assert.equal((await f.sync(s.id,2,{total:1,items:[{id:'p',quantity:2,unitAmount:1}]})).status,200);await f.sync(s.id,1,{items:[]});const body=await (await f.get(cookie)).json();assert.equal(body.totals.subtotal,2468);assert.equal(body.totals.items[0].unitAmount,1234);
 f.setActor('other-user');assert.equal((await f.sync(s.id,3)).status,403);f.setActor('owner');f.setRole('cashier');assert.equal((await f.sync(s.id,3)).status,403);assert.equal((await f.post({action:'sync',siteId:'tenant-b',id:s.id,sequence:3,items:[]})).status,403);
});
test('public display hides stale sales, rejects expired links, revoked devices and cashier membership removal',async()=>{
 const f=fixture(),s=await f.create(),{cookie}=await f.pair(s);await f.sync(s.id,1);f.setNow(1020001);const stale=await(await f.get(cookie)).json();assert.equal(stale.payment,'disconnected');assert.equal(stale.totals,null);f.setNow(1000001);f.site.members=[];assert.equal((await f.get(cookie)).status,403);f.site.members=[{email:'owner@example.invalid',role:'owner'}];await f.post({action:'revoke',siteId:f.site.siteId,id:s.id});assert.equal((await f.get(cookie)).status,401);
 const g=fixture(),u=await g.create();g.setNow(1600001);assert.equal((await g.post({action:'pair',...u})).status,401);const h=fixture(),v=await h.create(),p=await h.pair(v);h.setNow(29800001);assert.equal((await h.get(p.cookie)).status,200);
});
test('payment and receipt come only from stored transactions and redact personal/payment secrets',async()=>{
 const f=fixture(),s=await f.create(),{cookie}=await f.pair(s);await f.sync(s.id,1,{attemptId:'attempt-123'});let d=await(await f.get(cookie)).json();assert.equal(d.payment,'pending');assert.equal(d.receipt,null);
 const record={siteId:f.site.siteId,source:'pos_remote',createdBy:'owner@example.invalid',paymentStatus:'pending',status:'payment_pending',customer:{email:'private@example.invalid'},checkoutUrl:'secret',items:[{id:'p',name:'Stored Product',quantity:1,unitAmount:1234}],subtotal:1234,discounts:0,tip:50,tax:142,amountTotal:1426,receiptId:'server-receipt',createdAt:new Date(1000000).toISOString()};
 f.rows.set('tenant-a/transactions/txn_pos_attempt-123.json',{data:record,etag:'transaction'});d=await(await f.get(cookie)).json();assert.equal(d.payment,'pending');assert.equal(d.receipt,null);record.paymentStatus='paid';record.status='confirmed';d=await(await f.get(cookie)).json();assert.equal(d.payment,'paid');assert.equal(d.totals.total,1426);assert.equal(d.receipt.id,'server-receipt');assert(!JSON.stringify(d).includes('private'));assert(!JSON.stringify(d).includes('secret'));record.siteId='tenant-b';assert.equal((await f.get(cookie)).status,403);
});
test('direct in-person processing stays pending until backend completion; marker scopes the confirmed sale',async()=>{
 const f=fixture(),s=await f.create(),{cookie}=await f.pair(s);await f.sync(s.id,1,{attemptId:'attempt-direct'});f.rows.set('tenant-a/pos-attempts/attempt-direct.json',{data:{siteId:'tenant-a',transactionId:'txn-direct'},etag:'marker'});const record={siteId:'tenant-a',source:'pos',createdBy:'owner@example.invalid',paymentStatus:'paid_in_person',status:'processing',items:[],amountTotal:100};f.rows.set('tenant-a/transactions/txn-direct.json',{data:record,etag:'record'});assert.equal((await(await f.get(cookie)).json()).payment,'pending');record.status='completed';assert.equal((await(await f.get(cookie)).json()).payment,'paid');
});
test('parallel updates preserve the newest sequence and fail closed without conditional write metadata',async()=>{const f=fixture(),s=await f.create();const responses=await Promise.all(Array.from({length:8},(_,i)=>f.sync(s.id,i+1)));assert(responses.every(r=>[200,409].includes(r.status)));assert.equal((await f.sync(s.id,8)).status,200);assert.equal(f.rows.get(displayKey(s.id)).data.sequence,8);const bad={getWithMetadata:async()=>({data:{}}),setJSON:async()=>{throw Error('Must not write')}};await assert.rejects(mutateDisplay(bad,s.id,()=>({})),{status:503})});
test('draft taxes match existing POS estimates, included tax, exemptions and discounts',()=>{const f=fixture();for(const pricesIncludeTax of [false,true])for(const enabled of [false,true])for(const discountCents of [0,100,9999]){f.site.taxConfig={enabled,pricesIncludeTax,stateRate:10.5,municipalRate:1};const input={items:[{id:'p',quantity:2},{id:'s',quantity:1}],discountCents,tipCents:50};const draft=displayDraft(f.site,{role:'owner'},input),expected=estimatePosTotals(f.site.catalog,input.items,discountCents,50,f.site.taxConfig);for(const key of ['subtotal','discount','tax','tip','total'])assert.equal(draft[key],expected[key]);}});
test('CSRF, missing identity, malformed payload and invalid quantities are rejected',async()=>{
 const f=fixture();assert.equal((await f.post({action:'create',siteId:'tenant-a'},'','https://foreign.invalid')).status,403);assert.equal((await f.post(null)).status,400);assert.equal((await f.post([])).status,400);for(const items of [[{id:'p',quantity:1},{id:'p',quantity:2}],[{id:'p',quantity:0}],[{id:'missing',quantity:1}]])assert.throws(()=>displayDraft(f.site,{role:'owner'},{items}));f.setActor(null);assert.equal((await f.post({action:'create',siteId:'tenant-a'})).status,403);assert.equal(hashDisplayToken('secret').length,64);
});

test('paired screen exposes only pending server-owned Stripe checkout, hides paid, expired, stale and unsafe links',async()=>{
 const f=fixture(),s=await f.create(),{cookie}=await f.pair(s);await f.sync(s.id,1,{attemptId:'attempt-qr'});
 const record={siteId:f.site.siteId,source:'pos_remote',createdBy:'owner@example.invalid',paymentStatus:'pending',status:'payment_pending',checkoutUrl:'https://checkout.stripe.com/c/pay/cs_test_fixture#fragment',checkoutExpiresAt:new Date(Date.now()+600000).toISOString(),items:[],amountTotal:2500,customer:{email:'private@example.invalid'}};
 f.rows.set('tenant-a/transactions/txn_pos_attempt-qr.json',{data:record,etag:'qr'});
 let d=await(await f.get(cookie)).json();assert.equal(d.checkout.url,record.checkoutUrl);assert.equal(d.totals.customer.email,'private@example.invalid');assert.deepEqual(Object.keys(d.totals.customer).sort(),['email','name','phone']);
 for(const url of ['javascript:alert(1)','https://checkout.stripe.com.evil.invalid/c/pay/x','https://user:pass@checkout.stripe.com/c/pay/x','https://evil.invalid/pay/x']){record.checkoutUrl=url;assert.equal((await(await f.get(cookie)).json()).checkout,null)}
 record.checkoutUrl='https://checkout.stripe.com/c/pay/cs_test_fixture';record.checkoutExpiresAt=new Date(0).toISOString();assert.equal((await(await f.get(cookie)).json()).checkout,null);
 record.checkoutExpiresAt=new Date(Date.now()+600000).toISOString();for(const status of ['cancelled','expired','payment_failed']){record.status=status;assert.equal((await(await f.get(cookie)).json()).checkout,null)}
 record.status='payment_pending';record.paymentStatus='paid';assert.equal((await(await f.get(cookie)).json()).checkout,null);record.paymentStatus='pending';f.setNow(1020001);let pending=await(await f.get(cookie)).json();assert.equal(pending.checkout.url,record.checkoutUrl);assert.equal(pending.cashierConnected,false);assert.deepEqual(pending.totals.customer,{name:'',email:'',phone:''});assert(!JSON.stringify(pending).includes('private@example.invalid'));record.checkoutExpiresAt=new Date(0).toISOString();assert.equal((await(await f.get(cookie)).json()).checkout,null);
});

test('suspended cashier displays confirmation then automatically clears the completed sale',async()=>{
 const f=fixture(),s=await f.create(),{cookie}=await f.pair(s);await f.sync(s.id,1,{attemptId:'attempt-receipt'});
 const record={siteId:f.site.siteId,source:'pos_remote',createdBy:'owner@example.invalid',paymentStatus:'paid',status:'confirmed',items:[],amountTotal:2500,receiptId:'receipt-one',paidAt:new Date(1020001).toISOString()};
 f.rows.set('tenant-a/orders/txn_pos_attempt-receipt.json',{data:record,etag:'paid'});f.setNow(1020001);
 let d=await(await f.get(cookie)).json();assert.equal(d.stale,false);assert.equal(d.payment,'paid');assert.equal(d.receipt.id,'receipt-one');assert.equal(d.checkout,null);assert.equal(d.cashierConnected,false);
 f.setNow(1020001+3000);d=await(await f.get(cookie)).json();assert.equal(d.stale,false);assert.equal(d.payment,'draft');assert.equal(d.totals.total,0);assert.deepEqual(d.totals.items,[]);assert.equal(d.receipt,null);assert.equal(d.checkout,null);
 f.site.members=[];assert.equal((await f.get(cookie)).status,403);
});

test('Client Info synchronizes only bounded name/email/phone to the authorized paired device and clears with the draft',async()=>{
 const f=fixture(),s=await f.create(),{cookie}=await f.pair(s);
 await f.sync(s.id,1,{customer:{name:'  Cliente QA  ',email:'buyer@example.invalid',phone:'7870000000',role:'admin',secret:'never-expose'}});
 let d=await(await f.get(cookie)).json();assert.deepEqual(d.totals.customer,{name:'Cliente QA',email:'buyer@example.invalid',phone:'7870000000'});assert(!JSON.stringify(d).includes('never-expose'));assert.equal((await f.get('')).status,401);
 await f.sync(s.id,2,{customer:{name:'Corregido',email:'x'.repeat(400),phone:'0'.repeat(100)}});d=await(await f.get(cookie)).json();assert.equal(d.totals.customer.name,'Corregido');assert.equal(d.totals.customer.email.length,320);assert.equal(d.totals.customer.phone.length,80);
 await f.sync(s.id,3,{customer:{}});assert.deepEqual((await(await f.get(cookie)).json()).totals.customer,{name:'',email:'',phone:''});
 f.setNow(1020001);assert.equal((await(await f.get(cookie)).json()).totals,null);f.site.members=[];assert.equal((await f.get(cookie)).status,403);
});
test('pending Client Info comes from the frozen sale and is redacted on payment confirmation',async()=>{
 const f=fixture(),s=await f.create(),{cookie}=await f.pair(s);await f.sync(s.id,1,{attemptId:'attempt-client',customer:{name:'Changed draft'}});
 const record={siteId:f.site.siteId,source:'pos_remote',createdBy:'owner@example.invalid',paymentStatus:'pending',status:'payment_pending',items:[],amountTotal:100,customer:{name:'Saved buyer',email:'saved@example.invalid',phone:'7870000000',secret:'hidden'},createdAt:new Date(1000000).toISOString()};f.rows.set('tenant-a/transactions/txn_pos_attempt-client.json',{data:record,etag:'client'});
 let d=await(await f.get(cookie)).json();assert.equal(d.totals.customer.name,'Saved buyer');assert(!JSON.stringify(d).includes('Changed draft'));assert(!JSON.stringify(d).includes('hidden'));
 record.paymentStatus='paid';record.receiptId='receipt-client';record.paidAt=new Date(1000000).toISOString();d=await(await f.get(cookie)).json();assert.deepEqual(d.totals.customer,{name:'',email:'',phone:''});f.setNow(1003000);d=await(await f.get(cookie)).json();assert.equal(d.totals.total,0);assert(!JSON.stringify(d).includes('saved@example.invalid'));
});

test('paired devices survive long inactivity and renew only their HttpOnly cookie; resume is scoped and revocation still wins',async()=>{
 const f=fixture(),s=await f.create(),{cookie}=await f.pair(s);f.setNow(1000000+365*86400000);
 const response=await f.get(cookie);assert.equal(response.status,200);assert.match(response.headers.get('set-cookie'),/Max-Age=34560000/);assert.match(response.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Strict/);
 const resumed=await f.post({siteId:f.site.siteId,action:'resume',id:s.id});assert.equal(resumed.status,200);assert.equal((await resumed.json()).paired,true);
 f.setActor('other');assert.equal((await f.post({siteId:f.site.siteId,action:'resume',id:s.id})).status,403);f.setActor('owner');
 await f.post({siteId:f.site.siteId,action:'revoke',id:s.id});assert.equal((await f.get(cookie)).status,401);assert.equal((await f.post({siteId:f.site.siteId,action:'resume',id:s.id})).status,403);
});
test('resume returns a protected pending sale rather than silently starting a different charge',async()=>{
 const f=fixture(),s=await f.create();await f.pair(s);await f.sync(s.id,5,{attemptId:'restore-attempt'});
 f.rows.set('tenant-a/transactions/txn_pos_restore-attempt.json',{data:{siteId:f.site.siteId,source:'pos_remote',createdBy:'owner@example.invalid',paymentStatus:'pending',status:'payment_pending',amountTotal:100,items:[]},etag:'restore'});
 const d=await(await f.post({siteId:f.site.siteId,action:'resume',id:s.id})).json();assert.equal(d.sequence,5);assert.equal(d.activeAttempt.id,'restore-attempt');assert.equal(d.activeAttempt.kind,'card');assert.equal(d.activeAttempt.transactionId,'txn_pos_restore-attempt');
});

test('POS keepalive requires authenticated POS capability and cannot renew on cross-origin or denied requests',async()=>{
 const f=fixture();let calls=0;
 const request=origin=>new Request('https://example.invalid/.netlify/functions/client-customer-display',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({action:'keepalive',siteId:f.site.siteId})});
 const authorized=createCustomerDisplayHandler({getStore:()=>f.store,authorize:async(id,cap)=>{assert.equal(id,f.site.siteId);assert.equal(cap,'pos');return {site:f.site,user:{id:'owner'}}},renewSession:async user=>{assert.equal(user.id,'owner');calls++}});
 assert.equal((await authorized(request('https://foreign.invalid'))).status,403);assert.equal(calls,0);assert.equal((await authorized(request('https://example.invalid'))).status,200);assert.equal(calls,1);
 const denied=createCustomerDisplayHandler({getStore:()=>f.store,authorize:async()=>{throw Object.assign(Error('Denied'),{status:401})},renewSession:async()=>{throw Error('Must not renew')}});assert.equal((await denied(request('https://example.invalid'))).status,401);
});
