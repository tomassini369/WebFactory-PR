import test from 'node:test';
import assert from 'node:assert/strict';
import {kioskFixture} from '../../scripts/fixtures/kiosk-fixture.mjs';
import {kioskDeviceKey} from './kiosk.mjs';
import {commerceKey} from './client-store.mjs';
import {createCommerceAdminHandler} from '../functions/client-commerce-admin.mjs';
import {clientCheckoutReturn} from './client-checkout-return.mjs';
const draft=(view,provider='in_person')=>({action:'checkout',saleId:view.saleId,lang:'es',items:[{id:'product',quantity:1}],customer:{name:'Test buyer',email:'buyer@example.invalid'},paymentProvider:provider});
test('QR is opt-in; invalid modes fail and active sales keep their mode across settings changes',async()=>{
 const f=kioskFixture();assert.equal((await(await f.admin('admin')).json()).checkoutMode,'screen');assert.equal((await f.admin('configure',{enabled:true,checkoutMode:'external'})).status,400);
 f.setMode('in_person');const p=await f.paired();await f.admin('configure',{enabled:true,checkoutMode:'qr'});let r=await f.handler(f.request(draft(p.view),p.cookie)),v=await r.json();assert.equal(v.sale.checkoutMode,'qr');assert.equal(v.sale.status,'due');assert.equal(v.sale.canReset,false);assert.equal((await f.handler(f.request({action:'reset',saleId:v.saleId},p.cookie))).status,409);
 await f.admin('configure',{enabled:true,checkoutMode:'screen'});v=await(await f.handler(f.request(null,p.cookie))).json();assert.equal(v.sale.canReset,false);assert.equal(v.sale.checkoutMode,'qr');await f.confirm();v=await(await f.handler(f.request(null,p.cookie))).json();assert.equal(v.sale.status,'paid');assert.equal(v.sale.canReset,true);assert.equal((await f.handler(f.request({action:'reset',saleId:v.saleId},p.cookie))).status,200);assert.equal(f.calls(),1);
});
test('online QR retains one existing checkout; browser claims cannot confirm it',async()=>{
 const f=kioskFixture(),p=await f.paired();await f.admin('configure',{enabled:true,checkoutMode:'qr'});let v=await(await f.handler(f.request({...draft(p.view,'stripe'),paid:true},p.cookie))).json();assert.equal(v.sale.checkoutMode,'qr');assert.equal(v.sale.status,'pending');assert.equal(v.sale.checkoutUrl,f.origin+'/fixture-checkout');assert.equal(v.sale.canReset,false);
 await f.handler(f.request({action:'resume',saleId:v.saleId},p.cookie));assert.equal(f.calls(),1);const state=await f.store.get(kioskDeviceKey(p.id));assert.equal(state.active.checkoutMode,'qr');
});
test('mobile return keeps receipt capability in fragment and never returns the phone to paired kiosk',()=>{
 const r=clientCheckoutReturn({slug:'test',kiosk:true,kioskQr:true,requestUrl:'https://deploy-preview-125--webfactorypr.netlify.app/.netlify/functions/client-kiosk',receiptReturn:'receipt=abcdefghijklmnopqrstuvwxyz123456',trackingToken:'private-tracking'}),url=new URL(r.success);assert.equal(url.pathname,'/kiosk-receipt');assert.equal(url.search,'');assert.equal(new URLSearchParams(url.hash.slice(1)).get('receipt'),'abcdefghijklmnopqrstuvwxyz123456');assert.equal(new URLSearchParams(url.hash.slice(1)).get('slug'),'test');assert(!r.success.includes('private-tracking'));assert.equal(new URL(r.cancel).origin,url.origin);assert(r.ath.startsWith('/kiosk-receipt#'));assert(!r.ath.startsWith('//'));
});
test('cash QR lookup requires same business, record, branch access and collection permission; GET is read-only',async()=>{
 const f=kioskFixture();f.setMode('in_person');const p=await f.paired();const v=await(await f.handler(f.request(draft(p.view),p.cookie))).json(),key=commerceKey(f.site.siteId,'orders',v.sale.transactionId);await f.store.setJSON(key,await f.store.get(commerceKey(f.site.siteId,'transactions',v.sale.transactionId)));let membership={role:'owner'};const handler=createCommerceAdminHandler({getStore:()=>f.store,authorizeAccess:async()=>({site:f.site,membership}),pendingSales:async()=>[]});
 const req=(id=v.sale.transactionId,kind='order')=>new Request(f.origin+'/.netlify/functions/client-commerce-admin?siteId='+f.site.siteId+'&kioskSale='+encodeURIComponent(id)+'&kind='+kind);
 assert.equal((await handler(req())).status,200);assert.equal((await f.store.get(key)).paymentStatus,'due');assert.equal((await handler(req('../private'))).status,400);assert.equal((await handler(req('foreign'))).status,404);assert.equal((await handler(req(v.sale.transactionId,'booking'))).status,404);
 membership={role:'employee',locationIds:['branch'],permissions:{orders:true}};assert.equal((await handler(req())).status,403);membership.permissions.collect=true;let response=await handler(req());assert.equal(response.status,200);const data=await response.json();assert.equal(data.record.amountTotal,1115);assert.equal(data.record.checkoutUrl,undefined);membership.locationIds=['other'];assert.equal((await handler(req())).status,403);
 const row=await f.store.get(key);await f.store.setJSON(key,{...row,siteId:'foreign'});membership={role:'owner'};assert.equal((await handler(req())).status,404);assert.equal(f.calls(),1);
});

test('authorized cancellation of an unpaid QR cash order releases the screen without claiming payment',async()=>{
 const f=kioskFixture();f.setMode('in_person');const p=await f.paired();await f.admin('configure',{enabled:true,checkoutMode:'qr'});let v=await(await f.handler(f.request(draft(p.view),p.cookie))).json();const key=commerceKey(f.site.siteId,'transactions',v.sale.transactionId),row=await f.store.get(key);await f.store.setJSON(key,{...row,status:'cancelled',paymentStatus:'cancelled'});v=await(await f.handler(f.request(null,p.cookie))).json();assert.equal(v.sale.status,'cancelled');assert.equal(v.sale.canReset,true);assert.equal(v.sale.receipt,null);assert.equal(v.sale.checkoutUrl,'');assert.equal((await f.handler(f.request({action:'reset',saleId:v.saleId},p.cookie))).status,200);
});
