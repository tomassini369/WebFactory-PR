import { clientCommerceStore, commerceKey, getClientSite } from './client-store.mjs';
import { withBookingLock } from './booking-lock.mjs';
import { reserveInventory, releaseInventory } from './inventory-reservations.mjs';
import { reservationId, inventoryFingerprint } from './inventory-availability.mjs';
import { applyStockOperation, projectStockMovements, stockOperationId } from './inventory-operations.mjs';
import { applyCustomerTransaction } from './customer-transactions.mjs';
import { createReceiptRecord } from './webfactory-v3-domain.mjs';
import { putV3Record } from './webfactory-v3-store.mjs';

const fail=message=>Object.assign(new Error(message),{status:409});
const keys=(siteId,id)=>({transaction:commerceKey(siteId,'transactions',id),order:commerceKey(siteId,'orders',id)});

export async function createInPersonOrder(site,seed){
  const store=clientCommerceStore(),key=keys(site.siteId,seed.transactionId);
  return withBookingLock(store,`locks/commerce/${site.siteId}`,async()=>{
    let record={...seed,source:'in_person_order',inventoryProtocol:1,inventoryReservationRequired:true,paymentStatus:'due',status:'reservation_pending'};
    // Keep a visible reference before touching stock. A partial creation is never
    // silently deleted or released; an authorized operator can inspect/cancel it.
    await store.setJSON(key.transaction,record);
    await store.setJSON(key.order,record);
    await reserveInventory(site.siteId,record.transactionId,record.items,undefined,'in_person');
    record={...record,status:'confirmed',updatedAt:new Date().toISOString()};
    await store.setJSON(key.transaction,record);
    await store.setJSON(key.order,record);
    return record;
  });
}

export async function manageInPersonOrder(siteId,transactionId,action,{lockHeld=false}={}){
  const store=clientCommerceStore(),key=keys(siteId,transactionId);
  const run=async()=>{
    let record=await store.get(key.transaction,{type:'json'});
    if(!record||record.siteId!==siteId||record.transactionId!==transactionId||record.kind!=='order'||record.source!=='in_person_order'||record.inventoryProtocol!==1||!record.inventoryReservationRequired)throw fail('This order requires manual inventory reconciliation.');
    if(!['mark_paid','cancel_in_person'].includes(action))throw fail('Unsupported in-person order action.');
    const site=await getClientSite(siteId);
    const reservation=site?.stockReservations?.[reservationId(transactionId)];
    if(action==='cancel_in_person'){
      if(!['due','cancelled'].includes(record.paymentStatus)||record.inventoryAppliedAt||site?.stockOperations?.[stockOperationId('sale',transactionId)])throw fail('A paid or consumed order cannot release its reservation.');
      if(reservation&&(reservation.provider!=='in_person'||reservation.fingerprint!==inventoryFingerprint(record.items)||!['held','released'].includes(reservation.state)))throw fail('Reservation requires reconciliation.');
      if(reservation)await releaseInventory(siteId,transactionId);
      const now=new Date().toISOString();
      record={...record,status:'cancelled',paymentStatus:'cancelled',cancelledAt:record.cancelledAt||now,updatedAt:now};
      await store.setJSON(key.transaction,record);
      await store.setJSON(key.order,record);
      return record;
    }
    if(!['due','paid_in_person'].includes(record.paymentStatus)||!['confirmed','reservation_pending','processing'].includes(record.status))throw fail('This order is no longer available for payment.');
    if(record.paymentStatus==='paid_in_person'&&record.status==='confirmed'&&record.inventoryAppliedAt&&record.v3ArtifactsCreatedAt&&record.receiptId)return record;
    if(!reservation||reservation.provider!=='in_person'||reservation.fingerprint!==inventoryFingerprint(record.items)||!['held','consumed'].includes(reservation.state))throw fail('Verify the original inventory reservation before recording payment.');
    if(record.paymentStatus==='due'&&reservation.state!=='held')throw fail('Consumed inventory with an unpaid record requires reconciliation.');
    const now=new Date().toISOString();
    record={...record,paymentStatus:'paid_in_person',status:'processing',paidAt:record.paidAt||now,updatedAt:now};
    // Record operator-confirmed payment before stock. Retries resume this same
    // order; they never ask the operator to collect a second payment.
    await store.setJSON(key.transaction,record);
    await store.setJSON(key.order,record);
    const applied=await applyStockOperation(siteId,{kind:'sale',referenceId:transactionId,items:record.items,reason:'in_person_order',reservationRequired:true});
    await projectStockMovements(siteId,applied.operation,store);
    const customer=await applyCustomerTransaction(siteId,record);
    record={...record,inventoryAppliedAt:applied.operation.appliedAt,inventoryOperationId:applied.operation.id,inventoryNeedsReview:false,customerId:customer.customerId,status:'confirmed',updatedAt:new Date().toISOString()};
    if(/restaurant|food|catering|bakery|cafe|coffee|comida|alimento|panader|cafeter|restaurante/i.test(`${site.business?.category||''} ${site.business?.name||''}`)){
      record.kitchenStatus=record.kitchenStatus||'received';record.queueNumber=record.queueNumber||`Q${Date.parse(record.paidAt)}`;
    }
    const receipt=createReceiptRecord({siteId,transaction:record,now:record.paidAt});
    await putV3Record(siteId,'receipts',receipt.receiptId,receipt);
    record={...record,receiptId:receipt.receiptId,v3ArtifactsCreatedAt:record.v3ArtifactsCreatedAt||new Date().toISOString()};
    await store.setJSON(key.order,record);
    await store.setJSON(key.transaction,record);
    return record;
  };
  return lockHeld?run():withBookingLock(store,`locks/commerce/${siteId}`,run);
}
