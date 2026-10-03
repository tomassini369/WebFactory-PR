import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import './PortalPanel.css'

type PortalPanelContextValue = { expandedPanel: string | null; setExpandedPanel: (id: string | null) => void; lang: 'es' | 'en' }
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

export function PortalPanel({ className = '', children }: { className?: string; children: ReactNode }) {
  const context = useContext(PortalPanelContext)
  if (!context) throw new Error('PortalPanel must be rendered inside PortalPanelProvider.')
  const id = useId()
  const [collapsed, setCollapsed] = useState(false)
  const [scrollable, setScrollable] = useState(false)
  const expanded = context.expandedPanel === id
  const es = context.lang === 'es'
  const panel = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!expanded || !panel.current) return
    const element = panel.current, previousFocus = document.activeElement as HTMLElement | null
    const siblings: Array<{element:HTMLElement;inert:boolean}> = []
    let current: HTMLElement = element
    while (current.parentElement) {
      for (const sibling of Array.from(current.parentElement.children)) {
        if (sibling !== current && sibling instanceof HTMLElement) {
          siblings.push({element:sibling,inert:sibling.inert}); sibling.inert = true
        }
      }
      current = current.parentElement
      if (current === document.body) break
    }
    element.focus()
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const controls = Array.from(element.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]')).filter(control => control.tabIndex >= 0 && !control.hasAttribute('disabled') && control.getClientRects().length > 0 && !control.closest('[inert]'))
      const first=controls[0],last=controls.at(-1)
      if (!first) { event.preventDefault(); element.focus(); return }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === element)) { event.preventDefault(); first.focus() }
    }
    element.addEventListener('keydown',trap)
    return () => {
      element.removeEventListener('keydown',trap)
      for (const sibling of siblings) sibling.element.inert = sibling.inert
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  },[expanded])

  return <section ref={panel} tabIndex={expanded?-1:undefined} role={expanded?'dialog':undefined} aria-modal={expanded||undefined} aria-label={expanded?(es?'Panel ampliado':'Expanded panel'):undefined} className={`${className} wf-portal-panel${collapsed ? ' wf-panel-collapsed' : ''}${scrollable ? ' wf-panel-scroll' : ''}${expanded ? ' wf-panel-expanded' : ''}`.trim()}>
    <div className="wf-panel-tools" role="toolbar" aria-label={es ? 'Controles del recuadro' : 'Panel controls'}>
      <button type="button" aria-expanded={!collapsed} title={collapsed ? (es ? 'Mostrar contenido' : 'Show content') : (es ? 'Ocultar contenido' : 'Hide content')} onClick={() => setCollapsed(value => !value)}>{collapsed ? (es ? 'Mostrar' : 'Show') : (es ? 'Ocultar' : 'Hide')}</button>
      <button type="button" aria-pressed={scrollable} title={es ? 'Activar o quitar scroll interno' : 'Toggle internal scrolling'} onClick={() => setScrollable(value => !value)}>{es ? 'Scroll' : 'Scroll'}</button>
      <button type="button" aria-pressed={expanded} title={expanded ? (es ? 'Salir de pantalla completa' : 'Exit full screen') : (es ? 'Ampliar a pantalla completa' : 'Expand to full screen')} onClick={() => context.setExpandedPanel(expanded ? null : id)}>{expanded ? (es ? 'Cerrar' : 'Close') : (es ? 'Ampliar' : 'Expand')}</button>
    </div>
    {children}
  </section>
}
