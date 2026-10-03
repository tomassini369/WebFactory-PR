import crypto from 'node:crypto';
import {buildTenantBackup,createSiteBackup,validateBackup} from './backup-recovery.mjs';
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const fail=message=>Object.assign(Error(message),{status:503});
// Private snapshots include binary assets. A published completion marker is written
// only after every JSON and binary copy has been read back and verified.
export async function captureTenantSnapshot(site,stores,destination,{clock=Date.now,budgetMs=18000,maxAssets=100,maxAssetBytes=64*1024*1024}={}){
 const started=clock(),deadline=started+budgetMs,id=crypto.randomUUID(),prefix=`snapshots/${site.siteId}/${id}/`;
 const check=()=>{if(clock()>deadline)throw fail('Snapshot time budget exceeded')};
 try{
  const tenant=await buildTenantBackup(site,stores,{clock,deadline});
  const backup=createSiteBackup(tenant,'scheduled-backup',new Date(started).toISOString());validateBackup(backup);
  if(tenant.assets.length>maxAssets)throw fail('Snapshot asset count exceeds batch capacity');
  await destination.setJSON(prefix+'records.json',backup);
  const copied=await destination.get(prefix+'records.json',{type:'json'});validateBackup(copied);if(copied.integrity.digest!==backup.integrity.digest)throw fail('Snapshot record checksum mismatch');
  const assets=[];let bytes=0;
  for(const asset of tenant.assets){
   check();const source=await stores.assets.getWithMetadata(asset.key,{type:'arrayBuffer'});
   if(!source||asset.etag&&source.etag!==asset.etag)throw fail('Asset changed during snapshot');
   const data=Buffer.from(source.data);bytes+=data.length;if(bytes>maxAssetBytes)throw fail('Snapshot asset bytes exceed batch capacity');
   const digest=hash(data),target=prefix+'assets/'+hash(Buffer.from(asset.key));
   await destination.set(target,data,{metadata:source.metadata||{}});
   const verified=await destination.get(target,{type:'arrayBuffer'});if(!verified||hash(Buffer.from(verified))!==digest)throw fail('Snapshot asset verification failed');
   const latest=await stores.assets.getMetadata(asset.key);if(!latest||source.etag!==latest.etag)throw fail('Asset changed during snapshot');
   assets.push({key:asset.key,target,sha256:digest,size:data.length,metadata:source.metadata||{}});
  }
  check();const current=await stores.sites.get(`sites/${site.siteId}.json`,{type:'json'});if(!current||Number(current.revision||0)!==Number(site.revision||0))throw fail('Business changed during snapshot');
  const manifest={version:1,id,siteId:site.siteId,createdAt:new Date(started).toISOString(),recordsKey:prefix+'records.json',recordsChecksum:backup.integrity.digest,assets,assetBytes:bytes,snapshotConsistency:'non-transactional',externalIntegrationsRestored:false};
  await destination.setJSON(prefix+'manifest.json',manifest);const verified=await destination.get(prefix+'manifest.json',{type:'json'});if(JSON.stringify(verified)!==JSON.stringify(manifest))throw fail('Snapshot manifest verification failed');
  check();await destination.setJSON(`latest/${site.siteId}.json`,{id,manifestKey:prefix+'manifest.json',createdAt:manifest.createdAt,assets:assets.length,assetBytes:bytes});
  return {ok:true,id,assets:assets.length,assetBytes:bytes,elapsedMs:clock()-started};
 }catch(error){
  // Incomplete copies are private and never replace latest. Retain evidence for
  // manual maintenance; no production source is deleted during backup.
  await destination.setJSON(prefix+'incomplete.json',{id,siteId:site.siteId,createdAt:new Date(started).toISOString(),complete:false});throw error;
 }
}
export async function verifyTenantSnapshot(destination,manifest){
 if(manifest?.version!==1||!/^[a-zA-Z0-9_-]{1,120}$/.test(manifest.siteId||'')||!/^[a-f0-9-]{36}$/.test(manifest.id||''))throw fail('Invalid snapshot identity');
 const prefix=`snapshots/${manifest.siteId}/${manifest.id}/`;if(manifest.recordsKey!==prefix+'records.json'||!Array.isArray(manifest.assets)||manifest.assets.length>100)throw fail('Invalid snapshot manifest');
 const backup=await destination.get(manifest.recordsKey,{type:'json'});const validated=validateBackup(backup);
 if(backup.siteId!==manifest.siteId||validated.checksum!==manifest.recordsChecksum)throw fail('Snapshot record integrity failed');
 const sourceAssets=backup.assets||[],seen=new Set();let bytes=0;
 if(sourceAssets.length!==manifest.assets.length)throw fail('Snapshot asset list is incomplete');
 for(const asset of manifest.assets){
  if(seen.has(asset.key)||!sourceAssets.some(source=>source.key===asset.key)||asset.target!==prefix+'assets/'+hash(Buffer.from(asset.key)))throw fail('Invalid snapshot asset reference');seen.add(asset.key);
  const data=await destination.get(asset.target,{type:'arrayBuffer'});if(!data||Buffer.byteLength(data)!==asset.size||hash(Buffer.from(data))!==asset.sha256)throw fail('Snapshot binary checksum failed');bytes+=asset.size;
 }
 if(bytes!==manifest.assetBytes)throw fail('Snapshot byte count mismatch');
 return {ok:true,verifiedRecords:validated.recordCount,verifiedAssets:seen.size,assetBytes:bytes,scope:'business-records-and-binary-assets',snapshotConsistency:'non-transactional',externalIntegrationsRestored:false};
}
