import {useEffect,type ReactNode,type RefObject} from 'react'
import {coverLiquidDashboard} from './liquid-coverage'
import './liquid-glass.css'

export function LiquidGlassProvider({enabled,motion,blur,backdrop,scope,children}:{enabled:boolean;motion:number;blur:number;backdrop:string;scope:RefObject<HTMLDivElement|null>;children:ReactNode}){
 useEffect(()=>{if(scope.current)return coverLiquidDashboard(scope.current,{enabled,motion,blur,backdrop})},[enabled,motion,blur,backdrop,scope])
 return children
}
