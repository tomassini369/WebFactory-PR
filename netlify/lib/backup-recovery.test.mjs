import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTenantBackup,createSiteBackup,createAllBackup,sealBackup,validateBackup,runRestoreDrill,backupResponse,MAX_BACKUP_BYTES } from './backup-recovery.mjs';
import { createRestoreDrillHandler } from './restore-drill-handler.mjs';
function memory(rows=[]){const data=new Map(rows);return {data,async get(key){return structuredClone(data.get(key)??null)},async setJSON(key,value){data.set(key,structuredClone(value))},async getMetadata(key){return data.has(key)?{metadata:{contentType:'image/png'}}:null},async delete(key){data.delete(key)},list({prefix}){const keys=[...data.keys()].filter(key=>key.startsWith(prefix));return (async function*(){for(let i=0;i<keys.length;i+=3)yield {blobs:keys.slice(i,i+3).map(key=>({key,etag:'version'}))};})()}};}
const site={siteId:'business-1',slug:'business-one',members:[{email:'OWNER@example.com',role:'owner'}],business:{name:'Test fixture'},revision:7};
async function fixture(){const stores={events:memory([['business-1/marketing-suppression/hash.json',{unsubscribed:true}],['foreign/private.json',{private:true}]]),commerce:memory([['business-1/v3/receipts/receipt.json',{siteId:site.siteId,receiptId:'receipt',total:30}],['business-1/order/order.json',{siteId:site.siteId,status:'paid'}]]),assets:memory([['sites/business-1/logo.png',new Uint8Array([1,2,3])]])};const tenant=await buildTenantBackup(site,stores);return {stores,backup:createSiteBackup(tenant,'admin@example.com')};}
test('export includes every paginated V3 record beyond the previous 1000-record limit',async()=>{const stores={events:memory(),assets:memory(),commerce:memory(Array.from({length:1005},(_,i)=>[`business-1/v3/customers/${i}.json`,{siteId:site.siteId,customerId:String(i)}]))};const tenant=await buildTenantBackup(site,stores);assert.equal(tenant.commerce.length,1005);assert.equal(tenant.v3Collections.customers.length,1005);assert.equal(validateBackup(createSiteBackup(tenant,'admin')).recordCount,1008);});
test('isolated restore verifies records and rebuilds lookup indexes while reporting excluded asset files',async()=>{const {backup,stores}=await fixture();const target=memory();const result=await runRestoreDrill(backup,target);assert.equal(result.verifiedRecords,6);assert.equal(result.assetManifestCount,1);assert.equal(result.assetFilesRestored,false);assert.equal(result.externalIntegrationsRestored,false);assert.equal(result.temporaryRecordsRemoved,true);assert.equal(target.data.size,0);assert.equal(stores.commerce.data.size,2);assert.ok(stores.events.data.has('foreign/private.json'));});
test('altered backup values, missing records and mismatched redundant collections fail integrity validation',async()=>{const {backup}=await fixture();const altered=structuredClone(backup);altered.commerce[0].value.total=999;assert.throws(()=>validateBackup(altered),/integrity/);const missing=structuredClone(backup);missing.commerce.pop();assert.throws(()=>validateBackup(missing),/integrity/);const mismatch=structuredClone(backup);mismatch.v3Collections.receipts=[];assert.throws(()=>validateBackup(sealBackup((({integrity,...rest})=>rest)(mismatch))),/collection/);});
test('a recomputed checksum cannot bypass tenant boundaries, path checks or duplicate keys',async()=>{const {backup}=await fixture();for(const key of ['other-business/order.json','business-1/../foreign.json']){const altered=structuredClone(backup);altered.commerce[0].key=key;assert.throws(()=>validateBackup(sealBackup((({integrity,...rest})=>rest)(altered))),/boundary/);}const duplicate=structuredClone(backup);duplicate.commerce.push(duplicate.commerce[0]);assert.throws(()=>validateBackup(sealBackup((({integrity,...rest})=>rest)(duplicate))),/Duplicate/);});
test('cross-tenant identifiers, legacy versions and oversized restore drills are rejected before writes',async()=>{const {backup}=await fixture();const legacy={...backup,exportVersion:'webfactory-v3-site-backup-1'};assert.throws(()=>validateBackup(legacy),/version 2/);const other=structuredClone(backup);other.site.siteId='foreign';assert.throws(()=>validateBackup(sealBackup((({integrity,...rest})=>rest)(other))),/identity/);const target=memory();await assert.rejects(runRestoreDrill(backup,target,{maxRecords:2}),{status:413});assert.equal(target.data.size,0);});
test('a failed write response or corrupted read removes all temporary records',async()=>{const {backup}=await fixture();for(const mode of ['write','read']){const target=memory(),set=target.setJSON,get=target.get;let count=0;target.setJSON=async(key,value)=>{await set(key,value);if(mode==='write'&&++count===2)throw new Error('storage response failed')};target.get=async key=>mode==='read'?{corrupted:true}:get(key);await assert.rejects(runRestoreDrill(backup,target));assert.equal(target.data.size,0);}});
test('a failure deleting temporary data cannot return a successful recovery report',async()=>{const {backup}=await fixture();const target=memory();target.delete=async()=>{throw new Error('delete failed')};await assert.rejects(runRestoreDrill(backup,target),/cleanup failed/);});
test('combined backups verify counts, reject duplicate business snapshots and cannot silently exceed response size',async()=>{const {backup}=await fixture();const {exportVersion,exportedAt,exportedBy,scope,snapshotConsistency,integrity,...tenant}=backup;assert.equal(validateBackup(createAllBackup([tenant],'admin')).tenantCount,1);assert.throws(()=>validateBackup(createAllBackup([tenant,tenant],'admin')),/duplicate/);assert.throws(()=>backupResponse({text:'a'.repeat(MAX_BACKUP_BYTES)},'backup.json'),{status:413});});
test('export aborts on disappearing records and deadlines rather than returning a partial backup',async()=>{const stores={events:memory([['business-1/event.json',null]]),commerce:memory(),assets:memory()};await assert.rejects(buildTenantBackup(site,stores),{status:409});await assert.rejects(buildTenantBackup(site,{...stores,events:memory()},{clock:()=>10,deadline:0}),{status:503});});
const req=(body,origin='https://preview.example.com')=>new Request('https://preview.example.com/.netlify/functions/restore-backup-drill',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
test('drill endpoint refuses production, cross-origin requests and unauthorized users before storage access',async()=>{let storeCalls=0,authCalls=0;const handler=createRestoreDrillHandler({authorize:async()=>{authCalls++;throw Object.assign(new Error('not authorized'),{status:401})},createStore:()=>{storeCalls++;return memory()}});const preview={deploy:{context:'deploy-preview',published:false}};assert.equal((await handler(req({}),{deploy:{context:'production',published:true}})).status,403);assert.equal((await handler(req({},'https://attacker.example'),preview)).status,403);assert.equal((await handler(req({}),preview)).status,401);assert.equal(storeCalls,0);assert.equal(authCalls,1);});
test('authorized preview drill uses bounded JSON and returns a private summary, never customer records',async()=>{const {backup}=await fixture();const handler=createRestoreDrillHandler({authorize:async()=>{},createStore:()=>memory()}),preview={deploy:{context:'deploy-preview',published:false}};const result=await handler(req(backup),preview);assert.equal(result.status,200);assert.equal(result.headers.get('Cache-Control'),'no-store');assert.equal((await result.json()).verifiedRecords,6);const tooBig=await handler(req({text:'a'.repeat(MAX_BACKUP_BYTES)}),preview);assert.equal(tooBig.status,413);});
test('corruption and time limits never leave temporary records or a false success',async()=>{const {backup}=await fixture();const target=memory();let tick=0;await assert.rejects(runRestoreDrill(backup,target,{clock:()=>tick+=100,budgetMs:150}),{status:503});assert.equal(target.data.size,0);const handler=createRestoreDrillHandler({authorize:async()=>{},createStore:()=>memory()});const result=await handler(new Request('https://preview.example.com',{method:'POST',headers:{Origin:'https://preview.example.com','Content-Type':'application/json'},body:'{broken'}),{deploy:{context:'deploy-preview',published:false}});assert.equal(result.status,400);});

async function archivedFixture(){
  const crypto=await import('node:crypto');
  const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const backup=structuredClone((await fixture()).backup),id='ab'+'1'.repeat(62),reservationId='cd'+'2'.repeat(62);
  backup.site.inventoryArchive={version:1,buckets:{},operationCount:1,reservationCount:1};
  for(const [type,markerId,value] of [['operation',id,{kind:'sale',referenceId:'archived-sale',deltas:[]}],['reservation',reservationId,{state:'released',referenceId:'archived-reservation',lines:[]}]]){
    const record={schemaVersion:1,siteId:site.siteId,type,id:markerId,value},checksum=hash(record),bucket=markerId.slice(0,2);
    const index={schemaVersion:1,siteId:site.siteId,bucket,entries:{[`${type}:${markerId}`]:checksum}},indexChecksum=hash(index);
    backup.site.inventoryArchive.buckets[bucket]=indexChecksum;
    backup.commerce.push({key:`${site.siteId}/inventory-archive-records/${type}-${markerId}-${checksum}.json`,value:record},{key:`${site.siteId}/inventory-archive-index/${bucket}-${indexChecksum}.json`,value:index});
  }
  return reseal(backup);
}
test('archive restoration proves operation and reservation lookups against isolated copies',async()=>{
  const backup=await archivedFixture(),target=memory();
  const result=await runRestoreDrill(backup,target);
  assert.equal(result.archiveIndexes,2);assert.equal(result.archiveOperations,1);assert.equal(result.archiveReservations,1);
  assert.equal(result.verifiedRecords,10);assert.equal(target.data.size,0);
});
test('resealed backups reject missing, modified or reordered published archive evidence before writes',async()=>{
  const source=await archivedFixture();
  for(const mutate of [b=>b.commerce.splice(2,1),b=>b.commerce.splice(3,1),b=>{b.commerce[2].value.value.kind='refund'},b=>{b.site.inventoryArchive.operationCount=2},b=>{b.commerce[3].value=Object.fromEntries(Object.entries(b.commerce[3].value).reverse())},b=>{b.site.inventoryArchive.buckets.ab='f'.repeat(64)}]){
    const backup=structuredClone(source);mutate(backup);const target=memory();
    await assert.rejects(runRestoreDrill(reseal(backup),target),/archive/);assert.equal(target.data.size,0);
  }
});
test('export refuses an incomplete published archive but permits unreferenced prepared copies',async()=>{
  const backup=await archivedFixture();
  const stores={events:memory(),assets:memory(),commerce:memory(backup.commerce.map(row=>[row.key,row.value]))};
  stores.commerce.data.set(`${site.siteId}/inventory-archive-index/prepared-orphan.json`,{prepared:true});
  const tenant=await buildTenantBackup(backup.site,stores);
  assert.equal(validateBackup(createSiteBackup(tenant,'admin')).archives[0].operations,1);
  stores.commerce.data.delete(backup.commerce[2].key);
  await assert.rejects(buildTenantBackup(backup.site,stores),/archive/);
});
test('restore rejects storage that changes archive property order and cleans every temporary record',async()=>{
  const backup=await archivedFixture(),target=memory(),get=target.get;
  target.get=async key=>{const value=await get(key);return key.includes('inventory-archive-index/')?Object.fromEntries(Object.entries(value).reverse()):value};
  await assert.rejects(runRestoreDrill(backup,target),/archive/);assert.equal(target.data.size,0);
});

function reseal(backup){const {integrity,...payload}=backup;return sealBackup(payload);}
