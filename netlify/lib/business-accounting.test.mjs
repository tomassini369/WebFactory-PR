import test from 'node:test';
import assert from 'node:assert/strict';
import {appendEntry,emptyLedger,accountingReport,reportCsv,day,csvCell} from './business-accounting.mjs';
const site={siteId:'tenant-a',employees:[{id:'e1',name:'Ana'}],catalog:[]};
let sequence=0;
const add=(l,input)=>appendEntry(l,{date:'2026-10-01',id:`record-${++sequence}`,revision:l.revision,...input},site,'owner');
function fixture(){let l=add(emptyLedger(),{type:'rate',employeeId:'e1',hourlyCents:1200});return add(l,{type:'work',employeeId:'e1',regularMinutes:480,overtimeMinutes:60,overtimeHourlyCents:1800,commissionCents:500,tipCents:200});}
test('Salary history is snapshotted; only approved work counts, payment does not double expense',()=>{
 let l=fixture(),work=l.entries.at(-1);assert.equal(work.amountCents,12100);
 assert.equal(accountingReport(l,[],site,'2026-10-01','2026-10-31').summary.salaryCents,0);
 l=add(l,{type:'rate',employeeId:'e1',hourlyCents:2000,date:'2026-10-02'});
 l=add(l,{type:'approve',targetId:work.id});l=add(l,{type:'payment',targetId:work.id,amountCents:6000});
 const r=accountingReport(l,[],site,'2026-10-01','2026-10-31');
 assert.equal(r.employees[0].hourlyCents,2000);assert.equal(r.summary.salaryCents,11900);assert.equal(r.summary.pendingCents,6100);assert.equal(r.work[0].hourlyCents,1200);
 assert.throws(()=>add(l,{type:'payment',targetId:work.id,amountCents:6200}));
 assert.throws(()=>add(l,{type:'void',targetId:work.id,note:'correction'}));
});
test('Validation rejects tampering, lost updates, invalid dates and over-24-hour work',()=>{
 let l=fixture();assert.throws(()=>add(l,{type:'rate',employeeId:'other-tenant',hourlyCents:100}));
 assert.throws(()=>add(l,{type:'rate',employeeId:'e1',hourlyCents:-1,date:'2026-10-02'}));
 assert.throws(()=>add(l,{type:'work',employeeId:'e1',regularMinutes:1440,overtimeMinutes:0,commissionCents:0,tipCents:0}));
 assert.throws(()=>add(l,{type:'rate',employeeId:'e1',hourlyCents:100,revision:0}));
 assert.throws(()=>day('2026-02-30'));assert.throws(()=>accountingReport(l,[],site,'2026-11-01','2026-10-01'));
 const last=l.entries.at(-1);assert.equal(appendEntry(l,{id:last.id},site,'owner'),l);
});
test('Purchases are separate from consumption and sales are deduplicated; refunds visibly estimated',()=>{
 let l=emptyLedger();l=add(l,{type:'expense',category:'inventory_purchase',description:'Stock',amountCents:10000,quantity:10});
 l=add(l,{type:'expense',category:'material_consumption',description:'Used',amountCents:1000,quantity:1});
 const sale={transactionId:'sale-1',employeeId:'e1',paidAt:'2026-10-02T01:00:00Z',paymentStatus:'paid',amountTotal:12000,tax:1000,tip:1000,refundedAmount:6000};
 const r=accountingReport(l,[sale,sale],site,'2026-10-01','2026-10-31');
 assert.equal(r.sales.length,1);assert.equal(r.summary.estimatedRevenueCents,5000);assert.equal(r.summary.purchaseCents,10000);assert.equal(r.summary.estimatedResultCents,4000);assert.equal(r.sales[0].review,true);
});
test('Corrections preserve audit trail and filtered CSV escapes formula injection',()=>{
 let l=add(emptyLedger(),{type:'expense',category:'operations',description:'=HYPERLINK("bad")',amountCents:100,quantity:0});
 const id=l.entries[0].id;l=add(l,{type:'void',targetId:id,note:'mistake'});
 const r=accountingReport(l,[],site,'2026-10-01','2026-10-31');assert.equal(r.summary.operatingCents,0);assert.equal(r.entries.length,2);
 assert.ok(reportCsv(r,l).includes("'=HYPERLINK"));
});

test('CSV preserves numeric negative results without permitting formulas',()=>{assert.equal(csvCell('-12.34'),'\"-12.34\"');assert.ok(csvCell('-HYPERLINK(1)').includes("'-HYPERLINK"));});
