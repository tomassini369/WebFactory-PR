import {requirePlatformAdmin,errorResponse} from '../lib/client-auth.mjs';
import {clientEventStore} from '../lib/client-store.mjs';
import {BOOKING_HEALTH_KEY,publicBookingHealth} from '../lib/booking-reminder-processor.mjs';
export default async(req,context)=>{
 try{
  if(req.method!=='GET')return new Response(null,{status:405,headers:{Allow:'GET','Cache-Control':'no-store'}});
  await requirePlatformAdmin();
  return Response.json({ok:true,enabled:context.deploy?.context==='production'&&context.deploy?.published===true,health:publicBookingHealth(await clientEventStore().get(BOOKING_HEALTH_KEY,{type:'json'}))},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return errorResponse(error)}
};
