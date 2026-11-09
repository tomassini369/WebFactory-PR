import {useEffect,useRef,useState} from 'react'
import {useWorkspaceApi} from './training/workspace-services'
import {usePractice} from './training/practice-context'
type Check={applicable:boolean;savedStatus:string;providerStatus:string|null;matches:boolean|null;checkedAt:string;cancelAtPeriodEnd?:boolean;currentPeriodEnd?:string;checkout:{state:string;requiresReview:boolean}}
export default function SubscriptionReconciliation({siteId,lang}:{siteId:string;lang:'es'|'en'}){
 const api=useWorkspaceApi(),practice=usePractice(),es=lang==='es',[busy,setBusy]=useState(false),[error,setError]=useState(''),[check,setCheck]=useState<Check|null>(null),current=useRef(siteId)
 current.current=siteId
 useEffect(()=>{setCheck(null);setError('');setBusy(false)},[siteId])
 const inspect=async()=>{const requested=siteId;setBusy(true);setError('');try{const result=await api(`/.netlify/functions/subscription-reconciliation?siteId=${encodeURIComponent(requested)}`);if(current.current===requested)setCheck(result)}catch(e){if(current.current===requested)setError(e instanceof Error?e.message:(es?'No se pudo consultar el estado.':'Status could not be checked.'))}finally{if(current.current===requested)setBusy(false)}}
 const states:Record<string,[string,string]>={none:['Sin checkout protegido','No protected Checkout'],open:['Checkout abierto','Open Checkout'],complete:['Checkout completado','Completed Checkout'],expired:['Checkout vencido','Expired Checkout'],unknown:['Resultado incierto: requiere revisión','Uncertain result: review required']}
 return <section aria-label={es?'Verificación de facturación':'Billing verification'}>
  <h3>{es?'Verificar facturación en Stripe':'Check billing in Stripe'}</h3>
  <p className="ca-note">{es?'Consulta el estado guardado y el estado actual del proveedor. Esta consulta no cobra, no cancela ni cambia el acceso.':'Compare the saved state with the provider’s current state. This check does not charge, cancel or change access.'}</p>
  <button disabled={busy||Boolean(practice)} onClick={inspect}>{busy?(es?'Consultando…':'Checking…'):(es?'Consultar estado de facturación':'Check billing status')}</button>
  {practice&&<p className="ca-note">{es?'La consulta real de Stripe no está disponible en práctica.':'Live Stripe inspection is unavailable in practice.'}</p>}
  {error&&<p role="alert" className="ca-error">{error}</p>}
  {check&&<div role="status">{!check.applicable?<p>{es?'Este plan no utiliza una suscripción de Stripe.':'This plan does not use a Stripe subscription.'}</p>:<>
   <dl className="ca-service-plan"><div><dt>{es?'Estado guardado':'Saved status'}</dt><dd>{check.savedStatus}</dd></div><div><dt>Stripe</dt><dd>{check.providerStatus||(es?'Sin suscripción vinculada':'No linked subscription')}</dd></div><div><dt>Checkout</dt><dd>{(states[check.checkout.state]||states.unknown)[es?0:1]}</dd></div></dl>
   {(check.matches===false||check.checkout.requiresReview)&&<p className="ca-warning">{es?'Los estados requieren revisión. No inicies otro cobro para corregirlo. Espera la confirmación del servidor o contacta soporte con la referencia de tu negocio.':'These states need review. Do not start another charge to fix them. Wait for server confirmation or contact support with your business reference.'} <a href="mailto:info@webfactorypr.com">info@webfactorypr.com</a></p>}
   {check.matches===true&&<p>{es?'El estado de suscripción y renovación coincide con Stripe.':'Subscription and renewal status match Stripe.'}</p>}
  </>}</div>}
 </section>
}
