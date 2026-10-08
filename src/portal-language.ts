import {useCallback,useEffect,useState} from 'react'

type PortalLanguage='es'|'en'
const currentLanguage=():PortalLanguage=>document.documentElement.lang==='es'?'es':'en'

// MFA stays mounted around the portal. Share the document locale so a handoff,
// security verification or logout cannot silently reset the selected language.
export function usePortalLanguage(initialLanguage?:PortalLanguage){
  const [lang,setLang]=useState<PortalLanguage>(()=>initialLanguage??currentLanguage())
  useEffect(()=>{
    // App sets the existing default once; route changes never reset a user's choice.
    if(initialLanguage)document.documentElement.lang=initialLanguage
    const sync=()=>setLang(currentLanguage())
    const observer=new MutationObserver(sync)
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['lang']})
    sync()
    return()=>observer.disconnect()
  },[initialLanguage])
  const chooseLanguage=useCallback((next:PortalLanguage)=>{
    document.documentElement.lang=next
    setLang(next)
  },[])
  return [lang,chooseLanguage] as const
}
