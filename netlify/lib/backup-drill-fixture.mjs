import crypto from 'node:crypto';
import { createSiteBackup } from './backup-recovery.mjs';
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const id=value=>crypto.createHash('sha256').update(value).digest('hex');

// No live store, identity, provider or customer data is read to build this sample.
export function createBackupDrillFixture(){
  const siteId='recovery-drill-synthetic',at='2026-01-01T00:00:00.000Z';
  const site={siteId,slug:siteId,members:[],revision:1,business:{name:'Synthetic recovery fixture'},products:[{id:'sample-product',stock:10}],stockOperations:{},stockReservations:{},inventoryArchive:{version:1,buckets:{},operationCount:0,reservationCount:0}};
  const commerce=[],indexes=new Map();
  const add=(type,markerId,value)=>{
    const record={schemaVersion:1,siteId,type,id:markerId,value},checksum=hash(record),bucket=markerId.slice(0,2);
    commerce.push({key:`${siteId}/inventory-archive-records/${type}-${markerId}-${checksum}.json`,value:record});
    const index=indexes.get(bucket)||{schemaVersion:1,siteId,bucket,entries:{}};
    index.entries[`${type}:${markerId}`]=checksum;indexes.set(bucket,index);
    site.inventoryArchive[type==='operation'?'operationCount':'reservationCount']++;
  };
  for(const referenceId of ['sample-sale-1','sample-sale-2','sample-sale-3']){
    const markerId=id(`sale:${referenceId}`);
    add('operation',markerId,{id:markerId,kind:'sale',referenceId,fingerprint:id(referenceId),deltas:[{productId:'sample-product',quantity:-1}],appliedAt:at});
  }
  add('reservation',id('reservation:sample-sale-1'),{referenceId:'sample-sale-1',fingerprint:id('sample-sale-1'),lines:[{productId:'sample-product',quantity:1}],state:'consumed',consumedAt:at});
  add('reservation',id('reservation:sample-unpaid'),{referenceId:'sample-unpaid',fingerprint:id('sample-unpaid'),lines:[{productId:'sample-product',quantity:1}],state:'released',releasedAt:at});
  for(const [bucket,index] of indexes){const checksum=hash(index);site.inventoryArchive.buckets[bucket]=checksum;commerce.push({key:`${siteId}/inventory-archive-index/${bucket}-${checksum}.json`,value:index});}
  const customer={siteId,customerId:'sample-customer',name:'Synthetic customer',totalSpent:10};
  const receipt={siteId,receiptId:'sample-receipt',referenceId:'sample-sale-1',total:10};
  commerce.push({key:`${siteId}/v3/customers/sample-customer.json`,value:customer},{key:`${siteId}/v3/receipts/sample-receipt.json`,value:receipt});
  return createSiteBackup({siteId,site,commerce,policyAndPreferenceRecords:[],assets:[],v3Collections:{customers:[customer],receipts:[receipt],'payment-links':[],'inventory-movements':[],'review-requests':[]}},'synthetic-preview-drill',at);
}
