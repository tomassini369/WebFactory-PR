import assert from 'node:assert/strict';
const origin=(process.env.PREVIEW_URL||'').replace(/\/$/,'');
if(!/^https:\/\/(?:deploy-preview-\d+--webfactorypr\.netlify\.app|webfactorypr\.com)$/.test(origin))throw Error('Select a WebFactory preview or production origin explicitly.');
const endpoint=origin+'/.netlify/functions/client-admin';
const payload=JSON.stringify({siteId:'fixture-never-real',section:'slug',value:'fixture-never-real',revision:0});
for(const [name,headers,status] of [
 ['unauthenticated URL update',{Origin:origin,'Content-Type':'application/json'},401],
 ['foreign-origin URL update',{Origin:'https://foreign.example.invalid','Content-Type':'application/json'},403],
]){
 const response=await fetch(endpoint,{method:'PATCH',headers,body:payload,signal:AbortSignal.timeout(15000)});assert.equal(response.status,status,name);assert.match(response.headers.get('cache-control')||'',/no-store/);assert.equal((await response.json()).ok,false);console.log(`PASS public URL boundary: ${name} ${status}`);
}
console.log('PASS deployed URL editor authorization; no session, no real tenant and zero data writes');
