import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { ChevronRight, LayoutGrid, List, RefreshCw } from 'lucide-react'
import {
  isKitchenOrder, kitchenChannel, kitchenChannels, kitchenColumns, kitchenStatuses, kitchenWaitTimes,
  type KitchenChange, type KitchenChannel, type KitchenColumn, type KitchenDisplay, type KitchenStatus,
} from '../netlify/lib/kitchen-display.mjs'
import { PortalPanel } from './PortalPanel'
import './kitchen-panel.css'

type Language = 'es' | 'en'
type Option = { id: string; name: string }
type KitchenOrder = {
  transactionId: string; kind: string; status: string; paymentStatus: string; createdAt: string; paidAt?: string;
  locationId?: string; locationName?: string; queueNumber?: string; kitchenStatus?: string; kitchenPaused?: boolean;
  kitchenEtaTime?: string; kitchenRevision?: number; posRecoveryNeeded?: boolean; source?: string; channel?: string;
  customer?: { name?: string }; items: Array<{ id?: string; name: string; quantity: number }>;
}

const allOrders: KitchenDisplay = {
  id: '', name: '', limit: 250, enabled: true, columns: kitchenColumns, locationIds: [],
  productIds: [], channels: [], hideCustomer: false, hideOrderId: false, hideChannel: false,
}
const statusLabels: Record<KitchenColumn, [string, string]> = {
  received: ['Recibida', 'Received'], preparing: ['Preparando', 'Preparing'],
  ready: ['Lista', 'Ready'], completed: ['Entregada', 'Completed'], on_hold: ['En pausa', 'On hold'],
}
const channelLabels: Record<KitchenChannel, [string, string]> = {
  storefront: ['Tienda web', 'Online store'], pos: ['Cajero', 'Cashier'], kiosk: ['Kiosco', 'Kiosk'],
}
const columnFor = (order: KitchenOrder): KitchenColumn =>
  order.kitchenPaused ? 'on_hold' : kitchenStatuses.find(status => status === order.kitchenStatus) || 'received'

function Checklist<T extends string>({ title, options, value, onChange }: {
  title: string; options: Array<{ id: T; name: string }>; value: T[]; onChange: (value: T[]) => void;
}) {
  return <details className="kds-checklist">
    <summary>{title} <span>({value.length})</span></summary>
    <div>{options.map(option => <label key={option.id}>
      <input type="checkbox" checked={value.includes(option.id)} onChange={event => onChange(
        event.target.checked ? [...value, option.id] : value.filter(id => id !== option.id),
      )}/>{option.name}
    </label>)}</div>
  </details>
}

function StationEditor({ draft, setDraft, onSubmit, onDelete, busy, lang, locations, products }: {
  draft: KitchenDisplay; setDraft: (value: KitchenDisplay) => void; onSubmit: (event: FormEvent) => void;
  onDelete?: () => void; busy: boolean; lang: Language; locations: Option[]; products: Option[];
}) {
  const es = lang === 'es'
  const t = (spanish: string, english: string) => es ? spanish : english
  return <form className="kds-station-form" onSubmit={onSubmit}>
    <fieldset disabled={busy}>
      <legend>{t('Configuración de estación', 'Station settings')}</legend>
      <div className="kds-toolbar">
        <label>{t('Nombre de estación', 'Station name')}<input required maxLength={80} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })}/></label>
        <label>{t('Límite de órdenes', 'Order limit')}<input type="number" min={1} max={100} required value={draft.limit || ''} onChange={event => setDraft({ ...draft, limit: Number(event.target.value) })}/></label>
      </div>
      <p>{t('Sin selecciones en un filtro se incluyen todas sus opciones.', 'Leave a filter empty to include every option.')}</p>
      {locations.length > 0 && <Checklist title={t('Sucursales', 'Locations')} options={locations} value={draft.locationIds} onChange={locationIds => setDraft({ ...draft, locationIds })}/>}
      <Checklist title={t('Origen de la orden', 'Order source')} options={kitchenChannels.map(id => ({ id, name: channelLabels[id][es ? 0 : 1] }))} value={draft.channels} onChange={channels => setDraft({ ...draft, channels })}/>
      {products.length > 0 && <Checklist title={t('Productos de la estación', 'Station products')} options={products} value={draft.productIds} onChange={productIds => setDraft({ ...draft, productIds })}/>}
      <Checklist title={t('Columnas visibles', 'Visible columns')} options={kitchenColumns.map(id => ({ id, name: statusLabels[id][es ? 0 : 1] }))} value={draft.columns} onChange={columns => setDraft({ ...draft, columns: kitchenColumns.filter(status => columns.includes(status)) })}/>
      <div className="kds-choices">
        {([
          ['enabled', t('Estación activa', 'Active station')], ['hideCustomer', t('Ocultar nombre del cliente', 'Hide customer name')],
          ['hideOrderId', t('Ocultar número de orden', 'Hide order number')], ['hideChannel', t('Ocultar origen', 'Hide order source')],
        ] as const).map(([key, label]) => <label key={key}><input type="checkbox" checked={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.checked })}/>{label}</label>)}
      </div>
      <div className="kds-actions">
        <button type="submit" className="kds-primary">{t('Guardar estación', 'Save station')}</button>
        {onDelete && <button type="button" onClick={onDelete}>{t('Eliminar estación', 'Delete station')}</button>}
      </div>
    </fieldset>
  </form>
}

