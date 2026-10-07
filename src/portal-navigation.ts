import {useEffect} from 'react'

let pending = false
let navigationTimer: number | undefined
export function navigatePortal(href:string) {
  if(pending)return
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){window.location.assign(href);return}
  pending=true
  document.documentElement.classList.add('wf-portal-leaving')
  navigationTimer=window.setTimeout(()=>window.location.assign(href),180)
}

export function usePortalNavigation() {
  useEffect(()=>{
    const reset=()=>{pending=false;window.clearTimeout(navigationTimer);document.documentElement.classList.remove('wf-portal-leaving')}
    reset()
    const viewport=window.visualViewport
    const syncViewport=()=>{
      document.documentElement.style.setProperty('--pg-viewport-height',`${viewport?.height??window.innerHeight}px`)
      document.documentElement.style.setProperty('--pg-viewport-top',`${viewport?.offsetTop??0}px`)
    }
    syncViewport()
    viewport?.addEventListener('resize',syncViewport)
    viewport?.addEventListener('scroll',syncViewport)
    const click=(event:MouseEvent)=>{
      if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey)return
      const anchor=event.target instanceof Element?event.target.closest<HTMLAnchorElement>('a[href]'):null
      if(!anchor||anchor.hasAttribute('download')||(anchor.target&&anchor.target!=='_self'))return
      const url=new URL(anchor.href,window.location.href)
      if(url.origin!==window.location.origin||url.search||url.hash)return
      const path=window.location.pathname.replace(/\/$/,'')||'/'
      if(path!=='/'||!/^\/(client-admin|webfactory-admin)\/?$/.test(url.pathname))return
      event.preventDefault();navigatePortal(url.pathname)
    }
    document.addEventListener('click',click)
    window.addEventListener('pageshow',reset)
    return()=>{viewport?.removeEventListener('resize',syncViewport);viewport?.removeEventListener('scroll',syncViewport);document.documentElement.style.removeProperty('--pg-viewport-height');document.documentElement.style.removeProperty('--pg-viewport-top');document.removeEventListener('click',click);window.removeEventListener('pageshow',reset);reset()}
  },[])
}
