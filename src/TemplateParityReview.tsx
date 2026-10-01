import {useState} from 'react'
import StorefrontPreview from './StorefrontPreview'
import type {StorefrontSite} from './ClientStorefront'
import snapshot from './nova-public-preview.json'

/** Public storefront snapshot only. Compiled out of production with the review route. */
export default function TemplateParityReview(){
 const [device,setDevice]=useState<'desktop'|'tablet'|'mobile'>('desktop')
 const [lang,setLang]=useState<'en'|'es'>('es')
 const [originalColors,setOriginalColors]=useState(false)
 const site:StorefrontSite={...snapshot,catalog:snapshot.catalog.map(item=>({...item,type:item.type==='product'?'product':'service',inventory:null})),design:{...snapshot.design,...(originalColors?{primary:'#111111',secondary:'#D1B07C'}:{})}}
 return <main style={{padding:'24px',background:'#eef2f7',color:'#0b1529',minHeight:'100vh'}}>
   <h1>Template → Builder → Website</h1>
   <p>Nova Fade Studio · Vista visual con los datos públicos del negocio. No procesa pagos, reservas ni mensajes.</p>
   <p><a href="/templates/northline-barber">Ver template Northline</a> · <a href="/builder?template=northline-barber">Probar el Builder</a> · <a href="https://webfactorypr.com/sites/novafadestudio" target="_blank" rel="noreferrer">Comparar con la versión actual</a></p>
   <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:20}}>
     {(['desktop','tablet','mobile'] as const).map(mode=><button key={mode} onClick={()=>setDevice(mode)} aria-pressed={device===mode}>{mode}</button>)}
     <button onClick={()=>setLang(lang==='es'?'en':'es')}>{lang==='es'?'English':'Español'}</button>
     <button onClick={()=>setOriginalColors(!originalColors)}>{originalColors?'Usar colores del cliente':'Usar colores originales del template'}</button>
   </div>
   <StorefrontPreview previewSite={site} lang={lang} device={device}/>
 </main>
}
