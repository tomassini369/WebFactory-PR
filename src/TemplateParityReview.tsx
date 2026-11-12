import {useEffect,useState} from 'react'
import {templateBySlug} from './templateData'
import StorefrontPreview from './StorefrontPreview'
import type {StorefrontSite} from './ClientStorefront'
import snapshot from './nova-public-preview.json'

function reviewAudio() {
 const sampleRate=8000, seconds=6
 const samples=sampleRate*seconds
 const buffer=new ArrayBuffer(44+samples*2)
 const view=new DataView(buffer)
 const tag=(offset:number,text:string)=>[...text].forEach((char,index)=>view.setUint8(offset+index,char.charCodeAt(0)))
 tag(0,'RIFF');view.setUint32(4,buffer.byteLength-8,true);tag(8,'WAVE');tag(12,'fmt ')
 view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true)
 view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true)
 tag(36,'data');view.setUint32(40,samples*2,true)
 const notes=[261.63,329.63,392,523.25,440,392,329.63,293.66]
 for(let i=0;i<samples;i++){
  const time=i/sampleRate, beat=(time*2)%1
  const frequency=notes[Math.floor(time*2)%notes.length]
  const envelope=Math.min(1,beat*20)*Math.exp(-beat*5)
  view.setInt16(44+i*2,Math.round(3200*envelope*Math.sin(2*Math.PI*frequency*time)),true)
 }
 return URL.createObjectURL(new Blob([buffer],{type:'audio/wav'}))
}

/** Public storefront snapshot only. Compiled out of production with the review route. */
export default function TemplateParityReview(){
 const [device,setDevice]=useState<'desktop'|'tablet'|'mobile'>('desktop')
 const [lang,setLang]=useState<'en'|'es'>('es')
 const [custom,setCustom]=useState(false)
 const [originalColors,setOriginalColors]=useState(true)
 const [selected,setSelected]=useState('northline-barber')
 const [audio,setAudio]=useState('')
 useEffect(()=>{const url=reviewAudio();setAudio(url);return()=>URL.revokeObjectURL(url)},[])
 const entertainment=selected==='sonido-vivo-artist'||selected==='pulse-dj-services'
 const template=templateBySlug(selected)

 const barber:StorefrontSite={...snapshot,business:{...snapshot.business,heroUrl:snapshot.business.heroUrl||'/template-images/19664876.jpg',galleryUrls:snapshot.business.galleryUrls.length?snapshot.business.galleryUrls:['/template-images/7697280.jpg','/template-images/7447145.jpg','/template-images/9511913.jpg']},catalog:snapshot.catalog.map(item=>({...item,type:item.type==='product'?'product':'service',inventory:null})),design:{...snapshot.design,templateSlug:custom?'':snapshot.design.templateSlug,templateOverrides:originalColors?[]:['primary','secondary']}}
 const site:StorefrontSite=entertainment&&template?{
  ...barber,siteId:template.slug,slug:template.slug,
  business:{name:template.name,category:template.category,headline:template.headline,kicker:template.kicker,description:template.description,heroUrl:template.heroImage,galleryUrls:template.gallery,address:template.location,
   socialLinks:[{id:'instagram',url:'https://www.instagram.com/'},{id:'youtube',url:'https://www.youtube.com/'},{id:'spotify',url:'https://open.spotify.com/'}]},
  design:{templateSlug:template.slug},
  catalog:template.items.map(item=>({id:item.id,type:'service',name:item.name,description:item.description,price:item.price,imageUrl:item.image,inventory:null,requiresAppointment:Boolean(item.appointment),duration:item.duration||0})),
  employees:[],music:{autoplay:false,welcomeId:'one',tracks:audio?[
   {id:'one',title:'Noche de verano',audioUrl:audio,coverUrl:template.heroImage},
   {id:'two',title:'Prueba sin portada',audioUrl:audio,coverUrl:''},
  ]:[]},
 }:selected==='distrito-fade'?{...barber,siteId:'distrito-fade-review',slug:'distrito-fade',business:{...barber.business,name:'Distrito Fade',nameEn:'Distrito Fade',nameEs:'Distrito Fade',description:'Precision haircuts, fades and beard grooming.',descriptionEn:'Precision haircuts, fades and beard grooming.',descriptionEs:'Recortes, fades y arreglo de barba.'},design:{...barber.design,style:'Luxury',primary:'#C8A96B',secondary:'#242424'}}:barber
 return <main style={{padding:'24px',background:'#eef2f7',color:'#0b1529',minHeight:'100vh'}}>
   <h1>Templates, enlaces y música</h1>
   <p>Vista de prueba. Las pistas contienen audio de demostración y los enlaces llevan a las plataformas de ejemplo.</p>
   <p><a href="/templates/northline-barber">Ver template Northline</a> · <a href="/builder?template=northline-barber">Probar el Builder</a> · <a href="https://webfactorypr.com/sites/novafadestudio" target="_blank" rel="noreferrer">Comparar con la versión actual</a></p>
   <label>Template <select value={selected} onChange={event=>setSelected(event.target.value)}>
     <option value="northline-barber">Northline Barber</option><option value="distrito-fade">Distrito Fade</option><option value="sonido-vivo-artist">Sonido Vivo</option><option value="pulse-dj-services">Pulse DJ</option>
   </select></label>
   <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:20}}>
     {(['desktop','tablet','mobile'] as const).map(mode=><button key={mode} onClick={()=>setDevice(mode)} aria-pressed={device===mode}>{mode}</button>)}
     <button onClick={()=>setCustom(!custom)}>{custom?'Custom activo · ver Template':'Template activo · probar Custom'}</button>
     <button onClick={()=>setLang(lang==='es'?'en':'es')}>{lang==='es'?'English':'Español'}</button>
     <button onClick={()=>setOriginalColors(!originalColors)}>{originalColors?'Usar colores del cliente':'Usar colores originales del template'}</button>
   </div>
   <StorefrontPreview key={site.siteId} previewSite={site} lang={lang} device={device}/>
 </main>
}
