import { useEffect, useRef, useState } from 'react'
import type { TemplateItem } from './templateData'
import type { TemplateLanguage } from './templateI18n'

/** Informational highlights only; the complete catalog remains in its panel. */
export default function TemplateHighlights({items, language}: {items: TemplateItem[]; language: TemplateLanguage}) {
  const rail = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({start: true, end: true})
  const update = () => {
    const el = rail.current
    if (el) setEdges({start: el.scrollLeft < 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2})
  }
  useEffect(() => {
    const el = rail.current
    if (!el) return
    const observer = new ResizeObserver(update)
    observer.observe(el); update()
    return () => observer.disconnect()
  }, [items])
  const move = (direction: number) => {
    const el = rail.current
    if (el) el.scrollBy({left: direction * (el.firstElementChild?.getBoundingClientRect().width || el.clientWidth), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'})
  }
  if (!items.length) return null
  return <div className="template-highlights">
    <div className="template-carousel-controls" role="group" aria-label={language === 'es' ? 'Navegar destacados' : 'Navigate highlights'}>
      <button type="button" disabled={edges.start} onClick={() => move(-1)} aria-label={language === 'es' ? 'Destacado anterior' : 'Previous highlight'}>←</button>
      <button type="button" disabled={edges.end} onClick={() => move(1)} aria-label={language === 'es' ? 'Siguiente destacado' : 'Next highlight'}>→</button>
    </div>
    <div ref={rail} className="template-catalog-preview" tabIndex={0} role="region" aria-label={language === 'es' ? 'Productos y servicios destacados' : 'Featured products and services'} onScroll={update} onKeyDown={event => {
      if (event.target !== event.currentTarget) return
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1) }
    }}>
      {items.slice(0, 3).map(item => <article key={item.id}>
        {item.image && <img src={item.image} alt="" loading="lazy" />}
        <div>
          {item.badge && <small>{item.badge}</small>}
          <h3>{item.name}</h3><p>{item.description}</p>
          <strong>{item.displayPrice || new Intl.NumberFormat(language === 'es' ? 'es-US' : 'en-US', {style: 'currency', currency: 'USD'}).format(item.price)}</strong>
        </div>
      </article>)}
    </div>
  </div>
}
