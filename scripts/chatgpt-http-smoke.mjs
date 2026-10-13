import assert from 'node:assert/strict';
const origin=process.env.PREVIEW_URL||process.env.WEBFACTORY_SMOKE_URL;
if(!origin)throw Error('Set PREVIEW_URL or WEBFACTORY_SMOKE_URL.');
const get=path=>fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(30000)});
const page=await get('/chatgpt');assert.equal(page.status,200,'ChatGPT page must route to the app');
const metadata=await get('/.well-known/oauth-authorization-server');assert.equal(metadata.status,200);const config=await metadata.json();assert.equal(config.issuer,origin);assert.deepEqual(config.code_challenge_methods_supported,['S256']);
const resource=await (await get('/.well-known/oauth-protected-resource/mcp')).json();assert.equal(resource.resource,origin+'/mcp');
const mcp=await get('/mcp');assert.equal(mcp.status,401);assert.ok(mcp.headers.get('www-authenticate')?.includes('/.well-known/oauth-protected-resource/mcp'));
const control=await get('/.netlify/functions/chatgpt-control');assert.equal(control.status,401);
for(const method of ['initialize','tools/list','tools/call']){
 const params=method==='initialize'?{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'webfactory-http-smoke',version:'1'}}:method==='tools/call'?{name:'wf_connection',arguments:{}}:{};
 const response=await fetch(origin+'/mcp',{method:'POST',redirect:'manual',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(30000)});
 assert.equal(response.status,401,method+' must fail closed without OAuth');assert.equal(response.headers.get('cache-control'),'no-store');assert(response.headers.get('www-authenticate')?.includes('/.well-known/oauth-protected-resource/mcp'));
}
console.log('ChatGPT route, OAuth metadata, unauthenticated initialize/list/call challenges and portal authentication passed for '+origin+'. Authenticated protocol execution and client catalog availability require separate checks.');
