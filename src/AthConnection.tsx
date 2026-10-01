import { useEffect, useState, type FormEvent } from 'react'
import { withAuthRetry } from './auth-retry'

export function AthConnection({site,setSite,lang,canConnect}:{site:any;setSite:(site:any)=>void;lang:'es'|'en';canConnect:boolean}){
  const es=lang==='es'
  const ath=site.paymentRules?.ath||{}
  const enabled=Boolean(site.paymentRules?.methods?.ath)
  const configured=Boolean(ath.credentialsConfigured&&ath.credentialVersion)
  const connected=enabled&&configured&&ath.status==='connected'
  const [publicToken,setPublicToken]=useState('')
  const [privateToken,setPrivateToken]=useState('')
  const [publicPath,setPublicPath]=useState(ath.publicPath||'')
  const [showTokens,setShowTokens]=useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  useEffect(()=>{setPublicToken('');setPrivateToken('');setShowTokens(false);setPublicPath(ath.publicPath||'');setError('');setMessage('')},[site.siteId])
  const request=async(url:string,options?:RequestInit)=>withAuthRetry(async()=>{const response=await fetch(url,{credentials:'include',cache:'no-store',...options});const result=await response.json();if(!response.ok||result.ok===false)throw new Error(result.message||'ATH request failed.');return result})
  const save=async(event:FormEvent)=>{
    event.preventDefault();setBusy(true);setError('');setMessage('')
    try{
      const result=await request('/.netlify/functions/client-integration-management',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({siteId:site.siteId,action:'configure_ath',publicToken,privateToken,publicPath})})
      setPublicToken('');setPrivateToken('');setSite(result.site)
      setMessage(es?'Credenciales guardadas. Falta verificar el primer pago real.':'Credentials saved. The first real payment still needs verification.')
    }catch(e){setError(e instanceof Error?e.message:'ATH could not be configured.')}
    finally{setBusy(false)}
  }
  const refresh=async()=>{setBusy(true);setError('');try{const result=await request(`/.netlify/functions/client-admin?siteId=${encodeURIComponent(site.siteId)}`);setSite(result.site);setMessage(es?'Estado actualizado.':'Status refreshed.')}catch(e){setError(e instanceof Error?e.message:'Status unavailable.')}finally{setBusy(false)}}
  return <section className="ca-ath-configuration" aria-label="ATH Móvil">
    <h3>ATH Móvil</h3>
    <p role="status"><strong>{connected?(es?'ATH Móvil conectado · Pago verificado':'ATH Móvil connected · Payment verified'):configured?(enabled?(es?'Credenciales guardadas · Primer pago pendiente':'Credentials saved · First payment pending'):(es?'ATH Móvil desactivado':'ATH Móvil disabled')):ath.publicPath?(es?'Registro manual · API no conectada':'Manual recording · API not connected'):(es?'ATH Móvil no conectado':'ATH Móvil not connected')}</strong></p>
    <p>{es?'Cada negocio usa su propia cuenta ATH Business. Los pagos van a esa cuenta y se verifican con ATH, separados de Stripe.':'Each business uses its own ATH Business account. Payments go to that account and are verified with ATH, separately from Stripe.'}</p>
    {canConnect?<form onSubmit={save} autoComplete="off"><ol><li>{es?'Abre ATH Business → Configuración y localiza tus tokens público y privado.':'Open ATH Business → Settings and locate your public and private tokens.'}</li><li>{es?'Guárdalos aquí. No uses tu contraseña ni el pATH en los campos de tokens.':'Save them here. Do not enter your password or business pATH in the token fields.'}</li><li>{es?'Prueba un pago desde un enlace de pago o tu website, usando una cuenta de comprador distinta. Se marcará conectado después de la verificación.':'Test a payment through a payment link or your website, using a separate buyer account. The connection is confirmed after verification.'}</li></ol>
      <div className="ca-grid"><label>Public Token<input type={showTokens?'text':'password'} autoComplete="off" value={publicToken} onChange={e=>setPublicToken(e.target.value)} minLength={16} maxLength={512} required spellCheck={false}/></label><label>Private Token<input type={showTokens?'text':'password'} autoComplete="new-password" value={privateToken} onChange={e=>setPrivateToken(e.target.value)} minLength={16} maxLength={512} required spellCheck={false}/></label><label>{es?'pATH del negocio (opcional)':'Business pATH (optional)'}<input value={publicPath} onChange={e=>setPublicPath(e.target.value)} maxLength={120}/></label></div>
      <label className="ca-ath-show"><input type="checkbox" checked={showTokens} onChange={e=>setShowTokens(e.target.checked)}/>{es?'Mostrar tokens':'Show tokens'}</label>
      <button className="ca-save" disabled={busy}>{busy?(es?'Guardando…':'Saving…'):configured?(es?'Reemplazar credenciales ATH':'Replace ATH credentials'):(es?'Guardar y habilitar ATH Móvil':'Save and enable ATH Móvil')}</button>
      <p className="ca-note">{es?'La llave privada se guarda cifrada y nunca se muestra de nuevo. La prueba es un pago real, sujeto a límites y cargos de ATH; guardar tokens no mueve dinero.':'The private key is encrypted and never shown again. Testing is a real payment subject to ATH limits and fees; saving tokens does not move money.'}</p>
      <a href="https://ath.business/botondepago" target="_blank" rel="noopener noreferrer">{es?'Ayuda oficial de ATH Business':'Official ATH Business help'} ↗</a>
    </form>:<p>{es?'El dueño del negocio debe configurar las credenciales.':'The business owner must configure the credentials.'}</p>}
    {configured&&<button type="button" disabled={busy} onClick={refresh}>{es?'Actualizar estado de ATH':'Refresh ATH status'}</button>}
    {message&&<div className="ca-success">{message}</div>}{error&&<div className="ca-error">{error}</div>}
  </section>
}