function Ticket({ order, display, busy, lang, timeZone, showStatus, onChange }: {
  order: KitchenOrder; display: KitchenDisplay; busy: boolean; lang: Language; timeZone: string; showStatus: boolean;
  onChange: (change: KitchenChange) => Promise<boolean>;
}) {
  const [time, setTime] = useState('')
  const id = useId()
  const es = lang === 'es'
  const t = (spanish: string, english: string) => es ? spanish : english
  const state = columnFor(order)
  const status = (value: KitchenColumn) => statusLabels[value][es ? 0 : 1]
  const active = kitchenStatuses.filter(value => display.columns.includes(value))
  const next = state === 'on_hold' ? (active.includes('preparing') ? 'preparing' : active[0]) : active[active.indexOf(state) + 1] || 'completed'
  const channel = kitchenChannel(order)
  const closed = state === 'completed'
  const paid = new Date(order.paidAt || order.createdAt)
  const receivedAt = new Intl.DateTimeFormat(es ? 'es-PR' : 'en-PR', { timeZone, hour: 'numeric', minute: '2-digit' }).format(paid)

  return <article className="kds-ticket" data-kitchen-order={order.transactionId} tabIndex={-1} aria-labelledby={id}>
    <header>
      <h4 id={id}>{display.hideOrderId ? t('Orden de cocina', 'Kitchen order') : order.queueNumber}</h4>
      <time dateTime={paid.toISOString()}>{receivedAt}</time>
    </header>
    <div className="kds-meta">
      {showStatus && <strong>{status(state)}</strong>}
      <span>{order.locationName || t('Local principal', 'Main location')}</span>
      {!display.hideChannel && channel && <span>{channelLabels[channel][es ? 0 : 1]}</span>}
      {!display.hideCustomer && order.customer?.name && <span>{order.customer.name}</span>}
    </div>
    <ul className="kds-items">
      {order.items.map((item, index) => <li key={item.id || index}><strong>{item.quantity} ×</strong> {item.name}</li>)}
    </ul>
    {order.kitchenEtaTime && <p className="kds-eta">{t('Hora estimada', 'Estimated time')} <time>{order.kitchenEtaTime}</time></p>}
    <div className="kds-actions">
      {next && !closed && <button className="kds-primary" type="button" disabled={busy} onClick={() => void onChange({ kitchenStatus: next })}>
        {status(next)} <ChevronRight aria-hidden="true" size={17}/>
      </button>}
      {!closed && state !== 'on_hold' && display.columns.includes('on_hold') && <button type="button" disabled={busy} onClick={() => void onChange({ kitchenPause: true })}>{t('Pausar', 'Pause')}</button>}
    </div>
    <details className="kds-ticket-options">
      <summary>{t('Opciones de orden', 'Order options')}</summary>
      <label>{t('Cambiar estado', 'Change status')}
        <select aria-label={t('Cambiar estado', 'Change status')} value="" disabled={busy} onChange={event => {
          if (event.target.value) void onChange({ kitchenStatus: event.target.value as KitchenStatus })
        }}>
          <option value="">{status(state)}</option>
          {kitchenStatuses.filter(value => value !== state).map(value => <option key={value} value={value}>{status(value)}</option>)}
        </select>
      </label>
      {!closed && <>
        <div className="kds-actions">
          {kitchenWaitTimes.map(minutes => <button type="button" key={minutes} disabled={busy} onClick={() => void onChange({ kitchenEtaMinutes: minutes })}>+{minutes} min</button>)}
        </div>
        <form className="kds-actions" onSubmit={async event => {
          event.preventDefault()
          if (await onChange({ kitchenEtaTime: time })) setTime('')
        }}>
          <label>{t('Hora manual', 'Custom time')}<input type="time" required value={time} onChange={event => setTime(event.target.value)}/></label>
          <button type="submit" disabled={busy || !time}>{t('Guardar hora', 'Save time')}</button>
        </form>
      </>}
    </details>
  </article>
}

