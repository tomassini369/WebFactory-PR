import type {Glass} from 'vaso/core'
import layerStyles from './liquid-layer.css?inline'

export const LIQUID_CARDS='article,.wf-portal-panel,.ca-panel,.wfa-card,.wfa-stat,.ca-help-card,.bcc-training,.gd-appearance,.mfa-panel,.business-qr,.ca-payment-status,.ca-detail-grid>div,.ca-mini-stats>div,.ca-summary-grid>article,.wfa-sales-breakdown>div,.ca-service-plan>div,.pos-sidebar,.pos-catalog,.pos-customer-info,.bcc-activity,.wfa-checks>div,dialog,.gd-content>header>div:first-child,.wfa-sales>header'
export const LIQUID_BUTTONS='button,a.btn,a.ca-primary-link,summary,[role="button"]'
type Options={enabled:boolean;motion:number;blur:number;backdrop:string}
type Surface={host:HTMLElement;layer:HTMLElement;lens:HTMLSpanElement;kind:'card'|'button';glass:Glass|null;timer:ReturnType<typeof setTimeout>|null;ticket:number;visible:boolean;signature:string;position:string;positionPriority:string;ownsPosition:boolean}

/** One scoped registry covers existing and lazy-rendered surfaces without replacing their DOM or handlers. */
export function coverLiquidDashboard(scope:HTMLElement,options:Options){
 const surfaces=new Map<HTMLElement,Surface>()
 const queries=['(prefers-reduced-motion:reduce)','(prefers-reduced-transparency:reduce)','(forced-colors:active)'].map(q=>matchMedia(q))
 const connection=(navigator as Navigator&{connection?:EventTarget&{saveData?:boolean}}).connection
 let disposed=false,queued=false,serial=0
 const allowed=(s:Surface)=>options.enabled&&options.motion>0&&!document.hidden&&!queries.some(q=>matchMedia(q.media).matches)&&!connection?.saveData&&s.visible&&!s.host.closest('[inert],[hidden]')&&!s.host.matches(':disabled,[aria-disabled=true]')
 const stop=(s:Surface)=>{s.ticket++;if(s.timer)clearTimeout(s.timer);s.timer=null;s.glass?.destroy();s.glass=null;s.layer.dataset.active='false';s.host.removeAttribute('data-liquid-pressed')}
 const buttonFill=(host:HTMLElement)=>{
  const style=getComputedStyle(host),color=style.backgroundColor,values=color.match(/[\d.]+/g)?.map(Number)||[]
  const alpha=color.includes('/')?Number(color.split('/')[1].replace(')','').trim()):color.startsWith('rgba')?values[3]:1
  if(alpha>=.999)return color // Keep opaque brand and semantic action colors exactly.
  const ink=(style.color.match(/[\d.]+/g)?.map(Number)||[0,0,0,1]),scale=style.color.startsWith('color(')?255:1
  const rgb=ink.slice(0,3).map(v=>v*scale),inkAlpha=ink[3]??1
  const lum=(c:number[])=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0)
  const base=lum(rgb)>.179?0:255
  for(const a of [.82,.9,.96,1]){
   const pass=[0,255].every(w=>{const bg=base*a+w*(1-a),b=lum([bg,bg,bg]),f=lum(rgb.map(v=>v*inkAlpha+bg*(1-inkAlpha)));return (Math.max(b,f)+.05)/(Math.min(b,f)+.05)>=4.5})
   if(pass||a===1)return `rgba(${base},${base},${base},${a})`
  }
  return color
 }
 const visible=new IntersectionObserver(entries=>{for(const entry of entries){const s=surfaces.get(entry.target as HTMLElement);if(s){s.visible=entry.isIntersecting;if(!s.visible)stop(s)}}},{threshold:0})
 const resize=new ResizeObserver(entries=>{for(const entry of entries){const s=surfaces.get(entry.target as HTMLElement);if(s?.glass){stop(s)}}})
 const finish=(s:Surface)=>{if(s.timer)clearTimeout(s.timer);s.timer=setTimeout(()=>stop(s),1800)}
 const start=async(s:Surface,event?:PointerEvent)=>{
  if(!allowed(s))return
  if(s.timer)clearTimeout(s.timer)
  // At most four interacting lenses; every registered surface keeps the same liquid material at rest.
  const rect=s.lens.parentElement!.getBoundingClientRect(),width=Math.min(rect.width,512),height=Math.min(rect.height,384)
  const x=Math.max(0,Math.min(rect.width-width,(event?.clientX??rect.x+rect.width/2)-rect.x-width/2)),y=Math.max(0,Math.min(rect.height-height,(event?.clientY??rect.y+rect.height/2)-rect.y-height/2))
  // Large/expanded cards get a local lens under the interaction instead of a viewport-sized raster.
  Object.assign(s.lens.style,{left:x+'px',top:y+'px',width:width+'px',height:height+'px'})
  const ticket=++s.ticket
  try{
   const {createGlass}=await import('vaso/core')
   if(disposed||s.ticket!==ticket||!allowed(s)||!s.layer.isConnected)return
   const active=[...surfaces.values()].filter(x=>x.glass&&x!==s);if(active.length>=4)stop(active[0])
   if(!s.glass)s.glass=createGlass(s.lens,{radius:Math.min(parseFloat(getComputedStyle(s.host).borderTopLeftRadius)||18,Math.min(width,height)/2),depth:s.kind==='button'?1.2:.8,blur:options.blur/4,dispersion:.12,specular:.65,light:matchMedia('(hover:hover) and (pointer:fine)').matches?'pointer':315,pressable:true,ripple:true})
   s.layer.dataset.active='true'
   if(event){s.lens.dispatchEvent(new PointerEvent('pointerdown',{clientX:event.clientX,clientY:event.clientY,pointerId:event.pointerId,pointerType:event.pointerType,bubbles:false}));if(!s.host.hasAttribute('data-liquid-pressed'))s.lens.dispatchEvent(new PointerEvent('pointerup',{bubbles:false}))}
   finish(s)
  }catch{stop(s)}
 }
 const release=(s:Surface)=>{s.host.removeAttribute('data-liquid-pressed');s.lens.dispatchEvent(new PointerEvent('pointerup',{bubbles:false}));finish(s)}
 const restore=(s:Surface)=>{stop(s);visible.unobserve(s.host);resize.unobserve(s.host);s.layer.remove();s.host.removeAttribute('data-liquid-kind');s.host.style.removeProperty('--liquid-button-fill');if(s.ownsPosition&&s.host.style.getPropertyValue('position')==='relative'&&s.host.style.getPropertyPriority('position')==='important'){if(s.position)s.host.style.setProperty('position',s.position,s.positionPriority);else s.host.style.removeProperty('position')}surfaces.delete(s.host)}
 const signature=(host:HTMLElement)=>[host.className,host.getAttribute('aria-current'),host.getAttribute('aria-pressed'),host.matches(':disabled'),document.documentElement.getAttribute('data-wf-theme')].join('|')
 const scan=()=>{
  queued=false;if(disposed)return
  for(const s of surfaces.values())if(!s.host.isConnected||!scope.contains(s.host)||!s.host.contains(s.layer))restore(s)
  scroll();if(!options.enabled)return
  for(const s of surfaces.values())if(s.kind==='button'&&s.signature!==signature(s.host)){s.signature=signature(s.host);s.host.removeAttribute('data-liquid-kind');const color=buttonFill(s.host);s.host.dataset.liquidKind=s.kind;s.host.style.setProperty('--liquid-button-fill',color)}
  for(const host of scope.querySelectorAll<HTMLElement>(LIQUID_CARDS+','+LIQUID_BUTTONS)){
   if(host.closest('.gd-liquid-surface,svg,canvas')||surfaces.has(host))continue
   const kind=host.matches(LIQUID_BUTTONS)?'button':'card'
   const layer=document.createElement('wf-liquid-surface');layer.className='gd-liquid-surface gd-liquid-'+kind;layer.setAttribute('aria-hidden','true');layer.inert=true;layer.dataset.active='false'
   const backdrop=document.createElement('span');backdrop.className='gd-liquid-backdrop';backdrop.style.backgroundImage=`url(${JSON.stringify(options.backdrop)})`
   const lens=document.createElement('span');lens.className='gd-liquid-lens';const tint=document.createElement('span');tint.className='gd-liquid-tint';backdrop.append(lens);const shadow=layer.attachShadow({mode:'open'}),style=document.createElement('style');style.textContent=layerStyles;shadow.append(style,backdrop,tint)
   if(kind==='button')host.style.setProperty('--liquid-button-fill',buttonFill(host))
   const position=host.style.getPropertyValue('position'),positionPriority=host.style.getPropertyPriority('position'),ownsPosition=getComputedStyle(host).position==='static';if(ownsPosition)host.style.setProperty('position','relative','important')
   host.dataset.liquidKind=kind;host.prepend(layer)
   const s:Surface={host,layer,lens,kind,glass:null,timer:null,ticket:++serial,visible:false,signature:signature(host),position,positionPriority,ownsPosition};surfaces.set(host,s);visible.observe(host);resize.observe(host)
  }
 }
 const scroll=()=>{for(const s of surfaces.values())s.layer.style.transform=s.host.matches('.wf-panel-expanded')?`translateY(${s.host.scrollTop}px)`:''}
 const schedule=()=>{if(!queued){queued=true;queueMicrotask(scan)}}
 const observer=new MutationObserver(records=>{
  if(records.some(r=>!(r.target instanceof Element)||!r.target.closest('.gd-liquid-surface')))schedule()
  for(const s of surfaces.values())if(s.glass&&!allowed(s))stop(s)
 })
 const themeObserver=new MutationObserver(schedule);themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-wf-theme']})
 observer.observe(scope,{subtree:true,childList:true,attributes:true,attributeFilter:['class','disabled','aria-disabled','inert','hidden','aria-current','aria-pressed']})
 const target=(event:Event)=>{const el=event.target as Element;return el.closest<HTMLElement>('[data-liquid-kind="button"]')||el.closest<HTMLElement>('[data-liquid-kind="card"]')}
 const down=(event:PointerEvent)=>{if((event.target as Element).closest('input,select,textarea,[disabled],[aria-disabled=true]'))return;const s=surfaces.get(target(event)!);if(!s||!allowed(s))return;s.host.setAttribute('data-liquid-pressed','');void start(s,event)}
 const up=()=>{for(const s of surfaces.values())if(s.host.hasAttribute('data-liquid-pressed'))release(s)}
 const hover=(event:PointerEvent)=>{if(event.pointerType==='touch')return;const s=surfaces.get(target(event)!);if(s?.kind==='button'&&!s.host.contains(event.relatedTarget as Node|null))void start(s)}
 const key=(event:KeyboardEvent)=>{if(event.key!=='Enter'&&event.key!==' ')return;const s=surfaces.get(target(event)!);if(s?.kind==='button'&&allowed(s)){s.host.setAttribute('data-liquid-pressed','');const r=s.host.getBoundingClientRect();void start(s,new PointerEvent('pointerdown',{clientX:r.x+r.width/2,clientY:r.y+r.height/2}))}}
 const leave=(event:FocusEvent)=>{const s=surfaces.get(target(event)!);if(s)release(s)}
 const update=()=>{for(const s of surfaces.values())if(!allowed(s))stop(s)}
 scope.addEventListener('pointerdown',down,{passive:true});scope.addEventListener('pointerover',hover,{passive:true});document.addEventListener('pointerup',up,{passive:true});document.addEventListener('pointercancel',up,{passive:true});scope.addEventListener('keydown',key);scope.addEventListener('keyup',up);scope.addEventListener('focusout',leave)
 scope.addEventListener('scroll',scroll,true);document.addEventListener('visibilitychange',update);queries.forEach(q=>q.addEventListener('change',update));connection?.addEventListener('change',update);scan()
 return()=>{disposed=true;observer.disconnect();themeObserver.disconnect();visible.disconnect();resize.disconnect();for(const s of surfaces.values())restore(s);scope.removeEventListener('pointerdown',down);scope.removeEventListener('pointerover',hover);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',up);scope.removeEventListener('keydown',key);scope.removeEventListener('keyup',up);scope.removeEventListener('focusout',leave);scope.removeEventListener('scroll',scroll,true);document.removeEventListener('visibilitychange',update);queries.forEach(q=>q.removeEventListener('change',update));connection?.removeEventListener('change',update)}
}
