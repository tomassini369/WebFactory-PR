import {createProfessionalHandler} from '../functions/client-professional.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {authorizeSiteUser,membershipHasCapability} from './client-auth.mjs';
import {commercialCapabilities,employeeSiteView,employeeCommerceRecord,assertCommerceAction,assertPosLocation} from './commercial-access.mjs';
import {changeCommercialMember} from './commercial-members.mjs';
import {createMemberAccessHandler} from '../functions/client-member-access.mjs';
import {createCommerceAdminHandler} from '../functions/client-commerce-admin.mjs';
const owner={email:'owner@example.invalid',role:'owner'},user={id:'user-a',email:'a@example.invalid'};
const employee={email:user.email,userId:user.id,role:'employee',employeeId:'p1',locationIds:['one'],permissions:{}};
const fixture=()=>({siteId:'business-a',slug:'business-a',revision:3,members:[owner,structuredClone(employee)],business:{name:'Fixture',locations:[{id:'one',name:'One'},{id:'two',name:'Two'}]},employees:[{id:'p1',name:'Ana',active:true,serviceIds:['s1'],locationIds:['one'],calendarId:'private-calendar',schedule:{}},{id:'p2',name:'Beto',serviceIds:['s2'],locationIds:['two']}],catalog:[{id:'s1',type:'service',active:true},{id:'s2',type:'service',active:true}],paymentRules:{stripeConnectedAccountId:'private-provider',ath:{privateKey:'private'}},membershipAudit:[],googleCalendar:{secret:'private'},businessEmail:{token:'private'},servicePlan:{stripeCustomerId:'private'},settings:{timezone:'America/Puerto_Rico'}});
const booking=(patch={})=>({transactionId:'booking-one',siteId:'business-a',kind:'booking',employeeId:'p1',locationId:'one',status:'confirmed',paymentStatus:'due',customer:{name:'Customer',email:'necessary@example.invalid',phone:'7870000000'},items:[],calendarToken:'private-link',bookingPin:'private-pin',stripePaymentIntentId:'private-provider',amountTotal:2500,...patch});
const req=input=>new Request('https://example.invalid/api',{method:'POST',headers:{origin:'https://example.invalid','Content-Type':'application/json'},body:JSON.stringify(input)});
test('only owner and employee are commercial roles; legacy roles cannot re-enter through explicit old allowlists',()=>{
 for(const role of ['manager','cashier','staff','accountant','cpa','payroll_manager','financial_approver','admin']){
  assert.throws(()=>authorizeSiteUser(user,{...fixture(),members:[{...employee,role}]},['owner',role]),{status:403});
  if(role!=='admin')assert.deepEqual(commercialCapabilities({role,permissions:{pos:true,collect:true}}),[]);
 }
 assert.deepEqual(commercialCapabilities(employee),['overview','bookings']);
 assert.equal(membershipHasCapability({...employee,permissions:{pos:true}},'collect'),false);
 assert.equal(membershipHasCapability({...employee,permissions:{collect:true}},'pos'),false);
 for(const grant of ['pos','collect','orders','kitchen','individualStats','availabilityRequests']){
  const member={...employee,permissions:{[grant]:true}};assert(membershipHasCapability(member,grant));
  for(const denied of ['billing','refunds','payments','settings','employees','catalog','customers'])assert(!membershipHasCapability(member,denied),grant+':'+denied);
 }
});
test('bound identity, current revocation, deleted tenants and another tenant deny a still-valid identity',()=>{
 assert.equal(authorizeSiteUser(user,fixture()).membership.employeeId,'p1');
 for(const site of [{...fixture(),members:[owner]},{...fixture(),status:'deleted'},{...fixture(),members:[{...employee,userId:'different-user'}]},{...fixture(),members:[{...employee,revokedAt:'now'}]},{...fixture(),members:[{...employee,suspendedAt:'now'}]}])assert.throws(()=>authorizeSiteUser(user,site),{status:403});
});
test('employee record authorization precedes every action and never treats POS as payment administration',()=>{
 const site=fixture();assert.doesNotThrow(()=>assertCommerceAction(site,employee,booking(),'complete'));
 for(const record of [booking({employeeId:'p2'}),booking({locationId:'two'}),booking({siteId:'business-b'})])for(const action of ['complete','preview_confirmation','mark_paid','refund'])assert.throws(()=>assertCommerceAction(site,employee,record,action),{status:403});
 for(const action of ['preview_confirmation','mark_paid','refund','cancel','sync_calendar','invite_customer'])assert.throws(()=>assertCommerceAction(site,employee,booking(),action),{status:403});
 assert.doesNotThrow(()=>assertCommerceAction(site,{...employee,permissions:{collect:true}},booking(),'mark_paid'));
 assert.throws(()=>assertCommerceAction(site,{...employee,permissions:{pos:true}},booking(),'mark_paid'),{status:403});
 assert.throws(()=>assertPosLocation(site,employee,{locationId:'two'}),{status:403});
});
test('employee responses contain no other professionals, member list, financial integrations, PINs or management tokens',()=>{
 const view=employeeSiteView(fixture(),employee),record=employeeCommerceRecord(booking(),employee),serialized=JSON.stringify({view,record});
 assert.deepEqual(view.employees.map(employee=>employee.id),['p1']);assert.deepEqual(view.catalog.map(item=>item.id),['s1']);
 for(const forbidden of ['private','servicePlan','googleCalendar','businessEmail','membershipAudit','stripePaymentIntentId','calendarToken','bookingPin','amountTotal','p2'])assert(!serialized.includes(forbidden),forbidden);
 assert.equal(record.customer.email,'necessary@example.invalid');
});
test('professional creation requires no portal membership or wages; owner can bind their existing account',()=>{
 const site=fixture();site.members=[owner];site.employees.push({id:'owner-professional',active:true,locationIds:['one']});
 const next=changeCommercialMember(site,{action:'configure',revision:3,email:owner.email,employeeId:'owner-professional',locationIds:['one']},{membership:owner,user:{id:'owner-id'}},{id:'owner-id',email:owner.email});
 assert.equal(next.members[0].role,'owner');assert.equal(next.members[0].employeeId,'owner-professional');assert.equal(next.employees.length,3);
});
test('legacy migration needs owner confirmation, never becomes owner, is audited/reversible and rejects stale revisions',()=>{
 const site=fixture();site.members[1]={...employee,role:'manager'};const actor={membership:owner,user:{id:'owner-id'}},identity=user;
 const input={action:'migrate',revision:3,email:user.email,employeeId:'p1',locationIds:['one'],permissions:{pos:true,billing:true}};
 assert.throws(()=>changeCommercialMember(site,input,actor,identity),{status:409});
 const next=changeCommercialMember(site,{...input,confirmLegacy:true},actor,identity);const member=next.members.find(member=>member.email===user.email);
 assert.equal(member.role,'employee');assert.equal(member.permissions.pos,true);assert(!member.permissions.billing);assert.equal(next.membershipAudit.length,1);
 assert.throws(()=>changeCommercialMember(next,{...input,confirmLegacy:true},actor,identity),{status:409});
 const restored=changeCommercialMember(next,{action:'undo_migration',email:user.email,revision:4,migrationId:next.membershipAudit[0].id},actor);
 assert.equal(restored.members.find(member=>member.email===user.email).role,'manager');assert.throws(()=>authorizeSiteUser(user,restored),{status:403});
 assert.throws(()=>changeCommercialMember(site,{...input,confirmLegacy:true},{membership:employee,user},identity),{status:403});
});
test('HTTP invitations use owner-authorized stable identity, default all grants off, preserve professional IDs and revoke current access',async()=>{
 let site=fixture();site.members=[owner];let deliveries=0;
 const handler=createMemberAccessHandler({authorize:async()=>({site,user:{id:'owner-id'},membership:owner}),findUser:async email=>({id:user.id,email}),save:async next=>(site=next),sendInvite:async()=>{deliveries++}});
 let response=await handler(req({siteId:site.siteId,revision:3,action:'invite',email:user.email,employeeId:'p1'}));assert.equal(response.status,200);assert.equal(deliveries,1);assert.equal(site.members[1].userId,user.id);assert(Object.values(site.members[1].permissions).every(value=>value===false));
 assert.equal(authorizeSiteUser(user,site).membership.employeeId,'p1');
 response=await handler(req({siteId:site.siteId,revision:4,action:'revoke',email:user.email}));assert.equal(response.status,200);assert.throws(()=>authorizeSiteUser(user,site),{status:403});assert.equal(site.employees.length,2);assert.equal(site.membershipAudit.length,2);
});
test('HTTP commerce GET scopes bookings by professional and branch before serializing; previews of another record are forbidden',async()=>{
 const site=fixture(),rows=[booking(),booking({transactionId:'other-person',employeeId:'p2'}),booking({transactionId:'other-branch',locationId:'two'})];
 const store={list:async({prefix})=>({blobs:prefix.includes('/bookings/')?rows.map((_,i)=>({key:String(i)})):[]}),get:async key=>/^\d$/.test(key)?rows[Number(key)]:rows[1]};
 const access={site,user,membership:employee};
 const handler=createCommerceAdminHandler({authorizeAccess:async()=>access,authorizeCapability:async()=>access,getStore:()=>store,pendingSales:async()=>[]});
 const response=await handler(new Request('https://example.invalid/api?siteId=business-a'));const body=await response.json();assert.equal(response.status,200);assert.equal(body.bookings.length,1);assert(!JSON.stringify(body).includes('private'));assert.equal(body.orders.length,0);
 const preview=await handler(req({siteId:site.siteId,kind:'booking',action:'preview_confirmation',transactionId:'other-person'}));assert.equal(preview.status,403);
 const paid=await handler(req({siteId:site.siteId,kind:'booking',action:'mark_paid',transactionId:'booking-one'}));assert.equal(paid.status,403);
});

