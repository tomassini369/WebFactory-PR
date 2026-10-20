// Professional titles are labels. Only explicit, current tenant grants confer
// financial permissions; CPA verification never grants a capability by itself.
export const FINANCIAL_PERMISSIONS=Object.freeze([
 'accounting.view','accounting.entries.create','accounting.entries.edit',
 'accounting.entries.approve','accounting.period.close','accounting.reports.export',
 'accounting.reconcile','payroll.view','payroll.prepare','payroll.approve',
 'attendance.view','attendance.approve','scheduling.manage','accounting.access.manage',
]);
export const FINANCIAL_ROLES=Object.freeze(['accountant','cpa','payroll_manager','financial_approver','accounting_readonly','supervisor']);
export const PORTAL_ROLES=Object.freeze(['owner','manager','employee','cashier','staff',...FINANCIAL_ROLES]);
export function activeMembership(member){return Boolean(member&&!member.revokedAt&&!member.suspendedAt&&member.disabled!==true&&(!member.status||member.status==='active'));}
export function normalizeFinancialPermissions(value){
 if(!Array.isArray(value)||value.length>FINANCIAL_PERMISSIONS.length||value.some(p=>!FINANCIAL_PERMISSIONS.includes(p)))throw Object.assign(new Error('Select valid financial permissions / Selecciona permisos financieros válidos.'),{status:400});
 return [...new Set(value)].sort();
}
export function financialPermissions(member){
 if(!activeMembership(member))return [];
 if(['owner','admin'].includes(member.role))return [...FINANCIAL_PERMISSIONS];
 if(member.financialStatus&&member.financialStatus!=='active')return [];
 return [...new Set((Array.isArray(member.financialPermissions)?member.financialPermissions:[]).filter(p=>FINANCIAL_PERMISSIONS.includes(p)&&p!=='accounting.access.manage'))];
}
export const hasFinancialPermission=(member,permission)=>financialPermissions(member).includes(permission);
export function professionalCredential(member,now=Date.now()){
 const value=member?.professionalCredential||{};
 const verified=value.status==='verified'&&value.source==='platform_review'&&Boolean(value.reviewedBy&&value.reviewedAt&&value.evidenceReference&&value.jurisdiction&&value.licenseNumber)&&(!value.expiresAt||Date.parse(value.expiresAt)>now);
 return {jurisdiction:String(value.jurisdiction||''),licenseNumber:String(value.licenseNumber||''),status:verified?'verified':value.status==='rejected'?'rejected':value.expiresAt&&Date.parse(value.expiresAt)<=now?'expired':'unverified',reviewedAt:verified?value.reviewedAt:null};
}
