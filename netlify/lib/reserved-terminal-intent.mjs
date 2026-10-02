import crypto from 'node:crypto';
import { clientCommerceStore,commerceKey } from './client-store.mjs';
import { withBookingLock } from './booking-lock.mjs';
import { reserveInventory } from './inventory-reservations.mjs';
import { stripeClient } from './reserved-stripe-checkout.mjs';
import { assertStripeWriteAllowed } from './stripe-runtime.mjs';

const fail=(message,status=409)=>Object.assign(new Error(message),{status});
export async function createReservedTerminalIntent(record,{requestUrl,store=clientCommerceStore(),client,reserve=reserveInventory}={}){
  assertStripeWriteAllowed({requestUrl});
  if(record.kind!=='order'||record.source!=='tap_to_pay'||record.currency!=='usd'||!record.stripeAccountId||!Number.isSafeInteger(record.amountTotal)||record.amountTotal<=0)throw fail('Invalid Terminal sale.',400);
  const fingerprint=crypto.createHash('sha256').update(JSON.stringify({items:record.items,customer:record.customer,amount:record.amountTotal,discounts:record.discounts,tax:record.tax,tip:record.tip,account:record.stripeAccountId})).digest('hex');
  return withBookingLock(store,`locks/commerce/${record.siteId}`,async()=>{
    const key=commerceKey(record.siteId,'transactions',record.transactionId),previous=await store.get(key,{type:'json'});
    const sdk=client||stripeClient();
    if(previous){
      if(previous.terminalFingerprint!==fingerprint||previous.paymentStatus!=='pending')throw fail('Use a new attempt for this Terminal sale.');
      record=previous;
      if(record.stripePaymentIntentId){
        const intent=await sdk.paymentIntents.retrieve(record.stripePaymentIntentId,{},{stripeAccount:record.stripeAccountId});
        if(!intent.client_secret||intent.id!==record.stripePaymentIntentId||intent.metadata?.site_id!==record.siteId||intent.metadata?.transaction_id!==record.transactionId||intent.amount!==record.amountTotal||intent.currency!=='usd'||!['requires_payment_method','requires_confirmation','requires_action'].includes(intent.status))throw fail('This Terminal payment requires reconciliation.');
        return {record,intent};
      }
      if(!record.terminalParameters||Date.now()-Date.parse(record.createdAt)>23*3600000)throw fail('An uncertain old Terminal payment requires reconciliation.');
    }else{
      record={...record,inventoryProtocol:1,inventoryReservationRequired:true,terminalFingerprint:fingerprint,status:'terminal_creating',terminalParameters:{amount:record.amountTotal,currency:'usd',payment_method_types:['card_present'],capture_method:'automatic',description:`WebFactory POS · ${record.items.length} items`,metadata:{flow:'webfactory_terminal',site_id:record.siteId,transaction_id:record.transactionId,kind:'order',source:'tap_to_pay'}}};
      const write=await store.setJSON(key,record,{onlyIfNew:true});if(!write.modified)throw fail('Terminal sale changed. Try again.');
    }
    await reserve(record.siteId,record.transactionId,record.items,undefined,'stripe_terminal');
    const intent=await sdk.paymentIntents.create(record.terminalParameters,{stripeAccount:record.stripeAccountId,idempotencyKey:`reserved-terminal-${record.siteId}-${record.transactionId}`});
    if(!intent.id||!intent.client_secret)throw fail('Terminal response requires reconciliation.',503);
    record={...record,stripePaymentIntentId:intent.id,status:'payment_pending',updatedAt:new Date().toISOString()};
    // A client secret is returned to the requesting cashier but never stored in records.
    await store.setJSON(key,record);
    await store.setJSON(commerceKey(record.siteId,'orders',record.transactionId),record);
    return {record,intent};
  });
}
