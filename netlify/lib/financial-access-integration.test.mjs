import test from 'node:test';import assert from 'node:assert/strict';
import {createAccountingHandler} from '../functions/client-business-accounting.mjs';
import {createWorkforceHandler} from '../functions/client-workforce.mjs';
import {recordFinancialAudit,financialAuditHistory} from './financial-audit.mjs';
import {financialPortalSite,operationalPortalSite} from './financial-portal.mjs';
import {emptyWorkforce,transitionWorkforce,workforceView} from './workforce.mjs';
const user={id:'professional',email:'professional@example.invalid'},site={siteId:'a',revision:1,business:{name:'Isolated'},employees:[{id:'e',name:'Employee QA',active:true}],settings:{timezone:'America/Puerto_Rico'},members:[],catalog:[],accountingAccess:{invitations:[{tokenHash:'private'}]}};
test('financial portal DTO excludes customer, integration, membership and private employee fields',()=>{
 const source={...site,employees:[{id:'e',name:'Employee QA',privateSalary:99999}],paymentRules:{stripeSecret:'private'},businessEmail:{token:'private'},stockReservations:{private:true}};
 const safe=financialPortalSite(source,{role:'accountant',financialPermissions:['accounting.view']});
 assert.deepEqual(safe.employees,[]);assert.equal(JSON.stringify(safe).includes('private'),false);assert.equal(safe.accountingAccess,undefined);
 assert.equal(operationalPortalSite(source,{role:'employee'}).accountingAccess,undefined);
});
test('HTTP financial read/export/write permissions are checked before any storage access',async()=>{
 const membership={role:'accounting_readonly',financialPermissions:['accounting.view']};
 let reads=0;const handler=createAccountingHandler({authorize:async()=>({site,user,membership}),getStore:()=>{reads++;throw Error('Unexpected storage access')}});
 const post=new Request('https://example.invalid/api',{method:'POST',headers:{origin:'https://example.invalid'},body:JSON.stringify({siteId:'a',type:'expense'})});
 assert.equal((await handler(post)).status,403);
 assert.equal((await handler(new Request('https://example.invalid/api?siteId=a&format=csv'))).status,403);assert.equal(reads,0);
});
test('financial audit records authenticated actors using conditional unique writes, and fails closed',async()=>{
 const rows=new Map(),store={setJSON:async(key,value,options)=>{assert.deepEqual(options,{onlyIfNew:true});rows.set(key,value);return{modified:true}},list:async function*(){yield{blobs:[...rows.keys()].map(key=>({key}))}},get:async key=>rows.get(key)};
 await recordFinancialAudit(store,{siteId:'a',user,action:'view'});await recordFinancialAudit(store,{siteId:'a',user,action:'export'});
 assert.equal((await financialAuditHistory(store,'a')).length,2);
 await assert.rejects(financialAuditHistory(store,'b'),{status:403});
 await assert.rejects(recordFinancialAudit({...store,setJSON:async()=>({modified:false})},{siteId:'a',user,action:'view'}),{status:503});
});
test('attendance professionals can view/approve only explicitly granted business records, never configure or clock for another user',async()=>{
 let state={...emptyWorkforce('a'),enabled:true,shifts:[{id:'shift-a',employeeId:'e',userId:'employee-user',locationId:'',start:'2026-10-20T12:00:00Z',end:'2026-10-20T13:00:00Z',breaks:[],paidBreaks:false}]};
 const membership={role:'accountant',financialUserId:user.id,financialPermissions:['attendance.view']};
 assert.equal(workforceView(state,site,user,membership).shifts.length,1);assert.equal(workforceView(state,site,user,membership).admin,false);
 const branches={...site,business:{...site.business,locations:[{id:'branch-a',name:'Authorized branch'}]}};assert.deepEqual(workforceView(state,branches,user,membership).locations.map(location=>location.name),['Authorized branch']);
 const input={action:'approve',shiftId:'shift-a',operationId:'approval-123'};
 assert.throws(()=>transitionWorkforce(state,input,site,user,membership),{status:403});
 membership.financialPermissions.push('attendance.approve');state=transitionWorkforce(state,input,site,user,membership).state;assert.ok(state.shifts[0].approvedAt);
 assert.throws(()=>transitionWorkforce(state,{action:'configure',enabled:false,paidBreaks:false,operationId:'configure-123'},site,user,membership),{status:403});
 const handler=createWorkforceHandler({authorize:async()=>({site,user,membership}),getStore:()=>({get:async()=>state})});
 const request=new Request('https://example.invalid/api',{method:'POST',headers:{origin:'https://example.invalid'},body:JSON.stringify({siteId:'a',action:'clock_in',employeeId:'e',operationId:'clock-in-123'})});assert.equal((await handler(request)).status,403);
 assert.throws(()=>transitionWorkforce({...state,enabled:false},{...input,operationId:'disabled-123'},site,user,membership),{status:403});
});

test('changing email cannot let a preparer approve their own work through the accounting API',async()=>{
 let writes=0;
 const ledger={version:1,siteId:'a',revision:1,entries:[{id:'work-subject-123',type:'work',date:'2026-10-20',createdBy:'old-email@example.invalid',createdById:user.id}]};
 const membership={role:'accountant',financialUserId:user.id,financialPermissions:['accounting.view','accounting.entries.approve','payroll.view','payroll.approve']};
 const handler=createAccountingHandler({authorize:async()=>({site,user,membership}),audit:async()=>{},getStore:()=>({getWithMetadata:async()=>({data:ledger,etag:'1'}),setJSON:async()=>{writes++;return{modified:true}}})});
 const request=new Request('https://example.invalid/api',{method:'POST',headers:{origin:'https://example.invalid'},body:JSON.stringify({siteId:'a',id:'approval-subject-123',revision:1,type:'approve',targetId:'work-subject-123',date:'2026-10-20'})});
 assert.equal((await handler(request)).status,403);assert.equal(writes,0);
 delete ledger.entries[0].createdById;
 const legacyRequest=new Request('https://example.invalid/api',{method:'POST',headers:{origin:'https://example.invalid'},body:JSON.stringify({siteId:'a',id:'legacy-approval-123',revision:1,type:'approve',targetId:'work-subject-123',date:'2026-10-20'})});
 assert.equal((await handler(legacyRequest)).status,403,'Legacy author attribution requires owner review, rather than guessing a subject from email');assert.equal(writes,0);
});
