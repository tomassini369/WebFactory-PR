import test from 'node:test';
import assert from 'node:assert/strict';
import {changeAccountingAccess,accessView,protectAccountingState,verifyAccessAudit} from './accounting-access.mjs';
import {createAccountingAccessHandler} from '../functions/client-accounting-access.mjs';
import {authorizeSiteUser} from './client-auth.mjs';
import {PORTAL_ROLES,financialPermissions} from './financial-permissions.mjs';
const owner={id:'owner-id',email:'owner@example.com'},accountant={id:'accountant-id',email:'accountant@example.com'};
const business=id=>({siteId:id,slug:id,revision:0,members:[{email:owner.email,role:'owner'}],business:{name:'Test business'}});
const token='A'.repeat(43),now=Date.parse('2026-10-20T12:00:00Z');
const invite=(site,permissions=['accounting.view'])=>changeAccountingAccess(site,{action:'invite',revision:site.revision,email:accountant.email,role:'accountant',permissions},owner,{token,now});
const accept=site=>changeAccountingAccess(site,{action:'accept',token},accountant,{now});

test('invitation confers no access before same-email authenticated single-use acceptance',()=>{
 const pending=invite(business('a'));
 assert.equal(pending.members.length,1);assert.equal(JSON.stringify(accessView(pending)).includes('tokenHash'),false);
 assert.throws(()=>authorizeSiteUser(accountant,pending,PORTAL_ROLES),{status:403});
 assert.throws(()=>changeAccountingAccess(pending,{action:'accept',token},{...accountant,email:'other@example.com'},{now}),{status:403});
 const accepted=accept(pending);
 assert.deepEqual(financialPermissions(authorizeSiteUser(accountant,accepted,PORTAL_ROLES).membership),['accounting.view']);
 assert.throws(()=>accept(accepted),{status:403});
 assert.throws(()=>changeAccountingAccess(pending,{action:'accept',token},accountant,{now:now+8*86400000}),{status:403});
 assert.ok(verifyAccessAudit(accepted.accountingAccess.audit));
 const tampered=structuredClone(accepted.accountingAccess.audit);tampered[0].permissions.push('payroll.approve');assert.equal(verifyAccessAudit(tampered),false);
});
test('multi-business grants are independent and revocation denies an existing identity session',()=>{
 const a=accept(invite(business('a'))),b=accept(invite(business('b'),['accounting.view','accounting.entries.create']));
 const revoked=changeAccountingAccess(a,{action:'revoke',email:accountant.email,revision:a.revision},owner,{now});
 assert.throws(()=>authorizeSiteUser(accountant,revoked,PORTAL_ROLES),{status:403});
 assert.equal(authorizeSiteUser(accountant,b,PORTAL_ROLES).membership.financialPermissions.length,2);
 assert.throws(()=>changeAccountingAccess(b,{action:'update',email:accountant.email,role:'cpa',permissions:['accounting.access.manage']},owner,{now}),{status:400});
 assert.throws(()=>changeAccountingAccess(b,{action:'revoke',email:owner.email},accountant,{now}),{status:403});
});
test('legacy team forms cannot erase, forge or replace financial permissions or audit',()=>{
 const site=accept(invite(business('a'))),next=structuredClone(site);
 assert.doesNotThrow(()=>protectAccountingState(site,next));
 next.members[1].financialPermissions.push('payroll.approve');assert.throws(()=>protectAccountingState(site,next),{status:403});
 const removed={...site,members:[site.members[0]]};assert.throws(()=>protectAccountingState(site,removed),{status:409});
 assert.throws(()=>protectAccountingState(site,{...site,accountingAccess:{}}),{status:403});
 assert.throws(()=>protectAccountingState(business('a'),{...business('a'),members:[...business('a').members,{email:accountant.email,role:'accountant'}]}),{status:403});
});
test('revoking a hybrid financial grant preserves the original operational membership',()=>{
 const site=business('a');site.members.push({email:accountant.email,role:'cashier'});
 const accepted=accept(invite(site));assert.equal(accepted.members[1].role,'cashier');
 const revoked=changeAccountingAccess(accepted,{action:'revoke',email:accountant.email},owner,{now});
 assert.equal(authorizeSiteUser(accountant,revoked).membership.role,'cashier');assert.deepEqual(financialPermissions(revoked.members[1]),[]);
});
test('CPA evidence requires an independent platform reviewer and never changes grants',()=>{
 let site=accept(invite(business('a')));
 site=changeAccountingAccess(site,{action:'credential_submit',email:accountant.email,jurisdiction:'PR',licenseNumber:'TEST-ONLY'},owner,{now});
 assert.equal(accessView(site).members[0].credential.status,'unverified');
 const input={action:'credential_review',email:accountant.email,status:'verified',evidenceReference:'Official registry reviewed manually'};
 assert.throws(()=>changeAccountingAccess(site,input,owner,{now}),{status:403});
 assert.throws(()=>changeAccountingAccess(site,input,accountant,{now,platformAdmin:true}),{status:403});
 assert.throws(()=>changeAccountingAccess(site,input,{...accountant,email:'changed-email@example.com'},{now,platformAdmin:true}),{status:403},'The same Identity subject cannot review its own license after an email change');
 site=changeAccountingAccess(site,input,{id:'reviewer-id',email:'reviewer@example.com'},{now,platformAdmin:true});
 assert.equal(accessView(site).members[0].credential.status,'verified');assert.deepEqual(site.members[1].financialPermissions,['accounting.view']);
});
test('HTTP invitation delivery failure is explicit; no raw token is returned or access granted',async()=>{
 let site=business('a'),sent;
 const handler=createAccountingAccessHandler({authorize:async()=>({site,user:owner,membership:site.members[0]}),save:async next=>{site=next;return next},ensureIdentity:async()=>{},mailReady:()=>true,deliver:async message=>{sent=message;throw Error('do not log this provider secret')},clock:()=>now,randomToken:()=>token});
 const req=new Request('https://example.com/.netlify/functions/client-accounting-access',{method:'POST',headers:{origin:'https://example.com'},body:JSON.stringify({siteId:'a',action:'invite',revision:0,email:accountant.email,role:'accountant',permissions:['accounting.view']})});
 const response=await handler(req),data=await response.json();assert.equal(response.status,202);assert.equal(data.invitationSent,false);assert.equal(JSON.stringify(data).includes(token),false);assert.equal(site.members.length,1);assert.ok(sent.text.includes('#accountingSite=a&accountingInvite='));
});
test('HTTP boundary rejects CSRF, stale writes and concurrent acceptance without retrying a grant',async()=>{
 let writes=0;const site=invite(business('a'));
 const handler=createAccountingAccessHandler({currentUser:async()=>accountant,load:async()=>site,save:async()=>{writes++;throw Object.assign(Error('Concurrent change'),{status:409})},clock:()=>now});
 const req=origin=>new Request('https://example.com/api',{method:'POST',headers:{origin},body:JSON.stringify({siteId:'a',action:'accept',token})});
 assert.equal((await handler(req('https://foreign.test'))).status,403);assert.equal(writes,0);
 assert.equal((await handler(req('https://example.com'))).status,409);assert.equal(writes,1);
});
