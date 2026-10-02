import { useEffect, useState, type ReactNode } from 'react'
import { startRegistration, startAuthentication } from '@simplewebauthn/browser'
import { getUser, logout, onAuthChange, refreshPortalUser, type User } from './portal-auth'
import { AdaptiveLogo, ThemeToggle } from './theme'
import './mfa.css'

async function request(action:string, values:Record<string,unknown>={}) {
  const response=await fetch('/.netlify/functions/portal-mfa',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...values})})
  const result=await response.json()
  if(!response.ok)throw new Error(result.message||'Security verification failed.')
  return result
}

function SecurityPanel({user,lang,onComplete,onCodes}:{user:User;lang:'es'|'en';onComplete:()=>Promise<unknown>;onCodes?:()=>void}) {
  const es=lang==='es'
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[code,setCode]=useState(''),[label,setLabel]=useState(''),[codes,setCodes]=useState<string[]>([]),[saved,setSaved]=useState(false)
  const run=async(action:()=>Promise<void>)=>{setBusy(true);setError('');try{await action()}catch(e){setError(e instanceof Error?e.message:'Security verification failed.')}finally{setBusy(false)}}
  const ceremony=async(register:boolean)=>{
    const challenge=await request(register?'register-options':'authenticate-options')
    const response=register?await startRegistration({optionsJSON:challenge.options}):await startAuthentication({optionsJSON:challenge.options})
    const result=await request(register?'register-verify':'authenticate-verify',{challengeId:challenge.challengeId,response,label})
    if(result.recoveryCodes){onCodes?.();setCodes(result.recoveryCodes)}
    else await onComplete()
  }
  return <section className="mfa-panel" aria-labelledby="mfa-title"><h2 id="mfa-title">{es?'Seguridad de la cuenta':'Account security'}</h2>
    <p>{es?'Usa tu contraseña y una passkey verificada con el bloqueo de tu dispositivo.':'Use your password and a passkey verified with your device lock.'}</p>
    {error&&<p role="alert">{error}</p>}
    {codes.length>0?<><h3>{es?'Guarda tus códigos de recuperación':'Save your recovery codes'}</h3><p>{es?'Cada código sirve una vez. Guárdalos fuera de este dispositivo; no se volverán a mostrar.':'Each code works once. Save them outside this device; they will not be shown again.'}</p><ul className="mfa-codes">{codes.map(value=><li key={value}><code>{value}</code></li>)}</ul><label><input type="checkbox" checked={saved} onChange={e=>setSaved(e.target.checked)}/>{es?'Guardé los códigos en un lugar seguro':'I saved the codes in a safe place'}</label><button className="btn" disabled={!saved||busy} onClick={()=>void run(async()=>{await onComplete();setCodes([])})}>{es?'Continuar':'Continue'}</button></>:
    user.mfa?.needsLogin?<><p>{es?'Vuelve a iniciar sesión con tu contraseña antes de continuar.':'Sign in with your password again before continuing.'}</p><button className="btn" disabled={busy} onClick={()=>void run(async()=>{await logout()})}>{es?'Volver al login':'Return to sign in'}</button></>:
    <><div className="mfa-actions">{user.mfa?.enrolled&&<button className="btn" disabled={busy} onClick={()=>void run(()=>ceremony(false))}>{es?'Verificar passkey':'Verify passkey'}</button>}
    {(!user.mfa?.enrolled||user.mfa?.verified)&&<><label>{es?'Nombre del dispositivo':'Device name'}<input value={label} maxLength={80} autoComplete="off" onChange={e=>setLabel(e.target.value)}/></label><button className="btn" disabled={busy} onClick={()=>void run(()=>ceremony(true))}>{es?'Añadir passkey':'Add passkey'}</button></>}</div>
    {user.mfa?.enrolled&&<><form onSubmit={e=>{e.preventDefault();void run(async()=>{await request('recovery',{code});setCode('');await onComplete()})}}><label>{es?'Código de recuperación':'Recovery code'}<input value={code} onChange={e=>setCode(e.target.value)} autoComplete="off" spellCheck={false} maxLength={32} required/></label><button className="btn secondary" disabled={busy}>{es?'Usar código':'Use code'}</button></form><p>{es?'Códigos restantes: ':'Codes remaining: '}{user.mfa.recoveryCodesRemaining}</p>
    {user.mfa.verified&&<><button className="btn secondary" disabled={busy} onClick={()=>void run(async()=>{const result=await request('rotate-codes');onCodes?.();setSaved(false);setCodes(result.recoveryCodes)})}>{es?'Renovar códigos de recuperación':'Replace recovery codes'}</button><p>{es?'Verifica tu passkey nuevamente antes de cambiar dispositivos. Añade una passkey de reemplazo antes de eliminar la última.':'Verify your passkey again before changing devices. Add a replacement before removing the last passkey.'}</p><ul>{user.mfa.credentials?.map(credential=><li key={credential.id}>{credential.label} <button disabled={busy||(user.mfa?.credentials?.length||0)<2} onClick={()=>void run(async()=>{await request('remove',{id:credential.id});await onComplete()})}>{es?'Eliminar':'Remove'}</button></li>)}</ul></>}</>}
    </>}
    {busy&&<p role="status">{es?'Verificando…':'Verifying…'}</p>}
  </section>
}

export function MfaGate({children}:{children:ReactNode}) {
  const [user,setUser]=useState<User|null>(null),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false),[holdCodes,setHoldCodes]=useState(false),[lang,setLang]=useState<'es'|'en'>('en')
  useEffect(()=>{let active=true;const stop=onAuthChange((_event,next)=>{if(active){setUser(next);setLoading(false);setFailed(false)}});void getUser().then(next=>{if(active)setUser(next)}).catch(()=>{if(active)setFailed(true)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false;stop()}},[])
  if(loading)return <main className="route-loading" role="status">Loading WebFactory…</main>
  if(failed)return <main className="mfa-screen"><p role="alert">Unable to check your session.</p><button className="btn" onClick={()=>window.location.reload()}>Try again</button><a href="/">Return to WebFactory PR</a></main>
  if(!user?.mfa?.required||(user.mfa.verified&&!holdCodes))return children
  return <main className="mfa-screen"><header><a href="/"><AdaptiveLogo alt="WebFactory PR"/></a><div><button onClick={()=>setLang(lang==='es'?'en':'es')}>{lang==='es'?'EN':'ES'}</button><ThemeToggle/></div></header><SecurityPanel user={user} lang={lang} onCodes={()=>setHoldCodes(true)} onComplete={async()=>{await refreshPortalUser();setHoldCodes(false)}}/><a href="/">{lang==='es'?'Volver a WebFactory PR':'Return to WebFactory PR'}</a><button onClick={()=>void logout().catch(()=>setFailed(true))}>{lang==='es'?'Cerrar sesión':'Sign out'}</button></main>
}

export function MfaSettings({lang}:{lang:'es'|'en'}) {
  const [user,setUser]=useState<User|null>(null)
  useEffect(()=>{let active=true;void getUser().then(next=>{if(active)setUser(next)}).catch(()=>{});const stop=onAuthChange((_event,next)=>{if(active)setUser(next)});return()=>{active=false;stop()}},[])
  return user?<SecurityPanel user={user} lang={lang} onComplete={refreshPortalUser}/>:null
}
