import {requireFinancialPermission,assertSameOrigin,errorResponse} from '../lib/client-auth.mjs';
import {erpBinding,createErpConnector} from '../lib/erp-connector.mjs';
import {clientCommerceStore} from '../lib/client-store.mjs';
import {scanErpSales,deliverErpEvent} from '../lib/erp-outbox.mjs';
export function createErpIntegrationHandler({authorize=requireFinancialPermission,bindingFor=erpBinding,connect=createErpConnector,getStore=clientCommerceStore}={}){return async req=>{
 try{
  if(!['GET','POST'].includes(req.method))return new Response(null,{status:405,headers:{Allow:'GET, POST'}});assertSameOrigin(req);
  const raw=req.method==='POST'?await req.text():'';if(raw.length>4000)throw Object.assign(new Error('Request too large.'),{status:413});
  const input=raw?JSON.parse(raw):{},siteId=req.method==='GET'?new URL(req.url).searchParams.get('siteId'):input.siteId;
  if(!/^[A-Za-z0-9_-]{1,120}$/.test(siteId||''))throw Object.assign(new Error('Invalid business.'),{status:400});
  const {site}=await authorize(siteId,req.method==='GET'?'accounting.view':'accounting.reconcile');const binding=bindingFor(siteId);
  if(!binding)return Response.json({ok:true,configured:false,connected:false},{headers:{'Cache-Control':'private, no-store'}});
  const connector=connect(binding),health=await connector.health();
  if(req.method==='GET')return Response.json({ok:true,configured:true,connected:true,health},{headers:{'Cache-Control':'private, no-store'}});
  if(binding.syncEnabled!==true)throw Object.assign(new Error('ERP synchronization has not been enabled for this business.'),{status:409});
  if(input.action!=='scan_and_sync')throw Object.assign(new Error('Unsupported ERP action.'),{status:400});
  const store=getStore(),scan=await scanErpSales(store,siteId,{timeZone:site.settings?.timezone||'America/Puerto_Rico'}),results=[];
  batches:for await(const page of store.list({prefix:`${siteId}/erp/outbox/`,paginate:true}))for(const blob of page.blobs||[]){
   if(results.length>=10)break batches;
   const pending=await store.get(blob.key,{type:'json'});
   if(!pending||pending.siteId!==siteId)throw Object.assign(new Error('ERP queue tenant mismatch.'),{status:403});
   if(['confirmed','dead_letter'].includes(pending.state)||pending.nextAttemptAt>Date.now()||pending.state==='processing'&&pending.leaseUntil>Date.now())continue;
   const job=await deliverErpEvent(store,blob.key,siteId,connector);results.push({state:job.state,externalId:job.event.externalId,receipt:job.receipt||null});
  }
  return Response.json({ok:true,scan,results},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return errorResponse(error instanceof SyntaxError?Object.assign(new Error('Invalid JSON.'),{status:400}):error)}
};}
export default createErpIntegrationHandler();
