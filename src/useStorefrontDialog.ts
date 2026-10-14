import {useLayoutEffect,useRef} from 'react'

/** Manage the top storefront overlay while keeping the underlying catalog mounted. */
export function useStorefrontDialog(selector:string,close:()=>void,label:string) {
  const closeRef=useRef(close)
  closeRef.current=close
  useLayoutEffect(()=>{
    if(!selector)return
    const dialog=document.querySelector<HTMLElement>(selector)
    if(!dialog)return
    const previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null
    const original={role:dialog.getAttribute('role'),label:dialog.getAttribute('aria-label'),modal:dialog.getAttribute('aria-modal'),tabindex:dialog.getAttribute('tabindex')}
    dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label',label);dialog.tabIndex=-1
    const siblings:Array<{element:HTMLElement;inert:boolean}>=[]
    let current=dialog
    while(current.parentElement){
      for(const sibling of Array.from(current.parentElement.children))if(sibling!==current&&sibling instanceof HTMLElement){siblings.push({element:sibling,inert:sibling.inert});sibling.inert=true}
      current=current.parentElement
      if(current===document.body)break
    }
    const overflow=document.documentElement.style.overflow
    document.documentElement.style.overflow='hidden'
    const controls=()=>Array.from(dialog.querySelectorAll<HTMLElement>('button,a[href],input,select,textarea,[tabindex]')).filter(control=>control.tabIndex>=0&&!control.hasAttribute('disabled')&&!control.closest('[inert]')&&control.getClientRects().length>0)
    // Focusing the heading region avoids opening the mobile keyboard automatically.
    dialog.focus({preventScroll:true})
    const keyboard=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();closeRef.current();return}
      if(event.key!=='Tab')return
      const elements=controls(),first=elements[0],last=elements.at(-1)
      if(!first){event.preventDefault();dialog.focus();return}
      if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog)){event.preventDefault();last?.focus()}
      else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===dialog||!dialog.contains(document.activeElement))){event.preventDefault();first.focus()}
    }
    document.addEventListener('keydown',keyboard,true)
    return()=>{
      document.removeEventListener('keydown',keyboard,true)
      for(const {element,inert} of siblings)element.inert=inert
      document.documentElement.style.overflow=overflow
      for(const [attribute,value] of Object.entries({role:original.role,'aria-label':original.label,'aria-modal':original.modal,tabindex:original.tabindex}))if(value===null)dialog.removeAttribute(attribute);else dialog.setAttribute(attribute,value)
      if(previousFocus?.isConnected&&!previousFocus.closest('[inert]'))previousFocus.focus({preventScroll:true})
    }
  },[selector,label])
}
