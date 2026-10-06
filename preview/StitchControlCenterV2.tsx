import {useState, type CSSProperties} from 'react'
import './stitch-v2.css'

type Tab='overview'|'bookings'|'sales'|'team'

const labels={
  en:{overview:'Overview',bookings:'Bookings',sales:'Sales',team:'Team',training:'Training',live:'Live operation',today:'Today at a glance',sample:'Sample data · No real transactions',net:'Net sales',booked:'Bookings',avg:'Average ticket',open:'Open orders',flow:'Today’s flow',quick:'Quick actions',salesPulse:'Sales pulse',queue:'Work queue',staff:'Team load',next:'Next booking',view:'View all',actions:['New sale','Add booking','Payment link','QR & Share'],days:['M','T','W','T','F','S','S']},
  es:{overview:'Resumen',bookings:'Reservas',sales:'Ventas',team:'Equipo',training:'Training',live:'Operación activa',today:'Tu día de un vistazo',sample:'Datos de ejemplo · Sin transacciones reales',net:'Ventas netas',booked:'Reservas',avg:'Ticket promedio',open:'Órdenes abiertas',flow:'Flujo de hoy',quick:'Accesos rápidos',salesPulse:'Pulso de ventas',queue:'Cola de trabajo',staff:'Carga del equipo',next:'Próxima reserva',view:'Ver todo',actions:['Nueva venta','Añadir reserva','Enlace de pago','QR y compartir'],days:['L','M','M','J','V','S','D']}
} as const

