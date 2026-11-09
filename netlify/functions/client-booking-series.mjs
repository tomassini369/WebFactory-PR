import {assertSameOrigin,requireSiteCapability,errorResponse} from '../lib/client-auth.mjs';
import {isBusinessOwner} from '../lib/commercial-access.mjs';
import {clientCommerceStore} from '../lib/client-store.mjs';
import {processBookingSeries,cancelFutureSeries} from '../lib/booking-series.mjs';
export default async req=>{
 try{
  if(!['GET','POST'].includes(req.method))return new Response(null,{status:405});
  if(req.method==='POST')assertSameOrigin(req);
  const raw=req.method==='POST'?await req.text():'';if(raw.length>5000)throw Object.assign(new Error('Request too large.'),{status:413});
  const input=raw?JSON.parse(raw):{},query=new URL(req.url).searchParams;
  const {site,membership}=await requireSiteCapability(input.siteId||query.get('siteId'),'bookings');
  if(!isBusinessOwner(membership))throw Object.assign(new Error('Owner access required.'),{status:403});
  if(req.method==='GET'){
   const store=clientCommerceStore(),series=[];pages:for await(const page of store.list({prefix:site.siteId+'/booking-series/',paginate:true}))for(const blob of page.blobs||[]){const row=await store.get(blob.key,{type:'json'});if(row?.siteId===site.siteId)series.push(row);if(series.length>=100)break pages;}
   return Response.json({ok:true,series},{headers:{'Cache-Control':'private, no-store'}});
  }
  if(!['create','continue','cancel'].includes(input.action))throw Object.assign(new Error('Invalid action.'),{status:400});
  const series=input.action==='cancel'?await cancelFutureSeries(site,input.id):await processBookingSeries(site,input,req.url);
  return Response.json({ok:true,series},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return errorResponse(error)}
};
