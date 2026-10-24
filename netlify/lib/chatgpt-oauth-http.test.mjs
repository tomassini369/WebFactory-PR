import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createOAuthHandler} from '../functions/chatgpt-oauth.mjs';
import {registerClient,beginAuthorization,consent,authenticateToken,revokeGrant,randomToken} from './chatgpt-oauth.mjs';
const origin='https://webfactorypr.com',redirect='https://chatgpt.com/connector_platform_oauth_redirect';
class Store {
 rows=new Map();
 async get(k){return structuredClone(this.rows.get(k)?.data||null)}
 async getWithMetadata(k){return structuredClone(this.rows.get(k)||null)}
 async setJSON(k,data,o={}){const old=this.rows.get(k);if(o.onlyIfNew&&old||o.onlyIfMatch&&old?.etag!==o.onlyIfMatch)return {modified:false};this.rows.set(k,{data:structuredClone(data),etag:crypto.randomUUID()});return {modified:true}}
}
async function fixture(){
 const store=new Store(),handler=createOAuthHandler({getStore:()=>store});
 const client=await registerClient(store,{redirect_uris:[redirect]}),verifier=randomToken();
 const id=await beginAuthorization(store,{client_id:client.client_id,redirect_uri:redirect,response_type:'code',code_challenge_method:'S256',code_challenge:crypto.createHash('sha256').update(verifier).digest('base64url'),scope:'webfactory.read webfactory.execute',state:'fixture',resource:origin+'/mcp'},origin);
 const authorized=await consent(store,id,{id:'u1',email:'owner@example.invalid'},{siteId:'tenant-a',allowExecute:true});
 const args={grant_type:'authorization_code',client_id:client.client_id,code:new URL(authorized.redirect).searchParams.get('code'),code_verifier:verifier,redirect_uri:redirect,resource:origin+'/mcp'};
 const token=values=>handler(new Request(origin+'/oauth/chatgpt/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(values)}));
 return {store,handler,args,authorized,token};
}
test('OAuth HTTP metadata exposes exact resource and PKCE without storage access',async()=>{
 const handler=createOAuthHandler({getStore:()=>{throw Error('unexpected storage')}});
 for(const path of ['/.well-known/oauth-protected-resource','/.well-known/oauth-protected-resource/mcp']){const r=await handler(new Request(origin+path));assert.equal(r.status,200);assert.equal((await r.json()).resource,origin+'/mcp');assert.equal(r.headers.get('cache-control'),'no-store')}
 const r=await handler(new Request(origin+'/.well-known/oauth-authorization-server')),v=await r.json();assert.deepEqual(v.code_challenge_methods_supported,['S256']);assert.deepEqual(v.token_endpoint_auth_methods_supported,['none']);assert(v.scopes_supported.includes('webfactory.execute'));
});
test('OAuth HTTP redemption, expiration, rotation and refresh replay retain resource binding',async()=>{
 const f=await fixture(),r=await f.token(f.args);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');const tokens=await r.json();
 assert.equal((await authenticateToken(f.store,'Bearer '+tokens.access_token,origin)).siteId,'tenant-a');
 await assert.rejects(authenticateToken(f.store,'Bearer '+tokens.access_token,origin,Date.now()+901000),{status:401});
 const refresh={grant_type:'refresh_token',client_id:f.args.client_id,refresh_token:tokens.refresh_token,resource:origin+'/mcp'};
 const rotation=await f.token(refresh);assert.equal(rotation.status,200);const rotated=await rotation.json();
 const replay=await f.token(refresh);assert.equal(replay.status,400);assert.equal((await replay.json()).error,'invalid_grant');
 await assert.rejects(authenticateToken(f.store,'Bearer '+rotated.access_token,origin),{status:401});
});
test('OAuth token errors distinguish invalid grant, request, scope and unsupported flow',async()=>{
 const f=await fixture();
 for(const [change,code] of [[{resource:'https://other.invalid/mcp'},'invalid_request'],[{grant_type:'password'},'unsupported_grant_type'],[{code_verifier:randomToken()},'invalid_grant'],[{code:'missing'},'invalid_grant'],[{scope:'webfactory.admin'},'invalid_scope']]){const r=await f.token({...f.args,...change});assert.equal(r.status,400);assert.equal((await r.json()).error,code)}
 const ok=await f.token(f.args);assert.equal(ok.status,200);
 const reused=await f.token(f.args);assert.equal((await reused.json()).error,'invalid_grant');
});
test('Revoked grants return OAuth invalid_grant and never mint replacement tokens',async()=>{
 const f=await fixture();await revokeGrant(f.store,f.authorized.grant.id);const r=await f.token(f.args);assert.equal(r.status,400);assert.equal((await r.json()).error,'invalid_grant');
});
