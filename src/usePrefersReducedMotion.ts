import {useEffect,useState} from 'react'

/** Reactively honor OS preference changes; Motion's hook snapshots only at mount. */
export function usePrefersReducedMotion() {
  const [reduced,setReduced]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(()=>{
    const query=window.matchMedia('(prefers-reduced-motion: reduce)')
    const update=()=>setReduced(query.matches)
    update();query.addEventListener('change',update)
    return()=>query.removeEventListener('change',update)
  },[])
  return reduced
}
