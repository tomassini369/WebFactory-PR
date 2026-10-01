import {useState,useRef,useEffect} from 'react'
import {createPortal} from 'react-dom'
import ClientStorefront,{type StorefrontSite} from './ClientStorefront'
import './builder.css'

/** An independent viewport makes desktop/tablet/mobile CSS identical to the live page. */
export default function StorefrontPreview({previewSite,lang,device='desktop'}:{previewSite:StorefrontSite;lang:'es'|'en';device?:'desktop'|'tablet'|'mobile'}){
  const shell=useRef<HTMLDivElement>(null)
  const [availableWidth,setAvailableWidth]=useState(1280)
  const viewportWidth=device==='mobile'?390:device==='tablet'?768:1280
  const viewportHeight=device==='mobile'?740:800
  const scale=Math.min(1,availableWidth/viewportWidth)
  useEffect(()=>{const element=shell.current;if(!element)return;const observer=new ResizeObserver(entries=>setAvailableWidth(entries[0].contentRect.width));observer.observe(element);return()=>observer.disconnect()},[])
  const [body,setBody]=useState<HTMLElement|null>(null)
  return <div ref={shell} className={`wf-template-preview-shell ${device}`} style={{height:viewportHeight*scale}}>
    <iframe title={lang==='es'?'Preview del website':'Website preview'} srcDoc={'<!doctype html><html><head></head><body></body></html>'} className="wf-template-preview-frame" style={{width:viewportWidth,height:viewportHeight,transform:`scale(${scale})`,transformOrigin:'top left'}} onLoad={event=>{
      const doc=event.currentTarget.contentDocument
      if(!doc)return
      doc.head.replaceChildren()
      const viewport=doc.createElement('meta');viewport.name='viewport';viewport.content='width=device-width, initial-scale=1';doc.head.appendChild(viewport)
      document.querySelectorAll('link[rel="stylesheet"],style').forEach(node=>doc.head.appendChild(node.cloneNode(true)))
      doc.documentElement.lang=lang
      setBody(doc.body)
    }}/>
    {body&&createPortal(<ClientStorefront slug="preview" previewSite={previewSite} previewLanguage={lang}/>,body)}
  </div>
}
