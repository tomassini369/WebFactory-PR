import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {kioskFixture} from '../../scripts/fixtures/kiosk-fixture.mjs';
import {commerceKey} from './client-store.mjs';
import {kioskDeviceKey,kioskSaleView} from './kiosk.mjs';
import {bookingBalance,applyBookingBalance,lookupKioskBooking} from './kiosk-bookings.mjs';
async function fixture(){
 const f=kioskFixture();f.store.delete=async key=>f.rows.delete(key);
 const p=await f.paired();await f.admin('configure',{enabled:true,bookingModes:{newBookings:true,existingBookings:true}});
 const token=crypto.randomBytes(32).toString('base64url'),transactionId='txn_booking';
 const record={siteId:f.site.siteId,transactionId,kind:'booking',locationId:'branch',status:'confirmed',paymentStatus:'paid',amountTotal:1000,bookingTotalCents:3000,serviceId:'appointment',start:new Date(f.now()+3600000).toISOString(),end:new Date(f.now()+7200000).toISOString(),calendarToken:token,customer:{name:'Private Customer',email:'private-buyer@example.invalid'},channel:'kiosk'};
 const save=async r=>{await f.store.setJSON(commerceKey(f.site.siteId,'bookings',transactionId),r);await f.store.setJSON(commerceKey(f.site.siteId,'transactions',transactionId),r);};await save(record);
 await f.store.setJSON(`calendar/${crypto.createHash('sha256').update(token).digest('hex')}.json`,{siteId:f.site.siteId,transactionId});
 return {...f,p,token,record,save,lookup:()=>f.handler(f.request({action:'lookup_booking',reference:token},p.cookie))};
}
import {bookingKioskPin,kioskBookingCodeKey} from './kiosk-bookings.mjs';
test('booking code plus PIN unlocks only the matching confirmed booking and hides all secrets',async()=>{
 const f=await fixture();const code='8C29F758',record={...f.record,bookingCode:code};
 await f.save(record);
 const pin=bookingKioskPin(record);
 assert.match(pin,/^[0-9]{6}$/);
 const req=(reference,p)=>f.handler(f.request({action:'lookup_booking',reference,...(p===undefined?{}:{pin:p})},f.p.cookie));
 assert.equal((await req(code)).status,404,'booking code alone is not sufficient');
 assert.equal((await req(code,'000000'===pin?'000001':'000000')).status,404,'wrong PIN rejected');
 const success=await req(code,pin);
 assert.equal(success.status,200);
 const details=await success.json();
 assert.equal(details.booking.balance.due,2000);
 for(const privateValue of [f.token,pin,'private-buyer@example.invalid','Private Customer'])
   assert.ok(!JSON.stringify(details).includes(privateValue),'customer and PIN must never leak');
 assert.equal((await req(code,pin)).status,200,'legacy code without index remains accessible with PIN');
 await f.store.setJSON(kioskBookingCodeKey(f.site.siteId,code),{siteId:f.site.siteId,transactionId:record.transactionId});
 assert.equal((await req(code,pin)).status,200,'indexed code+PIN must work');
 await f.save({...record,locationId:'wrong-branch'});
 assert.equal((await req(code,pin)).status,404,'wrong branch must not reveal booking');
 await f.save({...record,siteId:'wrong-tenant'});
 assert.equal((await req(code,pin)).status,404,'wrong tenant must not reveal booking');
});
test('PIN is stable per booking and different for a different reference',()=>{
 const r={siteId:'a',transactionId:'txn-1',bookingCode:'8C29F758',calendarToken:'x'.repeat(43)};
 assert.equal(bookingKioskPin(r),bookingKioskPin({...r}));
 assert.match(bookingKioskPin(r),/^\d{6}$/);
 assert.notEqual(bookingKioskPin(r),bookingKioskPin({...r,bookingCode:'250D9E31'}));
 assert.equal(bookingKioskPin({...r,calendarToken:''}),'');
});
test('completed kiosk booking briefly shows PIN on paired device but clears after reset',async()=>{
 const f=await fixture();const rec={...f.record,bookingCode:'8C29F758',paymentStatus:'due',amountTotal:3000,bookingTotalCents:3000};
 await f.save(rec);
 const st=await f.store.get(kioskDeviceKey(f.p.id));
 await f.store.setJSON(kioskDeviceKey(f.p.id),{...st,active:{kind:'booking',pricesIncludeTax:false,response:{transactionId:rec.transactionId}}});
 const response=await f.handler(f.request(null,f.p.cookie)),view=await response.json();
 assert.equal(view.sale.bookingReference.code,rec.bookingCode);
 assert.equal(view.sale.bookingReference.pin,bookingKioskPin(rec));
 const reset=await f.handler(f.request({action:'reset',saleId:st.saleId},f.p.cookie));
 assert.equal(reset.status,200);
 assert.equal((await reset.json()).sale,null);
 assert.equal((await(await f.handler(f.request(null,f.p.cookie))).json()).sale,null);
});

