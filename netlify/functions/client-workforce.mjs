import {assertSameOrigin,requireSiteAccess,errorResponse} from '../lib/client-auth.mjs';
import {clientCommerceStore} from '../lib/client-store.mjs';
import {emptyWorkforce,workforceKey,workforceView,updateWorkforce,attendanceCsv,wfFail} from '../lib/workforce.mjs';
export function createWorkforceHandler({authorize=requireSiteAccess,getStore=clientCommerceStore,clock=Date.now}={}){return async req=>{
 try{
  if(!['GET','POST'].includes(req.method))return new Response(null,{status:405,headers:{Allow:'GET, POST'}});assertSameOrigin(req);
  const url=new URL(req.url),raw=req.method==='POST'?await req.text():'';if(raw.length>10000)throw wfFail('Request too large.',413);
  const input=raw?JSON.parse(raw):{};if(!input||typeof input!=='object'||Array.isArray(input))throw wfFail('Invalid attendance request / Solicitud de asistencia inválida.');const siteId=req.method==='POST'?input.siteId:url.searchParams.get('siteId');if(!/^[a-zA-Z0-9_-]{1,120}$/.test(siteId||''))throw wfFail('Invalid business.');
  const {site,user,membership}=await authorize(siteId,['owner','manager','employee','cashier']);const store=getStore(),now=clock();
  const state=req.method==='POST'?await updateWorkforce(store,site,input,user,membership,now):(await store.get(workforceKey(siteId),{type:'json'}))||emptyWorkforce(siteId);
  if(state.siteId!==siteId)throw wfFail('Tenant mismatch.',403);
  const view=workforceView(state,site,user,membership,now);
  if(url.searchParams.get('format')==='csv')return new Response(attendanceCsv(view,url.searchParams.get('from')||'',url.searchParams.get('to')||'',url.searchParams.get('employeeId')||'',url.searchParams.get('locationId')||''),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="attendance.csv"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  return Response.json({ok:true,...view},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return errorResponse(e instanceof SyntaxError?wfFail('Invalid JSON.'):e)}
}}
export default createWorkforceHandler();
export const config={rateLimit:{windowLimit:90,windowSize:60,aggregateBy:['ip']}};
