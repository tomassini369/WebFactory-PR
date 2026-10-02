import { useState, type FormEvent } from 'react'
import { PortalPanel } from './PortalPanel'

type DrillReport={verifiedRecords:number;tenantCount:number;assetManifestCount:number;temporaryRecordsRemoved:boolean;checksum:string}
export default function BackupRecovery({lang,enabled}:{lang:'es'|'en';enabled:boolean}) {
  const es=lang==='es'
  const [file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[report,setReport]=useState<DrillReport|null>(null)
  const verify=async(event:FormEvent)=>{
    event.preventDefault();if(!file||busy)return
    setBusy(true);setError('');setReport(null)
    try{
      if(file.size>4*1024*1024)throw new Error(es?'El archivo excede 4 MiB.':'The file exceeds 4 MiB.')
      const body=await file.text();JSON.parse(body)
      const response=await fetch('/.netlify/functions/restore-backup-drill',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body})
      const result=await response.json();if(!response.ok)throw new Error(result.message||'Restore drill failed.')
      setReport(result)
    }catch(e){setError(e instanceof Error?e.message:'Restore drill failed.')}finally{setBusy(false)}
  }
  return <PortalPanel className="wfa-card"><header><div><small>{es?'RECUPERACIÓN':'RECOVERY'}</small><h2>{es?'Comprobar un backup':'Check a backup'}</h2></div></header>
    <p className="wfa-note">{es?'Los backups incluyen configuración y registros del negocio. Los archivos de imágenes se enumeran en un manifiesto; conserva sus originales y vuelve a conectar las integraciones externas al recuperar.':'Backups include business configuration and records. Image files are listed in a manifest; keep their originals and reconnect external integrations during recovery.'}</p>
    {enabled?<><p className="wfa-note">{es?'Este simulacro recupera hasta 100 registros en un área separada, verifica su integridad y elimina las copias temporales. Usa un export nuevo de versión 2, de hasta 4 MiB.':'This drill restores up to 100 records in a separate area, checks their integrity and removes temporary copies. Use a new version 2 export, up to 4 MiB.'}</p><form onSubmit={verify}><label htmlFor="backup-drill-file">{es?'Archivo de backup':'Backup file'}</label><input id="backup-drill-file" type="file" accept="application/json,.json" disabled={busy} onChange={event=>{setFile(event.target.files?.[0]||null);setReport(null);setError('')}}/><button type="submit" disabled={!file||busy}>{busy?(es?'Comprobando…':'Checking…'):(es?'Ejecutar simulacro aislado':'Run isolated drill')}</button></form></>:<p className="wfa-note">{es?'El simulacro está disponible en la vista previa.':'The restore drill is available in the deploy preview.'}</p>}
    {error&&<p className="wfa-alert danger" role="alert">{error}</p>}
    {report&&<div className="wfa-alert success" role="status"><p>{es?`${report.verifiedRecords} registros verificados de ${report.tenantCount} negocio(s). Copias temporales eliminadas.`:`${report.verifiedRecords} records verified across ${report.tenantCount} business(es). Temporary copies removed.`}</p><p>{es?`${report.assetManifestCount} archivos enumerados; sus contenidos no fueron restaurados.`:`${report.assetManifestCount} files listed; their contents were not restored.`}</p></div>}
  </PortalPanel>
}
