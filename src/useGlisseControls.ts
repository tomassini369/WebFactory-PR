import {useEffect,useState} from 'react'
import './glisse-integration.css'

/** Keep the approved production controls until this preview integration is reviewed. */
export function useGlisseControls(){
 const enabled=typeof __WF_PREVIEW_REVIEW__!=='undefined'&&__WF_PREVIEW_REVIEW__
 const [ui,setUi]=useState<typeof import('glisse')|null>(null)
 const [error,setError]=useState(false)
 useEffect(()=>{
  let active=true
  if(enabled)void import('glisse').then(module=>{if(active)setUi(module)}).catch(()=>{if(active)setError(true)})
  return()=>{active=false}
 },[enabled])
 return {ui,error,status:enabled?(ui?'ready':error?'error':'loading'):'disabled'} as const
}