export function KitchenPanel<T extends KitchenOrder>({ records, lang, busy, locations, products, timeZone, displays, canManage, loaded, syncError, actionError, onRefresh, onChange, onSave }: {
  records: T[]; lang: Language; busy: boolean; locations: Option[]; products: Option[]; timeZone: string;
  displays: KitchenDisplay[]; canManage: boolean; loaded: boolean; syncError: boolean; actionError: string; onRefresh: () => void;
  onChange: (record: T, change: KitchenChange) => Promise<boolean>; onSave: (displays: KitchenDisplay[]) => Promise<void>;
}) {
  const [stationId, setStationId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [view, setView] = useState<'board' | 'list'>('board')
  const [draft, setDraft] = useState<KitchenDisplay | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [saveError, setSaveError] = useState('')
  const content = useRef<HTMLDivElement>(null)
  const movedOrder = useRef('')
  const es = lang === 'es'
  const t = (spanish: string, english: string) => es ? spanish : english
  const station = displays.find(display => display.enabled && display.id === stationId) || allOrders
  const settings = displays.find(display => display.id === draft?.id)
  const day = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
  const today = day.format(new Date())
  const matches = records.filter(order => {
    const paid = new Date(order.paidAt || order.createdAt)
    const channel = kitchenChannel(order)
    return isKitchenOrder(order) && Number.isFinite(paid.getTime()) && day.format(paid) === today
      && (!locationId || order.locationId === locationId)
      && (!station.locationIds.length || Boolean(order.locationId && station.locationIds.includes(order.locationId)))
      && (!station.channels.length || Boolean(channel && station.channels.includes(channel)))
      && (!station.productIds.length || order.items.some(item => item.id && station.productIds.includes(item.id)))
      && station.columns.includes(columnFor(order))
  }).sort((a, b) => Date.parse(a.paidAt || a.createdAt) - Date.parse(b.paidAt || b.createdAt))
  const open = matches.filter(order => columnFor(order) !== 'completed')
  const closed = matches.filter(order => columnFor(order) === 'completed')
  const openRows = open.slice(0, station.limit)
  const remaining = station.limit - openRows.length
  const rows = [...openRows, ...closed.slice(Math.max(0, closed.length - remaining))]

  useEffect(() => {
    if (!movedOrder.current || busy) return
    const ticket = Array.from(content.current?.querySelectorAll<HTMLElement>('[data-kitchen-order]') || [])
      .find(element => element.dataset.kitchenOrder === movedOrder.current)
    movedOrder.current = ''
    if (document.activeElement === document.body) {
      if (ticket) ticket.focus()
      else content.current?.focus()
    }
  }, [records, busy])

  const save = async (next: KitchenDisplay[], selected: string) => {
    if (saving) return
    setSaving(true)
    setSaveError('')
    setNotice('')
    try {
      await onSave(next)
      setStationId(selected)
      setLocationId('')
      setDraft(null)
      setNotice(t('Configuración guardada.', 'Settings saved.'))
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t('No se pudo guardar.', 'Unable to save.'))
    } finally {
      setSaving(false)
    }
  }

  const renderTicket = (order: T) => <Ticket key={order.transactionId} order={{ ...order, locationName: order.locationName || locations.find(location => location.id === order.locationId)?.name }} display={station} busy={busy} lang={lang} timeZone={timeZone} showStatus={view === 'list'} onChange={change => {
    if ('kitchenStatus' in change || 'kitchenPause' in change) movedOrder.current = order.transactionId
    return onChange(order, change)
  }}/>

  return <PortalPanel className="ca-panel kds-panel" data-training="kitchen">
    <header><h2>{t('Pantalla de cocina', 'Kitchen display')}</h2><p>{t('Organiza las órdenes pagadas y sigue su preparación.', 'Organize paid orders and track their preparation.')}</p></header>
    <div className="kds-toolbar">
      <label>{t('Estación', 'Station')}
        <select value={station.id} onChange={event => { setStationId(event.target.value); setLocationId('') }}>
          <option value="">{t('Todas las estaciones', 'All stations')}</option>
          {displays.filter(display => display.enabled).map(display => <option key={display.id} value={display.id}>{display.name}</option>)}
        </select>
      </label>
      {locations.length > 0 && <label>{t('Sucursal', 'Location')}
        <select value={locationId} onChange={event => setLocationId(event.target.value)}>
          <option value="">{t('Todas las sucursales', 'All locations')}</option>
          {locations.filter(location => !station.locationIds.length || station.locationIds.includes(location.id))
            .map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
        </select>
      </label>}
      <div className="kds-actions" role="group" aria-label={t('Vista de cocina', 'Kitchen view')}>
        <button type="button" aria-pressed={view === 'board'} onClick={() => setView('board')}><LayoutGrid size={17} aria-hidden="true"/>{t('Tablero', 'Board')}</button>
        <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}><List size={17} aria-hidden="true"/>{t('Lista', 'List')}</button>
        <button type="button" onClick={onRefresh} aria-label={t('Actualizar órdenes', 'Refresh orders')}><RefreshCw size={17} aria-hidden="true"/></button>
      </div>
    </div>
    {canManage && <details className="kds-settings">
      <summary>{t('Administrar estaciones', 'Manage stations')}</summary>
      <div className="kds-toolbar">
        <label>{t('Editar estación', 'Edit station')}
          <select value={settings?.id || ''} onChange={event => setDraft(displays.find(display => display.id === event.target.value) || null)}>
            <option value="">{t('Selecciona una estación', 'Choose a station')}</option>
            {displays.map(display => <option key={display.id} value={display.id}>{display.name}</option>)}
          </select>
        </label>
        <button type="button" disabled={displays.length >= 12 || saving} onClick={() => setDraft({ ...allOrders, id: crypto.randomUUID(), limit: 20 })}>{t('Nueva estación', 'New station')}</button>
      </div>
      {draft && <StationEditor draft={draft} setDraft={setDraft} lang={lang} locations={locations} products={products} busy={saving}
        onSubmit={event => { event.preventDefault(); void save(settings ? displays.map(display => display.id === draft.id ? draft : display) : [...displays, draft], draft.enabled ? draft.id : '') }}
        onDelete={settings ? () => {
          if (window.confirm(t('¿Eliminar esta estación?', 'Delete this station?'))) void save(displays.filter(display => display.id !== draft.id), station.id === draft.id ? '' : station.id)
        } : undefined}/>}
      {saveError && <p role="alert">{saveError}</p>}
      {notice && <p role="status">{notice}</p>}
    </details>}
    {actionError && <p className="ca-error" role="alert">{actionError}</p>}
    {syncError && <p className="kds-feedback" role="status">{t('No se pudieron actualizar las órdenes. Intenta actualizar de nuevo.', 'Unable to refresh orders. Try refreshing again.')}</p>}
    {!loaded && !syncError && <p role="status">{t('Cargando órdenes…', 'Loading orders…')}</p>}
    {loaded && rows.length === 0 && <p className="kds-feedback">{t('No hay órdenes pagadas para esta vista.', 'No paid orders match this view.')}</p>}
    {matches.length > rows.length && <p className="kds-feedback">{es ? `Mostrando ${rows.length} de ${matches.length} órdenes.` : `Showing ${rows.length} of ${matches.length} orders.`}</p>}
    <div ref={content} tabIndex={-1} className={view === 'board' ? 'kds-board' : 'kds-list'}>
      {view === 'list' && [...rows].sort((a, b) => Date.parse(b.paidAt || b.createdAt) - Date.parse(a.paidAt || a.createdAt)).map(renderTicket)}
      {view === 'board' && loaded && station.columns.map(status => {
        const orders = rows.filter(order => columnFor(order) === status)
        return <section key={status} className="kds-column" data-status={status} aria-label={statusLabels[status][es ? 0 : 1]}>
          <h3>{statusLabels[status][es ? 0 : 1]} <span>{orders.length}</span></h3>
          {orders.map(renderTicket)}
        </section>
      })}
    </div>
  </PortalPanel>
}
