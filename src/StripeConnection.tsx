import { useEffect, useState } from 'react'
import { withAuthRetry } from './auth-retry'

const api = (url:string, options?:RequestInit) => withAuthRetry(async () => {
  const response = await fetch(url, { credentials:'include', cache:'no-store', ...options })
  const result = await response.json()
  if (!response.ok || result.ok === false) throw new Error(result.message || 'Stripe could not be opened.')
  return result
})

export function StripeConnection({site,setSite,lang,canConnect=true}:{site:any;setSite:(site:any)=>void;lang:'es'|'en';canConnect?:boolean}) {
  const es = lang === 'es'
  const accountId = site.paymentRules?.stripeConnectedAccountId || ''
  const [status,setStatus] = useState<any>(null)
  const [checking,setChecking] = useState(true)
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const refresh = async () => {
    setChecking(true);setError('')
    try { setStatus(await api(`/.netlify/functions/client-stripe-status?siteId=${encodeURIComponent(site.siteId)}`)) }
    catch(e) { setStatus(null);setError(e instanceof Error ? e.message : 'Stripe status could not be verified.') }
    finally { setChecking(false) }
  }
  useEffect(() => { let active=true;setStatus(null);setChecking(true);setError('');api(`/.netlify/functions/client-stripe-status?siteId=${encodeURIComponent(site.siteId)}`).then(result=>{if(active)setStatus(result)}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setChecking(false)});return()=>{active=false} },[site.siteId,accountId])
  const verified = status?.connected && status?.capabilityStatus === 'active'
  const enable = async () => {
    setBusy(true);setError('')
    try {const result=await api('/.netlify/functions/client-integration-management',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({siteId:site.siteId,action:'enable_stripe'})});setSite(result.site)}
    catch(e){setError(e instanceof Error?e.message:'Stripe could not be enabled.')}
    finally{setBusy(false)}
  }
  const open = async () => {
    setBusy(true);setError('')
    try {
      const endpoint = accountId ? 'client-stripe-account-link' : 'client-stripe-connect-start'
      const result = await api(`/.netlify/functions/${endpoint}`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({siteId:site.siteId})})
      if(result.site)setSite(result.site)
      window.location.assign(result.url)
    } catch(e) {setError(e instanceof Error ? e.message : 'Stripe could not be opened.');setBusy(false)}
  }
  return <div className="ca-stripe-connection">
    <div className="ca-payment-status"><span className={verified?'ready':''}/><div><small>STRIPE CONNECT</small><strong>{checking?(es?'Verificando Stripe…':'Checking Stripe…'):error?(es?'Estado sin verificar':'Status unverified'):!status?.connected?(es?'Stripe no conectado':'Stripe not connected'):verified?(site.paymentRules?.methods?.stripe?(es?'Stripe conectado · Pagos activos':'Stripe connected · Payments active'):(es?'Stripe conectado · Cobros desactivados':'Stripe connected · Payments disabled')):(es?'Stripe vinculado · Verificación pendiente':'Stripe linked · Verification pending')}</strong></div>
      {canConnect && (verified?<a className="ca-primary-link" href="https://dashboard.stripe.com/" target="_blank" rel="noopener noreferrer">{es?'Abrir Stripe':'Open Stripe'}</a>:<button disabled={busy||checking||status?.configured===false} onClick={open}>{busy?(es?'Abriendo…':'Opening…'):accountId?(es?'Continuar verificación':'Continue verification'):(es?'Conectar Stripe':'Connect Stripe')}</button>)}
      <button disabled={busy||checking} onClick={refresh}>{es?'Verificar estado':'Check status'}</button>
      {verified&&canConnect&&!site.paymentRules?.methods?.stripe&&<button disabled={busy} onClick={enable}>{es?'Activar cobros Stripe':'Enable Stripe payments'}</button>}
    </div>
    {error&&<div className="ca-error" role="alert">{error}</div>}
    {status?.configured===false&&<p className="ca-warning">{es?'Stripe requiere configuración de WebFactory. Contacta soporte.':'Stripe requires WebFactory configuration. Contact support.'}</p>}
    {status?.webhookConfigured===false&&<p className="ca-warning">{es?'La confirmación automática de pagos Stripe requiere configuración de WebFactory.':'Automatic Stripe payment confirmation requires WebFactory configuration.'}</p>}
    <p className="ca-note">{es?'Stripe procesa tarjetas. Su conexión y verificación son independientes de ATH Móvil.':'Stripe processes cards. Its connection and verification are independent of ATH Móvil.'}</p>
  </div>
}
