import test from 'node:test';import assert from 'node:assert/strict';
import {createAdminResetHandler} from '../functions/admin-reset-authenticator.mjs';
const origin='https://portal.example',post=(body,requestOrigin=origin)=>new Request(origin+'/.netlify/functions/admin-reset-authenticator',{method:'POST',headers:{Origin:requestOrigin,'Content-Type':'application/json'},body:JSON.stringify(body)});
const payload={siteId:'business',email:'outsider@example.com',requestId:'00000000-0000-4000-8000-000000000001',confirmation:'RESET AUTHENTICATOR',requestedByClient:true,identityVerified:true,verificationMethod:'registered-contact-and-business-verification',reason:'Lost customer phone',requestReference:'SUPPORT-2026-1002'};
test('reset rejects foreign origins and anonymous users before Identity lookup or storage',async()=>{
 let accesses=0;const handler=createAdminResetHandler({authorize:async()=>{throw Object.assign(Error('Authentication required'),{status:401})},listUsers:async()=>{accesses++;return []},securityStore:()=>{accesses++;return {}}});
 assert.equal((await handler(post(payload,'https://foreign.example'),{})).status,403);assert.equal((await handler(post(payload),{})).status,401);assert.equal(accesses,0);
 assert.equal((await handler(new Request(origin),{})).status,405);
});
test('reset restricts target to authoritative business membership and rejects oversized payloads',async()=>{
 let lookups=0;const handler=createAdminResetHandler({authorize:async()=>({id:'admin',email:'admin@example.com',roles:['admin']}),recent:async()=>{},securityStore:()=>({}),getSite:async()=>({siteId:'business',members:[{email:'actual@example.com'}]}),listUsers:async()=>{lookups++;return []},configured:()=>true});
 const response=await handler(post(payload),{});assert.equal(response.status,404);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(lookups,0);
 assert.equal((await handler(post({...payload,reason:'x'.repeat(9000)}),{})).status,413);
});
