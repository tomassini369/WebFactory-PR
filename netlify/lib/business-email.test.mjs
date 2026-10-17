import test from "node:test";
import assert from "node:assert/strict";
import nodemailer from "nodemailer";
import { getStore } from "@netlify/blobs";
import { businessEmailConnected, businessEmailProvider, sendBusinessEmail } from "./business-email.mjs";
import { clientOAuthStore,clientSiteStore } from "./client-store.mjs";
import googleCallback from "../functions/google-calendar-callback.mjs";
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
  t.mock.method(proto,"getWithMetadata",async function(key){return structuredClone(rows.get(`${this.name}/${key}`)??null)});
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

for (const scenario of ["missing business token","expired without refresh token","revoked refresh token"]) {
 test(`${scenario} identifies Gmail authorization separately from Calendar`,async t=>{
  const f=fixture(t),calls=[];
  await clientOAuthStore().setJSON(`tokens/${f.site.siteId}.json`,{encrypted:encryptToken({access_token:"calendar-only",expires_at:Date.now()+3600000})});
  if(scenario!=="missing business token") await clientOAuthStore().setJSON(`business-email/tokens/${f.site.siteId}.json`,{encrypted:encryptToken({access_token:"expired",expires_at:1,...(scenario==="revoked refresh token"?{refresh_token:"revoked"}:{})})});
  t.mock.method(globalThis,"fetch",async url=>{calls.push(String(url));return Response.json({error:"invalid_grant"},{status:400})});
  await assert.rejects(sendBusinessEmail(f.site,{to:"customer@example.invalid",subject:"Fixture",text:"Fixture"}),e=>e.status===409 && e.code==="business_email_authorization_required");
  assert.deepEqual(calls,scenario==="revoked refresh token"?["https://oauth2.googleapis.com/token"]:[]);
 });
}
for (const status of [401,403]) {
 test(`Gmail ${status} preserves an actionable authorization error`,async t=>{
  const f=fixture(t);
  await clientOAuthStore().setJSON(`business-email/tokens/${f.site.siteId}.json`,{encrypted:encryptToken({access_token:"fixture",expires_at:Date.now()+3600000})});
  t.mock.method(globalThis,"fetch",async()=>Response.json({error:{message:"provider detail must remain private"}},{status}));
  await assert.rejects(sendBusinessEmail(f.site,{to:"customer@example.invalid",subject:"Fixture",text:"Fixture"}),e=>e.status===status && e.code==="business_email_authorization_required" && !e.message.includes("provider detail"));
 });
}
test("an empty successful Gmail response is not proof that a confirmation was sent",async t=>{
 const f=fixture(t);
 await clientOAuthStore().setJSON(`business-email/tokens/${f.site.siteId}.json`,{encrypted:encryptToken({access_token:"fixture",expires_at:Date.now()+3600000})});
 t.mock.method(globalThis,"fetch",async()=>Response.json({}));
 await assert.rejects(sendBusinessEmail(f.site,{to:"customer@example.invalid",subject:"Fixture",text:"Fixture"}),e=>e.status===502 && e.code==="business_email_delivery_failed");
});

