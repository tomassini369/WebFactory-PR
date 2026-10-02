import crypto from 'node:crypto';
import { clientCommerceStore,commerceKey,getClientSite } from './client-store.mjs';
import { withBookingLock } from './booking-lock.mjs';
import { stockOperationId } from './inventory-operations.mjs';
import { inventoryFingerprint,inventoryLines } from './inventory-availability.mjs';
import { findStockOperation } from './inventory-archive.mjs';

const fail=(message,status=409)=>Object.assign(new Error(message),{status});
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,180}$/.test(id);
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const REVIEW_AGE_MS={stripe_checkout:2*3600000,stripe_terminal:24*3600000,ath_movil:2*3600000,in_person:24*3600000};

// These thresholds request human review. They are never proof of payment failure.
export async function inventoryHealth(site,{store=clientCommerceStore(),clock=Date.now,maxPointers=5000,budgetMs=15000}={}){
  const started=clock(),check=()=>{if(clock()-started>budgetMs)throw fail('Inventory health scan timed out. Refresh before acting.',503)};
  const held=Object.values(site.stockReservations||{}).filter(row=>row.state==='held');
  if(held.length>5000)throw fail('Inventory reservations require a staged health scan.',503);
  const reservations=[];
  for(let i=0;i<held.length;i+=40){
    check();
    const batch=await Promise.all(held.slice(i,i+40).map(async reservation=>{
      const issues=[],referenceId=reservation.referenceId;
      if(!Object.hasOwn(REVIEW_AGE_MS,reservation.provider))issues.push('provider_mismatch');
      const record=validId(referenceId)?await store.get(commerceKey(site.siteId,'transactions',referenceId),{type:'json'}):null;
      const created=Date.parse(reservation.createdAt),ageMs=Number.isFinite(created)?Math.max(0,started-created):null;
      if(ageMs===null||created>started+300000)issues.push('invalid_date');
      if(ageMs!==null&&ageMs>=(REVIEW_AGE_MS[reservation.provider]||2*3600000))issues.push('age_review');
      if(!record||record.siteId!==site.siteId||record.transactionId!==referenceId)issues.push('missing_transaction');
      else{
        try{if(reservation.fingerprint!==inventoryFingerprint(record.items))issues.push('items_mismatch')}catch{issues.push('items_mismatch')}
        if(record.kind!=='order')issues.push('kind_mismatch');
        if(['paid','paid_in_person','failed','expired','cancelled','refunded','partially_refunded'].includes(record.paymentStatus))issues.push('payment_reconciliation');
        if(reservation.provider==='in_person'&&record.source!=='in_person_order'||reservation.provider==='stripe_terminal'&&record.source!=='tap_to_pay'||reservation.provider==='ath_movil'&&record.paymentProvider!=='ath_movil')issues.push('provider_mismatch');
        if(reservation.provider==='stripe_checkout'&&!record.stripeSessionId||reservation.provider==='stripe_terminal'&&!record.stripePaymentIntentId)issues.push('provider_reference_missing');
      }
      return {referenceId,provider:reservation.provider||'unknown',createdAt:reservation.createdAt||'',ageHours:ageMs===null?null:Math.floor(ageMs/3600000),units:(reservation.lines||[]).reduce((n,line)=>n+Number(line.quantity||0),0),issues};
    }));reservations.push(...batch);check();
  }
  const keys=[];
  for await(const page of store.list({prefix:`${site.siteId}/pos-processing/`,paginate:true})){
    check();for(const row of page.blobs||[]){if(!row.key.startsWith(`${site.siteId}/pos-processing/`)||keys.length>=maxPointers)throw fail('POS maintenance scan exceeds its scope or capacity.',503);keys.push(row.key)}
  }
  const pointers=[];
  for(let i=0;i<keys.length;i+=20){
    check();
    pointers.push(...await Promise.all(keys.slice(i,i+20).map(async key=>{
      const pointer=await store.get(key,{type:'json'}),id=pointer?.transactionId;
      if(!validId(id)||key!==commerceKey(site.siteId,'pos-processing',id))return {transactionId:validId(id)?id:'',status:'invalid_pointer',cleanupEligible:false};
      return posPointerStatus(site,id,store);
    })));check();
  }
  const operationCount=Object.keys(site.stockOperations||{}).length,reservationCount=Object.keys(site.stockReservations||{}).length;
  const journalBytes=Buffer.byteLength(JSON.stringify(site.stockOperations||{}))+Buffer.byteLength(JSON.stringify(site.stockReservations||{}));
  const review=reservations.filter(row=>row.issues.length).sort((a,b)=>(b.ageHours??Number.MAX_SAFE_INTEGER)-(a.ageHours??Number.MAX_SAFE_INTEGER));
  return {checkedAt:new Date(started).toISOString(),heldCount:held.length,reviewCount:review.length,reservations:review.slice(0,50),hiddenReviewCount:Math.max(0,review.length-50),journal:{operationCount,reservationCount,archivedOperations:Number(site.inventoryArchive?.operationCount||0),archivedReservations:Number(site.inventoryArchive?.reservationCount||0),bytes:journalBytes,nearCapacity:operationCount>=4000||reservationCount>=4000||journalBytes>=1600000,atCapacity:operationCount>=5000||reservationCount>=5000||journalBytes>2*1024*1024},pos:{pointerCount:pointers.length,cleanupEligibleCount:pointers.filter(row=>row.cleanupEligible).length,reviewCount:pointers.filter(row=>!row.cleanupEligible).length,rows:pointers.slice(0,50),hiddenCount:Math.max(0,pointers.length-50)}};
}

