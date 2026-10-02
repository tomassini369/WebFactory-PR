import crypto from 'node:crypto';
import { clientCommerceStore,clientSiteStore,siteKey } from './client-store.mjs';
import { withBookingLock } from './booking-lock.mjs';
import { reservationId } from './inventory-availability.mjs';

const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const hashText=value=>crypto.createHash('sha256').update(value).digest('hex');
const sha=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const fail=(message,status=503)=>Object.assign(new Error(message),{status,code:'INVENTORY_ARCHIVE_UNAVAILABLE'});
const indexKey=(siteId,bucket,checksum)=>`${siteId}/inventory-archive-index/${bucket}-${checksum}.json`;
const recordKey=(siteId,type,id,checksum)=>`${siteId}/inventory-archive-records/${type}-${id}-${checksum}.json`;
const emptyIndex=(siteId,bucket)=>({schemaVersion:1,siteId,bucket,entries:{}});

function archiveRoot(site){
  if(!site.inventoryArchive)return null;
  const root=site.inventoryArchive;
  if(root.version!==1||!root.buckets||Array.isArray(root.buckets)||Object.keys(root.buckets).length>256||![root.operationCount,root.reservationCount].every(value=>Number.isSafeInteger(value)&&value>=0)||Object.entries(root.buckets).some(([key,value])=>!/^[a-f0-9]{2}$/.test(key)||!sha(value)))throw fail('Inventory archive index requires recovery.');
  return root;
}
async function readIndex(siteId,bucket,checksum,store){
  const index=await store.get(indexKey(siteId,bucket,checksum),{type:'json'});
  if(!index||hash(index)!==checksum||index.siteId!==siteId||index.bucket!==bucket||index.schemaVersion!==1||!index.entries||Array.isArray(index.entries)||Object.keys(index.entries).length>10000||Object.entries(index.entries).some(([key,value])=>!new RegExp(`^(operation|reservation):${bucket}[a-f0-9]{62}$`).test(key)||!sha(value)))throw fail('Inventory archive index is missing or altered.');
  return index;
}
export async function archivedInventoryMarker(site,type,id,store){
  const root=archiveRoot(site);
  if(!root)return null;
  store=store||clientCommerceStore();
  if(!['operation','reservation'].includes(type)||!sha(id))throw fail('Invalid inventory archive lookup.',400);
  const bucket=id.slice(0,2),checksum=root.buckets[bucket];
  if(!checksum)return null;
  const index=await readIndex(site.siteId,bucket,checksum,store),entry=index.entries[`${type}:${id}`];
  if(entry===undefined)return null;
  if(!sha(entry))throw fail('Invalid inventory archive reference.');
  const record=await store.get(recordKey(site.siteId,type,id,entry),{type:'json'});
  if(!record||hash(record)!==entry||record.siteId!==site.siteId||record.schemaVersion!==1||record.type!==type||record.id!==id||!record.value)throw fail('Inventory archive evidence is missing or altered.');
  return record.value;
}
export async function findStockOperation(site,id,store){
  return site.stockOperations?.[id]||await archivedInventoryMarker(site,'operation',id,store);
}
export async function findStockReservation(site,referenceId,store){
  const id=reservationId(referenceId);
  return site.stockReservations?.[id]||await archivedInventoryMarker(site,'reservation',id,store);
}
async function immutableCopy(store,key,value){
  await store.setJSON(key,value,{onlyIfNew:true});
  const copy=await store.get(key,{type:'json'});
  if(!copy||hash(copy)!==hash(value))throw fail('Inventory archive copy could not be verified.');
}

