import { useId, useState } from 'react'
import './revenue-chart.css'

export type RevenueDay = { key: string; label: string; dateLabel: string; amount: number }

/** The bars and the selected readout use the same server-derived amounts. */
export default function RevenueChart({ days, lang, variant = 'business' }: { days: RevenueDay[]; lang: 'es' | 'en'; variant?: 'business' | 'platform' }) {
  const es = lang === 'es'
  const detailId = useId()
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const selected = days.find(day => day.key === selectedKey)
  const money = (cents: number) => new Intl.NumberFormat(es ? 'es-PR' : 'en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
  const compact = (cents: number) => new Intl.NumberFormat(es ? 'es-PR' : 'en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(cents / 100)
  const max = Math.max(1, ...days.map(day => day.amount))
  const empty = !days.some(day => day.amount > 0)
  return <div className="wf-data-chart" role="group" aria-label={es ? 'Ventas diarias' : 'Daily sales'}>
    <div className="wf-data-chart-scale" aria-hidden="true"><span>{money(empty ? 0 : max)}</span><span>USD</span></div>
    <div className="wf-data-chart-plot"><div className="wf-data-chart-content"><svg className="wf-data-chart-grid" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={days.map(day => `${day.dateLabel}: ${money(day.amount)}`).join('; ')}>
      {[0, 50, 100].map(y => <line key={y} x1="0" x2="100" y1={y} y2={y} vectorEffect="non-scaling-stroke" />)}
    </svg>
    <div className="wf-data-chart-bars">
      {days.map((day, index) => <button type="button" key={day.key} aria-label={`${day.dateLabel}: ${money(day.amount)}`} aria-pressed={selected?.key === day.key} aria-describedby={detailId} onClick={() => setSelectedKey(day.key)} onKeyDown={event => {
        const next = event.key === 'ArrowRight' ? Math.min(days.length - 1, index + 1) : event.key === 'ArrowLeft' ? Math.max(0, index - 1) : event.key === 'Home' ? 0 : event.key === 'End' ? days.length - 1 : null
        if (next === null) return
        event.preventDefault()
        const button = event.currentTarget.parentElement?.children[next] as HTMLButtonElement | undefined
        button?.focus()
        setSelectedKey(days[next].key)
      }}>
        <span className="wf-data-chart-amount" aria-hidden="true">{compact(day.amount)}</span>
        <span className={`wf-data-chart-track ${variant === 'platform' ? 'wfa-revenue-track' : 'bcc-chart-track'}`} aria-hidden="true"><i style={{ height: `${day.amount / max * 100}%` }} /></span>
        <small aria-hidden="true">{day.label}</small>
      </button>)}
    </div></div></div>
    <div id={detailId} className="wf-data-chart-detail" aria-live="polite" aria-atomic="true">
      {selected ? <><span>{selected.dateLabel}</span><strong>{money(selected.amount)}</strong></> : <span>{empty ? (es ? 'Sin ventas confirmadas en estos días.' : 'No confirmed sales on these days.') : (es ? 'Toca un día para ver el importe exacto.' : 'Select a day to see the exact amount.')}</span>}
    </div>
  </div>
}
