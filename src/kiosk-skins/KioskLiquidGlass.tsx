import NeutralReadingLayer from '../glassy-dashboard/NeutralReadingLayer'
import type {GlassOptics} from '../../shared/glass-optics.mjs'
import {createPortal} from 'react-dom'
import {useEffect,useState,type RefObject} from 'react'
import {FluidGlassSurface} from '../glassy-dashboard/FluidGlassSurface'

// Only mount the actual MIT-licensed lens on two large stable kiosk surfaces.
// No second renderer is written here; this chooses targets for the library.
export default function KioskLiquidGlass({host,backdropSelector,distortion,optics,motion,blur,opacity,headerColor,cartColor,opticsEnabled=true}:{host:RefObject<HTMLElement|null>;backdropSelector:string;distortion?:number;optics?:GlassOptics;motion?:boolean;blur?:number;opacity?:number;headerColor?:string;cartColor?:string;opticsEnabled?:boolean}){
 const [targets,setTargets]=useState<HTMLElement[]>([])
 useEffect(()=>{
  const root=host.current
  if(!root)return
  const update=()=>{
   const next=Array.from(root.querySelectorAll<HTMLElement>('.kiosk-header,.kiosk-cart,.kiosk-catalog,.kiosk-welcome,.kiosk-connect,.kiosk-result')).slice(0,6)
   setTargets(old=>old.length===next.length&&old.every((item,index)=>item===next[index])?old:next)
  }
  update()
  const observer=new MutationObserver(update)
  observer.observe(root,{childList:true,subtree:true})
  return()=>{observer.disconnect();setTargets([])}
 },[host])
 return <>{targets.map((target,index)=>createPortal(
  target.matches('.kiosk-header,.kiosk-cart')&&opticsEnabled?<FluidGlassSurface opacity={opacity} readingColor={target.matches('.kiosk-header')?headerColor:cartColor} blur={blur} optics={optics} motion={motion} distortion={distortion} radius={target.matches('.kiosk-header')?28:30} backdropSelector={backdropSelector}/>:<NeutralReadingLayer opacity={opacity} color={target.matches('.kiosk-header')?headerColor:target.matches('.kiosk-cart')?cartColor:undefined}/>,
  target,
  index
 ))}</>
}
