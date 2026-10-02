import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { createSiteBackup,validateBackup,runRestoreDrill } from '../netlify/lib/backup-recovery.mjs';
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
// Synthetic, local memory only. These numbers do not estimate Netlify latency,
// storage costs or production capacity. Larger drills here are offline only.
for(const count of [10,50,1000]){
  const siteId='benchmark',buckets={},indexes=new Map(),commerce=[];
  for(let n=0;n<count;n++){
    const id=crypto.createHash('sha256').update(`sale:fixture-${n}`).digest('hex'),bucket=id.slice(0,2);
    const record={schemaVersion:1,siteId,type:'operation',id,value:{kind:'sale',referenceId:`fixture-${n}`,deltas:[]}},checksum=hash(record);
    commerce.push({key:`${siteId}/inventory-archive-records/operation-${id}-${checksum}.json`,value:record});
    const index=indexes.get(bucket)||{schemaVersion:1,siteId,bucket,entries:{}};
    index.entries[`operation:${id}`]=checksum;indexes.set(bucket,index);
  }
  for(const [bucket,index] of indexes){const checksum=hash(index);buckets[bucket]=checksum;commerce.push({key:`${siteId}/inventory-archive-index/${bucket}-${checksum}.json`,value:index});}
  const site={siteId,slug:siteId,members:[],inventoryArchive:{version:1,buckets,operationCount:count,reservationCount:0}};
  const backup=createSiteBackup({siteId,site,commerce,policyAndPreferenceRecords:[],assets:[],v3Collections:Object.fromEntries(['customers','receipts','payment-links','inventory-movements','review-requests'].map(key=>[key,[]]))},'synthetic-local');
  const data=new Map(),calls={reads:0,writes:0,deletes:0};
  const store={async get(key){calls.reads++;return structuredClone(data.get(key)??null)},async setJSON(key,value){calls.writes++;data.set(key,structuredClone(value))},async delete(key){calls.deletes++;data.delete(key)}};
  const started=performance.now(),validated=validateBackup(backup),validatedAt=performance.now();
  const report=await runRestoreDrill(backup,store,{maxRecords:5000});
  if(data.size||report.archiveOperations!==count)throw new Error('Incomplete synthetic recovery');
  console.log(JSON.stringify({environment:'synthetic-local-memory',archiveOperations:count,records:validated.recordCount,bytes:Buffer.byteLength(JSON.stringify(backup)),validationMs:+(validatedAt-started).toFixed(2),drillMs:+(performance.now()-validatedAt).toFixed(2),...calls,temporaryRecordsRemoved:report.temporaryRecordsRemoved,hostedDrillRecordLimit:100}));
}
