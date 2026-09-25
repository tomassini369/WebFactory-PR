import { createContext, useContext, useEffect, useId, useState, type ReactNode } from 'react'
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

  return <section className={`${className} wf-portal-panel${collapsed ? ' wf-panel-collapsed' : ''}${scrollable ? ' wf-panel-scroll' : ''}${expanded ? ' wf-panel-expanded' : ''}`.trim()}>
    <div className="wf-panel-tools" role="toolbar" aria-label={es ? 'Controles del recuadro' : 'Panel controls'}>
      <button type="button" aria-expanded={!collapsed} title={collapsed ? (es ? 'Mostrar contenido' : 'Show content') : (es ? 'Ocultar contenido' : 'Hide content')} onClick={() => setCollapsed(value => !value)}>{collapsed ? (es ? 'Mostrar' : 'Show') : (es ? 'Ocultar' : 'Hide')}</button>
      <button type="button" aria-pressed={scrollable} title={es ? 'Activar o quitar scroll interno' : 'Toggle internal scrolling'} onClick={() => setScrollable(value => !value)}>{es ? 'Scroll' : 'Scroll'}</button>
      <button type="button" aria-pressed={expanded} title={expanded ? (es ? 'Salir de pantalla completa' : 'Exit full screen') : (es ? 'Ampliar a pantalla completa' : 'Expand to full screen')} onClick={() => context.setExpandedPanel(expanded ? null : id)}>{expanded ? (es ? 'Cerrar' : 'Close') : (es ? 'Ampliar' : 'Expand')}</button>
    </div>
    {children}
  </section>
}