test('availability requests bind authenticated profile and server time; forbidden identities and duplicate retries never create extra requests',async()=>{
 const site=fixture(),member={...employee,permissions:{availabilityRequests:true}},rows=new Map();
 const store={setJSON:async(key,row,{onlyIfNew})=>{if(onlyIfNew&&rows.has(key))return {modified:false};rows.set(key,row);return {modified:true}},get:async key=>rows.get(key),list:async function*({prefix}){yield {blobs:[...rows.keys()].filter(key=>key.startsWith(prefix)).map(key=>({key}))}}};
 const handler=createProfessionalHandler({authorize:async()=>({site,user,membership:member}),getStore:()=>store,clock:()=> '2026-10-21T12:00:00Z'}),input={siteId:site.siteId,id:'availability-request-one',start:'2028-01-01',end:'2028-01-02',now:'2099-01-01'};
 for(const result of await Promise.all(Array.from({length:8},()=>handler(req(input)))))assert.equal(result.status,200);
 assert.equal(rows.size,1);assert.equal([...rows.values()][0].employeeId,'p1');assert.equal([...rows.values()][0].createdAt,'2026-10-21T12:00:00Z');
 assert.equal((await handler(req({...input,employeeId:'p2'}))).status,403);
 const other=createProfessionalHandler({authorize:async()=>({site,user:{...user,id:'other'},membership:{...member,employeeId:'p2'}}),getStore:()=>store});const response=await other(new Request('https://example.invalid/api?siteId='+site.siteId));assert.deepEqual((await response.json()).requests,[]);
});

