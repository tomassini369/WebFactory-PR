import {financialPermissions,FINANCIAL_ROLES,professionalCredential} from './financial-permissions.mjs';
export const financialOnly=membership=>FINANCIAL_ROLES.includes(membership?.role);
export function financialPortalSite(site,membership){
 const wages=financialPermissions(membership).includes('payroll.view');
 return{siteId:site.siteId,slug:site.slug,status:site.status,revision:site.revision,portalContext:'financial',business:{name:site.business?.name||'',nameEn:site.business?.nameEn||'',nameEs:site.business?.nameEs||'',category:site.business?.category||''},design:{primary:site.design?.primary,secondary:site.design?.secondary,style:site.design?.style},catalog:(site.catalog||[]).map(item=>({id:item.id,name:item.name||item.nameEn||item.nameEs||item.id,type:item.type})),employees:wages?(site.employees||[]).map(employee=>({id:employee.id,name:employee.name})):[],hours:{},paymentRules:{},googleCalendar:{},settings:{locale:site.settings?.locale||'en',currency:'usd',timezone:site.settings?.timezone||'America/Puerto_Rico'}};
}
export function financialMembershipView(membership,capabilities){return{email:membership.email,role:membership.role,locationIds:membership.locationIds||[],financialRole:membership.financialRole,financialPermissions:financialPermissions(membership),credential:professionalCredential(membership),capabilities};}
export function operationalPortalSite(site,membership){
 if(['owner','admin'].includes(membership.role))return site;
 const {accountingAccess,...safe}=site;
 return{...safe,members:(site.members||[]).map(({financialPermissions,financialUserId,professionalCredential,...member})=>member)};
}
