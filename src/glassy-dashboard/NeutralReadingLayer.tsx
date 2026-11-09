import {useEffect,useState} from 'react'
import {useWebFactoryTheme} from '../theme'
import {posBrandPair} from '../pos-domain'
import {neutralGlassOpacity,protectedZoneFill} from '../../shared/neutral-glass.mjs'
const readMedia=()=>({forced:typeof window!=='undefined'&&window.matchMedia('(forced-colors: active)').matches,reduced:typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-transparency: reduce)').matches,print:typeof window!=='undefined'&&window.matchMedia('print').matches})
export default function NeutralReadingLayer({opacity=.82,color}:{opacity?:number;color?:string}){
 const {theme}=useWebFactoryTheme(),[media,setMedia]=useState(readMedia)
 useEffect(()=>{const queries=['(forced-colors: active)','(prefers-reduced-transparency: reduce)','print'].map(q=>window.matchMedia(q));const update=()=>setMedia(readMedia());queries.forEach(q=>q.addEventListener?.('change',update));update();return()=>queries.forEach(q=>q.removeEventListener?.('change',update))},[])
 const base=color&&/^#[a-f\d]{6}$/i.test(color)?color:theme==='dark'?'#202020':'#f6f6f6'
 const fill=media.forced?'Canvas':media.print?'#ffffff':protectedZoneFill(base,posBrandPair(base).foreground,media.reduced?1:neutralGlassOpacity(opacity))
 return <span aria-hidden="true" className="wf-neutral-reading-layer" style={{backgroundColor:fill}}/>
}
