import { assertSameOrigin, errorResponse, requireSiteAccess } from '../lib/client-auth.mjs';
import { clientCommerceStore } from '../lib/client-store.mjs';
import {importApprovedShift} from '../lib/workforce-accounting.mjs';
import {workforceKey} from '../lib/workforce.mjs';
import { accountingReport, appendEntry, emptyLedger, fail, reportCsv } from '../lib/business-accounting.mjs';
import {PORTAL_ROLES,requireAccountingAction,privateAccountingReport} from '../lib/accounting-policy.mjs';
import {isPlatformAdmin} from '../lib/client-auth.mjs';
import {hasFinancialPermission} from '../lib/financial-permissions.mjs';
import {recordFinancialAudit} from '../lib/financial-audit.mjs';

export async function loadAccountingTransactions(store,siteId) {
  const records=[]; const deadline=Date.now()+20000;
  for (const kind of ['orders','bookings']) {
    for await (const page of store.list({prefix:`${siteId}/${kind}/`,paginate:true})) {
      if (records.length+(page.blobs||[]).length>10000 || Date.now()>deadline) throw fail('Report exceeds the synchronous export limit. No partial report was returned.',413);
      for(let index=0;index<(page.blobs||[]).length;index+=40) {
        if(Date.now()>deadline)throw fail('Report timed out. No partial report was returned.',503);
        const batch=await Promise.all(page.blobs.slice(index,index+40).map(blob=>store.get(blob.key,{type:'json'})));
        if(batch.some(r=>!r||r.siteId!==siteId))throw fail('Business records changed. Reload the report.',409);
        records.push(...batch);
      }
    }
  }
  return records;
}
export function createAccountingHandler({authorize=requireSiteAccess,getStore=clientCommerceStore,audit=recordFinancialAudit}={}) { return async req=>{
  try {
    if(!['GET','POST'].includes(req.method))return new Response(null,{status:405,headers:{Allow:'GET, POST'}});
    assertSameOrigin(req);
    const url=new URL(req.url);
    if(Number(req.headers.get('content-length')||0)>20000)throw fail('Request too large.',413);
    const raw=req.method==='POST'?await req.text():'';
    if(raw.length>20000)throw fail('Request too large.',413);
    const payload=raw?JSON.parse(raw):{};
    const siteId=req.method==='POST'?payload.siteId:url.searchParams.get('siteId');
    if(!/^[a-zA-Z0-9_-]{1,120}$/.test(siteId||''))throw fail('Invalid business.');
    // Salary access is deliberately stricter than general employee/payment permissions.
    const access=await authorize(siteId,PORTAL_ROLES),{site,user}=access;
    const membership=isPlatformAdmin(user)?{...access.membership,role:'admin'}:access.membership;
    if(membership?.financialUserId&&membership.financialUserId!==String(user.id||user.sub||''))throw fail('Financial identity mismatch.',403);
    requireAccountingAction(membership,req.method==='POST'?payload.type:url.searchParams.get('format')==='csv'?'csv':'');
    const store=getStore(),key=`${site.siteId}/accounting/ledger.json`;
    await audit(store,{siteId:site.siteId,user,action:req.method==='POST'?`request:${payload.type}`:url.searchParams.get('format')==='csv'?'export':'view',entryId:payload.id||'',revision:payload.revision});
    const saved=await store.getWithMetadata(key,{type:'json'});
    const ledger=saved?.data||{...emptyLedger(),siteId:site.siteId};
    if(ledger.siteId&&ledger.siteId!==site.siteId)throw fail('Tenant mismatch.',403);
    if(req.method==='POST') {
      const target=ledger.entries.find(entry=>entry.id===payload.targetId);
      if(payload.type==='void'&&target&&['rate','work','payment'].includes(target.type)&&(!hasFinancialPermission(membership,'payroll.view')||!hasFinancialPermission(membership,'payroll.prepare')))throw fail('Payroll permission required for this correction.',403);
      if(payload.type==='financial_approval'&&target&&['rate','work','payment'].includes(target.type))requireAccountingAction(membership,'approve');
      if(payload.type==='approve'&&target?.createdBy===(user.email||user.id)&&!['owner','admin'].includes(membership.role))throw fail('A separate approver is required.',403);
      if(payload.type==='allocation') {
        const transactions=await loadAccountingTransactions(store,site.siteId);
        if(!transactions.some(e=>e.transactionId===payload.transactionId))throw fail('Transaction does not belong to this business.',404);
      }
      const next=payload.type==='attendance_import'?importApprovedShift(ledger,payload,await store.get(workforceKey(site.siteId),{type:'json'}),site,user.email||user.id):appendEntry(ledger,payload,site,user.email||user.id,undefined,{requiresApproval:!['owner','admin'].includes(membership.role)});
      if(next!==ledger){
        if(saved&&!saved.etag)throw fail('Concurrency information unavailable.',503);
        const result=await store.setJSON(key,next,saved?{onlyIfMatch:saved.etag}:{onlyIfNew:true});
        if(!result.modified)throw fail('Another owner updated this ledger. Reload and retry.',409);
      }
      await audit(store,{siteId:site.siteId,user,action:`confirmed:${payload.type}`,entryId:payload.id||'',revision:next.revision});
      return Response.json({ok:true,revision:next.revision},{headers:{'Cache-Control':'private, no-store'}});
    }
    const transactions=await loadAccountingTransactions(store,site.siteId);
    const safe=privateAccountingReport(accountingReport(ledger,transactions,site,url.searchParams.get('from'),url.searchParams.get('to'),url.searchParams.get('employeeId')||''),ledger,membership),report=safe.report;
    if(url.searchParams.get('format')==='csv')return new Response(reportCsv(report,safe.ledger),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="business-accounting.csv"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
    return Response.json({ok:true,revision:ledger.revision,report},{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){if(error instanceof SyntaxError)return errorResponse(fail('Invalid JSON request.'));return errorResponse(error);}
};
}
export default createAccountingHandler();
export const config={rateLimit:{windowLimit:60,windowSize:60,aggregateBy:['ip']}};
