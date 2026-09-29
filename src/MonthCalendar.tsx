import { useMemo } from 'react'

type MonthCalendarProps = {
  month: string
  locale: 'en' | 'es'
  timeZone?: string
  selectedDate: string
  availability: Record<string, number>
  loading?: boolean
  onMonthChange: (month: string) => void
  onSelectDate: (date: string) => void
}

const monthKey = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`

export default function MonthCalendar({ month, locale, timeZone = 'America/Puerto_Rico', selectedDate, availability, loading = false, onMonthChange, onSelectDate }: MonthCalendarProps) {
  const [year, monthNumber] = month.split('-').map(Number)
  const dateCells = useMemo(() => {
    const firstWeekday = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay()
    const dayCount = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
    return [...Array(firstWeekday).fill(null), ...Array.from({ length: dayCount }, (_, index) => index + 1)] as Array<number | null>
  }, [year, monthNumber])
  const minMonth = monthKey(new Date())
  const previous = monthKey(new Date(Date.UTC(year, monthNumber - 2, 1)))
  const next = monthKey(new Date(Date.UTC(year, monthNumber, 1)))
  const title = new Intl.DateTimeFormat(locale === 'es' ? 'es-PR' : 'en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, monthNumber - 1, 1)))
  const weekdays = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale === 'es' ? 'es-PR' : 'en-US', { weekday: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(2024, 0, 7 + index)))
    .replace('.', ''))
  const today = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

  return <div className="wf-month-calendar" aria-label={locale === 'es' ? 'Calendario mensual de disponibilidad' : 'Monthly availability calendar'}>
    <div className="wf-month-calendar-heading">
      <button type="button" aria-label={locale === 'es' ? 'Mes anterior' : 'Previous month'} disabled={previous < minMonth} onClick={() => onMonthChange(previous)}>‹</button>
      <strong>{title}</strong>
      <button type="button" aria-label={locale === 'es' ? 'Mes siguiente' : 'Next month'} onClick={() => onMonthChange(next)}>›</button>
    </div>
    <div className="wf-month-calendar-grid" role="group">
      {weekdays.map((day, index) => <span className="wf-month-weekday" aria-hidden="true" key={`${day}-${index}`}>{day}</span>)}
      {dateCells.map((day, index) => {
        if (!day) return <span className="wf-month-empty" aria-hidden="true" key={`empty-${index}`} />
        const date = `${month}-${String(day).padStart(2, '0')}`
        const available = Number(availability[date] || 0) > 0
        const isPast = date < today
        const dateLabel = new Intl.DateTimeFormat(locale === 'es' ? 'es-PR' : 'en-US', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))
        return <button type="button" key={date} className={`wf-month-day${available ? ' has-availability' : ''}${selectedDate === date ? ' selected' : ''}`}
          aria-label={`${dateLabel}${available ? `, ${availability[date]} ${locale === 'es' ? 'horarios disponibles' : 'available times'}` : ''}`}
          aria-pressed={selectedDate === date} disabled={loading || isPast || !available} onClick={() => onSelectDate(date)}>
          <span>{day}</span>{available && <i aria-hidden="true"/>}
        </button>
      })}
    </div>
    <div className="wf-month-calendar-legend"><span><i aria-hidden="true"/>{locale === 'es' ? 'Disponible' : 'Available'}</span>{loading && <small>{locale === 'es' ? 'Actualizando…' : 'Updating…'}</small>}</div>
  </div>
}
