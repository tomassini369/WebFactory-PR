import test from "node:test";
import assert from "node:assert/strict";
import { bookingKioskPin } from "./kiosk-bookings.mjs";
import { sendBookingConfirmationEmails } from "./client-notifications.mjs";

const site={
 siteId:"mail-test",slug:"mail-test",
 business:{name:"Sample Barber"},
 settings:{locale:"en",timezone:"America/Puerto_Rico"},
 employees:[{id:"barber",name:"Alex"}],
};
const booking=()=>({
 siteId:site.siteId,kind:"booking",transactionId:"transaction-mail-test",bookingCode:"A1B2C3D4",calendarToken:"t".repeat(43),
 status:"confirmed",paymentStatus:"due",confirmationEmailRequested:true,
 start:"2099-10-12T21:00:00Z",end:"2099-10-12T21:45:00Z",
 employeeId:"barber",amountTotal:2500,items:[{name:"Haircut / Fade"}],
 customer:{name:"Customer",email:"customer@example.invalid"},
 customerCalendarInviteRequested:false,
});

test("confirmed booking is delivered as branded HTML without an automatic calendar attachment",async()=>{
 const sends=[],saved=[];
 const out=await sendBookingConfirmationEmails(site,booking(),async value=>saved.push(structuredClone(value)),{
   deliver:async (_site,payload)=>{sends.push(payload);return {accepted:[payload.to]};},
 });
 assert.equal(sends.length,1);
 assert.match(sends[0].html,/Sample Barber/);
 assert.match(sends[0].html,/Haircut \/ Fade/);
 assert.match(sends[0].html,/You&#39;re booked in/);
 assert.equal(sends[0].attachments,undefined);
 assert.match(sends[0].html,/Añadir al calendario|Add to calendar/);
 assert.match(sends[0].html,/Private kiosk PIN/);
 assert.ok(sends[0].html.includes("A1B2C3D4") && sends[0].text.includes("A1B2C3D4"));
 const pin=bookingKioskPin(booking());assert.match(pin,/^\d{6}$/);assert.ok(sends[0].html.includes(pin) && sends[0].text.includes(pin));
 assert.match(sends[0].html,/At the self-service kiosk/);
 assert.doesNotMatch(sends[0].html,/If you accepted the Google invitation/);
 assert.equal(out.customerEmailSent,true);
 assert.equal(out.customerEmailDeliveryStatus,"sent");
 assert.equal(saved.length,1);
 await sendBookingConfirmationEmails(site,out,async()=>{throw Error("must not persist")},{
   deliver:async()=>{throw Error("must not resend");},
 });
});

test("unconfigured Gmail leaves booking confirmed and makes the error visible without exposing provider details",async()=>{
 const stored=[],failed=new Error("sensitive provider text");
 failed.code="business_email_not_connected";
 const first=await sendBookingConfirmationEmails(site,booking(),async value=>stored.push(structuredClone(value)),{
  deliver:async()=>{throw failed;},
 });
 assert.equal(first.status,"confirmed");
 assert.notEqual(first.customerEmailSent,true);
 assert.equal(first.customerEmailDeliveryStatus,"action_required");
 assert.equal(first.customerEmailDeliveryStatusReason,"connection_required");
 assert.ok(first.customerEmailDeliveryStatusAttemptedAt);
 assert.doesNotMatch(JSON.stringify(first),/sensitive provider text/);
 assert.equal(stored.length,1);
 const count=[];
 const retry=await sendBookingConfirmationEmails(site,first,async value=>stored.push(structuredClone(value)),{
  deliver:async(_,payload)=>{count.push(payload);return {accepted:[payload.to]};},
 });
 assert.equal(count.length,1);
 assert.equal(retry.customerEmailSent,true);
 assert.equal(retry.customerEmailDeliveryStatus,"sent");
 assert.equal(retry.customerEmailDeliveryStatusReason,null);
});

test("transient mail errors show retry status while preserving the booking",async()=>{
 const output=await sendBookingConfirmationEmails(site,booking(),async()=>{},{
  deliver:async()=>{const error=new Error("Network timeout");error.code="timeout";throw error;},
 });
 assert.equal(output.status,"confirmed");
 assert.equal(output.customerEmailDeliveryStatus,"pending_retry");
 assert.equal(output.customerEmailDeliveryStatusReason,"delivery_failed");
});

for (const failure of [{code:"business_email_authorization_required",status:409},{status:401},{status:403}]) {
 test(`business email authorization failure ${failure.status} requires action without exposing credentials`,async()=>{
  const result=await sendBookingConfirmationEmails(site,booking(),async()=>{}, {
   deliver:async()=>{throw Object.assign(new Error("sensitive provider detail"),failure)},
  });
  assert.equal(result.status,"confirmed");
  assert.notEqual(result.customerEmailSent,true);
  assert.equal(result.customerEmailDeliveryStatus,"action_required");
  assert.equal(result.customerEmailDeliveryStatusReason,"authorization_required");
  assert.doesNotMatch(JSON.stringify(result),/sensitive provider detail/);
 });
}

for (const [code,reason,status] of [
 ["business_email_api_disabled","gmail_api_disabled","action_required"],
 ["business_email_policy_blocked","workspace_policy","action_required"],
 ["business_email_rate_limited","rate_limited","pending_retry"],
]) {
 test(`connected Gmail failure ${reason} is not mislabeled as disconnected authorization`,async()=>{
  const saved=[];
  const result=await sendBookingConfirmationEmails(site,booking(),async row=>saved.push(row),{
   deliver:async()=>{throw Object.assign(new Error("private provider response"),{status:403,code})},
  });
  assert.equal(result.status,"confirmed");assert.notEqual(result.customerEmailSent,true);
  assert.equal(result.customerEmailDeliveryStatus,status);assert.equal(result.customerEmailDeliveryStatusReason,reason);
  assert.doesNotMatch(JSON.stringify(saved),/private provider response/);
 });
}

test("placeholder business recipient is flagged for correction without retrying the booking or losing customer notice",async()=>{
 const fixture={...site,business:{...site.business,email:"demo@example.com"}};
 const recipients=[];
 const record=await sendBookingConfirmationEmails(fixture,booking(),async()=>{}, {
  deliver:async(_site,payload)=>{
   recipients.push(payload.to);
   if(payload.to==="demo@example.com")throw Object.assign(new Error("example recipient"),{code:"business_email_invalid_recipient",status:400});
   return {accepted:[payload.to]};
  },
 });
 assert.deepEqual(recipients,["customer@example.invalid","demo@example.com"]);
 assert.equal(record.customerEmailSent,true);
 assert.notEqual(record.businessEmailSent,true);
 assert.equal(record.businessEmailDeliveryStatus,"action_required");
 assert.equal(record.businessEmailDeliveryStatusReason,"invalid_recipient");
 assert.equal(record.status,"confirmed");
});