// Publish archive locations and remove active markers in ONE site CAS write.
// Copies written before that commit are harmless and can be reused after a retry.
export async function archiveInventoryBatch(siteId,savedBy,{stock=clientSiteStore(),store=clientCommerceStore(),clock=Date.now,budgetMs=20000}={}){
  const started=clock(),cutoff=started-30*86400000;
  const check=()=>{if(clock()-started>budgetMs)throw fail('Archival exceeded its time budget; active history was retained.')};
  const batches=async(rows,fn)=>{const values=[];for(let i=0;i<rows.length;i+=5){check();const results=await Promise.allSettled(rows.slice(i,i+5).map(fn));const rejected=results.find(result=>result.status==='rejected');if(rejected)throw rejected.reason;values.push(...results.map(result=>result.value));check()}return values};
  return withBookingLock(store,`locks/commerce/${siteId}`,async()=>{
    const source=await stock.getWithMetadata(siteKey(siteId),{type:'json'});
    if(!source?.etag||source.data?.siteId!==siteId)throw fail('Business concurrency metadata is unavailable.');
    const site=source.data,root=archiveRoot(site)||{version:1,buckets:{},operationCount:0,reservationCount:0};
    const candidates=[],skipped=[];
    for(const [id,value] of Object.entries(site.stockOperations||{})){
      const at=Date.parse(value.appliedAt);
      if(!Number.isFinite(at)||at>cutoff)continue;
      if(!sha(id)||value.id!==id||!['sale','refund','adjustment'].includes(value.kind)||typeof value.referenceId!=='string'||id!==hashText(`${value.kind}:${value.referenceId}`)||!sha(value.fingerprint)||!Array.isArray(value.deltas)){skipped.push(id);continue}
      candidates.push({type:'operation',id,value,at});
    }
    for(const [id,value] of Object.entries(site.stockReservations||{})){
      if(!['released','consumed'].includes(value.state))continue;
      const at=Date.parse(value.state==='released'?value.releasedAt:value.consumedAt);
      if(!Number.isFinite(at)||at>cutoff)continue;
      if(!sha(id)||typeof value.referenceId!=='string'||reservationId(value.referenceId)!==id||!sha(value.fingerprint)||!Array.isArray(value.lines)){skipped.push(id);continue}
      candidates.push({type:'reservation',id,value,at});
    }
    const selected=candidates.sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id)).slice(0,50);
    check();
    if(!selected.length)return {archivedOperations:0,archivedReservations:0,remainingEligible:0,skippedCount:skipped.length,activeInventoryUnchanged:true};
    check();
    const indexes=new Map();let addedOperations=0,addedReservations=0;
    // Keep the batch bounded; each selected entry is copied and reread before
    // any active marker is removed. Never archive a held reservation.
    const accepted=(await batches(selected,async row=>{
      if(row.type==='reservation'&&row.value.state==='consumed'){
        const sale=await findStockOperation(site,hashText(`sale:${row.value.referenceId}`),store);
        if(!sale||sale.kind!=='sale'||sale.referenceId!==row.value.referenceId||sale.appliedAt!==row.value.consumedAt){skipped.push(row.id);return null}
      }
      return row;
    })).filter(Boolean);
    await batches([...new Set(accepted.map(row=>row.id.slice(0,2)))],async bucket=>{indexes.set(bucket,root.buckets[bucket]?await readIndex(siteId,bucket,root.buckets[bucket],store):emptyIndex(siteId,bucket))});
    const copies=[];
    for(const row of accepted){
      const bucket=row.id.slice(0,2);
      const index=indexes.get(bucket),record={schemaVersion:1,siteId,type:row.type,id:row.id,value:row.value},checksum=hash(record),entryKey=`${row.type}:${row.id}`;
      if(index.entries[entryKey]!==undefined&&index.entries[entryKey]!==checksum)throw fail('Active inventory conflicts with archived evidence.',409);
      if(index.entries[entryKey]===undefined){if(row.type==='operation')addedOperations++;else addedReservations++}
      index.entries[entryKey]=checksum;
      if(Object.keys(index.entries).length>10000||Buffer.byteLength(JSON.stringify(index))>2*1024*1024)throw fail('Inventory archive bucket requires migration.');
      copies.push({key:recordKey(siteId,row.type,row.id,checksum),record});
    }
    await batches(copies,row=>immutableCopy(store,row.key,row.record));
    const buckets={...root.buckets};
    await batches([...indexes],async([bucket,index])=>{const checksum=hash(index);await immutableCopy(store,indexKey(siteId,bucket,checksum),index);buckets[bucket]=checksum});
    if(!accepted.length)return {archivedOperations:0,archivedReservations:0,remainingEligible:candidates.length,skippedCount:skipped.length,activeInventoryUnchanged:true};
    const operations={...site.stockOperations},reservations={...site.stockReservations};
    for(const row of accepted)delete (row.type==='operation'?operations:reservations)[row.id];
    const now=new Date(started).toISOString();
    const audit={siteId,savedBy,preparedAt:now,state:'prepared',baseRevision:Number(site.revision||0),records:accepted.map(row=>({type:row.type,id:row.id})),buckets};
    await immutableCopy(store,`${siteId}/inventory-archive-audits/${hash(audit)}.json`,audit);
    check();
    const result=await stock.setJSON(siteKey(siteId),{...site,stockOperations:operations,stockReservations:reservations,inventoryArchive:{...root,buckets,operationCount:Number(root.operationCount||0)+addedOperations,reservationCount:Number(root.reservationCount||0)+addedReservations,lastArchivedAt:now},revision:Number(site.revision||0)+1,updatedAt:now},{onlyIfMatch:source.etag});
    if(!result.modified)throw fail('Inventory changed during archival. Retry with a fresh report.',409);
    return {archivedOperations:accepted.filter(row=>row.type==='operation').length,archivedReservations:accepted.filter(row=>row.type==='reservation').length,remainingEligible:Math.max(0,candidates.length-accepted.length),skippedCount:skipped.length,activeInventoryUnchanged:true};
  });
}
