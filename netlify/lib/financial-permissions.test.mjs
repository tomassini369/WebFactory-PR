import test from 'node:test';
import assert from 'node:assert/strict';
import {financialPermissions,normalizeFinancialPermissions,professionalCredential,FINANCIAL_ROLES,PORTAL_ROLES} from './financial-permissions.mjs';
import {authorizeSiteUser,membershipCapabilities,membershipHasCapability} from './client-auth.mjs';

test('professional titles and browser metadata grant no financial or operational permissions',()=>{
 for(const role of FINANCIAL_ROLES){
  const member={role,capabilities:['accounting.view'],professionalCredential:{status:'verified'}};
  assert.deepEqual(financialPermissions(member),[]);
  assert.equal(membershipHasCapability(member,'pos'),false);
 }
 assert.equal(membershipHasCapability({role:'manager'},'accounting.view'),false);
 assert.equal(membershipHasCapability({role:'owner'},'accounting.access.manage'),true);
 assert.throws(()=>normalizeFinancialPermissions(['accounting.view','*']),{status:400});
});
test('read permission is scoped and cannot create, approve or delegate',()=>{
 const membership={role:'accounting_readonly',financialPermissions:['accounting.view','accounting.access.manage']};
 assert.deepEqual(financialPermissions(membership),['accounting.view']);
 assert.deepEqual(membershipCapabilities(membership),['accounting.view','accounting']);
 for(const permission of ['accounting.entries.create','accounting.entries.approve','accounting.access.manage'])assert.equal(membershipHasCapability(membership,permission),false);
});
test('current membership overrides old valid sessions and cross-tenant JWT metadata',()=>{
 const user={id:'user-a',email:'a@example.com',app_metadata:{webfactory_site_ids:['a','b'],roles:['client']}};
 const membership={email:user.email,role:'accountant',financialPermissions:['accounting.view']};
 assert.equal(authorizeSiteUser(user,{siteId:'a',members:[membership]},PORTAL_ROLES).membership.role,'accountant');
 assert.throws(()=>authorizeSiteUser(user,{siteId:'b',members:[]},PORTAL_ROLES),{status:403});
 for(const revoked of [{revokedAt:'2026-10-20'}, {suspendedAt:'2026-10-20'}, {status:'pending'}, {disabled:true}]){
  assert.deepEqual(financialPermissions({...membership,...revoked}),[]);
  assert.throws(()=>authorizeSiteUser(user,{members:[{...membership,...revoked}]},PORTAL_ROLES),{status:403});
 }
 assert.throws(()=>authorizeSiteUser(user,{deletedAt:'2026-10-20',members:[membership]},PORTAL_ROLES),{status:404});
 assert.throws(()=>authorizeSiteUser(user,{members:[membership]}),{status:403});
});
test('CPA label or self supplied verification cannot confer verified status or permissions',()=>{
 const member={role:'cpa',professionalCredential:{status:'verified',jurisdiction:'PR',licenseNumber:'TEST'}};
 assert.equal(professionalCredential(member).status,'unverified');
 member.professionalCredential={...member.professionalCredential,source:'platform_review',reviewedBy:'independent-reviewer',reviewedAt:'2026-10-20',evidenceReference:'official registry reference',expiresAt:'2027-01-01'};
 assert.equal(professionalCredential(member,Date.parse('2026-10-20')).status,'verified');
 assert.equal(professionalCredential(member,Date.parse('2027-01-02')).status,'expired');
 assert.deepEqual(financialPermissions(member),[]);
});