function Icon({name}:{name:string}){
  const p:Record<string,string>={
    home:'M3 11 12 4l9 7v9H5v-9 M9 20v-6h6v6',
    book:'M5 5h14v15H5z M8 2v6 M16 2v6 M5 10h14',
    sale:'M4 7h16l-2 9H6L4 7z M4 7 3 3H1',
    team:'M16 20v-2a4 4 0 0 0-8 0v2 M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
    training:'M4 5h16v12H4z M8 21h8 M12 17v4',
    plus:'M12 5v14 M5 12h14',
    link:'M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1 M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1',
    qr:'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h2v2h-2z M18 14h2v2h-2z M14 18h2v2h-2z M18 18h2v2h-2z'
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={p[name]} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

export default function StitchControlCenterV2(){
  const [tab,setTab]=useState<Tab>('overview')
  const [lang,setLang]=useState<'en'|'es'>('es')
  const [light,setLight]=useState(false)
  const [training,setTraining]=useState(false)
  const t=labels[lang]
  const nav:[Tab,string,string][]=[['overview','home',t.overview],['bookings','book',t.bookings],['sales','sale',t.sales],['team','team',t.team]]
  return <div className={'sv2-app '+(light?'is-light':'is-dark')}>
    <aside className="sv2-rail">
      <img src={light?'/webfactory-pr-logo.png':'/webfactory-pr-logo-dark.png'} alt="WebFactory PR"/>
      <nav>{nav.map(n=><button key={n[0]} className={tab===n[0]?'active':''} onClick={()=>setTab(n[0])}><Icon name={n[1]}/><span>{n[2]}</span></button>)}</nav>
      <button className={'sv2-training-btn '+(training?'active':'')} onClick={()=>setTraining(v=>!v)}><Icon name="training"/><span>{t.training}</span></button>
      <div className="sv2-rail-foot"><span>WF</span><div><strong>Owner</strong><small>Sample business</small></div></div>
    </aside>

    <main className="sv2-workspace">
      <header className="sv2-topbar">
        <div><p>BUSINESS CONTROL CENTER</p><h1>Nova Studio</h1></div>
        <div className="sv2-top-actions">
          <span className={'sv2-mode '+(training?'training':'')}><i/>{training?'TRAINING':t.live.toUpperCase()}</span>
          <div className="sv2-segment"><button className={lang==='en'?'active':''} onClick={()=>setLang('en')}>EN</button><button className={lang==='es'?'active':''} onClick={()=>setLang('es')}>ES</button></div>
          <button className="sv2-theme" onClick={()=>setLight(v=>!v)}>{light?'Dark':'Light'}</button>
        </div>
      </header>

      {tab==='overview' ? <div className="sv2-dashboard">
        <section className="sv2-dashboard-intro">
          <div><p className="sv2-eyebrow">{t.sample}</p><h2>{t.today}</h2><span>Tuesday · October 6 · 09:35 AM</span></div>
          <button className="sv2-primary"><Icon name="plus"/>{t.actions[0]}</button>
        </section>

        <section className="sv2-kpis">
          <article className="hero-kpi"><span>{t.net}</span><strong>$1,284.35</strong><small><b>+8.4%</b> vs. previous Tuesday</small><div className="sv2-sparkline">{[28,40,34,54,47,72,61,88,76,91].map((h,i)=><i key={i} style={{'--h':h+'%'} as CSSProperties}/>)}</div></article>
          <article><span>{t.booked}</span><strong>7</strong><small>3 upcoming</small></article>
          <article><span>{t.avg}</span><strong>$64.22</strong><small>5 completed sales</small></article>
          <article><span>{t.open}</span><strong>3</strong><small>2 ready · 1 preparing</small></article>
        </section>

        <section className="sv2-dashboard-grid">
          <article className="sv2-panel sv2-dayflow">
            <header><div><span>{t.flow}</span><strong>{t.next}</strong></div><button>{t.view}</button></header>
            <div className="sv2-timeline">
              {[
                ['09:00','Haircut','James R.','Completed'],
                ['10:30','Consultation','Andrea M.','Confirmed'],
                ['12:15','Color service','Lucía C.','Confirmed'],
                ['14:00','Haircut + beard','Marco T.','Pending']
              ].map((x,i)=><div className={'sv2-time '+(i===1?'current':'')} key={x[0]}><time>{x[0]}</time><i/><div><strong>{x[1]}</strong><span>{x[2]}</span></div><b>{x[3]}</b></div>)}
            </div>
          </article>

          <article className="sv2-panel sv2-quick">
            <header><span>{t.quick}</span></header>
            <div>
              <button><Icon name="plus"/><span><strong>{t.actions[0]}</strong><small>POS</small></span></button>
              <button><Icon name="book"/><span><strong>{t.actions[1]}</strong><small>Calendar</small></span></button>
              <button><Icon name="link"/><span><strong>{t.actions[2]}</strong><small>Shareable link</small></span></button>
              <button><Icon name="qr"/><span><strong>{t.actions[3]}</strong><small>Website</small></span></button>
            </div>
          </article>

          <article className="sv2-panel sv2-sales-chart">
            <header><div><span>{t.salesPulse}</span><strong>$4,936.72 · 7 days</strong></div><small>Sample</small></header>
            <div className="sv2-week-chart">{[44,61,52,78,67,91,74].map((h,i)=><div key={i}><i style={{'--h':h+'%'} as CSSProperties}/><span>{t.days[i]}</span></div>)}</div>
          </article>

          <article className="sv2-panel sv2-queue">
            <header><span>{t.queue}</span><b>3 active</b></header>
            <div className="sv2-queue-row"><i className="paid"/><div><strong>Order #1048</strong><span>Care kit · Pickup</span></div><b>$48.35</b></div>
            <div className="sv2-queue-row"><i className="prep"/><div><strong>Order #1049</strong><span>2 items · Preparing</span></div><b>$86.20</b></div>
            <div className="sv2-queue-row"><i className="book"/><div><strong>Booking</strong><span>Consultation · 10:30</span></div><b>45 min</b></div>
          </article>

          <article className="sv2-panel sv2-team-load">
            <header><span>{t.staff}</span><button>{t.view}</button></header>
            {[
              ['Andrea M.','3 bookings','72%'],
              ['James R.','2 bookings','54%'],
              ['Lucía C.','1 booking','38%'],
              ['Marco T.','1 booking','31%']
            ].map((x,i)=><div className="sv2-staff-row" key={x[0]}><i>{x[0].split(' ').map(y=>y[0]).join('')}</i><div><strong>{x[0]}</strong><span>{x[1]}</span></div><div className="sv2-load"><span><b style={{width:x[2]}}/></span><small>{x[2]}</small></div></div>)}
          </article>
        </section>
      </div> : <section className="sv2-tab-placeholder">
        <p className="sv2-eyebrow">{t.sample}</p>
        <h2>{nav.find(n=>n[0]===tab)?.[2]}</h2>
        <p>This visual preview keeps secondary sections intentionally simplified. The production feature remains unchanged.</p>
        <button className="sv2-primary" onClick={()=>setTab('overview')}>{t.overview}</button>
      </section>}
    </main>
  </div>
}
