import { assertSameOrigin, errorResponse, requireSiteAccess } from '../lib/client-auth.mjs';
import { clientCommerceStore } from '../lib/client-store.mjs';
import {importApprovedShift} from '../lib/workforce-accounting.mjs';
import {workforceKey} from '../lib/workforce.mjs';
import { accountingReport, appendEntry, emptyLedger, fail, reportCsv } from '../lib/business-accounting.mjs';

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
export function createAccountingHandler({authorize=requireSiteAccess,getStore=clientCommerceStore}={}) { return async req=>{
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
    const {site,user}=await authorize(siteId,['owner']);
    const store=getStore(),key=`${site.siteId}/accounting/ledger.json`;
    const saved=await store.getWithMetadata(key,{type:'json'});
    const ledger=saved?.data||{...emptyLedger(),siteId:site.siteId};
    if(req.method==='POST') {
      if(payload.type==='allocation') {
        const transactions=await loadAccountingTransactions(store,site.siteId);
        if(!transactions.some(e=>e.transactionId===payload.transactionId))throw fail('Transaction does not belong to this business.',404);
      }
      const next=payload.type==='attendance_import'?importApprovedShift(ledger,payload,await store.get(workforceKey(site.siteId),{type:'json'}),site,user.email||user.id):appendEntry(ledger,payload,site,user.email||user.id);
      if(next!==ledger){
        if(saved&&!saved.etag)throw fail('Concurrency information unavailable.',503);
        const result=await store.setJSON(key,next,saved?{onlyIfMatch:saved.etag}:{onlyIfNew:true});
        if(!result.modified)throw fail('Another owner updated this ledger. Reload and retry.',409);
      }
      return Response.json({ok:true,revision:next.revision},{headers:{'Cache-Control':'private, no-store'}});
    }
    const transactions=await loadAccountingTransactions(store,site.siteId);
    const report=accountingReport(ledger,transactions,site,url.searchParams.get('from'),url.searchParams.get('to'),url.searchParams.get('employeeId')||'');
    if(url.searchParams.get('format')==='csv')return new Response(reportCsv(report,ledger),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="business-accounting.csv"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
    return Response.json({ok:true,revision:ledger.revision,report},{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){if(error instanceof SyntaxError)return errorResponse(fail('Invalid JSON request.'));return errorResponse(error);}
};
}
export default createAccountingHandler();
export const config={rateLimit:{windowLimit:60,windowSize:60,aggregateBy:['ip']}};
