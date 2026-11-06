import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from 'react'
import LiquidGlass from 'simple-liquid-glass'
import {fluidGlassDistortion,FLUID_GLASS_DISTORTION_DEFAULT} from '../../shared/fluid-glass.mjs'

// The licensed renderer is from github.com/lucaperullo/simple-liquid-glass.
// Keep the current glass rendering as an immediate fallback when transparency
// is reduced, and never render it unless the user opted in.
const FluidGlassContext=createContext({enabled:false,distortion:FLUID_GLASS_DISTORTION_DEFAULT as number})
export function FluidGlassProvider({enabled,distortion=FLUID_GLASS_DISTORTION_DEFAULT,children}:{enabled:boolean;distortion?:number;children:ReactNode}){
 const value=useMemo(()=>({enabled,distortion:fluidGlassDistortion(distortion)}),[enabled,distortion])
 return <FluidGlassContext.Provider value={value}>{children}</FluidGlassContext.Provider>
}
export function useFluidGlass(){return useContext(FluidGlassContext).enabled}
export function FluidGlassSurface({radius=28,backdropSelector='.gd-wallpaper',distortion}:{radius?:number;backdropSelector?:string;distortion?:number}){
 const context=useContext(FluidGlassContext),intensity=fluidGlassDistortion(distortion??context.distortion)
 const [reduceTransparency,setReduceTransparency]=useState(false)
 useEffect(()=>{
  const m=window.matchMedia('(prefers-reduced-transparency: reduce)')
  const update=()=>setReduceTransparency(m.matches)
  update();m.addEventListener?.('change',update)
  return()=>m.removeEventListener?.('change',update)
 },[])
 if(reduceTransparency)return null
 return <LiquidGlass
  aria-hidden="true"
  data-fluid-distortion={intensity}
  className="wf-licensed-liquid-glass"
  material="clear"
  renderer="auto"
  backdropSelector={backdropSelector}
  lensProfile="material"
  lensOptions={{strength:intensity/100}}
  blur={2}
  radius={radius}
  frost={0.08}
  glassColor="rgba(255,255,255,0.08)"
  style={{position:'absolute',inset:0,width:'100%',height:'100%',borderRadius:'inherit',pointerEvents:'none',zIndex:-1}}
 ><span aria-hidden="true"/></LiquidGlass>
}
