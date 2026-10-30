import {createContext,useContext,useEffect,useState,type ReactNode} from 'react'
import LiquidGlass from 'simple-liquid-glass'

// The licensed renderer is from github.com/lucaperullo/simple-liquid-glass.
// Keep the current glass rendering as an immediate fallback when transparency
// is reduced, and never render it unless the user opted in.
const FluidGlassContext=createContext(false)
export function FluidGlassProvider({enabled,children}:{enabled:boolean;children:ReactNode}){
 return <FluidGlassContext.Provider value={enabled}>{children}</FluidGlassContext.Provider>
}
export function useFluidGlass(){return useContext(FluidGlassContext)}
export function FluidGlassSurface({radius=28,backdropSelector='.gd-wallpaper'}:{radius?:number;backdropSelector?:string}){
 const [reduceTransparency,setReduceTransparency]=useState(false)
 const [touch,setTouch]=useState(()=>window.matchMedia('(any-pointer: coarse)').matches)
 useEffect(()=>{
  const m=window.matchMedia('(prefers-reduced-transparency: reduce)')
  const update=()=>setReduceTransparency(m.matches)
  update();m.addEventListener?.('change',update)
  return()=>m.removeEventListener?.('change',update)
 },[])
 useEffect(()=>{
  const m=window.matchMedia('(any-pointer: coarse)')
  const update=()=>setTouch(m.matches)
  m.addEventListener?.('change',update)
  return()=>m.removeEventListener?.('change',update)
 },[])
 if(reduceTransparency)return null
 return <LiquidGlass
  aria-hidden="true"
  className="wf-licensed-liquid-glass"
  material="clear"
  renderer="auto"
  effectMode={touch?'blur':'auto'}
  backdropSelector={backdropSelector}
  lensProfile="material"
  lensOptions={{strength:0.10}}
  blur={0}
  radius={radius}
  frost={0}
  glassColor="rgba(25,28,34,0.001)"
  style={{position:'absolute',inset:0,width:'100%',height:'100%',borderRadius:'inherit',pointerEvents:'none',zIndex:-1}}
 ><span aria-hidden="true"/></LiquidGlass>
}
