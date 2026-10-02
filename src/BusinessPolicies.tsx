import { useEffect, useId, useRef, useState } from 'react'
import './business-policies.css'

export type BusinessPolicyText = {privacy?:string;terms?:string;refund?:string}

export function BusinessPolicies({policies,lang,businessName}:{policies?:BusinessPolicyText;lang:'es'|'en';businessName:string}) {
  const titleId=useId()
  const [selected,setSelected]=useState<keyof BusinessPolicyText|null>(null)
  const dialog=useRef<HTMLDialogElement>(null)
  const labels={privacy:lang==='es'?'Privacidad':'Privacy',terms:lang==='es'?'Términos':'Terms',refund:lang==='es'?'Reembolsos y cancelaciones':'Refunds and cancellations'}
  useEffect(()=>{if(selected)dialog.current?.showModal();else dialog.current?.close()},[selected])
  return <div className="business-policy-links">
    {(['privacy','terms','refund'] as const).filter(key=>policies?.[key]?.trim()).map(key=><button type="button" key={key} onClick={()=>setSelected(key)}>{labels[key]}</button>)}
    <a href="/privacy" target="_blank" rel="noreferrer">{lang==='es'?'Privacidad de WebFactory':'WebFactory privacy'}</a>
    <dialog ref={dialog} className="business-policy-dialog" aria-labelledby={titleId} onClose={()=>setSelected(null)} onClick={event=>{if(event.target===dialog.current)setSelected(null)}}>
      <header><div><small>{businessName}</small><h2 id={titleId}>{selected?labels[selected]:''}</h2></div><button type="button" onClick={()=>setSelected(null)} aria-label={lang==='es'?'Cerrar política':'Close policy'}>×</button></header>
      <div className="business-policy-text">{selected?policies?.[selected]:''}</div>
    </dialog>
  </div>
}

export function CustomerDataNotice({lang,businessName}:{lang:'es'|'en';businessName:string}) {
  return <p className="customer-data-notice">{lang==='es'?`Tus datos se envían a ${businessName} para atender esta solicitud y gestionar el servicio o la compra. WebFactory procesa la información para operar la plataforma.`:`Your details are sent to ${businessName} to handle this request and manage the service or purchase. WebFactory processes the information to operate the platform.`}</p>
}
