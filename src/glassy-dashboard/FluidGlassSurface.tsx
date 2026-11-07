import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from 'react'
import LiquidGlass from 'simple-liquid-glass'
import {glassRendererOptions,type GlassOptics} from '../../shared/glass-optics.mjs'
import {fluidGlassDistortion,FLUID_GLASS_DISTORTION_DEFAULT} from '../../shared/fluid-glass.mjs'

// The licensed renderer is from github.com/lucaperullo/simple-liquid-glass.
// Keep the current glass rendering as an immediate fallback when transparency
// is reduced, and never render it unless the user opted in.
const FluidGlassContext=createContext({enabled:false,distortion:FLUID_GLASS_DISTORTION_DEFAULT as number,optics:{} as GlassOptics,motion:true})
export function FluidGlassProvider({enabled,distortion=FLUID_GLASS_DISTORTION_DEFAULT,optics={},motion=true,children}:{enabled:boolean;distortion?:number;optics?:GlassOptics;motion?:boolean;children:ReactNode}){
 const value=useMemo(()=>({enabled,distortion:fluidGlassDistortion(distortion),optics,motion}),[enabled,distortion,optics,motion])
 return <FluidGlassContext.Provider value={value}>{children}</FluidGlassContext.Provider>
}
export function useFluidGlass(){return useContext(FluidGlassContext).enabled}
export function FluidGlassSurface({radius=28,backdropSelector='.gd-wallpaper',distortion,optics,motion}:{radius?:number;backdropSelector?:string;distortion?:number;optics?:GlassOptics;motion?:boolean}){
 const context=useContext(FluidGlassContext),intensity=fluidGlassDistortion(distortion??context.distortion)
 const [reduceTransparency,setReduceTransparency]=useState(false),[reduceMotion,setReduceMotion]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)
 useEffect(()=>{const m=window.matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduceMotion(m.matches);update();m.addEventListener?.('change',update);return()=>m.removeEventListener?.('change',update)},[])
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
  data-fluid-optics={JSON.stringify(optics??context.optics)}
  className="wf-licensed-liquid-glass"
  {...glassRendererOptions(optics??context.optics,intensity,!reduceMotion&&(motion??context.motion))}
  renderer="auto"
  backdropSelector={backdropSelector}
  blur={2}
  radius={radius}
  style={{position:'absolute',inset:0,width:'100%',height:'100%',borderRadius:'inherit',pointerEvents:'none',zIndex:-1}}
 ><span aria-hidden="true"/></LiquidGlass>
}
