import {assertSameOrigin,requireSiteCapability,errorResponse} from '../lib/client-auth.mjs';
import {isBusinessOwner,canAccessCommerce} from '../lib/commercial-access.mjs';
import {clientCommerceStore,commerceKey} from '../lib/client-store.mjs';
import {createBookingHold} from '../lib/booking-engine.mjs';
import {withBookingLock} from '../lib/booking-lock.mjs';
import {syncBookingCalendar} from '../lib/booking-calendar.mjs';
import {sendBookingConfirmationEmails} from '../lib/client-notifications.mjs';
export function createBookingApprovalHandler({authorize=requireSiteCapability,getStore=clientCommerceStore,hold=createBookingHold,sync=syncBookingCalendar,send=sendBookingConfirmationEmails}={}){return async req=>{
 try{
  if(req.method!=='POST')return new Response(null,{status:405});assertSameOrigin(req);
  const raw=await req.text();if(raw.length>1500)throw Object.assign(new Error('Request too large.'),{status:413});const input=JSON.parse(raw);
  const {site,membership}=await authorize(input.siteId,'bookings');if(!isBusinessOwner(membership))throw Object.assign(new Error('Owner access required.'),{status:403});
  if(!/^[a-zA-Z0-9_-]{1,160}$/.test(input.transactionId||''))throw Object.assign(new Error('Invalid booking.'),{status:400});
  const store=getStore(),key=commerceKey(site.siteId,'bookings',input.transactionId);
  return await withBookingLock(store,commerceKey(site.siteId,'booking-change-locks',input.transactionId),async()=>{
   const saved=await store.getWithMetadata(key,{type:'json'});let record=saved?.data;
   if(!record||record.kind!=='booking'||!canAccessCommerce(site,membership,record))throw Object.assign(new Error('Booking unavailable.'),{status:404});
   if(record.status==='confirmed'&&record.approvedAt)return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
   if(record.status!=='pending_approval'||!saved.etag||record.paymentStatus!=='due')throw Object.assign(new Error('Booking cannot be approved.'),{status:409});
   const reservation=await hold(site,{serviceId:record.serviceId,employeeId:record.employeeId,locationId:record.locationId,start:record.start},{ignoreReservationId:record.holdId||record.transactionId});
   try{
    if(reservation.end!==record.end)throw Object.assign(new Error('Service duration changed. Review this request before approval.'),{status:409});
    record={...record,status:'confirmed',approvedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    if(!(await store.setJSON(key,record,{onlyIfMatch:saved.etag})).modified)throw Object.assign(new Error('Booking changed. Reload.'),{status:409});
    await store.setJSON(commerceKey(site.siteId,'transactions',record.transactionId),record);
    record=await sync(site,record);await store.setJSON(key,record);
    record=await send(site,record,value=>store.setJSON(key,value));
    await store.setJSON(commerceKey(site.siteId,'transactions',record.transactionId),record);
    return Response.json({ok:true},{headers:{'Cache-Control':'private, no-store'}});
   }finally{await store.delete(commerceKey(site.siteId,'holds',reservation.holdId))}
  });
 }catch(error){return errorResponse(error)}
};}
export default createBookingApprovalHandler();
