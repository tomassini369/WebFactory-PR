import { useState } from 'react'
import { PortalPanel } from './PortalPanel'
import { businessDateKey, dashboardSummary, monthCells, shiftMonth, validTimeZone, type DashboardRecord } from './business-dashboard-data'
import './business-control-center.css'
import './control-center-apple.css'

const paths: Record<string, string> = {
  pos: 'M5 3h14v18H5V3Zm3 4h8M8 11h2m4 0h2m-8 4h2m4 0h2',
  bookings: 'M5 5h14v15H5V5Zm3-3v6m8-6v6M5 10h14',
  payments: 'M3 6h18v12H3V6Zm0 5h18M7 15h3',
  team: 'M16 20v-2a4 4 0 0 0-8 0v2M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 20v-1a3 3 0 0 1 3-3M20 20v-1a3 3 0 0 0-3-3',
  website: 'M3 5h18v14H3V5Zm0 4h18M7 7h.01M10 7h.01',
  share: 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h2v2h-2v-2Zm4 0h2v2h-2Zm-4 4h2v2h-2Zm4 0h2v2h-2Z',
  catalog: 'M12 3 3 8l9 5 9-5-9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
  orders: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6',
  analytics: 'M4 20h16M7 16v-4m5 4V5m5 11V9',
  training: 'm3 9 9-5 9 5-9 5-9-5Zm4 3v5l5 3 5-3v-5',
}
function Icon({ name }: { name: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.analytics} /></svg>
}

type Props = {
  site: { siteId?: string; catalog: unknown[]; employees: { active: boolean }[]; settings: { timezone: string }; business: Record<string, string> };
  commerce: { orders: DashboardRecord[]; bookings: DashboardRecord[] }; lang: 'en' | 'es';
  onNavigate: (tab: string) => void; canNavigate: (tab: string) => boolean;
  loading?: boolean; loadError?: boolean;
}

function Trend({ values, label }: { values: number[]; label: string }) {
  const ceiling = Math.max(1, ...values);
  const points = values.map((value, index) => `${8 + index * 29},${72 - value / ceiling * 60}`).join(' ');
  return <svg className="v8-trend" viewBox="0 0 190 84" role="img" aria-label={label}>
    <path d="M8 72H182" stroke="currentColor" strokeOpacity=".16" strokeDasharray="3 5" />
    <polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="182" cy={72 - values[values.length - 1] / ceiling * 60} r="4" fill="currentColor" />
  </svg>
}

