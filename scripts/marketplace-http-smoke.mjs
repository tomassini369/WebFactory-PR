import assert from 'node:assert/strict';
const origin=process.env.QA_ORIGIN;
if(!origin)throw Error('QA_ORIGIN required');
const request=(path,options={})=>fetch(origin+'/.netlify/functions/'+path,{...options,signal:AbortSignal.timeout(30000)});
const directory=await request('marketplace-directory');assert.equal(directory.status,200);const data=await directory.json();assert.equal(data.ok,true);assert(Array.isArray(data.entries));
for(const business of data.entries){assert.equal(typeof business.slug,'string');for(const key of ['members','settings','googleCalendar','businessEmail','servicePlan','paymentRules','ownerEmail'])assert.equal(key in business,false)}
const profile=await request('marketplace-profile');assert.equal(profile.status,401);assert.match(profile.headers.get('cache-control'),/no-store/);
const blocked=await request('marketplace-register',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://untrusted.example.invalid'},body:JSON.stringify({email:'qa@example.invalid'})});assert.equal(blocked.status,403);
const invalid=await request('marketplace-register',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({})});assert.equal(invalid.status,400);
const business=await request('marketplace-business?slug=invalid%2Fslug');assert.equal(business.status,404);
console.log('PASS published directory allowlist, unauthenticated profile denial, signup CSRF and validation; no account or business created');
