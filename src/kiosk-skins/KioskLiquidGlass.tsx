import {createPortal} from 'react-dom'
import {useEffect,useState,type RefObject} from 'react'
import {FluidGlassSurface} from '../glassy-dashboard/FluidGlassSurface'

// Only mount the actual MIT-licensed lens on two large stable kiosk surfaces.
// No second renderer is written here; this chooses targets for the library.
export default function KioskLiquidGlass({host,backdropSelector}:{host:RefObject<HTMLElement|null>;backdropSelector:string}){
 const [targets,setTargets]=useState<HTMLElement[]>([])
 useEffect(()=>{
  const root=host.current
  if(!root)return
  const update=()=>{
   const next=Array.from(root.querySelectorAll<HTMLElement>('.kiosk-header,.kiosk-cart')).slice(0,2)
   setTargets(old=>old.length===next.length&&old.every((item,index)=>item===next[index])?old:next)
  }
  update()
  const observer=new MutationObserver(update)
  observer.observe(root,{childList:true,subtree:true})
  return()=>{observer.disconnect();setTargets([])}
 },[host])
 return <>{targets.map((target,index)=>createPortal(
  <FluidGlassSurface radius={index===0?28:30} backdropSelector={backdropSelector}/>,
  target,
  index===0?'header':'cart'
 ))}</>
}
