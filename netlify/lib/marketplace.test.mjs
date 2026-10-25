import {consumerConsent,CONSUMER_POLICY_VERSION} from './consumer-policy.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {consumerKey,directoryEntry,discoverableSite,publicConsumer,readDirectory,updateConsumer,recordConsumerConsent} from './marketplace.mjs';
import {consumerRegistration} from './consumer-registration.mjs';
import {authorizeSiteUser} from './client-auth.mjs';
const site=(patch={})=>({siteId:'test-business',slug:'test-business',status:'active',business:{name:'Directory test business',category:'Barbería',locations:[{name:'Local',address:'Arecibo, PR',mapsUrl:'https://maps.google.com/?q=Arecibo'}]},servicePlan:{billingModel:'complimentary'},members:[{email:'private@example.invalid',role:'owner'}],googleCalendar:{refreshToken:'SECRET'},businessEmail:{refreshToken:'SECRET'},catalog:[{id:'service',name:'Published service',price:20,active:true},{id:'hidden',active:false}],...patch});
function memory(){const data=new Map();let rev=0;return {data,get:async key=>data.get(key)?.data||null,getWithMetadata:async key=>data.get(key)||null,setJSON:async(key,value,options)=>{const old=data.get(key);if(options.onlyIfNew&&old||options.onlyIfMatch&&old?.etag!==options.onlyIfMatch)return {modified:false};data.set(key,{data:structuredClone(value),etag:String(++rev)});return {modified:true}}}}
test('directory publishes only eligible storefronts and a strict public allowlist',()=>{
 const entry=directoryEntry(site());assert.equal(entry.name,'Directory test business');assert.deepEqual(entry.municipalities,['Arecibo']);assert.equal(entry.category,'barberias');assert.equal(entry.services.length,1);
 assert(!JSON.stringify(entry).includes('SECRET'));for(const key of ['siteId','members','settings','employees','servicePlan','googleCalendar','businessEmail','paymentRules'])assert.equal(key in entry,false);
 for(const status of ['preview','setup_pending','suspended','deleted'])assert.equal(directoryEntry(site({status})),null);
 assert.equal(discoverableSite(site({deletedAt:'2026-10-23'})),false);assert.equal(discoverableSite(site({servicePlan:{subscriptionStatus:'canceled'}})),false);
 const bad=directoryEntry(site({business:{name:'Test',locations:[{address:'San Juan',mapsUrl:'https://evil.invalid/private'}]}}));assert.equal(bad.locations[0].mapsUrl,'');
});
test('directory filters canonical keys, does not read private stores and reports its scan limit',async()=>{
 const keys=['sites/test-business.json','sites/hidden.json','sites/not-canonical.json'];let reads=0;
 const store={async *list(options){assert.deepEqual(options,{prefix:'sites/',paginate:true});yield {blobs:keys.map(key=>({key}))}},get:async key=>{reads++;return key.includes('hidden')?site({siteId:'hidden',status:'preview'}):site()}};
 const result=await readDirectory(store,{maxSites:2});assert.equal(reads,2);assert.equal(result.entries.length,1);assert.equal(result.truncated,true);
 await assert.rejects(()=>readDirectory(store),/Invalid directory record/);
});
test('consumer storage uses immutable Identity subject, ignores supplied identity and never grants membership',async()=>{
 const store=memory(),a={id:'a',email:'a@example.invalid',name:'A'},b={id:'b',email:'b@example.invalid',name:'B'};
 await recordConsumerConsent(store,a,consumerConsent({adult:true,acceptedTerms:true,policyVersion:CONSUMER_POLICY_VERSION}));
 const profile=await updateConsumer(store,a,{action:'profile',revision:0,name:'Consumer A',municipality:'Arecibo',userId:b.id,role:'admin',members:[{role:'owner'}]},async()=>site());
 assert.equal(profile.name,'Consumer A');assert.equal(profile.revision,1);assert.equal(await store.get(consumerKey(b.id)),null);assert.equal(profile.role,undefined);assert(!consumerKey(a.id).includes(a.email));
 assert.throws(()=>authorizeSiteUser(a,site()),{status:403});assert.deepEqual(publicConsumer(null,b).favorites,[]);
 await assert.rejects(()=>updateConsumer(store,a,{action:'profile',revision:0,name:'stale'},async()=>site()),{status:409});
});
test('favorites validate public entitlement, cap storage and reject stale writes without retrying',async()=>{
 const store=memory(),user={id:'consumer',name:'Consumer'};
 await recordConsumerConsent(store,user,consumerConsent({adult:true,acceptedTerms:true,policyVersion:CONSUMER_POLICY_VERSION}));
 await assert.rejects(()=>updateConsumer(store,user,{action:'favorite',revision:0,slug:'test-business',saved:true},async()=>site({status:'preview'})),{status:404});
 const added=await updateConsumer(store,user,{action:'favorite',revision:0,slug:'test-business',saved:true},async()=>site());assert.deepEqual(added.favorites,['test-business']);
 const removed=await updateConsumer(store,user,{action:'favorite',revision:1,slug:'test-business',saved:false},async()=>{throw Error('Removal must not need a public business')});assert.deepEqual(removed.favorites,[]);
 await assert.rejects(()=>updateConsumer(store,user,{action:'favorite',revision:1,slug:'other',saved:true},async()=>site()),{status:409});
 const conflict={...store,setJSON:async()=>({modified:false})};await assert.rejects(()=>updateConsumer(conflict,user,{action:'profile',revision:2,name:'Concurrent'},async()=>site()),{status:409});
});
const request=(payload,origin='https://preview.example',method='POST')=>new Request('https://preview.example/.netlify/functions/marketplace-register',{method,headers:{Origin:origin,'Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify(payload)}:{})});
test('consumer registration is CSRF protected and forwards only a name, never role or membership',async()=>{
 const calls=[],handler=consumerRegistration({settings:async()=>({disableSignup:false}),signup:async(...args)=>calls.push(args),confirm:async()=>{}}),p={name:'Consumer',email:'USER@example.invalid',password:'a sufficiently long password',acceptedTerms:true,adult:true,policyVersion:CONSUMER_POLICY_VERSION,role:'admin',siteId:'private'};
 assert.equal((await handler(request(p,'https://other.example'))).status,403);assert.equal(calls.length,0);
 assert.equal((await handler(request({...p,password:'short'}))).status,400);assert.equal((await handler(request({...p,acceptedTerms:false}))).status,400);
 const response=await handler(request(p),{});assert.equal(response.status,202);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(calls.length,1);assert.deepEqual(calls[0].slice(0,3),['user@example.invalid',p.password,{full_name:'Consumer'}]);assert(!JSON.stringify(await response.json()).includes(p.password));
});
test('registration preserves disabled provider configuration and bounds confirmation payloads',async()=>{
 let calls=0;const handler=consumerRegistration({settings:async()=>({disableSignup:true}),signup:async()=>calls++,confirm:async()=>calls++});
 assert.equal((await handler(request({name:'Consumer',email:'user@example.invalid',password:'a sufficiently long password',acceptedTerms:true,adult:true,policyVersion:CONSUMER_POLICY_VERSION}))).status,503);assert.equal(calls,0);
 assert.equal((await handler(request({action:'confirm',token:'x'.repeat(2049)}))).status,400);
 assert.equal((await handler(request({action:'confirm',token:'valid-test-token'}))).status,200);assert.equal(calls,1);
 assert.equal((await handler(request(null,'https://preview.example','GET'))).status,405);
});

test('adult eligibility and current-version consent fail closed without collecting birth dates',async()=>{
 const calls=[],handler=consumerRegistration({settings:async()=>({disableSignup:false}),signup:async()=>{calls.push('signup');return {id:'new'}},recordConsent:async(user,receipt)=>calls.push(receipt)});
 const p={name:'Adult',email:'adult@example.invalid',password:'long enough test password',acceptedTerms:true,adult:true,policyVersion:CONSUMER_POLICY_VERSION};
 for(const patch of [{adult:false},{adult:'true'},{policyVersion:'old'},{acceptedTerms:false}])assert.equal((await handler(request({...p,...patch}),{})).status,400);
 assert.equal(calls.length,0);assert.equal((await handler(request(p),{})).status,202);assert.equal(calls[1].version,CONSUMER_POLICY_VERSION);assert.equal(calls[1].adult,true);assert(!JSON.stringify(calls).includes('birth'));assert(Number.isFinite(Date.parse(calls[1].acceptedAt)));
});
test('legacy profiles require acceptance; deletion and minor review erase profile PII with scoped CAS',async()=>{
 const store=memory(),a={id:'private-a'},b={id:'private-b'};
 await store.setJSON(consumerKey(a.id),{name:'Legacy private name',municipality:'Arecibo',favorites:['test-business'],revision:0},{onlyIfNew:true});
 assert.deepEqual(publicConsumer((await store.get(consumerKey(a.id))),a).favorites,[]);
 await assert.rejects(()=>updateConsumer(store,a,{action:'favorite',slug:'test-business',saved:true,revision:0},async()=>site()),{status:403});
 await updateConsumer(store,a,{action:'accept_policy',adult:true,acceptedTerms:true,policyVersion:CONSUMER_POLICY_VERSION,revision:0},async()=>site());
 await updateConsumer(store,a,{action:'profile',name:'Private',municipality:'Arecibo',revision:1},async()=>site());
 await updateConsumer(store,a,{action:'minor_review',confirmation:'REVIEW MINOR',revision:2,userId:b.id},async()=>site());
 let record=await store.get(consumerKey(a.id));assert.equal(record.name,'');assert.equal(record.municipality,'');assert.deepEqual(record.favorites,[]);assert.equal(record.status,'minor_review');assert.equal(await store.get(consumerKey(b.id)),null);
 await assert.rejects(()=>updateConsumer(store,a,{action:'accept_policy',adult:true,acceptedTerms:true,policyVersion:CONSUMER_POLICY_VERSION,revision:3},async()=>site()),{status:403});
 await updateConsumer(store,a,{action:'delete_profile',confirmation:'DELETE PROFILE',revision:3},async()=>site());
 assert.equal((await store.get(consumerKey(a.id))).status,'minor_review','deletion cannot erase an eligibility restriction');
 await assert.rejects(()=>updateConsumer(store,a,{action:'delete_profile',confirmation:'DELETE PROFILE',revision:3},async()=>site()),{status:409});
});
test('self-service profile deletion erases consumer fields and reacceptance never trusts browser timestamps or privileges',async()=>{
 const store=memory(),user={id:'self-delete'};
 await updateConsumer(store,user,{action:'accept_policy',revision:0,adult:true,acceptedTerms:true,policyVersion:CONSUMER_POLICY_VERSION,acceptedAt:'1900-01-01',role:'admin'},async()=>site());
 const receipt=(await store.get(consumerKey(user.id))).consent;assert.notEqual(receipt.acceptedAt,'1900-01-01');assert.equal(receipt.version,CONSUMER_POLICY_VERSION);
 await updateConsumer(store,user,{action:'profile',revision:1,name:'Erase this name',municipality:'Arecibo'},async()=>site());
 await assert.rejects(()=>updateConsumer(store,user,{action:'delete_profile',revision:2,confirmation:'wrong'},async()=>site()),{status:400});
 const result=await updateConsumer(store,user,{action:'delete_profile',revision:2,confirmation:'DELETE PROFILE'},async()=>site());
 assert.equal(result.needsAcceptance,true);assert.equal(result.name,'');assert.deepEqual(result.favorites,[]);
 const deleted=await store.get(consumerKey(user.id));assert.equal(deleted.status,'deleted');assert(!JSON.stringify(deleted).includes('Erase this name'));assert.equal(deleted.consent,undefined);
});
