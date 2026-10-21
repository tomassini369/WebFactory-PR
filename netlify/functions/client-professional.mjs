import {assertSameOrigin,errorResponse,requireSiteAccess,membershipHasCapability} from '../lib/client-auth.mjs';
import {clientCommerceStore,commerceKey} from '../lib/client-store.mjs';
import {isBusinessOwner} from '../lib/commercial-access.mjs';
export function createProfessionalHandler({authorize=requireSiteAccess,getStore=clientCommerceStore,clock=()=>new Date().toISOString()}={}) {return async req=>{
 try {
  if(!['GET','POST'].includes(req.method))return new Response(null,{status:405});
  assertSameOrigin(req);
  const url=new URL(req.url),raw=req.method==='POST'?await req.text():'';if(Buffer.byteLength(raw)>4000)throw Object.assign(new Error('Request too large.'),{status:413});
  let input;try{input=raw?JSON.parse(raw):{}}catch{throw Object.assign(new Error('Invalid JSON.'),{status:400})}
  if(!input||typeof input!=='object'||Array.isArray(input))throw Object.assign(new Error('Invalid request.'),{status:400});
  const {site,user,membership}=await authorize(input.siteId||url.searchParams.get('siteId'));
  if(!isBusinessOwner(membership)&&!membershipHasCapability(membership,'availabilityRequests'))throw Object.assign(new Error('Availability request permission required.'),{status:403});
  const store=getStore(),prefix=site.siteId+'/availability-requests/';
  if(req.method==='GET'){
   const requests=[];for await(const page of store.list({prefix,paginate:true}))for(const blob of page.blobs || []){const row=await store.get(blob.key,{type:'json'});if(row?.siteId===site.siteId&&(isBusinessOwner(membership)||row.employeeId===membership.employeeId&&row.userId===user.id))requests.push(row);}
   return Response.json({ok:true,requests},{headers:{'Cache-Control':'private, no-store'}});
  }
  if(input.action==='review') {
   if(!isBusinessOwner(membership))throw Object.assign(new Error('Owner approval required.'),{status:403});
   if(!/^[a-zA-Z0-9_-]{8,120}$/.test(input.id||''))throw Object.assign(new Error('Invalid request.'),{status:400});
   const key=commerceKey(site.siteId,'availability-requests',input.id),saved=await store.getWithMetadata(key,{type:'json'});
   if(!saved?.data||saved.data.siteId!==site.siteId)throw Object.assign(new Error('Request not found.'),{status:404});
   if(!saved.etag)throw Object.assign(new Error('Concurrency metadata unavailable.'),{status:503});
   const next={...saved.data,status:'reviewed',reviewedAt:clock(),reviewedBy:user.id};
   const updated=await store.setJSON(key,next,{onlyIfMatch:saved.etag});if(!updated.modified)throw Object.assign(new Error('Request changed. Reload.'),{status:409});
   return Response.json({ok:true},{headers:{'Cache-Control':'private, no-store'}});
  }
  if(Object.hasOwn(input,'employeeId')||!membership.employeeId||!site.employees?.some(employee=>employee.id===membership.employeeId&&employee.active!==false))throw Object.assign(new Error('A linked active professional is required.'),{status:403});
  const validDate=date=>/^\d{4}-\d{2}-\d{2}$/.test(date||'')&&Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date;
  if(!/^[a-zA-Z0-9_-]{8,120}$/.test(input.id||'')||!validDate(input.start)||!validDate(input.end)||input.end<input.start)throw Object.assign(new Error('Choose a valid date range and request identifier.'),{status:400});
  const row={siteId:site.siteId,id:input.id,userId:user.id,employeeId:membership.employeeId,start:input.start,end:input.end,status:'pending',createdAt:clock()};
  const key=commerceKey(site.siteId,'availability-requests',input.id),saved=await store.setJSON(key,row,{onlyIfNew:true});
  if(!saved.modified){const old=await store.get(key,{type:'json'});if(old.userId!==user.id||old.start!==row.start||old.end!==row.end)throw Object.assign(new Error('Request identifier already used.'),{status:409});}
  return Response.json({ok:true},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return errorResponse(error);}
};}
export default createProfessionalHandler();
