import { useState, type FormEvent } from 'react'
import { PortalPanel } from './PortalPanel'

type DrillReport={ok:boolean;verifiedRecords:number;tenantCount:number;assetManifestCount:number;temporaryRecordsRemoved:boolean;cleanupVerified:boolean;checksum:string;archiveIndexes:number;archiveOperations:number;archiveReservations:number;elapsedMs:number;storageOperations:{reads:number;writes:number;deletes:number};source:'synthetic-fixture'|'uploaded-backup';deployContext:string;deployId:string;completedAt:string}
export default function BackupRecovery({lang,enabled}:{lang:'es'|'en';enabled:boolean}) {
  const es=lang==='es'
  const [file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[report,setReport]=useState<DrillReport|null>(null)
  const execute=async(synthetic:boolean)=>{
    if(!enabled||busy||!synthetic&&!file)return
    setBusy(true);setError('');setReport(null)
    try{
      let body=JSON.stringify({mode:'synthetic'})
      if(!synthetic&&file){
        if(file.size>4*1024*1024)throw new Error(es?'El archivo excede 4 MiB.':'The file exceeds 4 MiB.')
        body=await file.text();JSON.parse(body)
      }
      const response=await fetch('/.netlify/functions/restore-backup-drill',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body})
      const result=await response.json()
      if(!response.ok||result.ok!==true||result.temporaryRecordsRemoved!==true||result.cleanupVerified!==true)throw new Error(result.message||(es?'No se pudo verificar la recuperación y su limpieza.':'Recovery and cleanup could not be verified.'))
      setReport(result)
    }catch(e){setError(e instanceof Error?e.message:'Restore drill failed.')}finally{setBusy(false)}
  }
  const verify=(event:FormEvent)=>{event.preventDefault();void execute(false)}
  const downloadReport=()=>{
    if(!report)return
    const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}))
    const anchor=document.createElement('a');anchor.href=url;anchor.download='webfactory-recovery-report.json';document.body.appendChild(anchor);anchor.click();anchor.remove();window.setTimeout(()=>URL.revokeObjectURL(url),15000)
  }
  return <PortalPanel className="wfa-card"><header><div><small>{es?'RECUPERACIÓN':'RECOVERY'}</small><h2>{es?'Comprobar un backup':'Check a backup'}</h2></div></header>
    <p className="wfa-note">{es?'Los backups incluyen configuración y registros del negocio. Los archivos de imágenes se enumeran en un manifiesto; conserva sus originales y vuelve a conectar las integraciones externas al recuperar.':'Backups include business configuration and records. Image files are listed in a manifest; keep their originals and reconnect external integrations during recovery.'}</p>
    {enabled?<><p className="wfa-note">{es?'Este simulacro recupera hasta 100 registros en un área separada, verifica su integridad y elimina las copias temporales. Usa un export nuevo de versión 2, de hasta 4 MiB.':'This drill restores up to 100 records in a separate area, checks their integrity and removes temporary copies. Use a new version 2 export, up to 4 MiB.'}</p>
      <p className="wfa-note">{es?'Comienza con datos sintéticos para comprobar el almacenamiento real del preview. Incluye historial de inventario archivado, un cliente y un recibo de prueba.':'Start with synthetic data to check actual preview storage. Includes archived inventory history, a test customer and a test receipt.'}</p>
      <button type="button" disabled={busy} onClick={()=>void execute(true)}>{busy?(es?'Comprobando…':'Checking…'):(es?'Probar con datos sintéticos':'Test with synthetic data')}</button>
      <form onSubmit={verify}><label htmlFor="backup-drill-file">{es?'Archivo de backup':'Backup file'}</label><input id="backup-drill-file" type="file" accept="application/json,.json" disabled={busy} onChange={event=>{setFile(event.target.files?.[0]||null);setReport(null);setError('')}}/><button type="submit" disabled={!file||busy}>{busy?(es?'Comprobando…':'Checking…'):(es?'Ejecutar simulacro aislado':'Run isolated drill')}</button></form></>:<p className="wfa-note">{es?'El simulacro está disponible en la vista previa.':'The restore drill is available in the deploy preview.'}</p>}
    {error&&<p className="wfa-alert danger" role="alert">{error}</p>}
    {report&&<div role="status"><div className="wfa-alert success"><p>{es?`${report.verifiedRecords} registros verificados de ${report.tenantCount} negocio(s). Copias temporales eliminadas y ausencia comprobada.`:`${report.verifiedRecords} records verified across ${report.tenantCount} business(es). Temporary copies removed and absence verified.`}</p><p>{report.source==='synthetic-fixture'?(es?'Resultado con datos sintéticos en el preview.':'Result with synthetic data in the preview.'):(es?'Resultado del backup seleccionado.':'Result from the selected backup.')}</p></div>
      <dl><div><dt>{es?'Índices del archivo':'Archive indexes'}</dt><dd>{report.archiveIndexes}</dd></div><div><dt>{es?'Operaciones archivadas':'Archived operations'}</dt><dd>{report.archiveOperations}</dd></div><div><dt>{es?'Reservas archivadas':'Archived reservations'}</dt><dd>{report.archiveReservations}</dd></div><div><dt>{es?'Tiempo total':'Total time'}</dt><dd>{report.elapsedMs.toLocaleString(es?'es-PR':'en-US')} ms</dd></div><div><dt>{es?'Lecturas / escrituras / borrados':'Reads / writes / deletes'}</dt><dd>{report.storageOperations.reads} / {report.storageOperations.writes} / {report.storageOperations.deletes}</dd></div><div><dt>Deploy ID</dt><dd>{report.deployId||'—'}</dd></div></dl>
      <p className="wfa-note">{es?`${report.assetManifestCount} archivos enumerados; sus contenidos no fueron restaurados. Esta ejecución no mide capacidad de producción ni determina el costo de Netlify.`:`${report.assetManifestCount} files listed; their contents were not restored. This run does not measure production capacity or determine Netlify cost.`}</p><button type="button" onClick={downloadReport}>{es?'Descargar resultado':'Download result'} ↓</button>
    </div>}
  </PortalPanel>
}
