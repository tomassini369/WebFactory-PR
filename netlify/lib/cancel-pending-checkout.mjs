import {clientCommerceStore,commerceKey} from './client-store.mjs';
import {withBookingLock} from './booking-lock.mjs';
import {stripeClient} from './reserved-stripe-checkout.mjs';
import {assertStripeWriteAllowed} from './stripe-runtime.mjs';
import {releaseInventory} from './inventory-reservations.mjs';
const fail=(message,status=409)=>Object.assign(new Error(message),{status});
export async function cancelPendingCheckout(site,id,{authorize,requestUrl,store=clientCommerceStore(),client,release=releaseInventory}={}){
 if(!/^[a-zA-Z0-9_-]{1,160}$/.test(id||''))throw fail('Invalid transaction.',400);
 return withBookingLock(store,`locks/commerce/${site.siteId}`,async()=>{
  const key=commerceKey(site.siteId,'transactions',id);let row=await store.get(key,{type:'json'});
  if(!row||row.siteId!==site.siteId||row.kind!=='order')throw fail('Transaction unavailable.',404);
  await authorize(row);
  if(row.cancelledByCustomerAt&&row.paymentStatus==='cancelled'){await store.setJSON(commerceKey(site.siteId,'orders',id),row);return row;}
  if(row.inventoryAppliedAt||!['pending','expired'].includes(row.paymentStatus)||!row.stripeSessionId||!row.stripeAccountId)throw fail('Payment requires verification; it cannot be cancelled here. / Este pago requiere verificación.');
  assertStripeWriteAllowed({requestUrl});
  const stripe=client||stripeClient(),options={stripeAccount:row.stripeAccountId};
  let session=await stripe.checkout.sessions.retrieve(row.stripeSessionId,{},options);
  const matches=s=>s.id===row.stripeSessionId&&s.metadata?.site_id===site.siteId&&s.metadata?.transaction_id===id&&s.amount_total===row.amountTotal&&s.payment_status==='unpaid';
  if(!matches(session))throw fail('Provider payment does not match or is already paid.');
  if(session.status==='open')session=await stripe.checkout.sessions.expire(session.id,{},options);
  if(!matches(session)||session.status!=='expired')throw fail('Payment is processing or completed. Cancellation unavailable.');
  if(row.inventoryReservationRequired)await release(site.siteId,id);
  const now=new Date().toISOString();row={...row,paymentStatus:'cancelled',status:'cancelled',checkoutUrl:'',cancelledByCustomerAt:now,updatedAt:now};
  await store.setJSON(key,row);await store.setJSON(commerceKey(site.siteId,'orders',id),row);return row;
 });
}
