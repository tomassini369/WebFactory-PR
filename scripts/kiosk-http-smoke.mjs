import assert from 'node:assert/strict';
const origin=(process.env.PREVIEW_URL||'').replace(/\/$/,'');
if(!/^https:\/\/(?:deploy-preview-\d+--webfactorypr\.netlify\.app|webfactorypr\.com)$/.test(origin))throw new Error('Use an explicitly selected WebFactory preview or production origin.');
const endpoint=origin+'/.netlify/functions/client-kiosk';
const cases=[
 ['unpaired screen',endpoint,{method:'GET'},401],
 ['private background upload',origin+'/.netlify/functions/client-kiosk-background?siteId=fixture-never-real',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'},401],
 ['private background deletion',origin+'/.netlify/functions/client-kiosk-background?siteId=fixture-never-real',{method:'DELETE',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'},401],
 ['background foreign origin',origin+'/.netlify/functions/client-kiosk-background?siteId=fixture-never-real',{method:'POST',headers:{Origin:'https://foreign.example.invalid','Content-Type':'application/json'},body:'{}'},403],
 ['unsupported background read',origin+'/.netlify/functions/client-kiosk-background?siteId=fixture-never-real',{method:'GET'},405],
 ['private settings',endpoint+'?action=admin&siteId=fixture-never-real',{method:'GET'},401],
 ['invalid pairing',endpoint,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({action:'pair',id:'invalid',token:'invalid'})},401],
 ['foreign origin',endpoint,{method:'POST',headers:{Origin:'https://foreign.example.invalid','Content-Type':'application/json'},body:JSON.stringify({action:'configure',siteId:'fixture-never-real',enabled:true})},403],
 ['invalid JSON',endpoint,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{bad'},400],
 ['oversized request',endpoint,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'x'.repeat(16001)},413],
 ['unsupported method',endpoint,{method:'DELETE'},405],
 ['private POS operations',origin+'/.netlify/functions/client-pos-settings?siteId=fixture-never-real',{method:'GET'},401],
 ['unauthenticated POS settings write',origin+'/.netlify/functions/client-pos-settings',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({siteId:'fixture-never-real',cashierEnabled:false,displayEnabled:false,profile:'retail',revision:0})},401],
];
for(const [name,url,options,expected] of cases){const response=await fetch(url,{...options,signal:AbortSignal.timeout(15000)});assert.equal(response.status,expected,name);console.log(`PASS kiosk boundary: ${name} ${response.status}`)}
const route=await fetch(origin+'/kiosk',{signal:AbortSignal.timeout(15000)});assert.equal(route.status,200);assert.match(route.headers.get('cache-control')||'',/no-store/);assert.match(route.headers.get('x-robots-tag')||'',/noindex/);assert.equal(route.headers.get('referrer-policy'),'no-referrer');console.log('PASS kiosk route and privacy headers; zero real data writes');