test('booking modes default off and administrator configuration is bounded',async()=>{const f=kioskFixture(),p=await f.paired();assert.deepEqual(p.view.bookingModes,{newBookings:false,existingBookings:false});assert.equal((await f.handler(f.request({action:'lookup_booking',reference:'anything'},p.cookie))).status,403);assert.equal((await f.admin('configure',{enabled:true,bookingModes:{newBookings:'yes',existingBookings:true}})).status,400)});
test('private lookup is tenant and branch bound and never returns customer identity or token',async()=>{const f=await fixture();const response=await f.lookup();assert.equal(response.status,200);const v=await response.json();assert.equal(v.booking.balance.due,2000);const json=JSON.stringify(v);for(const secret of [f.token,'private-buyer@example.invalid','Private Customer'])assert.ok(!json.includes(secret));assert.equal((await f.handler(f.request({action:'lookup_booking',reference:f.record.transactionId},f.p.cookie))).status,404);await f.save({...f.record,locationId:'other'});assert.equal((await f.lookup()).status,404);await f.save({...f.record,siteId:'other'});assert.equal((await f.lookup()).status,404)});
test('lookup expiry and failed lookup do not retain another customer session',async()=>{const f=await fixture();await f.lookup();f.setNow(f.now()+60001);const v=await(await f.handler(f.request(null,f.p.cookie))).json();assert.equal(v.booking,null);assert.equal((await f.handler(f.request({action:'check_in'},f.p.cookie))).status,409);await f.lookup();await f.handler(f.request({action:'lookup_booking',reference:'invalid'},f.p.cookie));assert.equal((await(await f.handler(f.request(null,f.p.cookie))).json()).booking,null)});
test('arrival is idempotent, separate from payment and only permitted within the arrival window',async()=>{const f=await fixture();await f.lookup();for(let i=0;i<2;i++)assert.equal((await f.handler(f.request({action:'check_in',paid:true},f.p.cookie))).status,200);let row=await f.store.get(commerceKey(f.site.siteId,'bookings',f.record.transactionId));assert.ok(row.checkedInAt);assert.equal(row.paymentStatus,'paid');assert.equal(row.amountTotal,1000);await f.save({...f.record,start:new Date(f.now()+48*3600000).toISOString(),end:new Date(f.now()+49*3600000).toISOString()});assert.equal((await f.handler(f.request({action:'check_in'},f.p.cookie))).status,409)});
test('legacy paid deposits fail closed instead of repricing; legacy unpaid bookings retain stored total',async()=>{const f=await fixture();const old={...f.record};delete old.bookingTotalCents;assert.equal((await bookingBalance(f.store,old)).known,false);assert.deepEqual(await bookingBalance(f.store,{...old,paymentStatus:'due'}),{known:true,total:1000,paid:0,due:1000,taxDue:0});f.site.catalog[3].price=999;assert.equal((await bookingBalance(f.store,f.record)).due,2000)});
test('verified balance payment is linked exactly once; refunded linked money becomes due again',async()=>{const f=await fixture();const attempt='a'.repeat(64);await f.save({...f.record,balanceAttempt:{attempt}});const payment={siteId:f.site.siteId,transactionId:'txn_balance',kind:'order',source:'booking_balance',bookingTransactionId:f.record.transactionId,bookingBalanceAttempt:attempt,locationId:'branch',paymentStatus:'paid',amountTotal:2000};await f.store.setJSON(commerceKey(f.site.siteId,'transactions',payment.transactionId),payment);await Promise.all([applyBookingBalance(f.store,payment),applyBookingBalance(f.store,payment)]);const row=await f.store.get(commerceKey(f.site.siteId,'bookings',f.record.transactionId));assert.deepEqual(row.balancePayments,{txn_balance:2000});assert.equal(row.amountTotal,1000);assert.equal((await bookingBalance(f.store,row)).due,0);await f.store.setJSON(commerceKey(f.site.siteId,'transactions',payment.transactionId),{...payment,paymentStatus:'partially_refunded',refundedAmount:500});assert.equal((await bookingBalance(f.store,row)).due,500)});
test('unverified, wrong-location, cancelled and overpaid balance attempts cannot settle a booking',async()=>{const f=await fixture(),attempt='b'.repeat(64);await f.save({...f.record,balanceAttempt:{attempt}});const payment={siteId:f.site.siteId,transactionId:'balance',source:'booking_balance',bookingTransactionId:f.record.transactionId,bookingBalanceAttempt:attempt,locationId:'branch',paymentStatus:'paid',amountTotal:2000};for(const patch of [{paymentStatus:'pending'},{locationId:'other'},{bookingBalanceAttempt:'wrong'},{amountTotal:2001}])await assert.rejects(()=>applyBookingBalance(f.store,{...payment,...patch}));await f.save({...f.record,balanceAttempt:{attempt},status:'cancelled'});await assert.rejects(()=>applyBookingBalance(f.store,payment))});
test('lookup attempts are throttled without exposing records',async()=>{const f=await fixture();for(let i=0;i<10;i++)assert.equal((await f.handler(f.request({action:'lookup_booking',reference:'invalid'},f.p.cookie))).status,404);assert.equal((await f.lookup()).status,429)});
test('booking checkout status uses bookings and does not require an inventory movement',async()=>{const f=await fixture();const record={...f.record,receiptId:'receipt',paymentStatus:'paid'};await f.save(record);const state=await f.store.get(kioskDeviceKey(f.p.id));state.active={kind:'booking',response:{transactionId:record.transactionId}};const view=await kioskSaleView(f.store,state);assert.equal(view.status,'paid');assert.equal(view.kind,'booking');assert.equal(view.canReset,true)});
test('cancelled appointments cannot be used for arrival or payment',async()=>{const f=await fixture();await f.save({...f.record,status:'cancelled'});await assert.rejects(()=>lookupKioskBooking(f.store,f.site,{locationId:'branch'},f.token))});

