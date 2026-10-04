import test from "node:test";
import assert from "node:assert/strict";
import nodemailer from "nodemailer";
import { getStore } from "@netlify/blobs";
import { businessEmailConnected, businessEmailProvider, sendBusinessEmail } from "./business-email.mjs";
import { clientOAuthStore } from "./client-store.mjs";
import { encryptToken } from "./google-calendar.mjs";

function fixture(t) {
  globalThis.netlifyBlobsContext=Buffer.from(JSON.stringify({siteID:"test",token:"test",deployID:"test"})).toString("base64");
  globalThis.Netlify={context:{deploy:{context:"production"}},env:{get:name=>({
    WEBFACTORY_TOKEN_ENCRYPTION_KEY:"business-email-test-key",
    GOOGLE_OAUTH_CLIENT_ID:"client-id",
    GOOGLE_OAUTH_CLIENT_SECRET:"client-secret",
    WEBFACTORY_EMAIL_PROVIDER:"resend",
    RESEND_API_KEY:"central-resend-must-not-be-used",
  })[name]||""}};
  t.after(()=>{delete globalThis.Netlify;delete globalThis.netlifyBlobsContext});
  const rows=new Map(),proto=Object.getPrototypeOf(getStore("test"));let etag=0;
  t.mock.method(proto,"get",async function(key){return structuredClone(rows.get(`${this.name}/${key}`)?.data??null)});
  t.mock.method(proto,"setJSON",async function(key,value){rows.set(`${this.name}/${key}`,{data:structuredClone(value),etag:String(++etag)});return {modified:true}});
  t.mock.method(proto,"delete",async function(key){rows.delete(`${this.name}/${key}`)});
  const site={siteId:"site-email-test",business:{name:"Fixture Business"},businessEmail:{provider:"google",connected:true,connectedEmail:"owner@example.com"}};
  return {site,rows};
}

test("business email never falls back to WebFactory Resend when a client has not connected an account",async t=>{
  fixture(t);
  const site={siteId:"site-unconnected",business:{name:"Fixture Business"}};
  assert.equal(businessEmailConnected(site),false);
  assert.equal(businessEmailProvider(site),"unconfigured");
  let opened=false,requested=false;
  t.mock.method(nodemailer,"createTransport",()=>{opened=true;throw new Error("must not open transport")});
  t.mock.method(globalThis,"fetch",async()=>{requested=true;throw new Error("must not call provider")});
  await assert.rejects(sendBusinessEmail(site,{to:"customer@example.com",subject:"Fixture",text:"Fixture"}),error=>error?.code==="business_email_not_connected");
  assert.equal(opened,false);
  assert.equal(requested,false);
});

test("connected business mail is generated from the client's Google account and sent with Gmail API",async t=>{
  const f=fixture(t);
  await clientOAuthStore().setJSON(`business-email/tokens/${f.site.siteId}.json`,{encrypted:encryptToken({access_token:"business-access-token",expires_at:Date.now()+3600000})});
  let mail,request;
  t.mock.method(nodemailer,"createTransport",options=>{
    assert.equal(options.streamTransport,true);
    assert.equal(options.buffer,true);
    return {sendMail:async value=>{mail=value;return {message:Buffer.from("raw-mime-message")}},close(){}};
  });
  t.mock.method(globalThis,"fetch",async(url,options)=>{request={url:String(url),options};return Response.json({id:"gmail-message",threadId:"gmail-thread"})});
  const result=await sendBusinessEmail(f.site,{
    to:"customer@example.com",
    subject:"Appointment confirmed",
    text:"Fixture body",
    replyTo:"reply@example.com",
    attachments:[{filename:"appointment.ics",content:"BEGIN:VCALENDAR\nEND:VCALENDAR",contentType:"text/calendar"}],
    fromName:"Fixture Business",
  });
  assert.equal(result.provider,"google-gmail");
  assert.deepEqual(result.accepted,["customer@example.com"]);
  assert.equal(mail.from,'"Fixture Business" <owner@example.com>');
  assert.deepEqual(mail.to,["customer@example.com"]);
  assert.equal(mail.replyTo,"reply@example.com");
  assert.equal(mail.attachments[0].filename,"appointment.ics");
  assert.equal(request.url,"https://gmail.googleapis.com/gmail/v1/users/me/messages/send");
  assert.equal(request.options.headers.Authorization,"Bearer business-access-token");
  assert.equal(JSON.parse(request.options.body).raw,Buffer.from("raw-mime-message").toString("base64url"));
});

test("expired business Google token refreshes without using the platform email provider",async t=>{
  const f=fixture(t);
  await clientOAuthStore().setJSON(`business-email/tokens/${f.site.siteId}.json`,{encrypted:encryptToken({access_token:"expired",refresh_token:"refresh-business",expires_at:1})});
  t.mock.method(nodemailer,"createTransport",()=>({sendMail:async()=>({message:Buffer.from("raw")}),close(){}}));
  const calls=[];
  t.mock.method(globalThis,"fetch",async(url,options)=>{
    calls.push(String(url));
    if(String(url)==="https://oauth2.googleapis.com/token")return Response.json({access_token:"renewed",expires_in:3600});
    assert.equal(options.headers.Authorization,"Bearer renewed");
    return Response.json({id:"gmail-message"});
  });
  await sendBusinessEmail(f.site,{to:"customer@example.com",subject:"Fixture",text:"Fixture"});
  assert.deepEqual(calls,["https://oauth2.googleapis.com/token","https://gmail.googleapis.com/gmail/v1/users/me/messages/send"]);
});