export default function BusinessControlCenter({ site, commerce, lang, onNavigate, canNavigate, loading = false, loadError = false }: Props) {
  const es = lang === 'es', locale = es ? 'es-PR' : 'en-US';
  const timeZone = validTimeZone(site.settings.timezone);
  const summary = dashboardSummary(commerce.orders, commerce.bookings, timeZone);
  const [month, setMonth] = useState(summary.today.slice(0, 7));
  const [selectedDay, setSelectedDay] = useState(summary.today);
  const [activityFilter, setActivityFilter] = useState('all');
  const money = (cents: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(cents / 100);
  const dateLabel = (key: string, options: Intl.DateTimeFormatOptions) => new Date(`${key}T12:00:00Z`).toLocaleDateString(locale, { ...options, timeZone: 'UTC' });
  const go = (tab: string) => { if (canNavigate(tab)) onNavigate(tab) };
  const unavailable = loading || loadError;
  const value = (text: string | number) => unavailable ? '—' : text;
  const selectedBookings = summary.activeBookings.filter(record => businessDateKey(record.start!, timeZone) === selectedDay).sort((a,b) => Date.parse(a.start!) - Date.parse(b.start!));
  const sales7 = summary.days.reduce((sum, day) => sum + day.sales, 0);
  const metrics = [
    { key: 'sales', label: es ? 'Ventas netas' : 'Net sales', value: money(sales7), series: summary.days.map(day => day.sales), detail: `${es ? 'Historial cargado' : 'Loaded history'}: ${money(summary.revenue)}`, color: 'lime' },
    { key: 'orders', label: es ? 'Órdenes creadas' : 'Orders created', value: summary.days.reduce((sum, day) => sum + day.orders, 0), series: summary.days.map(day => day.orders), detail: es ? 'Órdenes de los últimos 7 días' : 'Orders from the last 7 days', color: 'orange' },
    { key: 'bookings', label: es ? 'Citas programadas' : 'Scheduled bookings', value: summary.days.reduce((sum, day) => sum + day.bookings, 0), series: summary.days.map(day => day.bookings), detail: es ? 'Citas de los últimos 7 días' : 'Bookings in the last 7 days', color: 'blue' },
  ];
  const actions = [
    ['pos', 'POS', es ? 'Registrar una venta' : 'Record a sale'], ['bookings', es ? 'Reservaciones' : 'Bookings', es ? 'Abre tu agenda' : 'Open your schedule'],
    ['orders', es ? 'Órdenes' : 'Orders', es ? 'Gestiona tus ventas' : 'Manage your sales'], ['payments', es ? 'Pagos' : 'Payments', es ? 'Cobros y recibos' : 'Payments and receipts'],
    ['website', 'Website', es ? 'Edita tu página' : 'Edit your website'], ['catalog', es ? 'Catálogo' : 'Catalog', es ? 'Productos y servicios' : 'Products and services'],
    ['team', es ? 'Equipo' : 'Team', es ? 'Empleados y horarios' : 'Employees and schedules'], ['share', es ? 'QR y compartir' : 'QR & Share', es ? 'Comparte tu negocio' : 'Share your business'],
  ].filter(([tab]) => canNavigate(tab));
  const recent = [...commerce.orders, ...commerce.bookings].filter(record => activityFilter === 'all' || record.kind === activityFilter).sort((a,b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 4);
  const statusLabels: Record<string, string> = es ? { paid: 'Pagado', paid_in_person: 'Pagado en persona', pending: 'Pendiente', confirmed: 'Confirmada', completed: 'Completada', cancelled: 'Cancelada', canceled: 'Cancelada', refunded: 'Reembolsado', partially_refunded: 'Reembolso parcial' } : { paid: 'Paid', paid_in_person: 'Paid in person', pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', canceled: 'Cancelled', refunded: 'Refunded', partially_refunded: 'Partially refunded' };
  const status = (text: string) => statusLabels[text] || text.replaceAll('_', ' ');
  return <div className="bcc bcc-v8" aria-busy={loading}>
    <header className="v8-heading"><div><span className="v8-eyebrow">BUSINESS CONTROL CENTER</span><h2>{es ? 'Tu negocio, a tu ritmo.' : 'Your business. Your rhythm.'}</h2><p>{es ? 'Todo lo que necesitas para tu próximo paso.' : 'Everything you need for your next move.'}</p></div><div className="v8-heading-actions">{canNavigate('analytics') && <button className="v8-button" onClick={() => go('analytics')}><Icon name="analytics" />{es ? 'Ver reportes' : 'View reports'}</button>}{canNavigate('pos') && <button className="v8-button v8-primary" onClick={() => go('pos')}><span aria-hidden="true">+</span>{es ? 'Nueva venta' : 'New sale'}</button>}</div></header>
    {unavailable && <p className="v8-data-state" role="status">{loading ? (es ? 'Cargando la actividad del negocio…' : 'Loading business activity…') : (es ? 'No se pudo cargar la actividad. Vuelve a abrir Resumen para intentar de nuevo.' : 'Activity could not be loaded. Reopen Overview to try again.')}</p>}
    <div className="v8-main-grid">
      <PortalPanel className="v8-card v8-performance"><header className="v8-card-heading"><h3>{es ? 'Actividad del negocio' : 'Business activity'}</h3><span className="v8-pill">{es ? 'Últimos 7 días' : 'Last 7 days'}</span></header><div className="v8-metric-grid">{metrics.map(metric => <article className={`v8-metric v8-${metric.color}`} key={metric.key}><div className="v8-metric-label"><i aria-hidden="true" />{metric.label}</div><strong>{value(metric.value)}</strong>{!unavailable && <Trend values={metric.series} label={summary.days.map((day,index) => `${dateLabel(day.key, { month: 'short', day: 'numeric' })}: ${metric.key === 'sales' ? money(metric.series[index]) : metric.series[index]}`).join('; ')} />}<small>{unavailable ? '—' : metric.detail}</small></article>)}</div><footer className="v8-period"><span>{dateLabel(summary.days[0].key, { month: 'short', day: 'numeric' })} — {dateLabel(summary.today, { month: 'short', day: 'numeric' })}</span><span>{es ? 'USD · Zona horaria del negocio' : 'USD · Business time zone'}</span></footer><p className="v8-caption">{es ? 'Pagos confirmados menos reembolsos. Solo incluye el historial cargado.' : 'Confirmed payments less refunds. Includes loaded history only.'}</p></PortalPanel>
      <PortalPanel className="v8-card v8-calendar"><header className="v8-card-heading"><h3>{es ? 'Tu agenda' : 'Your schedule'}</h3>{canNavigate('bookings') && <button className="v8-calendar-link" onClick={() => go('bookings')}>{es ? 'Abrir' : 'Open'} ↗</button>}</header><div className="v8-month-controls"><button aria-label={es ? 'Mes anterior' : 'Previous month'} onClick={() => setMonth(shiftMonth(month, -1))}>‹</button><strong aria-live="polite">{dateLabel(`${month}-01`, { month: 'long', year: 'numeric' })}</strong><button aria-label={es ? 'Mes siguiente' : 'Next month'} onClick={() => setMonth(shiftMonth(month, 1))}>›</button></div><div className="v8-weekdays" aria-hidden="true">{(es ? ['L', 'M', 'M', 'J', 'V', 'S', 'D'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S']).map((day,i) => <span key={i}>{day}</span>)}</div><div className="v8-calendar-grid" role="group" aria-label={es ? 'Selecciona un día' : 'Select a day'}>{monthCells(month).map((key,index) => { const count = unavailable || !key ? 0 : summary.activeBookings.filter(record => businessDateKey(record.start!, timeZone) === key).length; return key ? <button key={key} className={`${key === selectedDay ? 'is-selected' : ''} ${key === summary.today ? 'is-today' : ''}`} aria-pressed={key === selectedDay} aria-current={key === summary.today ? 'date' : undefined} aria-label={`${dateLabel(key, { dateStyle: 'full' })}${count ? ` · ${count} ${es ? 'citas' : 'bookings'}` : ''}`} onClick={() => setSelectedDay(key)}>{Number(key.slice(-2))}{count > 0 && <i aria-hidden="true" />}</button> : <span key={`empty-${index}`} /> })}</div><div className="v8-day-summary" aria-live="polite"><strong>{dateLabel(selectedDay, { weekday: 'short', month: 'short', day: 'numeric' })}</strong>{!unavailable && selectedBookings.length ? <ul>{selectedBookings.slice(0,2).map(record => <li key={record.transactionId}><time dateTime={record.start}>{new Date(record.start!).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', timeZone })}</time><span>{record.customer?.name || (es ? 'Cliente' : 'Customer')}</span></li>)}</ul> : <p>{unavailable ? (es ? 'Agenda no disponible todavía.' : 'Schedule not available yet.') : (es ? 'Sin citas en el historial cargado.' : 'No bookings in the loaded history.')}</p>}{selectedBookings.length > 2 && !unavailable && <p>+{selectedBookings.length - 2} {es ? 'citas más' : 'more bookings'}</p>}<button onClick={() => { setMonth(summary.today.slice(0,7)); setSelectedDay(summary.today) }}>{es ? 'Volver a hoy' : 'Back to today'}</button></div></PortalPanel>
    </div>
    <div className="v8-secondary-grid"><div className="v8-business-stack"><section className="v8-card v8-business-pulse"><span className="v8-eyebrow">{es ? 'TU NEGOCIO' : 'YOUR BUSINESS'}</span><div><strong>{site.catalog.length}</strong><span>{es ? 'productos y servicios' : 'products and services'}</span></div><div><strong>{site.employees.filter(employee => employee.active).length}</strong><span>{es ? 'empleados activos' : 'active employees'}</span></div><div><strong>{value(summary.customers)}</strong><span>{es ? 'clientes en el historial' : 'customers in history'}</span></div></section>{canNavigate('training') && <section className="v8-card v8-training"><span className="v8-training-badge"><Icon name="training" />TRAINING</span><h3>{es ? 'Aprende haciendo.' : 'Learn by doing.'}</h3><p>{es ? 'Practica con datos de ejemplo sin cambiar tu negocio.' : 'Practice with sample data without changing your business.'}</p><button className="v8-button" onClick={() => go('training')}>{es ? 'Aprender y practicar' : 'Learn and practice'} <span aria-hidden="true">↗</span></button></section>}</div><section className="v8-card v8-shortcuts"><header className="v8-card-heading"><div><span className="v8-eyebrow">{es ? 'ACCESOS RÁPIDOS' : 'QUICK ACCESS'}</span><h3>{es ? 'Tu próximo paso' : 'Your next move'}</h3></div><span className="v8-caption">{es ? 'Todo en un lugar' : 'All in one place'}</span></header><div className="v8-action-grid">{actions.map(([tab,label,note],index) => <button key={tab} className={index === 0 ? 'is-featured' : ''} onClick={() => go(tab)}><span className="v8-action-top"><Icon name={tab} /><span aria-hidden="true">↗</span></span><strong>{label}</strong><small>{note}</small></button>)}</div></section></div>
    <div className="v8-bottom-grid"><PortalPanel className="v8-card"><header className="v8-card-heading"><h3>{es ? 'Próximas reservaciones' : 'Upcoming bookings'}</h3>{canNavigate('bookings') && <button className="v8-text-button" onClick={() => go('bookings')}>{es ? 'Ver todas' : 'View all'} ↗</button>}</header>{!unavailable && summary.upcoming.length ? summary.upcoming.map(record => <article className="v8-booking" key={record.transactionId}><time dateTime={record.start}><strong>{new Date(record.start!).toLocaleDateString(locale, { day: 'numeric', timeZone })}</strong><span>{new Date(record.start!).toLocaleDateString(locale, { month: 'short', timeZone })}</span></time><div><strong>{record.customer?.name || record.customer?.email || record.transactionId}</strong><span>{new Date(record.start!).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', timeZone })} · {status(record.status)}</span></div></article>) : <p className="v8-empty">{unavailable ? '—' : es ? 'No hay citas próximas en el historial cargado.' : 'No upcoming bookings in the loaded history.'}</p>}</PortalPanel><PortalPanel className="v8-card"><header className="v8-card-heading"><h3>{es ? 'Últimos movimientos' : 'Recent activity'}</h3></header><div className="v8-filters" role="group" aria-label={es ? 'Filtrar actividad' : 'Filter activity'}>{[['all',es ? 'Todo' : 'All'],['order',es ? 'Órdenes' : 'Orders'],['booking',es ? 'Reservaciones' : 'Bookings']].map(([filter,label]) => <button key={filter} aria-pressed={activityFilter === filter} onClick={() => setActivityFilter(filter)}>{label}</button>)}</div>{!unavailable && recent.length ? recent.map(record => <article className="v8-activity" key={`${record.kind}-${record.transactionId}`}><span className={`v8-activity-icon ${record.kind}`}><Icon name={record.kind === 'booking' ? 'bookings' : 'orders'} /></span><div><strong>{record.customer?.name || record.customer?.email || record.transactionId}</strong><span>{record.kind === 'booking' ? (es ? 'Reservación' : 'Booking') : (es ? 'Venta' : 'Sale')} · {status(record.paymentStatus)}</span></div><b>{money(record.amountTotal)}</b></article>) : <p className="v8-empty">{unavailable ? '—' : es ? 'Tu actividad aparecerá aquí.' : 'Your activity will appear here.'}</p>}</PortalPanel></div>
  </div>
}