test('balance tax comes from the frozen invoice rather than current catalog tax rules',async()=>{const f=await fixture();const record={...f.record,bookingTotalCents:3345,bookingTaxCents:345,amountTotal:1115,tax:115};assert.deepEqual(await bookingBalance(f.store,record),{known:true,total:3345,paid:1115,due:2230,taxDue:230});});

test('new appointments use the bound branch and employee and freeze one checkout through retries',async()=>{
 const f=kioskFixture();f.site.employees=[{id:'barber',name:'Barber',active:true,serviceIds:['appointment'],locationIds:['branch']}];f.site.paymentRules.bookingPayment='in_person';const p=await f.paired();await f.admin('configure',{enabled:true,bookingModes:{newBookings:true,existingBookings:false}});
 const input={action:'booking_checkout',saleId:p.view.saleId,siteId:'forged',locationId:'forged',booking:{serviceId:'appointment',employeeId:'barber',start:new Date(f.now()+3600000).toISOString()},customer:{name:'Test',email:'buyer@example.invalid'},paymentProvider:'in_person'};
 const results=await Promise.all(Array.from({length:8},()=>f.handler(f.request(input,p.cookie))));assert.equal(f.calls(),1);assert.ok(results.some(x=>x.status===200));const state=await f.store.get(kioskDeviceKey(p.id));assert.equal(state.active.kind,'booking');const v=await(await f.handler(f.request(null,p.cookie))).json();assert.equal(v.sale.kind,'booking');assert.equal(v.sale.status,'due');assert.equal(v.sale.canReset,true);
});
test('any-professional availability uses only active eligible staff at the device branch',async()=>{
 const seen=[];const f=kioskFixture('https://kiosk.example.invalid',{availability:async(site,service,id,date,location,options)=>{seen.push({id,location,strict:options.strictGoogle});return [{start:'2099-01-01T13:00:00Z',end:'2099-01-01T13:30:00Z'}]}});f.site.employees=[{id:'one',active:true,serviceIds:['appointment'],locationIds:['branch']},{id:'other',active:true,serviceIds:['appointment'],locationIds:['elsewhere']},{id:'inactive',active:false,serviceIds:['appointment'],locationIds:['branch']}];const p=await f.paired();await f.admin('configure',{enabled:true,bookingModes:{newBookings:true,existingBookings:false}});const date=new Date(f.now()+86400000).toISOString().slice(0,10);const response=await f.handler(f.request({action:'availability',date,serviceId:'appointment',employeeId:'any',locationId:'elsewhere'},p.cookie));assert.equal(response.status,200);assert.deepEqual(seen,[{id:'one',location:'branch',strict:true}]);assert.equal((await response.json()).slots[0].employeeId,'one');
});

