import {useEffect,useState,useTransition} from 'react'
import {confirmLeaveDrafts} from './interaction-state'

let navigateInApp: ((href:string)=>void) | undefined
export function navigatePortal(href:string) {
  if(!confirmLeaveDrafts())return
  if(navigateInApp)navigateInApp(href)
  else window.location.assign(href)
}

const supportedPath=(path:string)=>/^\/(?:client-admin\/?|webfactory-admin\/?|templates(?:\/[a-z0-9-]+)?\/?)?$/.test(path)
export function usePortalNavigation() {
  const [pathname,setPathname]=useState(window.location.pathname)
  const [pending,startTransition]=useTransition()
  useEffect(()=>{
    let navigating=false
    const navigate=(href:string)=>{
      const url=new URL(href,window.location.href)
      if(url.origin!==window.location.origin||url.search||url.hash||window.location.search||window.location.hash||!supportedPath(url.pathname)||!supportedPath(window.location.pathname)){window.location.assign(href);return}
      if(navigating||url.pathname===window.location.pathname)return
      navigating=true
      window.history.pushState(null,'',url.pathname)
      startTransition(()=>setPathname(url.pathname))
    }
    navigateInApp=navigate
    const reset=()=>{navigating=false;document.documentElement.classList.remove('wf-portal-leaving')}
    const back=()=>{if(!confirmLeaveDrafts()){window.history.pushState(null,'',pathname);return}reset();startTransition(()=>setPathname(window.location.pathname))}
    reset()
    const viewport=window.visualViewport
    let restingHeight=viewport?.height??window.innerHeight
    let frame=0
    const syncViewport=()=>{
      if(viewport&&Math.abs(viewport.scale-1)>.02)return
      const height=viewport?.height??window.innerHeight
      const active=document.activeElement
      const editing=active instanceof HTMLInputElement&&active.type!=='checkbox'&&Boolean(active.closest('.ca-login,.wfa-login'))
      if(!editing)restingHeight=Math.max(restingHeight,height)
      const keyboard=editing&&restingHeight-height>120
      document.documentElement.toggleAttribute('data-pg-keyboard',keyboard)
      if(keyboard){
        document.documentElement.style.setProperty('--pg-viewport-height',`${height}px`)
        document.documentElement.style.setProperty('--pg-viewport-top',`${viewport?.offsetTop??0}px`)
        // Keep the focused field reachable without collapsing the card's header.
        const card=active?.closest('.ca-login,.wfa-login')
        if(card&&active instanceof HTMLElement){
          const field=active.getBoundingClientRect(),bounds=card.getBoundingClientRect()
          if(field.bottom>bounds.bottom-12)card.scrollTop+=field.bottom-bounds.bottom+12
          else if(field.top<bounds.top+12)card.scrollTop-=bounds.top-field.top+12
        }
      }else{
        document.documentElement.style.removeProperty('--pg-viewport-height')
        document.documentElement.style.removeProperty('--pg-viewport-top')
      }
    }
    const scheduleViewport=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(syncViewport)}
    syncViewport()
    viewport?.addEventListener('resize',scheduleViewport)
    viewport?.addEventListener('scroll',scheduleViewport)
    document.addEventListener('focusin',scheduleViewport)
    document.addEventListener('focusout',scheduleViewport)
    const click=(event:MouseEvent)=>{
      if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey)return
      const anchor=event.target instanceof Element?event.target.closest<HTMLAnchorElement>('a[href]'):null
      if(!anchor||anchor.hasAttribute('download')||(anchor.target&&anchor.target!=='_self'))return
      const url=new URL(anchor.href,window.location.href)
      if(url.origin!==window.location.origin||url.search||url.hash)return
      const path=window.location.pathname.replace(/\/$/,'')||'/'
      if(!supportedPath(path)||!supportedPath(url.pathname))return
      if(!confirmLeaveDrafts()){event.preventDefault();return}
      event.preventDefault();navigate(url.pathname)
    }
    document.addEventListener('click',click)
    window.addEventListener('pageshow',reset)
    window.addEventListener('popstate',back)
    return()=>{cancelAnimationFrame(frame);document.removeEventListener('focusin',scheduleViewport);document.removeEventListener('focusout',scheduleViewport);document.documentElement.removeAttribute('data-pg-keyboard');viewport?.removeEventListener('resize',scheduleViewport);viewport?.removeEventListener('scroll',scheduleViewport);document.documentElement.style.removeProperty('--pg-viewport-height');document.documentElement.style.removeProperty('--pg-viewport-top');document.removeEventListener('click',click);window.removeEventListener('pageshow',reset);window.removeEventListener('popstate',back);navigateInApp=undefined;reset()}
  },[pathname])
  useEffect(()=>{if(pending)return;window.scrollTo({top:0,behavior:'instant'});document.documentElement.classList.remove('wf-portal-leaving');window.dispatchEvent(new Event('wf-route-change'))},[pathname,pending])
  return pathname
}
