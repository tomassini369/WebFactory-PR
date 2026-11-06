import {useId} from 'react'
export function KioskColorField({label,value,fallback,onChange,lang,inherit=true}:{label:string;value:string;fallback:string;onChange:(color:string)=>void;lang:'es'|'en';inherit?:boolean}){
 const id=useId()
 const safe=/^#[a-f\d]{6}$/i.test(value)?value:/^#[a-f\d]{6}$/i.test(fallback)?fallback:'#285fa6'
 return <div className="kiosk-color-field"><label htmlFor={id}>{label}</label><span className="kiosk-color-controls"><input type="color" aria-label={`${label} · ${lang==='es'?'Selector visual':'Visual picker'}`} value={safe} onChange={e=>onChange(e.target.value)}/><input id={id} value={value} placeholder={fallback} maxLength={7} pattern="#[0-9a-fA-F]{6}|^$" onChange={e=>onChange(e.target.value)}/>{inherit&&<button type="button" onClick={()=>onChange('')} disabled={!value}>{lang==='es'?'Heredar':'Inherit'}</button>}</span></div>
}
