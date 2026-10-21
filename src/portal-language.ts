import {useSyncExternalStore} from 'react'

type PortalLanguage='es'|'en'
const LANGUAGE_KEY='webfactory-language'
const listeners=new Set<()=>void>()
let language:PortalLanguage=document.documentElement.lang==='es'?'es':'en'
try{
  const saved=localStorage.getItem(LANGUAGE_KEY)
  if(saved==='es'||saved==='en')language=saved
}catch{ /* Locale still works when browser storage is unavailable. */ }
document.documentElement.lang=language

const subscribe=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener)}}
const snapshot=()=>language
function chooseLanguage(next:PortalLanguage){
  language=next
  document.documentElement.lang=next
  try{localStorage.setItem(LANGUAGE_KEY,next)}catch{ /* Keep the in-memory choice. */ }
  listeners.forEach(listener=>listener())
}

// Application state owns the locale; translator DOM mutations cannot change it.
export function usePortalLanguage(){
  return [useSyncExternalStore(subscribe,snapshot),chooseLanguage] as const
}
