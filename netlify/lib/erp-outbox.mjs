import {erpEventHash,settledSaleEvent} from './erp-connector.mjs';
import crypto from 'node:crypto';
const fail=(message,status=409)=>Object.assign(new Error(message),{status});
export const erpOutboxKey=event=>`${event.siteId}/erp/outbox/${erpEventHash({externalId:event.externalId})}.json`;
export async function enqueueErpEvent(store,event,now=Date.now()){
 const key=erpOutboxKey(event),hash=erpEventHash(event),previous=await store.get(key,{type:'json'});
 if(previous){if(previous.siteId!==event.siteId||previous.hash!==hash)throw fail('ERP event differs from the immutable source. Reconcile before retrying.');return previous;}
 const record={siteId:event.siteId,hash,event,state:'pending',attempts:0,createdAt:new Date(now).toISOString(),nextAttemptAt:now};
 const write=await store.setJSON(key,record,{onlyIfNew:true});
 if(!write.modified){const winner=await store.get(key,{type:'json'});if(winner?.hash!==hash)throw fail('ERP event conflict.');return winner;}
 return record;
}
export async function deliverErpEvent(store,key,siteId,connector,now=Date.now()){
 const saved=await store.getWithMetadata(key,{type:'json'});if(!saved?.etag)throw fail('ERP concurrency metadata unavailable.',503);
 const record=saved.data;if(record.siteId!==siteId||record.event.siteId!==siteId||!key.startsWith(`${siteId}/erp/outbox/`))throw fail('ERP tenant mismatch.',403);
 if(record.state==='confirmed'||record.state==='dead_letter'||record.nextAttemptAt>now||record.state==='processing'&&record.leaseUntil>now)return record;
 const claimed={...record,state:'processing',attempts:record.attempts+1,leaseId:crypto.randomUUID(),leaseUntil:now+30000};
 if(!(await store.setJSON(key,claimed,{onlyIfMatch:saved.etag})).modified)throw fail('ERP job already claimed.');
 const lease=await store.getWithMetadata(key,{type:'json'});if(!lease?.etag)throw fail('ERP job lease unavailable.',503);if(lease.data.leaseId!==claimed.leaseId)throw fail('ERP delivery lease changed.');
 let next;
 try{
  const receipt=await connector.ingest(record.event);
  if(receipt.externalId!==record.event.externalId||receipt.payloadHash!==record.hash||receipt.siteId!==siteId||receipt.documentType!=='Journal Entry'||receipt.status!=='draft')throw fail('ERP receipt mismatch.',502);
  next={...claimed,state:'confirmed',receipt:{documentType:receipt.documentType,documentName:receipt.documentName,status:receipt.status},confirmedAt:new Date(now).toISOString(),leaseUntil:0};
 }catch(error){next={...claimed,state:claimed.attempts>=5?'dead_letter':'pending',lastError:/^ERP_[A-Z_]+$/.test(error.code||'')?error.code:'ERP_DELIVERY_UNCONFIRMED',nextAttemptAt:now+Math.min(3600000,30000*2**claimed.attempts),leaseUntil:0};}
 if(!(await store.setJSON(key,next,{onlyIfMatch:lease.etag})).modified)throw fail('ERP delivery state changed. Reconcile the remote receipt.');
 return next;
}
// Source scanning repairs a crash between a completed POS write and enqueue.
// It never calls checkout, adjusts stock, changes payment status or sends mail.
export async function scanErpSales(store,siteId,{limit=1000,now=Date.now(),timeZone='America/Puerto_Rico'}={}){
 let inspected=0,enqueued=0;
 for(const kind of ['orders','bookings'])for await(const page of store.list({prefix:`${siteId}/${kind}/`,paginate:true}))for(const blob of page.blobs||[]){
  if(++inspected>limit)throw fail('ERP scan limit reached. Use a durable cursor before enabling this business.',413);
  const transaction=await store.get(blob.key,{type:'json'}),event=settledSaleEvent(transaction,siteId,timeZone);
  if(event){await enqueueErpEvent(store,event,now);enqueued++;}
 }
 return{inspected,enqueued};
}
