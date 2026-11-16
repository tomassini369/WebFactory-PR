import {useEffect,useState} from 'react'
import {PortalPanel} from './PortalPanel'
import {usePractice} from './training/practice-context'
import {useWorkspaceApi} from './training/workspace-services'

type IndexState = {status: 'pending'|'building'|'ready'; processed?: number}
function validatedState(value: unknown): IndexState {
 if(!value||typeof value!=='object'||!('status' in value)||typeof value.status!=='string'||!['pending','building','ready'].includes(value.status)||('processed' in value&&(typeof value.processed!=='number'||!Number.isFinite(value.processed)||value.processed<0)))throw new Error('No se pudo validar el estado del historial. / History status could not be validated.')
 return value as IndexState
}

export default function BookingIndexStatus({siteId,lang,area='bookings'}:{siteId:string;lang:'es'|'en';area?:'bookings'|'turns'}){
 const api=useWorkspaceApi()
 const practice=usePractice()
 const es=lang==='es'
 const turns=area==='turns'
 const endpoint=turns?'/.netlify/functions/client-order-turn-index':'/.netlify/functions/client-booking-index'
 const [state,setState]=useState<IndexState>({status:'pending'})
 const [checkRevision,setCheckRevision]=useState(0)
 const [checking,setChecking]=useState(!practice)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')

 useEffect(()=>{
  if(practice)return
  let active=true
  setChecking(true)
  setError('')
  void api(endpoint+'?siteId='+encodeURIComponent(siteId))
   .then(result=>{if(active)setState(validatedState(result.state))})
   .catch(reason=>{if(active)setError(reason.message)})
   .finally(()=>{if(active)setChecking(false)})
  return()=>{active=false}
 },[siteId,practice,endpoint,checkRevision])

 async function optimize(){
  setBusy(true)
  setError('')
  try{
   for(let batch=0;batch<3;batch++){
    const result=await api(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({siteId})})
    const next=validatedState(result.state)
    setState(next)
    if(next.status==='ready')break
   }
  }catch(reason){
   setError(reason instanceof Error?reason.message:(es?'No se pudo preparar el historial.':'Could not prepare the history.'))
  }finally{setBusy(false)}
 }

 const title=turns?(es?'Rendimiento del seguimiento de pedidos':'Order tracking performance'):(es?'Rendimiento de la agenda':'Calendar performance')
 const ready=turns?(es?'El seguimiento consulta los pedidos por sucursal y fecha.':'Tracking reads orders by branch and date.'):(es?'La lectura por fecha está habilitada.':'Date-based reading is enabled.')
 const pending=turns?(es?'Prepara el historial para acelerar el seguimiento de pedidos. El seguimiento sigue disponible durante la preparación.':'Prepare the history to speed up order tracking. Tracking remains available during preparation.'):(es?'Prepara el historial para acelerar la consulta de horarios. Las reservas continúan disponibles mientras se procesa por etapas.':'Prepare history for faster availability queries. Bookings remain available while preparation runs in stages.')
 const optimizeLabel=turns?(es?'Optimizar seguimiento':'Optimize tracking'):(es?'Optimizar agenda':'Optimize calendar')
 const buttonLabel=busy?(es?'Preparando…':'Preparing…'):state.status==='building'?(es?'Continuar preparación':'Continue preparation'):optimizeLabel
 return <PortalPanel className="ca-panel">
  <h2>{title}</h2>
  <p role="status">{checking?(es?'Consultando estado…':'Checking status…'):state.status==='ready'?ready:pending}</p>
  {turns&&state.status==='building'&&<p>{es?'Pedidos revisados':'Orders reviewed'}: {state.processed??0}</p>}
  {!error&&state.status!=='ready'&&<button type="button" disabled={checking||busy||!!practice} onClick={()=>void optimize()}>{buttonLabel}</button>}
  {error&&<div role="alert"><p>{error}</p><button type="button" disabled={checking||busy} onClick={()=>setCheckRevision(value=>value+1)}>{es?'Reintentar estado del historial':'Retry history status'}</button></div>}
 </PortalPanel>
}
