import {assertSameOrigin,errorResponse,requireSiteCapability} from '../lib/client-auth.mjs';
import {isBusinessOwner} from '../lib/commercial-access.mjs';
import {readWaitlist,cancelWaitlist,offerWaitlist} from '../lib/booking-waitlist.mjs';
import {clientCommerceStore,commerceKey} from '../lib/client-store.mjs';
export function createWaitlistAdminHandler({authorize=requireSiteCapability,getStore=clientCommerceStore}={}){return async req=>{
 try{
  if(!['GET','POST'].includes(req.method))return new Response(null,{status:405});
  if(req.method==='POST')assertSameOrigin(req);
  const raw=req.method==='POST'?await req.text():'';if(raw.length>2000)throw Object.assign(new Error('Request too large.'),{status:413});
  const input=raw?JSON.parse(raw):{},siteId=input.siteId||new URL(req.url).searchParams.get('siteId');
  const {site,membership}=await authorize(siteId,'bookings');if(!isBusinessOwner(membership))throw Object.assign(new Error('Owner access required.'),{status:403});
  const store=getStore();let result={};
  if(req.method==='GET')result={requests:await readWaitlist(site,{store})};
  else if(input.action==='cancel')await cancelWaitlist(site.siteId,input.id,{store});
  else if(input.action==='offer'){
   if(!/^[a-zA-Z0-9_-]{1,160}$/.test(input.bookingId||''))throw Object.assign(new Error('Invalid booking.'),{status:400});
   const booking=await store.get(commerceKey(site.siteId,'bookings',input.bookingId),{type:'json'});
   if(!booking||booking.siteId!==site.siteId)throw Object.assign(new Error('Booking unavailable.'),{status:404});
   result=await offerWaitlist(site,booking,{store});
  }else throw Object.assign(new Error('Invalid action.'),{status:400});
  return Response.json({ok:true,...result},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return errorResponse(error)}
};}
export default createWaitlistAdminHandler();
