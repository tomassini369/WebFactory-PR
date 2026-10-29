import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react'
import type {Glass} from 'vaso/core'
import './liquid-glass.css'

const LiquidContext=createContext<{enabled:boolean;motion:number;blur:number;backdrop:string}|null>(null)
export function LiquidGlassProvider({enabled,motion,blur,backdrop,children}:{enabled:boolean;motion:number;blur:number;backdrop:string;children:ReactNode}){
 return <LiquidContext.Provider value={{enabled,motion,blur,backdrop}}>{children}</LiquidContext.Provider>
}

/** Vaso only sees this decorative wallpaper subtree, never a form or commerce record. */
export function LiquidSurface({disabled=false,kind='panel'}:{disabled?:boolean;kind?:'panel'|'button'}){
 const settings=useContext(LiquidContext),source=useRef<HTMLSpanElement>(null),lens=useRef<HTMLSpanElement>(null),[active,setActive]=useState(false)
 const enabled=Boolean(settings?.enabled&&!disabled),motion=settings?.motion??0,backdrop=settings?.backdrop,blur=settings?.blur??0
 useEffect(()=>{
  const decoration=source.current,root=lens.current,host=decoration?.parentElement
  if(!enabled||!root||!decoration||!host)return
  const queries=['(prefers-reduced-motion:reduce)','(prefers-reduced-transparency:reduce)','(forced-colors:active)'].map(q=>matchMedia(q))
  const connection=(navigator as Navigator&{connection?:EventTarget&{saveData?:boolean}}).connection
  let glass:Glass|null=null,disposed=false,visible=false,loading=false,epoch=0
  const stop=()=>{epoch++;glass?.destroy();glass=null;setActive(false)}
  const allowed=()=>visible&&!document.hidden&&!host.closest('[hidden],[inert],.wf-panel-expanded')&&!queries.some(q=>q.matches)&&!connection?.saveData&&motion>0&&CSS.supports('backdrop-filter','blur(1px)')
  const sync=async()=>{
   const rect=host.getBoundingClientRect()
   if(!allowed()||rect.width*rect.height>450_000||rect.width<1||rect.height<1){stop();return}
   if(glass||loading)return
   loading=true;const ticket=epoch
   try{
    const {createGlass}=await import('vaso/core')
    if(disposed||ticket!==epoch||!allowed())return
    glass=createGlass(root,{radius:parseFloat(getComputedStyle(host).borderTopLeftRadius)||24,depth:kind==='button'?1.15:.75,blur:blur/4,dispersion:.12,specular:.55,light:matchMedia('(hover:hover) and (pointer:fine)').matches?'pointer':315,pressable:true,ripple:true})
    setActive(true)
   }catch{stop()}finally{loading=false}
  }
  // Forward visual coordinates without canceling the original business event.
  const forward=(event:PointerEvent)=>{
   if(!glass||(event.target as Element).closest('input,select,textarea,[disabled],[aria-disabled=true]'))return
   root.dispatchEvent(new PointerEvent(event.type,{clientX:event.clientX,clientY:event.clientY,pointerId:event.pointerId,pointerType:event.pointerType,button:event.button,buttons:event.buttons,bubbles:false}))
  }
  const types=['pointerdown','pointermove','pointerup','pointercancel','pointerleave'] as const
  types.forEach(type=>host.addEventListener(type,forward,{passive:true}))
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;void sync()},{threshold:.01})
  intersection.observe(host)
  const resize=new ResizeObserver(()=>void sync());resize.observe(host)
  const isolation=new MutationObserver(()=>void sync())
  for(let node:HTMLElement|null=host;node;node=node.parentElement)isolation.observe(node,{attributes:true,attributeFilter:['hidden','inert','class']})
  const update=()=>void sync()
  queries.forEach(q=>q.addEventListener('change',update));document.addEventListener('visibilitychange',update);connection?.addEventListener('change',update)
  return()=>{disposed=true;stop();intersection.disconnect();resize.disconnect();isolation.disconnect();types.forEach(type=>host.removeEventListener(type,forward));queries.forEach(q=>q.removeEventListener('change',update));document.removeEventListener('visibilitychange',update);connection?.removeEventListener('change',update)}
 },[enabled,motion,kind,backdrop,blur])
 if(!settings)return null
 return <span ref={source} className={'gd-liquid-surface gd-liquid-'+kind} data-active={active?'true':'false'} aria-hidden="true" inert><span className="gd-liquid-backdrop" style={{backgroundImage:`url(${JSON.stringify(settings.backdrop)})`}}><span className="gd-liquid-lens" ref={lens}/></span><span className="gd-liquid-tint"/></span>
}
