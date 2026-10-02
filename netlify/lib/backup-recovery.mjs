import crypto from 'node:crypto';
import { emailHash,normalizeEmail,slugify } from './client-store.mjs';

export const MAX_BACKUP_BYTES=4*1024*1024;
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const siteIdPattern=/^[a-zA-Z0-9_-]{1,120}$/;
const collections=['customers','receipts','payment-links','inventory-movements','review-requests'];
export function canonical(value,depth=0){
  if(depth>80)throw fail('Backup nesting is too deep.',413);
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return `[${value.map(item=>canonical(item,depth+1)).join(',')}]`;
  return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key],depth+1)}`).join(',')}}`;
}
const digest=value=>crypto.createHash('sha256').update(canonical(value)).digest('hex');
const unsigned=backup=>{const {integrity,...payload}=backup;return payload;};
export function sealBackup(payload){return {...payload,integrity:{algorithm:'sha256',digest:digest(payload)}};}
export function backupResponse(payload,filename){
  const body=JSON.stringify(payload);
  if(Buffer.byteLength(body)>MAX_BACKUP_BYTES)throw fail('Backup exceeds the synchronous export limit. Export individual businesses or use an offline recovery workflow.',413);
  return new Response(body,{headers:{'Content-Type':'application/json; charset=utf-8','Content-Disposition':`attachment; filename="${filename}"`,'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
}

export async function buildTenantBackup(site,stores,{clock=Date.now,deadline=clock()+40000,maxRecords=5000}={}){
  if(!siteIdPattern.test(site?.siteId||'')||!site.slug)throw fail('Invalid business backup identity.',409);
  let bytes=Buffer.byteLength(JSON.stringify(site)),records=2+(site.members||[]).filter(member=>normalizeEmail(member.email)).length;
  const check=value=>{if(clock()>deadline)throw fail('Backup exceeded the synchronous time limit. No partial backup was returned.',503);if(value){bytes+=Buffer.byteLength(JSON.stringify(value));records++;}if(records>maxRecords||bytes>MAX_BACKUP_BYTES)throw fail('Backup exceeds the synchronous export limit. No partial backup was returned.',413);};
  check();
  async function readPrefix(store,prefix){
    const result=[];
    for await(const page of store.list({prefix,paginate:true})){
      check();
      for(const {key} of page.blobs||[]){
        check();
        const value=await store.get(key,{type:'json'});
        if(value===null)throw fail('Backup source changed during export. Retry the export.',409);
        if(!key.startsWith(prefix)||value?.siteId&&value.siteId!==site.siteId)throw fail('Backup contains inconsistent business records.',409);
        const entry={key,value};check(entry);result.push(entry);
      }
    }
    return result;
  }
  const policyAndPreferenceRecords=await readPrefix(stores.events,`${site.siteId}/`);
  const commerce=await readPrefix(stores.commerce,`${site.siteId}/`);
  const assets=[];
  for await(const page of stores.assets.list({prefix:`sites/${site.siteId}/`,paginate:true})){
    check();
    for(const {key,etag} of page.blobs||[]){const meta=await stores.assets.getMetadata(key);if(!meta)throw fail('Backup asset manifest changed. Retry the export.',409);const entry={key,etag:etag||'',metadata:meta.metadata||{}};check(entry);assets.push(entry);}
  }
  check();
  const v3Collections=Object.fromEntries(collections.map(group=>[group,commerce.filter(row=>row.key.startsWith(`${site.siteId}/v3/${group}/`)).map(row=>row.value)]));
  return {siteId:site.siteId,site,policyAndPreferenceRecords,commerce,v3Collections,assets};
}

export function createSiteBackup(tenant,exportedBy,now=new Date().toISOString()){
  return sealBackup({exportVersion:'webfactory-v3-site-backup-2',exportedAt:now,exportedBy,scope:'business-records-and-asset-manifest',snapshotConsistency:'non-transactional',...tenant});
}
export function createAllBackup(tenants,exportedBy,now=new Date().toISOString()){
  return sealBackup({exportVersion:'webfactory-v3-all-tenants-backup-2',exportedAt:now,exportedBy,scope:'business-records-and-asset-manifest',snapshotConsistency:'non-transactional',tenantCount:tenants.length,tenants});
}

export function validateBackup(backup,{maxRecords=5000}={}){
  if(!backup||typeof backup!=='object'||Array.isArray(backup))throw fail('Invalid backup file.');
  if(!['webfactory-v3-site-backup-2','webfactory-v3-all-tenants-backup-2'].includes(backup.exportVersion))throw fail('Use a new version 2 backup export. Legacy backups lack an integrity checksum.');
  if(backup.integrity?.algorithm!=='sha256'||backup.integrity?.digest!==digest(unsigned(backup)))throw fail('Backup integrity check failed.');
  if(backup.scope!=='business-records-and-asset-manifest'||backup.snapshotConsistency!=='non-transactional')throw fail('Unsupported backup scope.');
  const tenants=backup.exportVersion==='webfactory-v3-site-backup-2'?[backup]:backup.tenants;
  if(!Array.isArray(tenants)||tenants.length>100||backup.tenantCount!==undefined&&backup.tenantCount!==tenants.length)throw fail('Invalid backup tenant count.');
  const seenTenants=new Set(),entries=[],seenKeys=new Set();let assetCount=0;
  function add(store,key,value){const compound=`${store}:${key}`;if(seenKeys.has(compound))throw fail('Duplicate backup record.');seenKeys.add(compound);entries.push({store,key,value});if(entries.length>maxRecords)throw fail('Backup exceeds the restore drill record limit. Validate offline or use a staged recovery workflow.',413);}
  for(const tenant of tenants){
    const id=tenant.siteId;
    if(!siteIdPattern.test(id||'')||tenant.site?.siteId!==id||!tenant.site.slug||slugify(tenant.site.slug)!==tenant.site.slug||seenTenants.has(id))throw fail('Invalid or duplicate business identity.');
    seenTenants.add(id);add('sites',`sites/${id}.json`,tenant.site);
    add('sites',`slugs/${tenant.site.slug}.json`,{siteId:id});
    if(!Array.isArray(tenant.site.members||[]))throw fail('Invalid business memberships.');
    for(const member of tenant.site.members||[]){const email=normalizeEmail(member.email);if(email)add('sites',`members/${emailHash(email)}/${id}.json`,{siteId:id,email,role:member.role||'owner'});}
    for(const [field,store] of [['commerce','commerce'],['policyAndPreferenceRecords','events']]){
      if(!Array.isArray(tenant[field]))throw fail('Missing business backup records.');
      for(const row of tenant[field]){if(typeof row?.key!=='string'||!row.key.startsWith(`${id}/`)||row.key.length>500||row.key.split('/').some(part=>!part||part==='.'||part==='..')||row.value===undefined||row.value?.siteId&&row.value.siteId!==id)throw fail('Backup record crosses a business boundary.');add(store,row.key,row.value);}
    }
    if(!Array.isArray(tenant.assets))throw fail('Missing asset manifest.');
    const assetKeys=new Set();
    for(const asset of tenant.assets){if(typeof asset?.key!=='string'||!asset.key.startsWith(`sites/${id}/`)||assetKeys.has(asset.key)||asset.key.split('/').some(part=>part==='.'||part==='..'))throw fail('Invalid asset manifest.');assetKeys.add(asset.key);assetCount++;}
    for(const group of collections){const values=tenant.commerce.filter(row=>row.key.startsWith(`${id}/v3/${group}/`)).map(row=>row.value);if(canonical(values)!==canonical(tenant.v3Collections?.[group]))throw fail('Backup collection disagrees with raw records.');}
  }
  return {entries,tenantCount:tenants.length,recordCount:entries.length,assetManifestCount:assetCount,checksum:backup.integrity.digest};
}

// The caller supplies a dedicated drill store. Live stores are never passed here.
export async function runRestoreDrill(backup,store,{clock=Date.now,maxRecords=100,budgetMs=30000}={}){
  const started=clock(),validated=validateBackup(backup,{maxRecords});
  const prefix=`drills/${crypto.randomUUID()}/`,written=[];
  let report;
  try{
    for(const entry of validated.entries){
      if(clock()-started>budgetMs)throw fail('Restore drill exceeded its time budget.',503);
      const key=`${prefix}${entry.store}/${entry.key}`;
      // Track before writing: a write can reach storage even if its response fails.
      written.push(key);await store.setJSON(key,entry.value);
      const restored=await store.get(key,{type:'json'});
      if(digest(restored)!==digest(entry.value))throw fail('Restored record integrity check failed.',409);
    }
    report={ok:true,isolated:true,tenantCount:validated.tenantCount,verifiedRecords:validated.recordCount,assetManifestCount:validated.assetManifestCount,checksum:validated.checksum,elapsedMs:clock()-started,scope:'business-records-only',assetFilesRestored:false,externalIntegrationsRestored:false,snapshotConsistency:'non-transactional'};
  }finally{
    // No success response until every temporary business record is removed.
    const removed=await Promise.allSettled(written.map(key=>store.delete(key)));
    if(removed.some(item=>item.status==='rejected')){console.error('backup-drill-cleanup',JSON.stringify({prefix,failed:removed.filter(item=>item.status==='rejected').length}));throw fail('Temporary drill cleanup failed. Administrative cleanup is required.',503);}
  }
  return {...report,elapsedMs:clock()-started,temporaryRecordsRemoved:true};
}
