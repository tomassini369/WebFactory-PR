import test from 'node:test';
import assert from 'node:assert/strict';
import {requireAccountingAction,privateAccountingReport} from './accounting-policy.mjs';
import {appendEntry,activeEntries,emptyLedger,reportCsv} from './business-accounting.mjs';
const site={employees:[]};
test('read-only delegates cannot write, approve or export without separate permissions',()=>{
 const member={role:'accounting_readonly',financialPermissions:['accounting.view']};
 assert.doesNotThrow(()=>requireAccountingAction(member,''));
 for(const type of ['expense','rate','work','payment','void','approve','financial_approval','csv'])assert.throws(()=>requireAccountingAction(member,type),{status:403});
 assert.throws(()=>requireAccountingAction({role:'accountant',financialPermissions:['accounting.view','accounting.entries.create']},'rate'),{status:403});
});
test('unauthorized wages are absent from JSON, aggregate totals and CSV rate histories',()=>{
 const entry={id:'private-rate',type:'rate',date:'2026-10-01',hourlyCents:985321,note:'private wage note'};
 const report={from:'2026-10-01',to:'2026-10-30',summary:{salaryCents:985321,estimatedResultCents:500,operatingCents:10},inventory:[],employees:[entry],work:[entry],entries:[entry],expenses:[],sales:[]};
 const safe=privateAccountingReport(report,{entries:[entry]},{role:'accountant',financialPermissions:['accounting.view','accounting.reports.export']});
 for(const content of [JSON.stringify(safe.report),reportCsv(safe.report,safe.ledger)]){assert.equal(content.includes('985321'),false);assert.equal(content.includes('private wage'),false);}
 assert.equal(safe.report.summary.salaryCents,undefined);assert.equal(safe.report.summary.estimatedResultCents,undefined);
});
test('delegated expenses remain drafts until a different authorized actor approves them',()=>{
 const input={id:'expense-123',revision:0,type:'expense',date:'2026-10-20',category:'operations',amountCents:1000,description:'Isolated test expense',quantity:0};
 const draft=appendEntry(emptyLedger(),input,site,'preparer',undefined,{requiresApproval:true});
 assert.equal(activeEntries(draft).length,0);
 const approval={id:'approval-123',revision:1,type:'financial_approval',date:input.date,targetId:input.id};
 assert.throws(()=>appendEntry(draft,approval,site,'preparer'),{status:403});
 const approved=appendEntry(draft,approval,site,'approver');assert.equal(activeEntries(approved).filter(e=>e.type==='expense').length,1);
 assert.throws(()=>appendEntry(approved,{...approval,id:'approval-other',revision:2},site,'approver'),{status:409});
 assert.equal(appendEntry(approved,input,site,'preparer'),approved);
 assert.throws(()=>appendEntry(approved,{...input,amountCents:2000},site,'preparer'),{status:409});
});
