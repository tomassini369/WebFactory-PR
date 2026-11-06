import {useEffect, useMemo, useState} from 'react'
import WebFactoryBuilder, {initialState, type BuilderState, type BuilderAsset} from './WebFactoryBuilder'
import {useWorkspaceFetch} from './training/workspace-services'
import {templateConfigs,templateVisualStyle} from './templateData'
import {usePractice} from './training/practice-context'

type Lang='es'|'en'
export function existingBuilderState(site:any):BuilderState {
  const defaults=structuredClone(initialState)
  const template=templateConfigs.find(template=>template.slug===site.design?.templateSlug)
  const style=template?({modern:'Modern',luxury:'Luxury',minimal:'Minimal',bold:'Bold'} as const)[templateVisualStyle(template.category)]:defaults.design.style
  const featureDefaults=Object.fromEntries(Object.keys(defaults.features).map(key=>[key,['products','services','cart'].includes(key)]))
  const closedDays=Object.fromEntries(Object.entries(defaults.hours).map(([day,hours])=>[day,{...hours,enabled:false}]))
  const url=(key:string)=>key?`/.netlify/functions/client-asset?siteId=${encodeURIComponent(site.siteId)}&key=${encodeURIComponent(key)}`:''
  return {
    ...defaults,
    business:{...defaults.business,...site.business,slug:site.slug,logo:url(site.business?.logoAssetKey),hero:url(site.business?.heroAssetKey),gallery:(site.business?.galleryAssetKeys||[]).map(url),galleryAssets:(site.business?.galleryAssetKeys||[]).map((assetKey:string)=>({assetKey,fileName:'',contentType:''}))},
    design:{...defaults.design,style,primary:template?.dark||defaults.design.primary,secondary:template?.accent||defaults.design.secondary,...site.design},features:{...featureDefaults,...site.features},
    catalog:(site.catalog||[]).filter((item:any)=>item.active!==false).map((item:any)=>({...item,image:url(item.imageAssetKey)})),
    team:(site.employees||[]).filter((member:any)=>member.active!==false),
    hours:{...closedDays,...site.hours},
    payments:{...defaults.payments,...site.paymentRules,bookingPayment:site.paymentRules?.bookingPayment||'full',methods:{stripe:Boolean(site.paymentRules?.methods?.stripe),ath:Boolean(site.paymentRules?.methods?.ath),inPerson:Boolean(site.paymentRules?.methods?.inPerson)},stripe:{...defaults.payments.stripe,accountStatus:site.paymentRules?.stripeConnectedAccountId?'existing':'new'},ath:{...defaults.payments.ath,...site.paymentRules?.ath,accountStatus:site.paymentRules?.ath?.credentialsConfigured?'active':'needs_account'},inPerson:{instructions:site.paymentRules?.inPerson?.instructions||''}},
  }
}

export default function SiteRedesignBuilder({siteId,lang}:{siteId:string;lang:Lang}) {
  const fetch=useWorkspaceFetch(),practice=usePractice(),es=lang==='es'
  const [site,setSite]=useState<any>(null),[error,setError]=useState(''),[saving,setSaving]=useState(false)
  const request=async(url:string,options?:RequestInit)=>{
    const response=await fetch(url,{credentials:'include',cache:'no-store',...options})
    const result=await response.json()
    if(!response.ok||!result.ok)throw new Error(result.message||(es?'No se pudo completar la solicitud.':'The request could not be completed.'))
    return result
  }
  useEffect(()=>{
    let active=true;setSite(null);setError('')
    request(`/.netlify/functions/client-admin?siteId=${encodeURIComponent(siteId)}`).then(result=>{
      if(!active)return
      if(result.membership?.role!=='owner'&&!(result.membership?.role==='admin'&&result.membership?.platform===true))throw new Error(es?'Solo el Dueño puede rediseñar este negocio.':'Only the Owner can redesign this business.')
      setSite(result.site)
    }).catch(error=>{if(active)setError(error instanceof Error?error.message:String(error))})
    return()=>{active=false}
  },[siteId])
  const state=useMemo(()=>site?existingBuilderState(site):null,[site])
  const upload=async(file:File):Promise<BuilderAsset>=>{
    if(practice)throw new Error(es?'Los archivos no se suben durante Training.':'Uploads are disabled during Training.')
    if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)||file.size>8*1024*1024)throw new Error(es?'Usa una imagen JPG, PNG, WebP o GIF de hasta 8 MB.':'Use a JPG, PNG, WebP or GIF image up to 8 MB.')
    const form=new FormData();form.append('siteId',siteId);form.append('file',file)
    const result=await request('/.netlify/functions/client-asset',{method:'POST',body:form})
    return {assetKey:result.assetKey,imageUrl:result.imageUrl,fileName:file.name,contentType:file.type,size:file.size}
  }
  const publish=async(value:BuilderState)=>{
    if(practice)throw new Error(es?'Training no publica cambios.':'Training does not publish changes.')
    const template=templateConfigs.find(template=>template.slug===value.design.templateSlug)
    const changes={...value,design:{...value.design,templateName:template?.name||'',templateCategory:template?.category||''}}
    setSaving(true)
    try{
      const result=await request('/.netlify/functions/client-admin',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({siteId,revision:site.revision,section:'builder',value:changes})})
      setSite(result.site);return existingBuilderState(result.site)
    }finally{setSaving(false)}
  }
  if(!site||!state)return <section className="wf-redesign"><p role={error?'alert':'status'}>{error||(es?'Cargando Builder…':'Loading Builder…')}</p></section>
  if(!['active','trialing','trial','complimentary'].includes(site.servicePlan?.subscriptionStatus))return <section className="wf-redesign"><h2>{es?'Se requiere una suscripción activa':'An active subscription is required'}</h2><a href="/client-admin">{es?'Volver al portal':'Back to portal'}</a></section>
  return <WebFactoryBuilder key={siteId} lang={lang} editing={{initialState:state,revision:site.revision,saving,timezone:site.settings?.timezone,publicUrl:`/sites/${site.slug}`,upload,publish}}/>
}
