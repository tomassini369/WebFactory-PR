import { createContext, useContext, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import './PortalPanel.css'
import {FluidGlassSurface,useFluidGlass} from './glassy-dashboard/FluidGlassSurface'
import { Maximize2, Minimize2 } from 'lucide-react'

type PortalPanelContextValue = { expandedPanel: string | null; setExpandedPanel: React.Dispatch<React.SetStateAction<string | null>>; lang: 'es' | 'en' }
const PortalPanelContext = createContext<PortalPanelContextValue | null>(null)

export function PortalPanelProvider({ children, lang }: { children: ReactNode; lang: 'es' | 'en' }) {
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpandedPanel(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!expandedPanel) return
    const previousOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => { document.documentElement.style.overflow = previousOverflow }
  }, [expandedPanel])

  return <PortalPanelContext.Provider value={{ expandedPanel, setExpandedPanel, lang }}>{children}</PortalPanelContext.Provider>
}

export function PortalPanel({ className = '', children, style, 'data-training': trainingTarget, 'data-card-depth': cardDepth, 'data-button-depth': buttonDepth, 'data-motion': motion }: { className?: string; children: ReactNode; style?: CSSProperties; 'data-training'?: string; 'data-card-depth'?: string; 'data-button-depth'?: string; 'data-motion'?: string }) {
  const liquid = useFluidGlass()
  const context = useContext(PortalPanelContext)
  if (!context) throw new Error('PortalPanel must be rendered inside PortalPanelProvider.')
  const id = useId()
  const expanded = context.expandedPanel === id
  const es = context.lang === 'es'
  const panel = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!expanded || !panel.current) return
    const element = panel.current, previousFocus = document.activeElement as HTMLElement | null
    const siblings: Array<{element:HTMLElement;inert:boolean;visibility:string;priority:string;opacity:string;opacityPriority:string}> = []
    const ancestors: Array<{element:HTMLElement;previous:string|null}> = []
    let current: HTMLElement = element
    while (current.parentElement) {
      for (const sibling of Array.from(current.parentElement.children)) {
        if (sibling !== current && sibling instanceof HTMLElement && !sibling.matches('.gd-wallpaper,.gd-shade')) {
          siblings.push({element:sibling,inert:sibling.inert,visibility:sibling.style.getPropertyValue('visibility'),priority:sibling.style.getPropertyPriority('visibility'),opacity:sibling.style.getPropertyValue('opacity'),opacityPriority:sibling.style.getPropertyPriority('opacity')}); sibling.inert = true; sibling.style.setProperty('visibility','hidden','important');sibling.style.setProperty('opacity','0','important')
        }
      }
      current = current.parentElement
      ancestors.push({element:current,previous:current.getAttribute('data-wf-panel-ancestor')});current.setAttribute('data-wf-panel-ancestor','')
      if (current === document.body) break
    }
    // The top layer escapes the dashboard scrollport on mobile without remounting the card.
    if (typeof element.showPopover === 'function') element.showPopover()
    element.scrollTop = 0
    element.focus({preventScroll:true})
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const controls = Array.from(element.querySelectorAll<HTMLElement>('button, summary, a[href], input, select, textarea, [tabindex]')).filter(control => control.tabIndex >= 0 && !control.hasAttribute('disabled') && control.getClientRects().length > 0 && !control.closest('[inert]'))
      const first=controls[0],last=controls.at(-1)
      if (!first) { event.preventDefault(); element.focus(); return }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === element)) { event.preventDefault(); first.focus() }
    }
    element.addEventListener('keydown',trap)
    return () => {
      if (typeof element.hidePopover === 'function' && element.matches(':popover-open')) element.hidePopover()
      element.removeEventListener('keydown',trap)
      for (const sibling of siblings) { sibling.element.inert = sibling.inert; if(sibling.visibility)sibling.element.style.setProperty('visibility',sibling.visibility,sibling.priority);else sibling.element.style.removeProperty('visibility');if(sibling.opacity)sibling.element.style.setProperty('opacity',sibling.opacity,sibling.opacityPriority);else sibling.element.style.removeProperty('opacity') }
      for(const ancestor of ancestors){if(ancestor.previous===null)ancestor.element.removeAttribute('data-wf-panel-ancestor');else ancestor.element.setAttribute('data-wf-panel-ancestor',ancestor.previous)}
      context.setExpandedPanel(current=>current===id?null:current)
      if (previousFocus?.isConnected) previousFocus.focus({preventScroll:true})
    }
  },[expanded])

  return <section popover={expanded?'manual':undefined} data-card-depth={cardDepth} data-button-depth={buttonDepth} data-motion={motion} data-training={trainingTarget} style={style} ref={panel} tabIndex={expanded?-1:undefined} role={expanded?'dialog':undefined} aria-modal={expanded||undefined} aria-label={expanded?(es?'Panel ampliado':'Expanded panel'):undefined} className={`${className} wf-portal-panel${expanded ? ' wf-panel-expanded' : ''}`.trim()}>
    {liquid&&<FluidGlassSurface/>}
    <div className="wf-panel-tools">
      <button type="button" className="wf-panel-expand" aria-label={expanded?(es?'Cerrar tarjeta ampliada':'Close expanded card'):(es?'Ampliar tarjeta':'Expand card')} title={expanded?(es?'Cerrar':'Close'):(es?'Ampliar':'Expand')} aria-expanded={expanded} onClick={()=>context.setExpandedPanel(expanded?null:id)}>{expanded?<Minimize2 size={20} aria-hidden="true"/>:<Maximize2 size={20} aria-hidden="true"/>}</button>
    </div>
    {children}
  </section>
}
