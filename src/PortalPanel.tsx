import { createContext, useContext, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import './PortalPanel.css'
import { MoreHorizontal } from 'lucide-react'

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

export function PortalPanel({ className = '', children, style }: { className?: string; children: ReactNode; style?: CSSProperties }) {
  const context = useContext(PortalPanelContext)
  if (!context) throw new Error('PortalPanel must be rendered inside PortalPanelProvider.')
  const id = useId()
  const [collapsed, setCollapsed] = useState(false)
  const [scrollable, setScrollable] = useState(false)
  const expanded = context.expandedPanel === id
  const es = context.lang === 'es'
  const panel = useRef<HTMLElement>(null)
  const tools = useRef<HTMLDetailsElement>(null)
  const closeTools = () => { if (tools.current) { tools.current.open = false; tools.current.querySelector('summary')?.focus() } }
  useEffect(() => {
    const dismiss = (event: PointerEvent) => { if (tools.current?.open && !tools.current.contains(event.target as Node)) tools.current.open = false }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [])
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
      const controls = Array.from(element.querySelectorAll<HTMLElement>('button, summary, a[href], input, select, textarea, [tabindex]')).filter(control => control.tabIndex >= 0 && !control.hasAttribute('disabled') && control.getClientRects().length > 0 && !control.closest('[inert]'))
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

  return <section style={style} ref={panel} tabIndex={expanded?-1:undefined} role={expanded?'dialog':undefined} aria-modal={expanded||undefined} aria-label={expanded?(es?'Panel ampliado':'Expanded panel'):undefined} className={`${className} wf-portal-panel${collapsed ? ' wf-panel-collapsed' : ''}${scrollable ? ' wf-panel-scroll' : ''}${expanded ? ' wf-panel-expanded' : ''}`.trim()}>
    <details className="wf-panel-tools" ref={tools} onKeyDown={event => { if (event.key === 'Escape' && tools.current?.open) { event.preventDefault(); event.stopPropagation(); closeTools() } }}>
      <summary aria-label={es ? 'Opciones del panel' : 'Panel options'} title={es ? 'Opciones del panel' : 'Panel options'}><MoreHorizontal size={20} aria-hidden="true" /></summary>
      <div className="wf-panel-menu" role="toolbar" aria-label={es ? 'Controles del recuadro' : 'Panel controls'}>
        <button type="button" aria-expanded={!collapsed} onClick={() => { closeTools(); setCollapsed(value => !value) }}>{collapsed ? (es ? 'Mostrar' : 'Show') : (es ? 'Ocultar' : 'Hide')}</button>
        <button type="button" aria-pressed={scrollable} onClick={() => { closeTools(); setScrollable(value => !value) }}>{es ? 'Scroll' : 'Scroll'}</button>
        <button type="button" aria-pressed={expanded} onClick={() => { closeTools(); context.setExpandedPanel(expanded ? null : id) }}>{expanded ? (es ? 'Cerrar' : 'Close') : (es ? 'Ampliar' : 'Expand')}</button>
      </div>
    </details>
    {children}
  </section>
}
