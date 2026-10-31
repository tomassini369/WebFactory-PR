// Only bundled in deploy previews. Reuses the real kiosk and the existing local practice transport.
import {useEffect,useMemo,useState} from 'react'
import {createRoot} from 'react-dom/client'
import Kiosk from '../src/Kiosk'
import {ThemeProvider} from '../src/theme'
import KioskAppearanceSettings from '../src/kiosk-skins/KioskAppearanceSettings'
import {WorkspaceServicesProvider,type WorkspaceFetch} from '../src/training/workspace-services'
import {createPracticeRuntime} from '../src/training/practice-runtime.mjs'
import {kioskAppearance,validateKioskAppearance,validateKioskPresets,type KioskPreset} from '../netlify/lib/kiosk-skins.mjs'
import {KioskAssetProvider} from '../src/kiosk-skins/KioskAssets'
import '../src/client-admin.css'
import '../src/styles.css'
function Review(){
 const [lang,setLang]=useState<'es'|'en'>('es'),[settings,setSettings]=useState(true)
 const runtime=useMemo(()=>createPracticeRuntime({role:'owner',capabilities:['settings','pos','collect'],category:'Retail'}),[])
 const transport=useMemo(()=>{let appearance=kioskAppearance(),presets:KioskPreset[]=[],backgroundAssets:Array<{key:string;name:string;size:number}>=[];const images=new Map<string,string>();const fetch:WorkspaceFetch=async(input,init)=>{
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.origin)
  if(url.origin!==location.origin)return Response.json({message:'Preview only'},{status:403})
  if(url.pathname.endsWith('/client-kiosk-visual-assets')){
   if(url.searchParams.get('siteId')!==runtime.siteId)return Response.json({message:'Preview business only'},{status:403})
   if(init?.method==='DELETE'){
    const {assetKey}=JSON.parse(String(init.body));if(appearance.backgroundAssetKey===assetKey||presets.some(p=>p.appearance.backgroundAssetKey===assetKey))return Response.json({message:'Este fondo está en un diseño guardado / This background is used by a saved design.'},{status:409})
    if(!images.has(assetKey))return Response.json({message:'Background unavailable'},{status:404});URL.revokeObjectURL(images.get(assetKey)!);images.delete(assetKey);backgroundAssets=backgroundAssets.filter(x=>x.key!==assetKey);return Response.json({ok:true,backgroundAssets})
   }
   const file=init?.body instanceof FormData?init.body.get('file'):null;if(!(file instanceof File)||backgroundAssets.length>=8)return Response.json({message:'Maximum 8 backgrounds'},{status:400})
   const key=`sites/${runtime.siteId}/kiosk-backgrounds/${crypto.randomUUID()}.webp`;images.set(key,URL.createObjectURL(file));backgroundAssets=[...backgroundAssets,{key,name:file.name,size:file.size}];return Response.json({ok:true,assetKey:key,backgroundAssets})
  }
  if(!url.pathname.endsWith('/client-kiosk'))return Response.json({message:'Preview only'},{status:403})
  let body:Record<string,unknown>={};try{if(init?.body)body=JSON.parse(String(init.body))}catch{return Response.json({message:'Invalid preview request'},{status:400})}
  if(body.action==='appearance'){try{appearance=validateKioskAppearance(body.appearance,runtime.siteId);if(appearance.backgroundAssetKey&&!images.has(appearance.backgroundAssetKey))throw Error('Unavailable image');return Response.json({ok:true,appearance})}catch{return Response.json({message:'Apariencia inválida / Invalid appearance'},{status:400})}}
  if(body.action==='appearance_presets'){try{presets=validateKioskPresets(body.presets,runtime.siteId);return Response.json({ok:true,presets})}catch{return Response.json({message:'Diseño inválido / Invalid design'},{status:400})}}
  const response=await runtime.fetch(input,init),data=await response.json()
  return Response.json({...data,appearance,presets,backgroundAssets,presentation:{...data.presentation,appearance}},{status:response.status})
 };return {fetch,resolve:(_siteId:string,key:string)=>images.get(key)||'',dispose:()=>{for(const url of images.values())URL.revokeObjectURL(url)}}},[runtime])
 useEffect(()=>()=>transport.dispose(),[transport])
 return <KioskAssetProvider resolve={transport.resolve}><WorkspaceServicesProvider fetch={transport.fetch}><div style={{padding:16,background:'#0b1529',color:'#fff',fontFamily:'system-ui'}}><strong>WebFactory PR · Kiosk Skin Engine · DEMO</strong><p>{lang==='es'?'Datos de práctica. Sin pagos ni operaciones reales.':'Practice data. No real payments or operations.'}</p><button style={{minHeight:44,fontSize:16,background:'#285fa6',color:'#fff',border:'1px solid #fff',borderRadius:8,padding:'10px 14px'}} onClick={()=>setSettings(!settings)}>{settings?'Ver kiosco / View kiosk':'Apariencia / Appearance'}</button></div>{settings?<KioskAppearanceSettings site={runtime.site} lang={lang}/>:<Kiosk lang={lang} setLang={setLang} pairing=""/>}</WorkspaceServicesProvider></KioskAssetProvider>
}
createRoot(document.getElementById('root')!).render(<ThemeProvider><Review/></ThemeProvider>)
