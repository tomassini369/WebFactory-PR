import {assertSameOrigin,requireSiteCapability,errorResponse} from '../lib/client-auth.mjs';
import {isBusinessOwner} from '../lib/commercial-access.mjs';
import {clientCommerceStore} from '../lib/client-store.mjs';
import {buildBookingIndexPage,indexStateKey} from '../lib/booking-date-index.mjs';
import {withBookingLock} from '../lib/booking-lock.mjs';
export function createBookingIndexHandler({authorize=requireSiteCapability,getStore=clientCommerceStore}={}){return async req=>{try{
 if(!['GET','POST'].includes(req.method))return new Response(null,{status:405});if(req.method==='POST')assertSameOrigin(req);
 const raw=req.method==='POST'?await req.text():'';if(raw.length>1000)throw Object.assign(Error('Request too large.'),{status:413});const input=raw?JSON.parse(raw):{};
 const {site,membership}=await authorize(input.siteId||new URL(req.url).searchParams.get('siteId'),'bookings');if(!isBusinessOwner(membership))throw Object.assign(Error('Owner access required.'),{status:403});
 const store=getStore();let state;
 if(req.method==='GET')state=await store.get(indexStateKey(site.siteId),{type:'json'});
 else state=await withBookingLock(store,site.siteId+'/booking-index-build-lock',()=>buildBookingIndexPage(store,site.siteId));
 return Response.json({ok:true,state:state||{status:'pending',processed:0}},{headers:{'Cache-Control':'private, no-store'}});
}catch(error){return errorResponse(error)}}}
export default createBookingIndexHandler();
