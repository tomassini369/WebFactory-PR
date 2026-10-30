import {lazy,Suspense,useEffect,useState} from 'react'
import type {User} from '../portal-auth'
import {PortalSessionContext} from '../portal-session'
import type {PracticeRuntime} from '../training/practice-runtime.mjs'
const Account=lazy(()=>import('../ConsumerPage'))
const Business=lazy(()=>import('../MarketplaceBusinessPage'))

export default function ConsumerExplore({runtime,lang,setLang,slug}:{runtime:PracticeRuntime;lang:'es'|'en';setLang:(lang:'es'|'en')=>void;slug?:string}){
 const [user,setUser]=useState<User|null>(null),[ready,setReady]=useState(false),[error,setError]=useState('')
 useEffect(()=>{
  let active=true
  const unsubscribe=runtime.subscribe(event=>{if(event.name==='consumer.session.changed'){setUser(event.detail);setReady(true)}})
  void runtime.fetch('/.netlify/functions/next-consumer-session').then(async r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{if(active){setUser(data.user);setReady(true)}}).catch(()=>{if(active)setError(lang==='es'?'No se pudo abrir el perfil de ejemplo. Recarga para intentar otra vez.':'The sample profile could not open. Reload to try again.')})
  return()=>{active=false;unsubscribe()}
 },[runtime])
 if(error)return <p role="alert">{error}</p>
 if(!ready)return <p role="status">{lang==='es'?'Preparando tu perfil de ejemplo…':'Preparing your sample profile…'}</p>
 return <section className="nx-consumer-host"><PortalSessionContext.Provider value={user}><Suspense fallback={<p role="status">{lang==='es'?'Cargando…':'Loading…'}</p>}>{slug?<><p className="nx-consumer-notice">{lang==='es'?'FICHA DE EJEMPLO · Negocio y reseñas locales ficticios':'SAMPLE LISTING · Fictional business and local reviews'}</p><Business slug={slug} lang={lang} setLang={setLang}/></>:<Account lang={lang} setLang={setLang} targetSlug={runtime.ui.nextConsumerTarget} initialSignup={runtime.ui.nextConsumerSignup}/>}</Suspense></PortalSessionContext.Provider></section>
}