test('paired booking email status is canonical, tenant bound and independent of a Calendar invitation',async()=>{
 const f=await fixture(),state=await f.store.get(kioskDeviceKey(f.p.id));
 state.active={kind:'booking',response:{transactionId:f.record.transactionId}};
 const record={...f.record,paymentStatus:'due',customerCalendarInviteStatus:'sent'};
 await f.save(record);
 for(const [patch,expected] of [[{},'pending'],[{customerEmailDeliveryStatus:'action_required',customerEmailDeliveryStatusReason:'authorization_required'},'action_required'],[{customerEmailSent:true,customerEmailDeliveryStatus:'sent'},'sent']]){
  await f.store.setJSON(commerceKey(f.site.siteId,'bookings',record.transactionId),{...record,...patch});
  const view=await kioskSaleView(f.store,state);
  assert.equal(view.status,'due');assert.equal(view.confirmationEmailStatus,expected);
  assert.doesNotMatch(JSON.stringify(view),/private-buyer|authorization_required|calendarToken|customerCalendarInviteStatus/);
 }
 // The transaction mirror may lag a failed/pending canonical confirmation.
 await f.store.setJSON(commerceKey(f.site.siteId,'transactions',record.transactionId),{...record,customerEmailSent:true});
 await f.store.setJSON(commerceKey(f.site.siteId,'bookings',record.transactionId),record);
 assert.equal((await kioskSaleView(f.store,state)).confirmationEmailStatus,'pending');
 for(const invalid of [{siteId:'foreign'},{locationId:'foreign'},{transactionId:'foreign'},{channel:'storefront'},{kind:'order'}]){
  await f.store.setJSON(commerceKey(f.site.siteId,'bookings',record.transactionId),{...record,...invalid});
  assert.equal((await kioskSaleView(f.store,state)).confirmationEmailStatus,'sent','foreign canonical row must not override the bound transaction');
 }
 await f.save({...record,paymentStatus:'pending',status:'payment_pending'});
 assert.equal((await kioskSaleView(f.store,state)).confirmationEmailStatus,undefined);
});
