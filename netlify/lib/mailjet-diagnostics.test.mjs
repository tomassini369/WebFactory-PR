import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyMailjetCredentials} from './mailjet-diagnostics.mjs';
import {createMailjetVerifier} from '../functions/verify-mailjet.mjs';
const values={MAILJET_API_KEY:'fixture-key',MAILJET_SECRET_KEY:'fixture-secret',MAILJET_SMTP_PORT:'465',MAILJET_SMTP_HOST:'in-v3.mailjet.com'};
test('Mailjet verification authenticates only, preserves transport selection and closes SMTP',async()=>{
 let closed=false,options;const result=await verifyMailjetCredentials({read:n=>values[n]||'',fetcher:async()=>({status:200}),createTransport:o=>{options=o;return {verify:async()=>true,close:()=>{closed=true}}}});
 assert.equal(result.authenticated,true);assert.equal(result.apiStatus,200);assert.equal(options.secure,true);assert.equal(closed,true);assert(!JSON.stringify(result).includes('fixture-key'));
});
test('authentication rejection is reported without leaking SMTP response or credentials',async()=>{
 const result=await verifyMailjetCredentials({read:n=>values[n]||'',fetcher:async()=>({status:401}),createTransport:()=>({verify:async()=>{throw Object.assign(new Error('fixture-secret'),{responseCode:535,response:'fixture-key'})},close:()=>{}})});
 assert.equal(result.authenticated,false);assert.equal(result.smtpStatus,535);assert.equal(result.apiStatus,401);assert(!JSON.stringify(result).includes('fixture'));
});
test('missing credentials prevent all connections',async()=>{assert.equal((await verifyMailjetCredentials({read:()=>'',fetcher:()=>{throw Error('unexpected')}})).issue,'credentials_missing')});
test('diagnostic endpoint restricts method, origin and administrator before credentials',async()=>{
 let calls=0;const handler=createMailjetVerifier({authorize:async()=>{throw Object.assign(new Error('Authentication required'),{status:401})},verify:async()=>{calls++;}});
 assert.equal((await handler(new Request('https://example.invalid/api'))).status,405);
 assert.equal((await handler(new Request('https://example.invalid/api',{method:'POST',headers:{origin:'https://foreign.invalid'}}))).status,403);
 assert.equal((await handler(new Request('https://example.invalid/api',{method:'POST',headers:{origin:'https://example.invalid'}}))).status,401);assert.equal(calls,0);
});
test('diagnostic response explicitly confirms no send and active Gmail',async()=>{
 const handler=createMailjetVerifier({authorize:async()=>{},verify:async()=>({authenticated:true}),provider:()=> 'gmail'});
 const response=await handler(new Request('https://example.invalid/api',{method:'POST',headers:{origin:'https://example.invalid'}}));const body=await response.json();assert.equal(body.emailSent,false);assert.equal(body.activeProvider,'gmail');assert.equal(response.headers.get('cache-control'),'no-store');
});
