import { useEffect,useState,useRef } from 'react'
import { withAuthRetry } from './auth-retry'
type Review={reviewRequestId:string;status:string;dueAt:string}
export default function ReviewDeliveryStatus({siteId,lang}:{siteId:string;lang:'es'|'en'}){
  const es=lang==='es',[rows,setRows]=useState<Review[]>([]),[error,setError]=useState('')
  const revision=useRef(0)
  const load=async()=>{const current=++revision.current;setError('');try{const result=await withAuthRetry(async()=>{const response=await fetch(`/.netlify/functions/client-v3-admin?siteId=${encodeURIComponent(siteId)}&collection=review-requests&limit=50`,{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw new Error(es?'No se pudo consultar las solicitudes.':'Unable to check requests.');return response.json()});if(current===revision.current)setRows(result.records||[])}catch(e){if(current===revision.current)setError(e instanceof Error?e.message:'Unable to check requests.')}}
  useEffect(()=>{setRows([]);void load();return()=>{revision.current++}},[siteId])
  const labels:Record<string,string>=es?{pending:'Pendiente',sent:'Aceptada por el proveedor',sending:'En proceso',delivery_uncertain:'Entrega incierta · revisar proveedor',suppressed:'Suprimida por consentimiento',invalid:'Datos inválidos'}:{pending:'Pending',sent:'Accepted by provider',sending:'Processing',delivery_uncertain:'Uncertain delivery · check provider',suppressed:'Suppressed by consent',invalid:'Invalid data'}
  return <section><h3>{es?'50 solicitudes más recientes':'50 most recent requests'}</h3><button onClick={()=>void load()}>{es?'Actualizar solicitudes':'Refresh requests'}</button>{error&&<p role="alert">{error}</p>}<ul>{rows.map(row=><li key={row.reviewRequestId}>{labels[row.status]||row.status} · {Number.isFinite(Date.parse(row.dueAt))?new Date(row.dueAt).toLocaleString(es?'es-PR':'en-US'):(es?'Sin fecha válida':'Invalid date')}</li>)}</ul>{rows.length===0&&!error&&<p>{es?'Sin solicitudes recientes.':'No recent requests.'}</p>}</section>
}
