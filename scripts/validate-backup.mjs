import { readFile } from 'node:fs/promises';
import { validateBackup,MAX_BACKUP_BYTES } from '../netlify/lib/backup-recovery.mjs';
try{
  if(process.argv.length!==3)throw new Error('Usage: node scripts/validate-backup.mjs /path/to/backup.json');
  const source=await readFile(process.argv[2]);
  if(source.length>MAX_BACKUP_BYTES)throw new Error('Backup exceeds the 4 MiB validation limit.');
  const {entries,archives,...report}=validateBackup(JSON.parse(source.toString('utf8')));
  const archiveCounts=archives.reduce((counts,archive)=>({indexes:counts.indexes+archive.indexes,operations:counts.operations+archive.operations,reservations:counts.reservations+archive.reservations}),{indexes:0,operations:0,reservations:0});
  console.log(JSON.stringify({ok:true,...report,archiveCounts,assetFilesIncluded:false,externalIntegrationsIncluded:false},null,2));
}catch(error){console.error(error.message);process.exitCode=1;}