async function posPointerStatus(site,id,store){
  const record=await store.get(commerceKey(site.siteId,'transactions',id),{type:'json'});
  const row={transactionId:id,status:'reconciliation_required',cleanupEligible:false};
  if(!record||record.siteId!==site.siteId||record.transactionId!==id||record.source!=='pos'){row.status='missing_transaction';return row}
  if(record.status!=='completed'||record.paymentStatus!=='paid_in_person'||record.inventoryProtocol!==1||!record.inventoryAppliedAt||record.inventoryNeedsReview||!validId(record.receiptId))return row;
  const operation=await findStockOperation(site,stockOperationId('sale',id),store);
  if(!operation||operation.id!==record.inventoryOperationId||operation.referenceId!==id||operation.kind!=='sale')return row;
  try{if(operation.fingerprint!==digest({kind:'sale',referenceId:id,lines:inventoryLines(record.items),direction:-1})||operation.appliedAt!==record.inventoryAppliedAt)return row}catch{return row}
  const [order,receipt]=await Promise.all([store.get(commerceKey(site.siteId,'orders',id),{type:'json'}),store.get(`${site.siteId}/v3/receipts/${record.receiptId}.json`,{type:'json'})]);
  if(order?.siteId!==site.siteId||order.transactionId!==id||order.status!=='completed'||order.paymentStatus!=='paid_in_person'||order.inventoryOperationId!==record.inventoryOperationId||order.receiptId!==record.receiptId||receipt?.siteId!==site.siteId||receipt.transactionId!==id||receipt.receiptId!==record.receiptId||Number(receipt.total)!==Number(record.amountTotal)||receipt.paymentStatus!=='paid_in_person')return row;
  if(record.posAttemptId){
    if(!validId(record.posAttemptId))return row;
    const marker=await store.get(commerceKey(site.siteId,'pos-attempts',record.posAttemptId),{type:'json'});
    if(marker?.status!=='completed'||!record.posAttemptFingerprint||marker.fingerprint!==record.posAttemptFingerprint||marker.transactionId!==id||marker.receiptId!==record.receiptId||marker.response?.record?.transactionId!==id||marker.response?.receiptId!==record.receiptId)return row;
  }
  return {...row,status:'completed_pointer',cleanupEligible:true};
}

export async function cleanupCompletedPosPointer(siteId,id,{store=clientCommerceStore()}={}){
  if(!validId(id))throw fail('Invalid transaction reference.',400);
  const initial=await store.get(commerceKey(siteId,'transactions',id),{type:'json'});
  const run=()=>withBookingLock(store,`locks/commerce/${siteId}`,async()=>{
    const key=commerceKey(siteId,'pos-processing',id),pointer=await store.get(key,{type:'json'});
    if(!pointer)return {removed:false,alreadyAbsent:true};
    if(pointer.transactionId!==id)throw fail('Pointer requires reconciliation.');
    const record=await store.get(commerceKey(siteId,'transactions',id),{type:'json'});
    if(record?.posAttemptId!==initial?.posAttemptId)throw fail('POS attempt changed. Refresh the health report.');
    const site=await getClientSite(siteId);
    if(!site||site.siteId!==siteId)throw fail('Business not found.',404);
    const status=await posPointerStatus(site,id,store);
    if(!status.cleanupEligible)throw fail('This reference still requires reconciliation; no records were removed.');
    await store.delete(key);
    if(await store.get(key,{type:'json'}))throw fail('Pointer cleanup could not be verified.',503);
    return {removed:true,transactionId:id};
  });
  if(initial?.posAttemptId&&!validId(initial.posAttemptId))throw fail('POS attempt requires reconciliation.');
  return initial?.posAttemptId?withBookingLock(store,`locks/pos-attempt/${siteId}/${initial.posAttemptId}`,run):run();
}

export async function snapshotInventoryJournal(siteId,savedBy,{store=clientCommerceStore()}={}){
  return withBookingLock(store,`locks/commerce/${siteId}`,async()=>{
    const site=await getClientSite(siteId);
    if(!site||site.siteId!==siteId)throw fail('Business not found.',404);
    const payload={siteId,stockOperations:site.stockOperations||{},stockReservations:site.stockReservations||{},inventoryArchive:site.inventoryArchive||null};
    if(Buffer.byteLength(JSON.stringify(payload))>2300000)throw fail('Journal requires a staged export.',413);
    const checksum=digest(payload),key=commerceKey(siteId,'inventory-journal-snapshots',checksum);
    await store.setJSON(key,{siteId,schemaVersion:1,savedAt:new Date().toISOString(),savedBy,siteRevision:site.revision,payload,checksum},{onlyIfNew:true});
    const saved=await store.get(key,{type:'json'});
    if(saved?.siteId!==siteId||saved.checksum!==checksum||digest(saved.payload)!==checksum)throw fail('Journal copy could not be verified.',503);
    return {checksum,operationCount:Object.keys(payload.stockOperations).length,reservationCount:Object.keys(payload.stockReservations).length,activeJournalUnchanged:true};
  });
}
