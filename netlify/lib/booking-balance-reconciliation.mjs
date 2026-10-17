import {clientCommerceStore,commerceKey} from './client-store.mjs';
import {withBookingLock} from './booking-lock.mjs';
import {mutateKiosk,kioskDeviceKey,kioskHash,kioskFail} from './kiosk.mjs';
import {bookingBalance} from './kiosk-bookings.mjs';
import {stripeClient} from './reserved-stripe-checkout.mjs';
import {assertStripeWriteAllowed} from './stripe-runtime.mjs';

// Uses the same commerce lock as provider webhooks. A processing claim is never
// released because of its age, an abandoned browser, or an absent transaction.
export async function reconcileBookingBalance(site,bookingId,{expectedAttempt,close=false,actor,requestUrl,lockHeld=false}={},dependencies={}) {
  const store=dependencies.store||clientCommerceStore(),clock=dependencies.clock||Date.now;
  const run=()=>withBookingLock(store,commerceKey(site.siteId,'booking-change-locks',bookingId),async()=>{
    const key=commerceKey(site.siteId,'bookings',bookingId);
    let booking=await store.get(key,{type:'json'});
    if(booking?.siteId!==site.siteId||booking.transactionId!==bookingId||booking.kind!=='booking')throw kioskFail('Booking unavailable / Cita no disponible.',404);
    if(!booking.balanceAttempt) return {ok:true,record:booking,reconciliation:booking.balanceReconciliation||{state:'closed'}};
    const attempt=booking.balanceAttempt;
    if(!/^[a-f0-9]{64}$/.test(attempt.attempt||'')||expectedAttempt!==attempt.attempt)throw kioskFail('The balance attempt changed. Reload the booking / El intento de saldo cambió. Actualiza la cita.',409);
    const claimKey=`${site.siteId}/checkout-attempts/${kioskHash(attempt.attempt)}.json`;
    const claim=await store.getWithMetadata(claimKey,{type:'json'});
    if(claim?.data&&claim.data.siteId!==site.siteId)throw kioskFail('Checkout identity requires review / Revisa la identidad del checkout.',409);
    const report=async(state,reason,payment)=>{
      const review={state,reason,checkedAt:new Date(clock()).toISOString(),checkedBy:actor,attemptHash:kioskHash(attempt.attempt),...(payment?{paymentTransactionId:payment.transactionId,provider:payment.paymentProvider==='ath_movil'?'ath_movil':'stripe'}:{})};
      booking=await mutateKiosk(store,key,current=>{
        if(current?.siteId!==site.siteId||current.balanceAttempt?.attempt!==attempt.attempt)throw kioskFail('Booking changed. Reload / La cita cambió. Actualiza.',409);
        return {...current,balanceReconciliation:review};
      });
      return {ok:true,record:booking,reconciliation:review};
    };
    if(claim?.data.status==='processing')return report('processing','checkout_in_progress');
    if(claim?.data&&!['completed','closed'].includes(claim.data.status))return report('review_required','unknown_claim');
    const listed=await store.list({prefix:`${site.siteId}/transactions/`});
    // The SDK's default list collects every page. Never infer absence from a
    // truncated list; large histories require an indexed/manual investigation.
    if(!Array.isArray(listed.blobs)||listed.blobs.length>2500)return report('review_required','history_requires_review');
    const matches=[];
    for(let i=0;i<listed.blobs.length;i+=40){
      const rows=await Promise.all(listed.blobs.slice(i,i+40).map(blob=>store.get(blob.key,{type:'json'})));
      for(const row of rows)if(row?.source==='booking_balance'&&row.bookingTransactionId===bookingId&&row.bookingBalanceAttempt===attempt.attempt)matches.push(row);
    }
    if(matches.length>1)return report('review_required','multiple_payments');
    let payment=matches[0];
    const responseId=claim?.data.body?.transactionId;
    if(responseId&&(!payment||payment.transactionId!==responseId))return report('review_required','missing_transaction');
    if(!payment&&claim?.data.body?.ok===true)return report('review_required','missing_transaction');
    if(payment&&(payment.siteId!==site.siteId||payment.kind!=='order'||payment.locationId!==booking.locationId||!Number.isSafeInteger(payment.amountTotal)||payment.amountTotal<=0))return report('review_required','payment_mismatch');
    let reason='no_provider_checkout';
    if(payment){
      if(payment.paymentProvider==='ath_movil'){
        // ATH browser callbacks and screen expiration do not prove cancellation.
        if(booking.balancePayments?.[payment.transactionId]&&payment.paymentStatus==='paid')return report('settled','payment_linked',payment);
        return report('review_required','ath_business',payment);
      }
      if(!payment.stripeAccountId||!payment.stripeSessionId)return report('review_required','missing_session',payment);
      assertStripeWriteAllowed({requestUrl});
      const stripe=dependencies.client||stripeClient(),options={stripeAccount:payment.stripeAccountId};
      const validate=session=>{
        if(session.id!==payment.stripeSessionId||session.metadata?.flow!=='webfactory_client_commerce'||session.metadata?.site_id!==site.siteId||session.metadata?.transaction_id!==payment.transactionId||Number(session.amount_total)!==payment.amountTotal||session.currency!=='usd')throw kioskFail('Stripe checkout does not match this balance / El checkout de Stripe no corresponde a este saldo.',409);
        return session;
      };
      let session=validate(await stripe.checkout.sessions.retrieve(payment.stripeSessionId,{},options));
      if(session.payment_status==='paid'){
        if(session.status!=='complete')return report('review_required','payment_mismatch',payment);
        if(close)return report('provider_pending','paid_retry_review',payment);
        if(typeof session.payment_intent!=='string')return report('review_required','missing_payment_identity',payment);
        const paidIntent=await stripe.paymentIntents.retrieve(session.payment_intent,{expand:['latest_charge']},options);
        const charge=paidIntent.latest_charge;
        if(paidIntent.id!==session.payment_intent||paidIntent.status!=='succeeded'||paidIntent.amount!==payment.amountTotal||paidIntent.amount_received!==payment.amountTotal||paidIntent.currency!=='usd'||!charge||typeof charge!=='object'||charge.paid!==true||charge.captured!==true||charge.amount!==payment.amountTotal||charge.amount_captured!==payment.amountTotal||charge.currency!=='usd'||charge.amount_refunded!==0||charge.refunded===true||!Number.isSafeInteger(charge.created)||charge.created<=0)return report('review_required','provider_payment_requires_review',payment);
        const finalize=dependencies.finalize||((input)=>import('../functions/stripe-connect-webhook.mjs').then(module=>module.finalizeStripeCheckout(input)));
        await finalize({session,account:payment.stripeAccountId,created:charge.created});
        const updated=await store.get(key,{type:'json'}),balance=await bookingBalance(store,updated);
        return report(balance.known&&balance.due===0?'settled':'review_required',balance.known&&balance.due===0?'provider_verified':'balance_requires_review',payment);
      }
      if(!['pending','expired','cancelled'].includes(payment.paymentStatus))return report('review_required','payment_mismatch',payment);
      if(!['open','expired'].includes(session.status)||session.payment_status!=='unpaid')return report('provider_pending','provider_processing',payment);
      let intent;
      const validateIntent=value=>{
        if(value.id!==(typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id)||value.amount!==payment.amountTotal||value.currency!=='usd'||Number(value.amount_received)!==0||Number(value.amount_capturable||0)!==0)throw kioskFail('Stripe payment requires review / El pago de Stripe requiere revisión.',409);
        return value;
      };
      if(session.payment_intent){
        const id=typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent.id;
        intent=validateIntent(await stripe.paymentIntents.retrieve(id,{},options));
        if(!['requires_payment_method','requires_confirmation','requires_action','canceled'].includes(intent.status))return report('provider_pending','provider_processing',payment);
      }
      if(!close)return report('unpaid','unpaid_checkout',payment);
      if(session.status==='open')session=validate(await stripe.checkout.sessions.expire(session.id,{}, {...options,idempotencyKey:`close-balance-${site.siteId}-${payment.transactionId}`}));
      if(session.status!=='expired'||session.payment_status!=='unpaid')return report('provider_pending','provider_processing',payment);
      if(session.payment_intent){
        const id=typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent.id;
        intent=validateIntent(await stripe.paymentIntents.retrieve(id,{},options));
      }
      if(intent){
        intent=validateIntent(await stripe.paymentIntents.retrieve(intent.id,{},options));
        if(intent.status!=='canceled'){
          if(!['requires_payment_method','requires_confirmation','requires_action'].includes(intent.status))return report('provider_pending','provider_processing',payment);
          intent=validateIntent(await stripe.paymentIntents.cancel(intent.id,{}, {...options,idempotencyKey:`close-balance-intent-${site.siteId}-${payment.transactionId}`}));
          if(intent.status!=='canceled')return report('provider_pending','provider_processing',payment);
        }
      }
      const paymentKey=commerceKey(site.siteId,'transactions',payment.transactionId);
      payment=await mutateKiosk(store,paymentKey,current=>{
        if(current?.bookingBalanceAttempt!==attempt.attempt||!['pending','expired','cancelled'].includes(current.paymentStatus))throw kioskFail('Payment changed. Review again / El pago cambió. Revisa nuevamente.',409);
        return {...current,paymentStatus:'expired',status:'expired',balanceCheckoutClosedAt:new Date(clock()).toISOString(),balanceCheckoutClosedBy:actor,updatedAt:new Date(clock()).toISOString()};
      });
      await mutateKiosk(store,commerceKey(site.siteId,'orders',payment.transactionId),current=>{
        if(current&&(current.siteId!==site.siteId||current.transactionId!==payment.transactionId||current.bookingBalanceAttempt!==attempt.attempt))throw kioskFail('Payment mirror requires review.',409);
        return payment;
      });
      reason='stripe_expired_unpaid';
    }else if(!close)return report('not_started','no_provider_checkout');
    // Fence the old server attempt before allowing another payment or cancellation.
    // onlyIfNew wins against a late executor; CAS wins against a changed claim.
    const fenced={...(claim?.data||{}),siteId:site.siteId,status:'closed',closedAt:new Date(clock()).toISOString(),closedBy:actor,reason};
    const fence=await store.setJSON(claimKey,fenced,claim?.etag?{onlyIfMatch:claim.etag}:{onlyIfNew:true});
    if(!fence.modified)throw kioskFail('Checkout changed. Review again / El checkout cambió. Revisa nuevamente.',409);
    if(attempt.deviceId)await mutateKiosk(store,kioskDeviceKey(attempt.deviceId),current=>{
      if(!current||current.siteId!==site.siteId||current.locationId!==booking.locationId||current.saleId!==attempt.saleId||current.active?.attempt!==attempt.attempt)return null;
      return {...current,active:{...current.active,reconciledClosed:true,payload:null}};
    });
    booking=await mutateKiosk(store,key,current=>{
      if(current?.siteId!==site.siteId||current.balanceAttempt?.attempt!==attempt.attempt)throw kioskFail('Booking changed. Review again / La cita cambió. Revisa nuevamente.',409);
      if((current.balanceAttemptHistory||[]).length>=200)throw kioskFail('Balance audit history requires review.',409);
      const {balanceAttempt,...rest}=current;
      const now=new Date(clock()).toISOString();
      return {...rest,balanceAttemptHistory:[...(current.balanceAttemptHistory||[]),{...balanceAttempt,closedAt:now,closedBy:actor,reason,paymentTransactionId:payment?.transactionId||''}],balanceReconciliation:{state:'closed',reason,checkedAt:now,checkedBy:actor,attemptHash:kioskHash(attempt.attempt)},updatedAt:now};
    });
    const mirrorKey=commerceKey(site.siteId,'transactions',bookingId);
    await mutateKiosk(store,mirrorKey,current=>{
      if(!current)return null;
      if(current.siteId!==site.siteId||current.transactionId!==bookingId||current.kind!=='booking')throw kioskFail('Booking mirror requires review.',409);
      return booking;
    });
    return {ok:true,record:booking,reconciliation:booking.balanceReconciliation};
  });
  return lockHeld?run():withBookingLock(store,`locks/commerce/${site.siteId}`,run);
}
