import assert from 'node:assert/strict';
const origin=String(process.env.PREVIEW_URL||'').replace(/\/$/,'');
if(!/^https:\/\//.test(origin))throw Error('PREVIEW_URL HTTPS is required.');
const endpoints=['client-accounting-access','client-business-accounting','client-business-modules','client-workforce','client-erp-integration'];
for(const endpoint of endpoints){
 const response=await fetch(`${origin}/.netlify/functions/${endpoint}?siteId=isolated-accounting-http-qa`,{redirect:'error',signal:AbortSignal.timeout(20000)});
 assert.equal(response.status,401,`${endpoint} rejects an unauthenticated read`);
 assert.match(response.headers.get('content-type')||'',/json/);
 const data=await response.json();assert.equal(data.ok,false);
 console.log(`PASS deployed ${endpoint}: authentication required`);
}
for(const endpoint of ['client-accounting-access','client-business-modules','client-erp-integration']){
 const response=await fetch(`${origin}/.netlify/functions/${endpoint}`,{method:'POST',headers:{Origin:'https://foreign.example.invalid','Content-Type':'application/json'},body:JSON.stringify({siteId:'isolated-accounting-http-qa',action:'unsupported'}),redirect:'error',signal:AbortSignal.timeout(20000)});
 assert.equal(response.status,403,`${endpoint} rejects cross-origin mutation before authentication/storage`);
 console.log(`PASS deployed ${endpoint}: cross-origin mutation rejected`);
}
