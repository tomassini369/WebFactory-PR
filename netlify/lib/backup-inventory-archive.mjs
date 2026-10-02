import crypto from 'node:crypto';
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const sha=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const fail=()=>Object.assign(new Error('Backup inventory archive is incomplete or altered.'),{status:409});

// Only the published root is authoritative. Prepared copies from failed CAS
// writes may remain in the export without becoming recovery dependencies.
export function validateBackupArchive(site,rows){
  const root=site.inventoryArchive,markers=[];
  if(!root)return {indexes:0,operations:0,reservations:0,markers};
  if(root.version!==1||!root.buckets||typeof root.buckets!=='object'||Array.isArray(root.buckets)||Object.keys(root.buckets).length>256||![root.operationCount,root.reservationCount].every(n=>Number.isSafeInteger(n)&&n>=0))throw fail();
  const values=new Map(rows.map(row=>[row.key,row.value]));
  let operations=0,reservations=0;
  for(const [bucket,checksum] of Object.entries(root.buckets)){
    if(!/^[a-f0-9]{2}$/.test(bucket)||!sha(checksum))throw fail();
    const index=values.get(`${site.siteId}/inventory-archive-index/${bucket}-${checksum}.json`);
    if(!index||hash(index)!==checksum||index.schemaVersion!==1||index.siteId!==site.siteId||index.bucket!==bucket||!index.entries||typeof index.entries!=='object'||Array.isArray(index.entries)||Object.keys(index.entries).length>10000)throw fail();
    for(const [key,recordChecksum] of Object.entries(index.entries)){
      if(!new RegExp(`^(operation|reservation):${bucket}[a-f0-9]{62}$`).test(key)||!sha(recordChecksum))throw fail();
      const [type,id]=key.split(':');
      const record=values.get(`${site.siteId}/inventory-archive-records/${type}-${id}-${recordChecksum}.json`);
      if(!record||hash(record)!==recordChecksum||record.schemaVersion!==1||record.siteId!==site.siteId||record.type!==type||record.id!==id||!record.value)throw fail();
      markers.push({type,id,value:record.value});
      if(type==='operation')operations++;else reservations++;
    }
  }
  if(root.operationCount!==operations||root.reservationCount!==reservations)throw fail();
  return {indexes:Object.keys(root.buckets).length,operations,reservations,markers};
}
