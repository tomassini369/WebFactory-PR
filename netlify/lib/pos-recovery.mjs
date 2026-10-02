import { clientCommerceStore,commerceKey,getClientSite } from './client-store.mjs';
import { withBookingLock } from './booking-lock.mjs';
import { findStockOperation } from './inventory-archive.mjs';
import { applyStockOperation,projectStockMovements,stockOperationId } from './inventory-operations.mjs';
import { applyCustomerTransaction } from './customer-transactions.mjs';
import { createReceiptRecord } from './webfactory-v3-domain.mjs';
import { putV3Record } from './webfactory-v3-store.mjs';

const fail=message=>Object.assign(new Error(message),{status:409});
export async function recoverPosOrder(siteId,transactionId){
  const store=clientCommerceStore(),key=commerceKey(siteId,'transactions',transactionId);
  const initial=await store.get(key,{type:'json'});
  if(!initial||initial.siteId!==siteId||initial.source!=='pos')throw fail('POS sale not found.');
  const run=()=>withBookingLock(store,`locks/commerce/${siteId}`,async()=>{
    let record=await store.get(key,{type:'json'});
    if(record.inventoryProtocol!==1||record.paymentStatus!=='paid_in_person'||record.kind!=='order'||!['processing','completed'].includes(record.status))throw fail('This sale requires manual reconciliation.');
    const site=await getClientSite(siteId);
    if(!await findStockOperation(site,stockOperationId('sale',transactionId)))throw fail('Original stock movement is unconfirmed. Reconcile cash and inventory before another sale.');
    let marker;
    if(record.posAttemptId){
      marker=await store.get(commerceKey(siteId,'pos-attempts',record.posAttemptId),{type:'json'});
      if(!marker||marker.fingerprint!==record.posAttemptFingerprint||marker.transactionId&&marker.transactionId!==transactionId)throw fail('POS attempt requires reconciliation.');
    }
    const applied=await applyStockOperation(siteId,{kind:'sale',referenceId:transactionId,items:record.items,reason:'pos_sale'});
    await projectStockMovements(siteId,applied.operation,store);
    if(record.customer?.email||record.customer?.phone)record.customerId=(await applyCustomerTransaction(siteId,record)).customerId;
    record={...record,inventoryAppliedAt:applied.operation.appliedAt,inventoryOperationId:applied.operation.id,inventoryNeedsReview:false,commerceEmailNeedsReview:Boolean((record.customer?.email&&!record.customerEmailSent)||(site.business?.email&&!record.businessEmailSent)),customerEmailPending:false,businessEmailPending:false,status:'completed',posRecoveredAt:record.posRecoveredAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    const receipt=createReceiptRecord({siteId,transaction:record});record.receiptId=receipt.receiptId;
    await putV3Record(siteId,'receipts',receipt.receiptId,receipt);
    await store.setJSON(commerceKey(siteId,'orders',transactionId),record);
    const response={ok:true,record,receiptId:receipt.receiptId};
    if(marker)await store.setJSON(commerceKey(siteId,'pos-attempts',record.posAttemptId),{...marker,status:'completed',transactionId,receiptId:receipt.receiptId,response,updatedAt:new Date().toISOString()});
    await store.setJSON(key,record);
    await store.delete(commerceKey(siteId,'pos-processing',transactionId));
    return response;
  });
  return initial.posAttemptId?withBookingLock(store,`locks/pos-attempt/${siteId}/${initial.posAttemptId}`,run):run();
}

export async function listPosProcessing(siteId,store=clientCommerceStore()){
 const deadline=Date.now()+15000,keys=[];
 for await(const page of store.list({prefix:`${siteId}/pos-processing/`,paginate:true}))for(const row of page.blobs||[]){if(keys.length>=5000||Date.now()>deadline)throw Object.assign(new Error('POS review list exceeds its scanning budget.'),{status:503});keys.push(row.key);}
 const records=[];
 for(let i=0;i<keys.length;i+=40){if(Date.now()>deadline)throw Object.assign(new Error('POS review list timed out.'),{status:503});const batch=await Promise.all(keys.slice(i,i+40).map(async key=>{const pointer=await store.get(key,{type:'json'});if(!pointer?.transactionId)return null;const record=await store.get(commerceKey(siteId,'transactions',pointer.transactionId),{type:'json'});if(record?.status==='completed'&&record.posAttemptId){const marker=await store.get(commerceKey(siteId,'pos-attempts',record.posAttemptId),{type:'json'});if(marker&&marker.status!=='completed')return {...record,posRecoveryNeeded:true};}return record}));records.push(...batch.filter(record=>record?.siteId===siteId&&record.source==='pos'&&(record.status==='processing'||record.posRecoveryNeeded)));}
 return records.sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).slice(0,50);
}
