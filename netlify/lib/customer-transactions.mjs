import crypto from 'node:crypto';
import { clientCommerceStore } from './client-store.mjs';
import { createCustomerRecord } from './webfactory-v3-domain.mjs';
export async function applyCustomerTransaction(siteId,transaction,store=clientCommerceStore()){
  const id=transaction.transactionId;
  if(!id||!Number.isSafeInteger(Number(transaction.amountTotal))||Number(transaction.amountTotal)<0)throw Object.assign(new Error('Invalid customer transaction.'),{status:400});
  const anonymousId=`cust-txn-${crypto.createHash('sha256').update(id).digest('hex').slice(0,24)}`;
  const seed=createCustomerRecord({siteId,customer:{...(transaction.customer||{}),...(!transaction.customer?.email&&!transaction.customer?.phone?{customerId:anonymousId}:{})}});
  const key=`${siteId}/v3/customers/${seed.customerId}.json`,previous=await store.getWithMetadata(key,{type:'json'});
  if(previous&&!previous.etag)throw Object.assign(new Error('Customer concurrency metadata unavailable.'),{status:503});
  const marker=crypto.createHash('sha256').update(id).digest('hex'),fingerprint=crypto.createHash('sha256').update(JSON.stringify({amount:Number(transaction.amountTotal),kind:transaction.kind})).digest('hex');
  const entries=previous?.data.appliedTransactions||{};
  if(Object.hasOwn(entries,marker)){if(entries[marker]!==fingerprint)throw Object.assign(new Error('Customer transaction changed after application.'),{status:409});return previous.data;}
  if(Object.keys(entries).length>=5000)throw Object.assign(new Error('Customer transaction journal requires archival.'),{status:503});
  const customer=createCustomerRecord({siteId,customer:transaction.customer||{},existing:previous?.data||seed});
  customer.totalSpent=Number(previous?.data.totalSpent||0)+Number(transaction.amountTotal);
  customer.orderCount=Number(previous?.data.orderCount||0)+(transaction.kind==='order'?1:0);
  customer.bookingCount=Number(previous?.data.bookingCount||0)+(transaction.kind==='booking'?1:0);
  customer.lastActivityAt=transaction.paidAt||transaction.createdAt||new Date().toISOString();
  customer.appliedTransactions={...entries,[marker]:fingerprint};
  const applied=await store.setJSON(key,customer,previous?{onlyIfMatch:previous.etag}:{onlyIfNew:true});
  if(!applied.modified)throw Object.assign(new Error('Customer totals changed. Retry this transaction.'),{status:409});
  return customer;
}
