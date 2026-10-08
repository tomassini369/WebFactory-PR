import { useRef, useState, type CSSProperties } from 'react'
import type { TemplateItem } from './templateData'
import type { TemplateLanguage } from './templateI18n'
import './template-spatial-carousel.css'

/** Glasssy V2's spatial arc, adapted to real business highlights without catalog actions. */
export default function TemplateHighlights({items, language}: {items: TemplateItem[]; language: TemplateLanguage}) {
  const highlights = items.slice(0, 3)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const gesture = useRef<{id: number; x: number; y: number} | null>(null)
  const suppressClick = useRef(false)
  const rail = useRef<HTMLDivElement>(null)
  const found = highlights.findIndex(item => item.id === selectedId)
  const activeIndex = Math.max(0, found)
  const total = highlights.length
  const es = language === 'es'
  const move = (direction: number) => {
    if (total > 1) setSelectedId(highlights[(activeIndex + direction + total) % total].id)
  }
  if (!total) return null
  return <div className="template-highlights template-spatial-highlights">
    <div ref={rail} className="template-catalog-preview template-spatial-stage" tabIndex={0} role="region"
      aria-roledescription={es ? 'carrusel' : 'carousel'}
      aria-label={es ? 'Productos y servicios destacados' : 'Featured products and services'}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1) }
        if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); setSelectedId(highlights[event.key === 'Home' ? 0 : total - 1].id) }
      }}
      onPointerDown={event => {
        if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return
        suppressClick.current = false
        gesture.current = {id: event.pointerId, x: event.clientX, y: event.clientY}
      }}
      onPointerMove={event => {
        const start = gesture.current
        if (start && event.pointerType === 'mouse' && Math.abs(event.clientX - start.x) > 10) {
          event.currentTarget.setPointerCapture(event.pointerId)
        }
      }}
      onPointerUp={event => {
        const start = gesture.current
        gesture.current = null
        if (!start || start.id !== event.pointerId) return
        const dx = event.clientX - start.x, dy = event.clientY - start.y
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
          suppressClick.current = true
          move(dx < 0 ? 1 : -1)
        }
      }}
      onPointerCancel={() => { gesture.current = null }}>
      {highlights.map((item, index) => {
        let diff = index - activeIndex
        if (diff > total / 2) diff -= total
        if (diff < -total / 2) diff += total
        const active = diff === 0
        return <article key={item.id} data-active={active} data-index={index}
          className="template-spatial-card" style={{'--card-slot': diff} as CSSProperties}
          role={active ? 'group' : 'button'} tabIndex={active ? undefined : 0}
          aria-label={active ? `${index + 1} / ${total}: ${item.name}` : `${es ? 'Mostrar' : 'Show'} ${item.name}`}
          onClick={() => { if (!suppressClick.current && !active) setSelectedId(item.id) }}
          onKeyDown={event => {
            if (!active && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault(); setSelectedId(item.id); rail.current?.focus({preventScroll: true})
            }
          }}>
          <div className="template-spatial-media" aria-hidden="true">
            {item.image && <img src={item.image} alt="" loading="lazy" draggable={false} />}
          </div>
          <div className="template-spatial-copy">
            {item.badge && <small>{item.badge}</small>}
            <h3>{item.name}</h3>
            <p tabIndex={active ? 0 : undefined}>{item.description}</p>
            <strong>{item.displayPrice || new Intl.NumberFormat(es ? 'es-US' : 'en-US', {style: 'currency', currency: 'USD'}).format(item.price)}</strong>
          </div>
        </article>
      })}
    </div>
    <div className="template-carousel-controls template-spatial-dock" role="group" aria-label={es ? 'Navegar destacados' : 'Navigate highlights'}>
      <button type="button" disabled={total < 2} onClick={() => move(-1)} aria-label={es ? 'Destacado anterior' : 'Previous highlight'}>←</button>
      <span role="status" aria-live="polite" aria-atomic="true">{activeIndex + 1} / {total}<b>{highlights[activeIndex].name}</b></span>
      <button type="button" disabled={total < 2} onClick={() => move(1)} aria-label={es ? 'Siguiente destacado' : 'Next highlight'}>→</button>
    </div>
  </div>
}
