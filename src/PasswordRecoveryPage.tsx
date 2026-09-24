import { useEffect, useState } from 'react'
import { getUser, handleAuthCallback, updateUser, type User } from '@netlify/identity'
import './client-admin.css'
import { AdaptiveLogo } from './theme'

type Language='es'|'en'

const copy={
  es:{
    eyebrow:'RECUPERACIÓN SEGURA',
    title:'Crea una contraseña nueva',
    text:'Este enlace funciona para cuentas administrativas de WebFactory y para portales privados de clientes.',
    password:'Nueva contraseña',
    confirm:'Confirmar contraseña',
    save:'Guardar contraseña',
    saving:'Guardando…',
    success:'Contraseña actualizada correctamente.',
    admin:'Ir al Control Center',
    client:'Ir al portal de cliente',
    invalid:'El enlace de recuperación no es válido o ya expiró.',
    mismatch:'Las contraseñas no coinciden.',
    short:'Usa una contraseña de al menos 8 caracteres.',
    failure:'No se pudo restablecer la contraseña.'
  },
  en:{
    eyebrow:'SECURE RECOVERY',
    title:'Create a new password',
    text:'This recovery link works for WebFactory administrators and private client portal accounts.',
    password:'New password',
    confirm:'Confirm password',
    save:'Save password',
    saving:'Saving…',
    success:'Password updated successfully.',
    admin:'Go to Control Center',
    client:'Go to client portal',
    invalid:'This recovery link is invalid or has expired.',
    mismatch:'Passwords do not match.',
    short:'Use a password with at least 8 characters.',
    failure:'The password could not be reset.'
  }
}

export default function PasswordRecoveryPage(){
  const [lang,setLang]=useState<Language>('en')
  const [user,setUser]=useState<User|null>(null)
  const [password,setPassword]=useState('')
  const [confirm,setConfirm]=useState('')
  const [busy,setBusy]=useState(false)
  const [ready,setReady]=useState(false)
  const [done,setDone]=useState(false)
  const [error,setError]=useState('')
  const t=copy[lang]

  useEffect(()=>{document.documentElement.lang=lang},[lang])
  useEffect(()=>{if(ready&&!user&&!done)setError(copy[lang].invalid)},[lang,ready,user,done])
  useEffect(()=>{(async()=>{try{
    const callback=await handleAuthCallback()
    const current=callback?.user||await getUser()
    if(!current) throw new Error(t.invalid)
    setUser(current)
  }catch{setError(copy.es.invalid)}finally{setReady(true)}})()},[])

  const save=async()=>{
    setError('')
    if(password.length<8)return setError(t.short)
    if(password!==confirm)return setError(t.mismatch)
    setBusy(true)
    try{
      const current=await updateUser({password})
      setUser(current)
      setDone(true)
      history.replaceState(null,'','/password-recovery')
    }catch(e){setError(e instanceof Error?e.message:t.failure)}finally{setBusy(false)}
  }

  return <main className="ca-page">
    <section className="ca-login">
      <div className="portal-language"><button className={lang==='en'?'active':''} onClick={()=>setLang('en')}>EN</button><button className={lang==='es'?'active':''} onClick={()=>setLang('es')}>ES</button></div>
      <AdaptiveLogo alt="WebFactory PR"/>
      <small>{t.eyebrow}</small><h1>{t.title}</h1><p>{t.text}</p>
      {!ready&&<div className="ca-loading">…</div>}
      {ready&&!done&&user&&<><label>{t.password}<input type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></label><label>{t.confirm}<input type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label><button onClick={save} disabled={busy}>{busy?t.saving:t.save}</button></>}
      {done&&<><div className="ca-success">{t.success}</div><div className="recovery-actions"><a className="ca-primary-link" href="/webfactory-admin">{t.admin}</a><a className="ca-primary-link secondary" href="/client-admin">{t.client}</a></div></>}
      {error&&<div className="ca-error">{error}</div>}
    </section>
  </main>
}
