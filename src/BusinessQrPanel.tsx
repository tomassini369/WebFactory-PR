import { useEffect, useMemo, useState } from 'react'
import { contrastTextColor } from './color-contrast'
import './business-qr.css'

type Language='es'|'en'
type Props={siteId?:string;slug?:string;businessName:string;lang:Language;revision?:number;accent?:string;compact?:boolean;onClose?:()=>void}

export function BusinessQrPanel({siteId,slug,businessName,lang,revision=0,accent='#3C86F6',compact=false,onClose}:Props){
  const es=lang==='es'
  const endpoint=useMemo(()=>`/.netlify/functions/business-qr?${siteId?`siteId=${encodeURIComponent(siteId)}`:'platform=1'}&lang=${lang}&v=${revision}`,[siteId,lang,revision])
  const url=siteId&&slug?`${location.origin}/sites/${encodeURIComponent(slug)}`:`${location.origin}/`
  const [imageFailed,setImageFailed]=useState(false)
  const [feedback,setFeedback]=useState('')
  useEffect(()=>{setImageFailed(false);setFeedback('')},[endpoint])

  const copy=async()=>{try{await navigator.clipboard.writeText(url);setFeedback(es?'Enlace copiado':'Link copied')}catch{setFeedback(es?'No se pudo copiar el enlace':'Could not copy the link')}}
  const share=async()=>{try{if(navigator.share)await navigator.share({title:businessName,text:es?`Visita ${businessName}`:`Visit ${businessName}`,url});else await copy()}catch(error){if(!(error instanceof DOMException&&error.name==='AbortError'))setFeedback(es?'No se pudo compartir':'Could not share')}}
  const download=async()=>{try{const response=await fetch(endpoint,{credentials:'include',cache:'no-store'});if(!response.ok)throw new Error();const blob=await response.blob();const objectUrl=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=objectUrl;anchor.download=`${(slug||'webfactory').replace(/[^a-z0-9-]/gi,'-')}-qr.png`;document.body.append(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(objectUrl);setFeedback(es?'QR descargado':'QR downloaded')}catch{setFeedback(es?'No se pudo descargar el QR':'Could not download the QR')}}

  return <section className={`business-qr${compact?' compact':''}`} style={{'--business-qr-accent':accent,'--business-qr-accent-text':contrastTextColor(accent)} as React.CSSProperties}>
    <header><div><small>{es?'COMPARTE TU NEGOCIO':'SHARE YOUR BUSINESS'}</small><h2>{es?'Tu código QR':'Your QR code'}</h2><p>{es?'Al escanearlo, abre la página principal de tu negocio.':'Scanning it opens your business home page.'}</p></div>{onClose&&<button className="business-qr-close" type="button" onClick={onClose} aria-label={es?'Cerrar':'Close'}>×</button>}</header>
    <div className="business-qr-content"><div className="business-qr-image-wrap">{imageFailed?<div className="business-qr-error">{es?'No se pudo cargar el QR. Intenta de nuevo.':'The QR could not load. Try again.'}</div>:<img className="business-qr-image" src={endpoint} alt={es?`Código QR de ${businessName}`:`${businessName} QR code`} onError={()=>setImageFailed(true)}/>}<strong>{businessName}</strong></div>
      <div className="business-qr-details"><span>{es?'ENLACE PRINCIPAL':'MAIN LINK'}</span><code>{url}</code><nav><button type="button" onClick={share}><ShareIcon/>{es?'Compartir perfil':'Share profile'}</button><button type="button" onClick={copy}><LinkIcon/>{es?'Copiar enlace':'Copy link'}</button><button type="button" onClick={download}><DownloadIcon/>{es?'Descargar':'Download'}</button></nav>{feedback&&<small role="status">{feedback}</small>}</div></div>
  </section>
}

function ShareIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5M5 12v8h14v-8"/></svg>}
function LinkIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13.5a4 4 0 0 0 5.7 0l3.5-3.5a4 4 0 0 0-5.7-5.7l-2 2M14 10.5a4 4 0 0 0-5.7 0l-3.5 3.5a4 4 0 0 0 5.7 5.7l2-2"/></svg>}
function DownloadIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 20h16"/></svg>}
