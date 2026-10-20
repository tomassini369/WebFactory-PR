import {financialPermissions,PORTAL_ROLES} from './financial-permissions.mjs';
export {PORTAL_ROLES};
const deny=()=>{throw Object.assign(new Error('Financial permission required / Se requiere autorización financiera.'),{status:403})};
export function requireAccountingAction(membership,type){
 const permissions=financialPermissions(membership),has=permission=>permissions.includes(permission);
 if(!has('accounting.view'))deny();
 if(type==='csv'){if(!has('accounting.reports.export'))deny();return;}
 if(!type)return;
 if(type==='financial_approval'||type==='approve'){if(!has('accounting.entries.approve'))deny();}
 else if(type==='void'){if(!has('accounting.entries.edit'))deny();}
 else if(!has('accounting.entries.create'))deny();
 if(['rate','work','attendance_import','payment','approve'].includes(type)){
  if(!has('payroll.view')||!has(type==='approve'||type==='payment'?'payroll.approve':'payroll.prepare'))deny();
 }
}
export function privateAccountingReport(report,ledger,membership){
 if(financialPermissions(membership).includes('payroll.view'))return{report,ledger};
 // Redact before JSON and CSV serialization. Do not leak wages through a
 // derived total, approval target, note, rate-history export or ledger object.
 const summary={...report.summary};
 for(const key of ['salaryCents','estimatedResultCents','regularMinutes','overtimeMinutes','paidCents','pendingCents'])delete summary[key];
 const allowedIds=new Set(ledger.entries.filter(entry=>['expense','allocation'].includes(entry.type)).map(entry=>entry.id));
 const visible=entry=>allowedIds.has(entry.id)||['financial_approval','void'].includes(entry.type)&&allowedIds.has(entry.targetId);
 const entries=report.entries.filter(visible);
 return{report:{...report,summary,employees:[],work:[],entries},ledger:{...ledger,entries:ledger.entries.filter(visible)}};
}
