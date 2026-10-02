import { assertSameOrigin,errorResponse,requireSiteCapability } from '../lib/client-auth.mjs';
import { clientCommerceStore,commerceKey } from '../lib/client-store.mjs';
import { releaseInventory } from '../lib/inventory-reservations.mjs';
import { stripeClient } from '../lib/reserved-stripe-checkout.mjs';
import { assertStripeWriteAllowed } from '../lib/stripe-runtime.mjs';
import { withBookingLock } from '../lib/booking-lock.mjs';

export default async req=>{
  try{
    if(req.method!=='POST')return Response.json({ok:false,message:'Method not allowed.'},{status:405});
    assertSameOrigin(req);
    const payload=await req.json();
    const {site}=await requireSiteCapability(payload.siteId,'catalog');
    assertStripeWriteAllowed({requestUrl:req.url}); // Preview must never contact live payments.
    const result=await withBookingLock(clientCommerceStore(),`locks/commerce/${site.siteId}`,async()=>{
      const key=commerceKey(site.siteId,'transactions',payload.transactionId);
      const record=await clientCommerceStore().get(key,{type:'json'});
      if(!record?.inventoryReservationRequired||!record.stripeSessionId||record.paymentStatus!=='pending')throw Object.assign(new Error('This checkout requires provider reconciliation.'),{status:409});
      const session=await stripeClient().checkout.sessions.retrieve(record.stripeSessionId,{},{stripeAccount:record.stripeAccountId});
      if(session.id!==record.stripeSessionId||session.metadata?.site_id!==site.siteId||session.metadata?.transaction_id!==record.transactionId||Number(session.amount_total)!==Number(record.amountTotal)||session.status!=='expired'||session.payment_status!=='unpaid')return {released:false};
      await releaseInventory(site.siteId,record.transactionId);
      const expired={...record,status:'expired',paymentStatus:'expired',updatedAt:new Date().toISOString()};
      await clientCommerceStore().setJSON(key,expired);
      await clientCommerceStore().setJSON(commerceKey(site.siteId,'orders',record.transactionId),expired);
      return {released:true};
    });
    return Response.json({ok:true,...result},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return errorResponse(error);}
};
export const config={rateLimit:{windowLimit:10,windowSize:180,aggregateBy:['ip']}};
