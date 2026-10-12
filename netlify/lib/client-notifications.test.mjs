import test from "node:test";
import assert from "node:assert/strict";
import { sendBookingConfirmationEmails } from "./client-notifications.mjs";

const site={
 siteId:"mail-test",slug:"mail-test",
 business:{name:"Sample Barber"},
 settings:{locale:"en",timezone:"America/Puerto_Rico"},
 employees:[{id:"barber",name:"Alex"}],
};
const booking=()=>({
 kind:"booking",transactionId:"transaction-mail-test",bookingCode:"BOOK001",calendarToken:"t".repeat(43),
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