test('owner reviews availability requests with CAS; employees cannot approve their own requests',async()=>{
 const site=fixture(),key=site.siteId+'/availability-requests/request-one.json';let saved={siteId:site.siteId,id:'request-one',employeeId:'p1',status:'pending'},writes=0;
 const store={getWithMetadata:async requested=>{assert.equal(requested,key);return {data:saved,etag:'revision-one'}},setJSON:async(requested,row,options)=>{assert.equal(requested,key);assert.equal(options.onlyIfMatch,'revision-one');saved=row;writes++;return {modified:true}}};
 const access=membership=>({site,user,membership}),make=membership=>createProfessionalHandler({authorize:async()=>access(membership),getStore:()=>store,clock:()=> '2026-10-21T12:00:00Z'});
 assert.equal((await make({...employee,permissions:{availabilityRequests:true}})(req({siteId:site.siteId,action:'review',id:'request-one'}))).status,403);assert.equal(writes,0);
 assert.equal((await make(owner)(req({siteId:site.siteId,action:'review',id:'request-one'}))).status,200);assert.equal(saved.status,'reviewed');assert.equal(saved.reviewedBy,user.id);assert.equal(writes,1);
});

test('a failed invitation can be resent without changing the existing identity, profile or grants',async()=>{
 let site=fixture(),attempts=0;site.members=[owner];
 const handler=createMemberAccessHandler({authorize:async()=>({site,user:{id:'owner-id'},membership:owner}),findUser:async email=>({id:user.id,email}),save:async next=>(site=next),sendInvite:async()=>{if(++attempts===1)throw Error('Isolated delivery failure')}});
 const first=await handler(req({siteId:site.siteId,revision:3,action:'invite',email:user.email,employeeId:'p1'}));assert.equal(first.status,200);assert.equal((await first.json()).invitationSent,false);const before=structuredClone(site.members.find(member=>member.email===user.email));
 const retry=await handler(req({siteId:site.siteId,revision:4,action:'resend_invite',email:user.email}));assert.equal(retry.status,200);assert.equal((await retry.json()).invitationSent,true);assert.deepEqual(site.members.find(member=>member.email===user.email),before);
});
test('employee appointment discovery filters every page before applying the bounded history limit',async()=>{
 const site=fixture(),access={site,user,membership:employee},own=booking(),foreign=Array.from({length:260},(_,i)=>booking({transactionId:'foreign-'+i,employeeId:'p2'}));
 const store={list:async function*({prefix}){if(prefix.includes('/bookings/')){yield {blobs:foreign.map((_,i)=>({key:String(i)}))};yield {blobs:[{key:'own'}]}}},get:async key=>key==='own'?own:foreign[Number(key)]};
 const handler=createCommerceAdminHandler({authorizeAccess:async()=>access,getStore:()=>store,pendingSales:async()=>[]});
 const response=await handler(new Request('https://example.invalid/api?siteId='+site.siteId));assert.equal(response.status,200);assert.deepEqual((await response.json()).bookings.map(record=>record.transactionId),['booking-one']);
});
