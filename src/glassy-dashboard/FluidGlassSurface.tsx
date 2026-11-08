import NeutralReadingLayer from './NeutralReadingLayer'
import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from 'react'
import LiquidGlass from 'simple-liquid-glass'
import {glassRendererOptions,type GlassOptics} from '../../shared/glass-optics.mjs'
import {fluidGlassDistortion,FLUID_GLASS_DISTORTION_DEFAULT} from '../../shared/fluid-glass.mjs'

// The licensed renderer is from github.com/lucaperullo/simple-liquid-glass.
// Keep the current glass rendering as an immediate fallback when transparency
// is reduced, and never render it unless the user opted in.
const FluidGlassContext=createContext({enabled:false,distortion:FLUID_GLASS_DISTORTION_DEFAULT as number,optics:{} as GlassOptics,motion:true,blur:2,opacity:.82})
export function FluidGlassProvider({enabled,distortion=FLUID_GLASS_DISTORTION_DEFAULT,optics={},motion=true,blur=2,opacity=.82,children}:{enabled:boolean;distortion?:number;optics?:GlassOptics;motion?:boolean;blur?:number;opacity?:number;children:ReactNode}){
 const value=useMemo(()=>({enabled,distortion:fluidGlassDistortion(distortion),optics,motion,blur,opacity}),[enabled,distortion,optics,motion,blur,opacity])
 return <FluidGlassContext.Provider value={value}>{children}</FluidGlassContext.Provider>
}
export function useFluidGlass(){return useContext(FluidGlassContext).enabled}
export function FluidGlassSurface({radius=28,backdropSelector='.gd-wallpaper',distortion,optics,motion,blur,opacity,readingColor}:{radius?:number;backdropSelector?:string;distortion?:number;optics?:GlassOptics;motion?:boolean;blur?:number;opacity?:number;readingColor?:string}){
 const context=useContext(FluidGlassContext),intensity=fluidGlassDistortion(distortion??context.distortion)
 const effectiveBlur=Math.min(40,Math.max(0,blur??context.blur))
 const [reduceTransparency,setReduceTransparency]=useState(false),[reduceMotion,setReduceMotion]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)
 useEffect(()=>{const m=window.matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduceMotion(m.matches);update();m.addEventListener?.('change',update);return()=>m.removeEventListener?.('change',update)},[])
 useEffect(()=>{
  const m=window.matchMedia('(prefers-reduced-transparency: reduce)')
  const update=()=>setReduceTransparency(m.matches)
  update();m.addEventListener?.('change',update)
  return()=>m.removeEventListener?.('change',update)
 },[])
 const reading=<NeutralReadingLayer opacity={opacity??context.opacity} color={readingColor}/>
 if(reduceTransparency)return reading
 return <><LiquidGlass
  aria-hidden="true"
  data-fluid-distortion={intensity}
  data-fluid-blur={effectiveBlur}
  data-fluid-optics={JSON.stringify(optics??context.optics)}
  className="wf-licensed-liquid-glass"
  {...glassRendererOptions(optics??context.optics,intensity,!reduceMotion&&(motion??context.motion))}
  renderer="auto"
  backdropSelector={backdropSelector}
  blur={effectiveBlur}
  radius={radius}
  style={{position:'absolute',inset:0,width:'100%',height:'100%',borderRadius:'inherit',pointerEvents:'none',zIndex:-2}}
 ><span aria-hidden="true"/></LiquidGlass>{reading}</>
}
