import {useState} from 'react'
import {createPortal} from 'react-dom'
import ClientStorefront,{type StorefrontSite} from './ClientStorefront'
import './builder.css'

/** An independent viewport makes desktop/tablet/mobile CSS identical to the live page. */
export default function StorefrontPreview({previewSite,lang,device='desktop'}:{previewSite:StorefrontSite;lang:'es'|'en';device?:'desktop'|'tablet'|'mobile'}){
  const [body,setBody]=useState<HTMLElement|null>(null)
  return <div className={`wf-template-preview-shell ${device}`}>
    <iframe title={lang==='es'?'Preview del website':'Website preview'} src="about:blank" className="wf-template-preview-frame" onLoad={event=>{
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
