import crypto from 'node:crypto';
import {commerceKey} from './client-store.mjs';
import {mutateKiosk,kioskFail} from './kiosk.mjs';
export const kioskBookingModes = config => ({newBookings:config?.bookingModes?.newBookings === true, existingBookings:config?.bookingModes?.existingBookings === true});
export function privateBookingToken(value) {
  const raw=String(value||'').trim();
  if (/^[A-Za-z0-9_-]{43}$/.test(raw)) return raw;
  try { const u=new URL(raw); if(u.protocol==='https:') {const token=u.searchParams.get('token');if(/^[A-Za-z0-9_-]{43}$/.test(token||''))return token;} } catch {}
  throw kioskFail('Use the private link from your booking email / Usa el enlace privado del correo de tu cita.',404);
}
export async function lookupKioskBooking(store,site,state,value) {
  const token=privateBookingToken(value),hash=crypto.createHash('sha256').update(token).digest('hex');
  const pointer=await store.get(`calendar/${hash}.json`,{type:'json'});
  if(pointer?.siteId!==site.siteId)throw kioskFail('Booking unavailable / Cita no disponible.',404);
  const record=await store.get(commerceKey(site.siteId,'bookings',pointer.transactionId),{type:'json'});
  assertKioskBooking(record,site,state);
  if(record.calendarToken!==token)throw kioskFail('Booking unavailable / Cita no disponible.',404);
  return record;
}
export function assertKioskBooking(record,site,state) {
  if(!record||record.siteId!==site.siteId||record.kind!=='booking'||record.locationId!==state.locationId||record.status!=='confirmed')throw kioskFail('Booking unavailable at this location / Cita no disponible en esta sucursal.',404);
}
export async function bookingBalance(store,record) {
  // Old paid bookings do not contain a frozen full price. Never infer it from today's catalog.
  const total=record.bookingTotalCents??(record.paymentStatus==='due'?record.amountTotal:null);
  if(!Number.isSafeInteger(total)||total<0) return {known:false,total:null,paid:null,due:null};
  const taxTotal=record.bookingTaxCents??(record.paymentStatus==='due'?Number(record.tax||0):null);
  let paidTax=['paid','paid_in_person'].includes(record.paymentStatus)?Math.max(0,Math.round(Number(record.tax||0)*(1-Number(record.refundedAmount||0)/Math.max(1,Number(record.amountTotal))))):0;
  let paid=['paid','paid_in_person'].includes(record.paymentStatus)?Number(record.amountTotal||0)-Number(record.refundedAmount||0):0;
  if(!['due','paid','paid_in_person'].includes(record.paymentStatus))return {known:false,total:null,paid:null,due:null};
  for(const id of Object.keys(record.balancePayments||{})) {
    const payment=await store.get(commerceKey(record.siteId,'transactions',id),{type:'json'});
    if(payment?.siteId!==record.siteId||payment.source!=='booking_balance'||payment.bookingTransactionId!==record.transactionId||!['paid','paid_in_person','partially_refunded','refunded'].includes(payment.paymentStatus)) return {known:false,total:null,paid:null,due:null};
    paid+=Number(payment.amountTotal)-Number(payment.refundedAmount||0);
    paidTax+=Math.max(0,Math.round(Number(payment.tax||0)*(1-Number(payment.refundedAmount||0)/Math.max(1,Number(payment.amountTotal)))));
  }
  if(!Number.isSafeInteger(paid)||paid<0||paid>total)return {known:false,total:null,paid:null,due:null};
  return {known:true,total,paid,due:total-paid,...(Number.isSafeInteger(taxTotal)&&taxTotal>=0?{taxDue:Math.min(total-paid,Math.max(0,taxTotal-paidTax))}:{})};
}
export async function applyBookingBalance(store,payment) {
  if(payment.source!=='booking_balance')return;
  if(payment.paymentStatus!=='paid'||!Number.isSafeInteger(payment.amountTotal)||payment.amountTotal<=0)throw kioskFail('Balance payment requires review.',409);
  const key=commerceKey(payment.siteId,'bookings',payment.bookingTransactionId);
  const next=await mutateKiosk(store,key,async current=>{
    if(!current||current.siteId!==payment.siteId||current.kind!=='booking'||current.locationId!==payment.locationId)throw kioskFail('Booking changed; reconcile the payment / La cita cambió; concilia el pago.',409);
    if(current.balancePayments?.[payment.transactionId])return null;
    if(current.status!=='confirmed')throw kioskFail('Booking changed; reconcile the payment.',409);
    if(current.balanceAttempt?.attempt!==payment.bookingBalanceAttempt)throw kioskFail('Balance attempt mismatch.',409);
    const balance=await bookingBalance(store,current);
    if(!balance.known||balance.due!==payment.amountTotal)throw kioskFail('Balance changed; reconcile the payment.',409);
    return {...current,balancePayments:{...current.balancePayments,[payment.transactionId]:payment.amountTotal},balancePaymentStatus:'paid',updatedAt:new Date().toISOString()};
  });
  const mirrorKey=commerceKey(payment.siteId,'transactions',payment.bookingTransactionId),mirror=await store.getWithMetadata(mirrorKey,{type:'json'});
  if(mirror?.etag){const saved=await store.setJSON(mirrorKey,{...mirror.data,balancePayments:next.balancePayments,balancePaymentStatus:next.balancePaymentStatus},{onlyIfMatch:mirror.etag});if(!saved.modified)throw kioskFail('Booking mirror requires reconciliation.',409);}
}
export async function kioskBookingView(store,state,site,now) {
  if(!state.bookingLookup||state.bookingLookup.expiresAt<=now)return null;
  const record=await store.get(commerceKey(site.siteId,'bookings',state.bookingLookup.id),{type:'json'});
  assertKioskBooking(record,site,state);
  const balance=await bookingBalance(store,record);
  return {service:(site.catalog||[]).find(x=>x.id===record.serviceId)?.name||record.items?.[0]?.name||'',start:record.start,end:record.end,checkedIn:Boolean(record.checkedInAt),balance,canCheckIn:Date.parse(record.start)<=now+86400000&&Date.parse(record.end)+2*3600000>=now,canPay:balance.known&&balance.due>0&&!record.balanceAttempt};
}