for (const [body,code] of [
 [{error:{errors:[{reason:"accessNotConfigured"}]}},"business_email_api_disabled"],
 [{error:{details:[{reason:"SERVICE_DISABLED",metadata:{service:"gmail.googleapis.com",consumer:"private-project"}}]}},"business_email_api_disabled"],
 [{error:{errors:[{reason:"userRateLimitExceeded"}]}},"business_email_rate_limited"],
 [{error:{errors:[{reason:"domainPolicy"}]}},"business_email_policy_blocked"],
 [{error:{details:[{reason:"ACCESS_TOKEN_SCOPE_INSUFFICIENT"}]}},"business_email_authorization_required"],
]) {
 test(`connected Gmail rejects with safe diagnostic ${code}`,async t=>{
  const f=fixture(t);
  await clientOAuthStore().setJSON(`business-email/tokens/${f.site.siteId}.json`,{encrypted:encryptToken({access_token:"fixture",expires_at:Date.now()+3600000})});
  t.mock.method(globalThis,"fetch",async()=>Response.json(body,{status:403}));
  await assert.rejects(sendBusinessEmail(f.site,{to:"customer@example.invalid",subject:"Fixture",text:"Fixture"}),e=>e.status===403 && e.code===code && !e.message.includes("private-project"));
 });
}
test("temporary token refresh failure does not tell a connected business to reauthorize",async t=>{
 const f=fixture(t);
 await clientOAuthStore().setJSON(`business-email/tokens/${f.site.siteId}.json`,{encrypted:encryptToken({access_token:"expired",refresh_token:"fixture",expires_at:1})});
 const calls=[];t.mock.method(globalThis,"fetch",async url=>{calls.push(String(url));return Response.json({error:"temporarily_unavailable"},{status:503})});
 await assert.rejects(sendBusinessEmail(f.site,{to:"customer@example.invalid",subject:"Fixture",text:"Fixture"}),e=>e.status===503 && e.code!=="business_email_authorization_required");
 assert.deepEqual(calls,["https://oauth2.googleapis.com/token"]);
});
for(const scope of [undefined,"openid email","https://www.googleapis.com/auth/calendar.events"]) {
 test(`Gmail connection requires sending scope, not just a verified email (${scope})`,async t=>{
  const f=fixture(t),key=`business-email/tokens/${f.site.siteId}.json`;
  const previous={encrypted:encryptToken({access_token:"existing",expires_at:Date.now()+3600000})};await clientOAuthStore().setJSON(key,previous);
  await clientOAuthStore().setJSON('states/scope-fixture.json',{kind:'business-email',siteId:f.site.siteId,expiresAt:new Date(Date.now()+60000).toISOString()});
  const calls=[];t.mock.method(globalThis,'fetch',async url=>{calls.push(String(url));return Response.json({access_token:'declined-send',expires_in:3600,...(scope?{scope}:{})})});
  const response=await googleCallback(new Request('https://webfactorypr.com/.netlify/functions/google-calendar-callback?state=scope-fixture&code=fixture'));
  assert.equal(response.status,302);assert.equal(new URL(response.headers.get('location')).searchParams.get('businessEmail'),'permission_required');
  assert.deepEqual(await clientOAuthStore().get(key),previous,'declining a renewal must not replace the existing grant');
  assert.deepEqual(calls,['https://oauth2.googleapis.com/token']);assert.equal(await clientOAuthStore().get('states/scope-fixture.json'),null);
 });
}
for(const grantedScope of ['https://www.googleapis.com/auth/gmail.send','https://www.googleapis.com/auth/gmail.compose','https://www.googleapis.com/auth/gmail.modify','https://mail.google.com/']) {
test(`Gmail connection still succeeds with authorized scope ${grantedScope}`,async t=>{
 const f=fixture(t);await clientSiteStore().setJSON(`sites/${f.site.siteId}.json`,{...f.site,slug:'fixture-email',revision:0});
 await clientOAuthStore().setJSON('states/allowed-fixture.json',{kind:'business-email',siteId:f.site.siteId,expiresAt:new Date(Date.now()+60000).toISOString()});
 t.mock.method(globalThis,'fetch',async url=>String(url).includes('userinfo')?Response.json({email:'owner@example.com',email_verified:true}):Response.json({access_token:'allowed',refresh_token:'fixture',expires_in:3600,scope:'openid email '+grantedScope}));
 const response=await googleCallback(new Request('https://webfactorypr.com/.netlify/functions/google-calendar-callback?state=allowed-fixture&code=fixture'));
 assert.equal(new URL(response.headers.get('location')).searchParams.get('businessEmail'),'connected');
 assert.equal((await clientSiteStore().get(`sites/${f.site.siteId}.json`)).businessEmail.connected,true);
});
}
