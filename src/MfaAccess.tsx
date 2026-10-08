import PortalLoadingCard from './PortalLoadingCard'
import PortalReturnHome from './PortalReturnHome'
import {usePortalLanguage} from './portal-language'
import { useEffect, useState, type ReactNode } from 'react'
import { startRegistration, startAuthentication } from '@simplewebauthn/browser'
import { getUser, logout, onAuthChange, refreshPortalUser, requestPasswordRecovery, type User } from './portal-auth'
import { AdaptiveLogo, ThemeToggle } from './theme'
import './mfa.css'

async function request(action:string, values:Record<string,unknown>={}) {
  const response=await fetch('/.netlify/functions/portal-mfa',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...values})})
  const result=await response.json()
  if(!response.ok)throw new Error(result.message||'Security verification failed.')
  return result
}

function SecurityPanel({user,lang,onComplete,onCodes,allowDisable=false}:{user:User;lang:'es'|'en';onComplete:()=>Promise<unknown>;onCodes?:()=>void;allowDisable?:boolean}) {
  const es=lang==='es'
  const [totpSetup,setTotpSetup]=useState<{secret:string;qr:string;challengeId:string;expiresAt:number}|null>(null),[totpCode,setTotpCode]=useState('')
  useEffect(()=>{if(!totpSetup)return;const timer=window.setTimeout(()=>{setTotpSetup(null);setTotpCode('')},Math.min(300000,Math.max(0,totpSetup.expiresAt-Date.now())));return()=>window.clearTimeout(timer)},[totpSetup])
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[code,setCode]=useState(''),[label,setLabel]=useState(''),[codes,setCodes]=useState<string[]>([]),[saved,setSaved]=useState(false)
  const run=async(action:()=>Promise<void>)=>{setBusy(true);setError('');try{await action()}catch(e){setError(e instanceof Error?e.message:'Security verification failed.')}finally{setBusy(false)}}
  const ceremony=async(register:boolean)=>{
    const challenge=await request(register?'register-options':'authenticate-options')
    const response=register?await startRegistration({optionsJSON:challenge.options}):await startAuthentication({optionsJSON:challenge.options})
    const result=await request(register?'register-verify':'authenticate-verify',{challengeId:challenge.challengeId,response,label})
    if(result.recoveryCodes){onCodes?.();setSaved(false);setCodes(result.recoveryCodes)}
    else await onComplete()
  }
  const activateTotp=async()=>{
    if(!totpSetup)return
    const result=await request('totp-confirm',{challengeId:totpSetup.challengeId,code:totpCode})
    setTotpSetup(null);setTotpCode('')
    if(result.recoveryCodes){onCodes?.();setSaved(false);setCodes(result.recoveryCodes)}else await onComplete()
  }
  const cancelTotp=async()=>{if(!totpSetup)return;const challengeId=totpSetup.challengeId;setTotpSetup(null);setTotpCode('');await request('totp-cancel',{challengeId})}
  return <section className="mfa-panel" aria-labelledby="mfa-title"><h2 id="mfa-title">{es?'Seguridad de la cuenta':'Account security'}</h2>
    <p>{es?'Usa tu contraseña y verifica con una passkey o una app Authenticator.':'Use your password and verify with a passkey or an Authenticator app.'}</p>
    <p><strong>{es?'Autenticación de dos factores (2FA): ':'Two-factor authentication (2FA): '}{user.mfa?.enrolled?(es?'Activada':'Enabled'):(es?'Desactivada':'Disabled')}</strong>{user.mfa?.policyRequired?` · ${es?'Obligatoria para esta cuenta':'Required for this account'}`:''}</p>
    {error&&<p role="alert">{error}</p>}
    {codes.length>0?<><h3>{es?'Guarda tus códigos de recuperación':'Save your recovery codes'}</h3><p>{es?'Cada código sirve una vez. Guárdalos fuera de este dispositivo; no se volverán a mostrar.':'Each code works once. Save them outside this device; they will not be shown again.'}</p><ul className="mfa-codes">{codes.map(value=><li key={value}><code>{value}</code></li>)}</ul><label><input type="checkbox" checked={saved} onChange={e=>setSaved(e.target.checked)}/>{es?'Guardé los códigos en un lugar seguro':'I saved the codes in a safe place'}</label><button className="btn" disabled={!saved||busy} onClick={()=>void run(async()=>{await onComplete();setCodes([])})}>{es?'Continuar':'Continue'}</button></>:
    user.mfa?.needsLogin?<><p>{es?'Vuelve a iniciar sesión con tu contraseña antes de continuar.':'Sign in with your password again before continuing.'}</p><button className="btn" disabled={busy} onClick={()=>void run(async()=>{await logout()})}>{es?'Volver al login':'Return to sign in'}</button></>:
    <>{totpSetup?<section className="mfa-authenticator-setup" aria-label={es?'Configurar Authenticator':'Set up Authenticator'}><h3>{es?'Configurar Authenticator':'Set up Authenticator'}</h3><p>{es?'En tu app Authenticator añade una cuenta y escanea el QR. Si estás usando el mismo teléfono, introduce la clave manual.':'Add an account in your Authenticator app and scan the QR. If using the same phone, enter the manual key.'}</p><img src={totpSetup.qr} alt={es?'QR de configuración de Authenticator':'Authenticator setup QR'} width="300" height="300"/><label>{es?'Clave manual':'Manual key'}<input readOnly value={totpSetup.secret} autoComplete="off" spellCheck={false}/></label><p>{es?'Esta clave es privada. La configuración vence en cinco minutos.':'This key is private. Setup expires in five minutes.'}</p><form onSubmit={event=>{event.preventDefault();void run(activateTotp)}}><label>{es?'Código de Authenticator':'Authenticator code'}<input value={totpCode} onChange={event=>setTotpCode(event.target.value.replace(/[^0-9]/g,''))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required/></label><button className="btn" disabled={busy||totpCode.length!==6}>{es?'Activar Authenticator':'Activate Authenticator'}</button><button type="button" className="btn secondary" disabled={busy} onClick={()=>void run(cancelTotp)}>{es?'Cancelar':'Cancel'}</button></form></section>:<div className="mfa-actions">{Boolean(user.mfa?.credentials?.length)&&<button className="btn" disabled={busy} onClick={()=>void run(()=>ceremony(false))}>{es?'Verificar passkey':'Verify passkey'}</button>}
    {(!user.mfa?.enrolled||user.mfa?.verified)&&<><label>{es?'Nombre del dispositivo':'Device name'}<input value={label} maxLength={80} autoComplete="off" onChange={e=>setLabel(e.target.value)}/></label><button className="btn" disabled={busy} onClick={()=>void run(()=>ceremony(true))}>{es?'Añadir passkey':'Add passkey'}</button>{user.mfa?.authenticatorAvailable&&!user.mfa.authenticatorEnrolled&&<button className="btn secondary" disabled={busy} onClick={()=>void run(async()=>{setTotpCode('');setTotpSetup(await request('totp-setup'))})}>{es?'Configurar Authenticator':'Set up Authenticator'}</button>}</>}</div>}
    {!totpSetup&&user.mfa?.authenticatorEnrolled&&<form onSubmit={event=>{event.preventDefault();void run(async()=>{await request('totp-verify',{code:totpCode});setTotpCode('');await onComplete()})}}><label>{es?'Código de Authenticator':'Authenticator code'}<input value={totpCode} onChange={event=>setTotpCode(event.target.value.replace(/[^0-9]/g,''))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required/></label><button className="btn" disabled={busy||totpCode.length!==6}>{es?'Verificar Authenticator':'Verify Authenticator'}</button><p>{es?'Introduce el código de seis dígitos de tu app. Si ya lo usaste, espera al próximo código.':'Enter the six-digit code from your app. If already used, wait for the next code.'}</p></form>}
    {!totpSetup&&user.mfa?.enrolled&&<><form onSubmit={e=>{e.preventDefault();void run(async()=>{await request('recovery',{code});setCode('');await onComplete()})}}><label>{es?'Código de recuperación':'Recovery code'}<input value={code} onChange={e=>setCode(e.target.value)} autoComplete="off" spellCheck={false} maxLength={32} required/></label><button className="btn secondary" disabled={busy}>{es?'Usar código':'Use code'}</button></form><p>{es?'Códigos restantes: ':'Codes remaining: '}{user.mfa.recoveryCodesRemaining}</p>
    {user.mfa.verified&&<><button className="btn secondary" disabled={busy} onClick={()=>void run(async()=>{const result=await request('rotate-codes');onCodes?.();setSaved(false);setCodes(result.recoveryCodes)})}>{es?'Renovar códigos de recuperación':'Replace recovery codes'}</button><p>{es?'Verifica un método de seguridad nuevamente antes de cambiar dispositivos. Mantén al menos una passkey o Authenticator configurado.':'Verify a security method again before changing devices. Keep at least one passkey or Authenticator configured.'}</p><ul>{user.mfa.credentials?.map(credential=><li key={credential.id}>{credential.label} <button disabled={busy||((user.mfa?.credentials?.length||0)<2&&!user.mfa?.authenticatorEnrolled)} onClick={()=>void run(async()=>{await request('remove',{id:credential.id});await onComplete()})}>{es?'Eliminar':'Remove'}</button></li>)}</ul>{user.mfa.authenticatorEnrolled&&<button className="btn secondary" disabled={busy||!user.mfa.credentials?.length} onClick={()=>void run(async()=>{await request('totp-remove');await onComplete()})}>{es?'Eliminar Authenticator':'Remove Authenticator'}</button>}</>}</>}
    </>}
    {allowDisable&&user.mfa?.enrolled&&!user.mfa?.policyRequired&&user.mfa?.verified&&<button className="btn secondary" disabled={busy} onClick={()=>void run(async()=>{if(!window.confirm(es?'¿Desactivar 2FA en tu cuenta? Tendrás que volver a activarlo manualmente si quieres usarlo otra vez.':'Disable 2FA on your account? You will need to enable it again manually if you want to use it later.'))return;await request('disable');await onComplete()})}>{es?'Desactivar 2FA':'Disable 2FA'}</button>}
    {user.mfa?.policyRequired&&<p>{es?'WebFactory exige 2FA para esta cuenta y no puede desactivarse desde el portal.':'WebFactory requires 2FA for this account and it cannot be disabled from the portal.'}</p>}
    {busy&&<p role="status">{es?'Verificando…':'Verifying…'}</p>}
  </section>
}

export function MfaGate({children}:{children:ReactNode}) {
  const [user,setUser]=useState<User|null>(null),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false),[holdCodes,setHoldCodes]=useState(false)
  const [lang,setLang]=usePortalLanguage()
  useEffect(()=>{let active=true;const stop=onAuthChange((_event,next)=>{if(active){setUser(next);setLoading(false);setFailed(false)}});void getUser().then(next=>{if(active)setUser(next)}).catch(()=>{if(active)setFailed(true)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false;stop()}},[])
  if(loading)return <PortalLoadingCard lang={lang}/>
  if(failed)return <main className="mfa-screen"><p role="alert">Unable to check your session.</p><button className="btn" onClick={()=>window.location.reload()}>Try again</button><a href="/">Return to WebFactory PR</a></main>
  if(!user?.mfa?.required||(user.mfa.verified&&!holdCodes))return children
  return <main className="ca-page mfa-login-page"><section className="ca-login mfa-login-card" key="security"><div className="portal-language"><PortalReturnHome lang={lang}/><button className={lang==='en'?'active':''} onClick={()=>setLang('en')}>EN</button><button className={lang==='es'?'active':''} onClick={()=>setLang('es')}>ES</button><ThemeToggle/></div><AdaptiveLogo alt="WebFactory PR"/><SecurityPanel user={user} lang={lang} onCodes={()=>setHoldCodes(true)} onComplete={async()=>{await refreshPortalUser();setHoldCodes(false)}}/><button className="ca-link" onClick={()=>void logout().catch(()=>setFailed(true))}>{lang==='es'?'Cerrar sesión':'Sign out'}</button></section></main>
}

export function MfaSettings({lang,allowDisable=false}:{lang:'es'|'en';allowDisable?:boolean}) {
  const [user,setUser]=useState<User|null>(null),[resetBusy,setResetBusy]=useState(false),[resetSent,setResetSent]=useState(false),[resetError,setResetError]=useState('')
  useEffect(()=>{let active=true;void getUser().then(next=>{if(active)setUser(next)}).catch(()=>{});const stop=onAuthChange((_event,next)=>{if(active)setUser(next)});return()=>{active=false;stop()}},[])
  if(!user)return null
  const es=lang==='es',accountEmail=user.email||''
  const sendReset=async()=>{if(!accountEmail)return setResetError(es?'Esta cuenta no tiene un email válido.':'This account does not have a valid email.');setResetBusy(true);setResetError('');try{await requestPasswordRecovery(accountEmail);setResetSent(true)}catch(e){setResetError(e instanceof Error?e.message:(es?'No se pudo enviar el enlace.':'The reset link could not be sent.'))}finally{setResetBusy(false)}}
  return <><section className="mfa-panel" aria-labelledby="password-security-title"><h2 id="password-security-title">{es?'Contraseña':'Password'}</h2><p>{es?'Envía un enlace seguro al email de esta cuenta para crear una contraseña nueva. WebFactory nunca muestra tu contraseña actual.':'Send a secure link to this account email to create a new password. WebFactory never displays your current password.'}</p><strong>{accountEmail}</strong><div className="mfa-actions"><button className="btn secondary" disabled={resetBusy||!accountEmail} onClick={()=>void sendReset()}>{resetBusy?(es?'Enviando…':'Sending…'):(es?'Enviar enlace para restablecer contraseña':'Send password reset link')}</button></div>{resetSent&&<p role="status">{es?'Enlace enviado. Revisa el correo de esta cuenta.':'Reset link sent. Check this account email.'}</p>}{resetError&&<p role="alert">{resetError}</p>}</section><SecurityPanel user={user} lang={lang} onComplete={refreshPortalUser} allowDisable={allowDisable}/></>
}
