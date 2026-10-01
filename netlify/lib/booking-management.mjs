import crypto from "node:crypto";
import {clientCommerceStore,commerceKey,getClientSite} from "./client-store.mjs";
import {createBookingHold} from "./booking-engine.mjs";
import {withBookingLock} from "./booking-lock.mjs";
import {deleteGoogleEvent} from "./google-calendar.mjs";
import {syncBookingCalendar} from "./booking-calendar.mjs";
import {renderBookingEmail} from "./booking-email-template.mjs";
import {bookingIcs} from "./booking-calendar-export.mjs";
import {sendEmail} from "./email.mjs";

const failure=(message,status=409)=>Object.assign(new Error(message),{status});
export function bookingVersion(record) {
  return crypto.createHash("sha256").update(`${record.updatedAt || record.createdAt || ""}:${record.start}:${record.status}:${record.managementRevision || ""}`).digest("hex");
}
export function canManageBooking(site,record,action,now=Date.now()) {
  if (record.kind!=="booking" || record.status!=="confirmed" || !Number.isFinite(Date.parse(record.start)) || Date.parse(record.start)<=now) return false;
  if (action==="cancel") return site.settings?.allowCustomerCancellation!==false;
  if (action==="reschedule") return site.status === "active" && site.settings?.allowCustomerRescheduling!==false && !record.calendarUpdatePending && Date.parse(record.start)>now+3600000;
  return false;
}
export async function findPrivateBooking(token,{metadata=false}={}) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token || "")) throw failure("Booking not found. / Reservación no encontrada.",404);
  const store=clientCommerceStore(), hash=crypto.createHash("sha256").update(token).digest("hex");
  const pointer=await store.get(`calendar/${hash}.json`,{type:"json"});
  if(!pointer) throw failure("Booking not found. / Reservación no encontrada.",404);
  const key=commerceKey(pointer.siteId,"bookings",pointer.transactionId);
  const saved=metadata?await store.getWithMetadata(key,{type:"json"}):null;
  const record=metadata?saved?.data:await store.get(key,{type:"json"});
  const site=await getClientSite(pointer.siteId);
  if (!site || record?.calendarToken!==token || record.kind!=="booking") throw failure("Booking not found. / Reservación no encontrada.",404);
  return {site,record,key,etag:saved?.etag};
}
async function mirrorTransaction(site,record) {
  const store=clientCommerceStore(), key=commerceKey(site.siteId,"transactions",record.transactionId);
  const saved=await store.getWithMetadata(key,{type:"json"});
  if(saved?.data) await store.setJSON(key,record,{onlyIfMatch:saved.etag});
}
export async function finishBookingChange(site,record) {
  if(!record.managementRevision || !record.managementChange) return record;
  const store=clientCommerceStore(), key=commerceKey(site.siteId,"bookings",record.transactionId);
  const persist=async next=>{
    const saved=await store.getWithMetadata(key,{type:"json"});
    if(saved?.data?.managementRevision!==record.managementRevision || saved.data.status!==record.status || saved.data.start!==record.start) throw failure("Booking changed. Reload the page. / La reservación cambió. Actualiza la página.");
    const result=await store.setJSON(key,next,{onlyIfMatch:saved.etag});
    if(!result.modified) throw failure("Booking changed. Reload the page. / La reservación cambió. Actualiza la página.");
    await mirrorTransaction(site,next);
    record=next;
  };
  if(record.status==="cancelled" && record.calendarCancellationPending && record.googleEventId) {
    try { await deleteGoogleEvent(site.siteId,record.googleCalendarId,record.googleEventId); record={...record,calendarCancellationPending:false}; } catch { /* Retry later; the local cancellation stays committed. */ }
  } else if(record.status==="confirmed") record=await syncBookingCalendar(site,record);
  await persist(record);
  for(const [audience,email,flag] of [["customer",record.customer?.email,"changeCustomerEmailSent"],["business",site.business?.email,"changeBusinessEmailSent"]]) {
    if(!email || record[flag]) continue;
    const current=await store.get(key,{type:"json"});
    if(current?.managementRevision!==record.managementRevision || current.status!==record.status || current.start!==record.start) return current || record;
    try {
      const ics=audience==="customer" && record.status==="confirmed" ? bookingIcs(site,record) : null;
      await sendEmail({category:"team",fromName:site.business?.name || "WebFactory Business",to:email,...renderBookingEmail(site,record,{audience,change:record.managementChange}),...(ics?{attachments:[{filename:"appointment.ics",content:ics,contentType:"text/calendar; charset=utf-8"}]}:{})});
      await persist({...record,[flag]:true});
    } catch { /* Successful recipients are stored separately; unsent mail is retried. */ }
  }
  return record;
}
export async function changePrivateBooking(token,{action,start,version,acknowledged}) {
  const initial=await findPrivateBooking(token), store=clientCommerceStore();
  if(!["cancel","reschedule"].includes(action)) throw failure("Invalid booking action. / Acción inválida.",400);
  if(acknowledged!=="yes") throw failure("Confirm the change before submitting. / Confirma el cambio antes de enviarlo.",400);
  return withBookingLock(store,commerceKey(initial.site.siteId,"booking-change-locks",initial.record.transactionId),async()=>{
    const {site,record,key,etag}=await findPrivateBooking(token,{metadata:true});
    if(!etag || version!==bookingVersion(record)) throw failure("Booking changed. Reload the page. / La reservación cambió. Actualiza la página.");
    if(!canManageBooking(site,record,action)) throw failure("This booking cannot be changed online. Contact the business. / Esta reservación no se puede cambiar online. Contacta al negocio.");
    let hold=null;
    try {
      if(action==="reschedule") {
        if(!Number.isFinite(Date.parse(start)) || Date.parse(start)<=Date.now()+3600000 || Date.parse(start)>Date.now()+365*86400000 || Date.parse(start)===Date.parse(record.start)) throw failure("Choose a new available time. / Elige un nuevo horario disponible.",400);
        hold=await createBookingHold(site,{serviceId:record.serviceId,employeeId:record.employeeId,start,locationId:record.locationId || ""},{strictGoogle:true});
      }
      const now=new Date().toISOString();
      const next={...record,managementRevision:crypto.randomUUID(),managementChange:action==="cancel"?"cancelled":"rescheduled",changeCustomerEmailSent:false,changeBusinessEmailSent:false,updatedAt:now,
        ...(action==="cancel"?{status:"cancelled",cancelledAt:now,calendarCancellationPending:Boolean(record.googleEventId),calendarUpdatePending:false}:{start:hold.start,end:hold.end,rescheduledAt:now,previousStart:record.start,calendarUpdatePending:Boolean(record.googleEventId),calendarSyncPending:true,calendarSyncStatus:"pending"})};
      const result=await store.setJSON(key,next,{onlyIfMatch:etag});
      if(!result.modified) throw failure("Booking changed. Reload the page. / La reservación cambió. Actualiza la página.");
      await mirrorTransaction(site,next);
      return await finishBookingChange(site,next);
    } finally { if(hold) await store.delete(commerceKey(initial.site.siteId,"holds",hold.holdId)); }
  });
}
