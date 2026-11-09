import {assertSameOrigin,requireSiteCapability,errorResponse} from '../lib/client-auth.mjs';
import {isBusinessOwner,canAccessCommerce} from '../lib/commercial-access.mjs';
import {clientCommerceStore} from '../lib/client-store.mjs';
export function createAttendanceHandler({authorize=requireSiteCapability,getStore=clientCommerceStore}={}){return async req=>{try{
 if(req.method!=='POST')return new Response(null,{status:405});assertSameOrigin(req);
 const raw=await req.text();if(raw.length>1500)throw Object.assign(Error('Request too large.'),{status:413});
 const input=JSON.parse(raw),email=String(input.email||'').trim().toLowerCase();
 if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)||email.length>320)throw Object.assign(Error('Enter a valid email. / Ingresa un email válido.'),{status:400});
 const {site,membership}=await authorize(input.siteId,'bookings');if(!isBusinessOwner(membership))throw Object.assign(Error('Owner access required.'),{status:403});
 const store=getStore(),bookings=[],summary={total:0,completed:0,noShow:0,cancelled:0,lateCancellation:0};
 const pages=store.list({prefix:site.siteId+'/bookings/',paginate:true});
 for await(const page of pages[Symbol.asyncIterator]?pages:[await pages])for(let i=0;i<(page.blobs||[]).length;i+=20){
  const batch=await Promise.all(page.blobs.slice(i,i+20).map(b=>store.get(b.key,{type:'json'})));
  for(const r of batch){if(r?.siteId!==site.siteId||r.kind!=='booking'||String(r.customer?.email||'').trim().toLowerCase()!==email||!canAccessCommerce(site,membership,r))continue;
   summary.total++;if(r.status==='completed')summary.completed++;if(r.status==='no_show')summary.noShow++;if(r.status==='cancelled'){summary.cancelled++;if(r.lateCancellation)summary.lateCancellation++;}
   bookings.push({id:r.transactionId,start:r.start,status:r.status,lateCancellation:r.status==='cancelled'&&r.lateCancellation===true,employeeId:r.employeeId,locationId:r.locationId});
   if(bookings.length>1000)throw Object.assign(Error('History exceeds this report limit; no partial totals returned.'),{status:422});
  }
 }
 bookings.sort((a,b)=>Date.parse(b.start)-Date.parse(a.start));
 return Response.json({ok:true,summary,bookings},{headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
}catch(error){return errorResponse(error)}}}
export default createAttendanceHandler();
