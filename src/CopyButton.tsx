import { useEffect, useState } from 'react'

export default function CopyButton({value,lang='en'}:{value:string;lang?:'en'|'es'}) {
  const [state,setState]=useState<'idle'|'busy'|'done'|'error'>('idle')
  useEffect(()=>setState('idle'),[value])
  const copy=async()=>{if(state==='busy')return;setState('busy');try{await navigator.clipboard.writeText(value);setState('done')}catch{setState('error')}}
  return <span><button type="button" onClick={copy} disabled={state==='busy'} aria-busy={state==='busy'}>{state==='done'?(lang==='es'?'Copiado':'Copied'):state==='busy'?(lang==='es'?'Copiando…':'Copying…'):state==='error'?(lang==='es'?'Reintentar copia':'Retry copy'):(lang==='es'?'Copiar':'Copy')}</button>{state==='error'&&<small role="alert">{lang==='es'?'No se pudo copiar. Selecciona el enlace para copiarlo manualmente.':'Could not copy. Select the link to copy it manually.'}</small>}<span className="wf-sr-only" role="status">{state==='done'?(lang==='es'?'Enlace copiado':'Link copied'):''}</span></span>
}
