import { useState } from 'react'
import { PortalPanel } from './PortalPanel'
import RevenueChart from './RevenueChart'
import './business-control-center.css'
import './control-center-apple.css'

const actionPaths: Record<string, string> = {
 pos: 'M5 3h14v18H5V3Zm3 4h8M8 11h2m4 0h2m-8 4h2m4 0h2',
 bookings: 'M5 5h14v15H5V5Zm3-3v6m8-6v6M5 10h14',
 payments: 'M3 6h18v12H3V6Zm0 5h18M7 15h3',
 team: 'M16 20v-2a4 4 0 0 0-8 0v2M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 20v-1a3 3 0 0 1 3-3M20 20v-1a3 3 0 0 0-3-3',
 website: 'M3 5h18v14H3V5Zm0 4h18M7 7h.01M10 7h.01',
 share: 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h2v2h-2v-2Zm4 0h2v2h-2Zm-4 4h2v2h-2Zm4 0h2v2h-2Z',
 catalog: 'M12 3 3 8l9 5 9-5-9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
}
function ActionIcon({ name }: { name: string }) {
 return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={actionPaths[name]} /></svg>
}

type RecordEntry = { transactionId: string; kind: string; customer?: {name?: string;email?: string}; amountTotal: number; refundedAmount?: number; paymentStatus: string; status: string; createdAt: string; start?: string }
type Props = { site: {catalog: unknown[];employees: {active:boolean}[];settings:{timezone:string};business:Record<string,string>}; commerce:{orders:RecordEntry[];bookings:RecordEntry[]}; lang:'en'|'es'; onNavigate:(tab:string)=>void; canNavigate:(tab:string)=>boolean }
const money=(cents:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100)
const statusCopy:Record<string,[string,string]>={confirmed:['Confirmada','Confirmed'],pending:['Pendiente','Pending'],completed:['Completada','Completed'],scheduled:['Programada','Scheduled'],paid:['Pagado','Paid'],paid_in_person:['Pagado en persona','Paid in person'],partially_refunded:['Reembolso parcial','Partially refunded'],due:['Pago pendiente','Payment due'],refunded:['Reembolsado','Refunded'],failed:['Fallido','Failed']}
export default function BusinessControlCenter({site,commerce,lang,onNavigate,canNavigate}:Props){
 const [salesKind,setSalesKind]=useState('all');
 const es=lang==='es';const all=[...commerce.orders,...commerce.bookings];const paid=all.filter(x=>['paid','paid_in_person','partially_refunded'].includes(x.paymentStatus));
 const statusLabel=(status:string)=>statusCopy[status]?.[es?0:1]||status.replaceAll('_',' ');
 const net=(r:RecordEntry)=>Math.max(0,Number(r.amountTotal||0)-Number(r.refundedAmount||0));const revenue=paid.reduce((sum,r)=>sum+net(r),0);
 const now=new Date();const timezone=site.settings.timezone||'America/Puerto_Rico';
 const dateKey=(value:Date)=>value.toLocaleDateString('en-CA',{timeZone:timezone});
 const chartPaid=paid.filter(r=>salesKind==='all'||r.kind===salesKind);
 const days=Array.from({length:7},(_,i)=>{const d=new Date(now);d.setDate(d.getDate()-6+i);const key=dateKey(d);return{key,label:d.toLocaleDateString(es?'es-PR':'en-US',{weekday:'short',timeZone:timezone}),dateLabel:d.toLocaleDateString(es?'es-PR':'en-US',{weekday:'long',month:'short',day:'numeric',timeZone:timezone}),amount:chartPaid.filter(r=>dateKey(new Date(r.createdAt))===key).reduce((s,r)=>s+net(r),0)}});
 const upcoming=commerce.bookings.filter(r=>r.start&&new Date(r.start)>=now&&!['cancelled','canceled','refunded'].includes(r.status)).sort((a,b)=>Date.parse(a.start!)-Date.parse(b.start!)).slice(0,3);
 const recent=all.slice().sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).slice(0,3);
 const customers=new Set(all.map(r=>r.customer?.email?.trim().toLowerCase()).filter(Boolean)).size;
 const actions=[['pos','POS',es?'Registrar una venta':'Record a sale'],['bookings',es?'Reservaciones':'Bookings',es?'Organiza tu agenda':'Manage your schedule'],['payments',es?'Pagos':'Payments',es?'Cobros y recibos':'Payments and receipts'],['team',es?'Equipo':'Team',es?'Empleados y horarios':'Employees and schedules'],['website','Website',es?'Edita tu página':'Edit your website'],['share',es?'QR y compartir':'QR & Share',es?'Descarga tu QR y comparte tu página':'Download your QR and share your website'],['catalog',es?'Catálogo':'Catalog',es?'Productos y servicios':'Products and services']].filter(([tab])=>canNavigate(tab));
 const go=(tab:string)=>{if(canNavigate(tab))onNavigate(tab)};
 return <div className="bcc">
  <section className="bcc-hero"><div><span className="bcc-eyebrow">WEBFACTORY PR · FACTORY AI</span><h2>Business Control Center</h2><p>{es?'Tu negocio, conectado. Una vista clara para decidir tu próximo paso.':'Your business, connected. A clear view of what comes next.'}</p></div><div className="bcc-hero-actions">{canNavigate('pos')&&<button onClick={()=>go('pos')}>{es?'Abrir POS':'Open POS'}</button>}{canNavigate('analytics')&&<button className="bcc-secondary" onClick={()=>go('analytics')}>{es?'Ver reportes':'View reports'}</button>}</div></section>
  <div className="bcc-metrics">{[[es?'Ventas registradas':'Recorded sales',money(revenue),es?'Pagos menos reembolsos':'Payments less refunds'],[es?'Reservaciones':'Bookings',String(commerce.bookings.length),es?'Historial cargado':'Loaded history'],[es?'Pagos confirmados':'Confirmed payments',String(paid.length),es?'Online y en persona':'Online and in person'],[es?'Clientes en historial':'Customers in history',String(customers),es?'Emails únicos':'Unique emails']].map(([label,value,note])=><article key={label}><small>{label}</small><strong>{value}</strong><span>{note}</span></article>)}</div>
  <div className="bcc-insights"><PortalPanel className="bcc-card"><header><div><small>{es?'RENDIMIENTO':'PERFORMANCE'}</small><h3>{es?'Ventas de los últimos 7 días':'Sales in the last 7 days'}</h3></div><strong>{money(days.reduce((s,d)=>s+d.amount,0))}</strong></header><label className="bcc-chart-filter"><span>{es?'Tipo de transacción':'Transaction type'}</span><select value={salesKind} onChange={event=>setSalesKind(event.target.value)}><option value="all">{es?'Todas':'All'}</option><option value="order">{es?'Órdenes':'Orders'}</option><option value="booking">{es?'Reservaciones':'Bookings'}</option></select></label><RevenueChart days={days} lang={lang}/><p className="bcc-note">{es?'USD · Historial cargado · Zona horaria del negocio':'USD · Loaded history · Business time zone'}</p></PortalPanel>
  <PortalPanel className="bcc-card"><header><div><small>{es?'AGENDA':'SCHEDULE'}</small><h3>{es?'Próximas reservaciones':'Upcoming bookings'}</h3></div>{canNavigate('bookings')&&<button onClick={()=>go('bookings')}>{es?'Ver todas':'View all'}</button>}</header><div className="bcc-bookings">{upcoming.length?upcoming.map(r=><article key={r.transactionId}><time dateTime={r.start}>{new Date(r.start!).toLocaleDateString(es?'es-PR':'en-US',{month:'short',day:'numeric',timeZone:timezone})}<b>{new Date(r.start!).toLocaleTimeString(es?'es-PR':'en-US',{hour:'numeric',minute:'2-digit',timeZone:timezone})}</b></time><div><strong>{r.customer?.name||r.customer?.email||r.transactionId}</strong><span>{statusLabel(r.status)}</span></div></article>):<p className="bcc-empty">{es?'No hay citas próximas en el historial cargado.':'No upcoming bookings in the loaded history.'}</p>}</div></PortalPanel></div>
  <section className="bcc-shortcuts"><div className="bcc-section-title"><h3>{es?'Tu negocio, en un solo lugar':'Your business, in one place'}</h3><span>{site.catalog.length} {es?'productos y servicios':'products and services'} · {site.employees.filter(e=>e.active).length} {es?'empleados activos':'active employees'}</span></div><div className="bcc-action-grid">{actions.map(([tab,label,note])=><button key={tab} onClick={()=>go(tab)}><span className="bcc-action-icon"><ActionIcon name={tab}/></span><strong>{label}</strong><small>{note}</small></button>)}</div></section>
  <div className="bcc-bottom"><PortalPanel className="bcc-card"><header><div><small>{es?'ACTIVIDAD':'ACTIVITY'}</small><h3>{es?'Últimos movimientos':'Recent activity'}</h3></div></header>{recent.length?recent.map(r=><div className="bcc-activity" key={r.transactionId}><div><strong>{r.customer?.name||r.customer?.email||r.transactionId}</strong><span>{r.kind==='booking'?(es?'Reservación':'Booking'):(es?'Venta':'Sale')} · {statusLabel(r.paymentStatus)}</span></div><b>{money(r.amountTotal)}</b></div>):<p className="bcc-empty">{es?'Tu actividad aparecerá aquí.':'Your activity will appear here.'}</p>}</PortalPanel><section className="bcc-training"><span className="bcc-eyebrow">TRAINING MODE</span><h3>{es?'Aprende haciendo.':'Learn by doing.'}</h3><p>{es?'Practica las funciones con datos de ejemplo sin cambiar tu negocio real.':'Practice using sample data without changing your real business.'}</p><button onClick={()=>go('training')}>{es?'Aprender y practicar':'Learn and practice'}</button></section></div>
 </div>
}
