// Only bundled in deploy previews. Reuses the real kiosk and the existing local practice transport.
import {useMemo,useState} from 'react'
import {createRoot} from 'react-dom/client'
import Kiosk from '../src/Kiosk'
import {ThemeProvider} from '../src/theme'
import KioskAppearanceSettings from '../src/kiosk-skins/KioskAppearanceSettings'
import {WorkspaceServicesProvider,type WorkspaceFetch} from '../src/training/workspace-services'
import {createPracticeRuntime} from '../src/training/practice-runtime.mjs'
import {kioskAppearance,validateKioskAppearance} from '../netlify/lib/kiosk-skins.mjs'
import '../src/client-admin.css'
import '../src/styles.css'
function Review(){
 const [lang,setLang]=useState<'es'|'en'>('es'),[settings,setSettings]=useState(true)
 const runtime=useMemo(()=>createPracticeRuntime({role:'owner',capabilities:['settings','pos','collect'],category:'Retail'}),[])
 const transport=useMemo(()=>{let appearance=kioskAppearance();const fetch:WorkspaceFetch=async(input,init)=>{
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.origin)
  if(!url.pathname.endsWith('/client-kiosk'))return Response.json({message:'Preview only'},{status:403})
  let body:Record<string,unknown>={};try{if(init?.body)body=JSON.parse(String(init.body))}catch{return Response.json({message:'Invalid preview request'},{status:400})}
  if(body.action==='appearance'){try{appearance=validateKioskAppearance(body.appearance);return Response.json({ok:true,appearance})}catch{return Response.json({message:'Apariencia inválida / Invalid appearance'},{status:400})}}
  const response=await runtime.fetch(input,init),data=await response.json()
  return Response.json({...data,appearance,presentation:{...data.presentation,appearance}},{status:response.status})
 };return fetch},[runtime])
 return <WorkspaceServicesProvider fetch={transport}><div style={{padding:16,background:'#0b1529',color:'#fff',fontFamily:'system-ui'}}><strong>WebFactory PR · Kiosk Skin Engine · DEMO</strong><p>{lang==='es'?'Datos de práctica. Sin pagos ni operaciones reales.':'Practice data. No real payments or operations.'}</p><button style={{minHeight:44,fontSize:16,background:'#285fa6',color:'#fff',border:'1px solid #fff',borderRadius:8,padding:'10px 14px'}} onClick={()=>setSettings(!settings)}>{settings?'Ver kiosco / View kiosk':'Apariencia / Appearance'}</button></div>{settings?<KioskAppearanceSettings site={runtime.site} lang={lang}/>:<Kiosk lang={lang} setLang={setLang} pairing=""/>}</WorkspaceServicesProvider>
}
createRoot(document.getElementById('root')!).render(<ThemeProvider><Review/></ThemeProvider>)
