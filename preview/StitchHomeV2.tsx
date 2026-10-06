import {useState} from 'react'
import './stitch-v2.css'

type Lang='en'|'es'

const copy={
  en:{
    nav:['Platform','How it works','Pricing','FAQ'],
    login:'Log In', trial:'Start free',
    eyebrow:'BUILT IN PUERTO RICO · OPERATE FROM ONE PLACE',
    titleA:'Your business,', titleB:'in one operating system.',
    lead:'Website, sales, bookings, payments, customers and team — connected to one Business Control Center.',
    chip:'Live operations',
    proof:['7-day free trial','No card required','$30/month after trial'],
    pulse:'TODAY · SAMPLE DATA',
    revenue:'Net sales',bookings:'Bookings',orders:'Orders',team:'Team on shift',
    next:'Next booking', nextValue:'10:30 AM · Consultation', activity:'Live activity',
    modulesTitle:'One platform. Five operating layers.',
    modulesLead:'Build the customer experience once, then run the daily operation without jumping between disconnected tools.',
    modules:[
      ['Website','Bilingual pages, templates, QR sharing and a Builder guided by Factory AI.'],
      ['Commerce','Catalog, inventory, cart, POS, orders and customer tracking.'],
      ['Bookings','Services, professionals, availability, reminders and calendar flow.'],
      ['Payments','Stripe, ATH Móvil and payment links connected to the business.'],
      ['Team','Employees, schedules, access roles and operating visibility.'],
    ],
    flowEyebrow:'FROM SETUP TO DAILY WORK', flowTitle:'Build once. Operate every day.',
    flow:[
      ['01','Create','Choose a template or start in the Builder.'],
      ['02','Configure','Add services, products, team, hours and payment methods.'],
      ['03','Launch','Publish the site and share it by link or QR.'],
      ['04','Operate','Handle sales, bookings, customers and staff from the Control Center.'],
    ],
    customerEyebrow:'CUSTOMER SIDE', customerTitle:'A storefront that feeds the operation.',
    product:'Care kit', service:'Consultation', add:'Add to cart', book:'Book', checkout:'Checkout',
    controlEyebrow:'BUSINESS SIDE', controlTitle:'The same activity lands in your Control Center.',
    controlRows:[['10:30','Consultation','Confirmed'],['11:15','Care kit order','$48.35'],['1:00','New customer','Booking']],
    priceEyebrow:'ONE CLEAR PLAN', priceTitle:'Start with the full platform.', price:'$30', annual:'or $350/year', priceLead:'Website + commerce + bookings + payments + employees + Business Control Center.',
    priceItems:['7 days free','No card to start','No WebFactory commission on your sales'],
    cta:'Start 7-day free trial',
    faqTitle:'Questions before you start.',
    faqs:[
      ['Can I sell and take bookings on the same site?','Yes. Products and appointment-based services can live together on the same business website.'],
      ['Where do customer payments go?','Stripe and ATH Móvil connect to the business payment accounts. Provider fees may apply.'],
      ['Can I edit the site later?','Yes. The Builder and Control Center remain connected so you can update content and operations over time.'],
    ],
    footer:'WebFactory PR · Factory AI'
  },
  es:{
    nav:['Plataforma','Cómo funciona','Precio','FAQ'],
    login:'Log In', trial:'Comenzar gratis',
    eyebrow:'CREADO EN PUERTO RICO · OPERA DESDE UN SOLO LUGAR',
    titleA:'Tu negocio,', titleB:'en un solo sistema.',
    lead:'Website, ventas, reservas, pagos, clientes y equipo — conectados a un solo Business Control Center.',
    chip:'Operación en vivo',
    proof:['7 días gratis','Sin tarjeta','$30/mes después del trial'],
    pulse:'HOY · DATOS DE EJEMPLO',
    revenue:'Ventas netas',bookings:'Reservas',orders:'Órdenes',team:'Equipo activo',
    next:'Próxima reserva', nextValue:'10:30 AM · Consulta', activity:'Actividad en vivo',
    modulesTitle:'Una plataforma. Cinco capas operativas.',
    modulesLead:'Crea la experiencia del cliente una vez y luego maneja la operación diaria sin brincar entre herramientas desconectadas.',
    modules:[
      ['Website','Páginas bilingües, templates, QR y un Builder guiado por Factory AI.'],
      ['Ventas','Catálogo, inventario, carrito, POS, órdenes y seguimiento de clientes.'],
      ['Reservas','Servicios, profesionales, disponibilidad, recordatorios y calendario.'],
      ['Pagos','Stripe, ATH Móvil y enlaces de pago conectados al negocio.'],
      ['Equipo','Empleados, horarios, roles de acceso y visibilidad operacional.'],
    ],
    flowEyebrow:'DE CONFIGURACIÓN A OPERACIÓN', flowTitle:'Créalo una vez. Opéralo todos los días.',
    flow:[
      ['01','Crea','Escoge un template o comienza en el Builder.'],
      ['02','Configura','Añade servicios, productos, equipo, horarios y pagos.'],
      ['03','Publica','Publica el website y compártelo por enlace o QR.'],
      ['04','Opera','Maneja ventas, reservas, clientes y equipo desde el Control Center.'],
    ],
    customerEyebrow:'LADO DEL CLIENTE', customerTitle:'Un storefront que alimenta la operación.',
    product:'Kit de cuidado', service:'Consulta', add:'Añadir al carrito', book:'Reservar', checkout:'Pagar',
    controlEyebrow:'LADO DEL NEGOCIO', controlTitle:'La misma actividad llega a tu Control Center.',
    controlRows:[['10:30','Consulta','Confirmada'],['11:15','Orden · Kit de cuidado','$48.35'],['1:00','Cliente nuevo','Reserva']],
    priceEyebrow:'UN PLAN CLARO', priceTitle:'Comienza con la plataforma completa.', price:'$30', annual:'o $350/año', priceLead:'Website + ventas + reservas + pagos + empleados + Business Control Center.',
    priceItems:['7 días gratis','Sin tarjeta para comenzar','Sin comisión de WebFactory sobre tus ventas'],
    cta:'Comenzar prueba de 7 días',
    faqTitle:'Preguntas antes de comenzar.',
    faqs:[
      ['¿Puedo vender y recibir reservas en el mismo website?','Sí. Productos y servicios con cita pueden convivir en el mismo website del negocio.'],
      ['¿A dónde llegan los pagos del cliente?','Stripe y ATH Móvil se conectan a las cuentas de pago del negocio. Pueden aplicar cargos del proveedor.'],
      ['¿Puedo editar el website luego?','Sí. El Builder y el Control Center permanecen conectados para actualizar contenido y operación con el tiempo.'],
    ],
    footer:'WebFactory PR · Factory AI'
  }
} as const

function Glyph({name}:{name:string}){
  const paths:Record<string,string>={
    website:'M4 5h16v14H4z M4 9h16 M7 7h.01 M10 7h.01',
    commerce:'M4 7h16l-2 9H6L4 7z M4 7 3 3H1 M8 20h.01 M17 20h.01',
    booking:'M5 5h14v15H5z M8 2v6 M16 2v6 M5 10h14 M9 14h2 M13 14h2',
    payments:'M3 6h18v12H3z M3 10h18 M7 15h4',
    team:'M16 20v-2a4 4 0 0 0-8 0v2 M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M20 20v-2a4 4 0 0 0-3-3.87'
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name]} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

export default function StitchHomeV2(){
  const [lang,setLang]=useState<Lang>('es')
  const [light,setLight]=useState(false)
  const t=copy[lang]
  const glyphs=['website','commerce','booking','payments','team']
  return <div className={'stitch-v2-home '+(light?'is-light':'is-dark')}>
    <header className="sv2-nav">
      <a className="sv2-brand" href="#top" aria-label="WebFactory PR">
        <img src={light?'/webfactory-pr-logo.png':'/webfactory-pr-logo-dark.png'} alt="WebFactory PR"/>
      </a>
      <nav aria-label="Main navigation">{t.nav.map((item,i)=><a key={item} href={['#platform','#flow','#pricing','#faq'][i]}>{item}</a>)}</nav>
      <div className="sv2-nav-actions">
        <div className="sv2-segment" aria-label="Language">
          <button className={lang==='en'?'active':''} onClick={()=>setLang('en')}>EN</button>
          <button className={lang==='es'?'active':''} onClick={()=>setLang('es')}>ES</button>
        </div>
        <button className="sv2-theme" onClick={()=>setLight(v=>!v)} aria-label={light?'Use dark mode':'Use light mode'}>
          <span>{light?'Dark':'Light'}</span>
        </button>
        <a className="sv2-login" href="#control">{t.login}</a>
        <a className="sv2-primary" href="#pricing">{t.trial}</a>
      </div>
    </header>

    <main id="top">
      <section className="sv2-hero">
        <video className="sv2-hero-video" autoPlay muted loop playsInline poster="/media/webfactory-hero-poster.webp">
          <source src="/webfactory-hero-tech-hud.mp4" type="video/mp4"/>
        </video>
        <div className="sv2-hero-scrim"/>
        <div className="sv2-hero-grid">
          <div className="sv2-hero-copy">
            <p className="sv2-eyebrow">{t.eyebrow}</p>
            <h1>{t.titleA}<br/><span>{t.titleB}</span></h1>
            <p className="sv2-lead">{t.lead}</p>
            <div className="sv2-hero-cta">
              <a className="sv2-primary sv2-primary-large" href="#pricing">{t.trial}</a>
              <span className="sv2-live"><i/>{t.chip}</span>
            </div>
            <div className="sv2-proof">{t.proof.map(x=><span key={x}>{x}</span>)}</div>
          </div>

          <aside className="sv2-command" aria-label="Sample Business Control Center">
            <div className="sv2-command-top">
              <div><span>{t.pulse}</span><strong>Nova Studio</strong></div>
              <span className="sv2-status"><i/>LIVE</span>
            </div>
            <div className="sv2-metrics">
              <article><span>{t.revenue}</span><strong>$1,284.35</strong><small>+8.4%</small></article>
              <article><span>{t.bookings}</span><strong>7</strong><small>3 upcoming</small></article>
              <article><span>{t.orders}</span><strong>3</strong><small>2 ready</small></article>
            </div>
            <div className="sv2-command-body">
              <div className="sv2-next">
                <span>{t.next}</span>
                <strong>{t.nextValue}</strong>
                <div className="sv2-person"><i>AM</i><span>Andrea M.<small>Service · 45 min</small></span><b>CONFIRMED</b></div>
              </div>
              <div className="sv2-mini-chart" aria-label={t.activity}>
                <div className="sv2-chart-label"><span>{t.activity}</span><b>09:15</b></div>
                <div className="sv2-bars">{[37,54,43,71,64,86,58,92,76,88,69,96].map((h,i)=><i key={i} style={{'--h':h+'%'} as React.CSSProperties}/>)}</div>
              </div>
            </div>
            <div className="sv2-command-foot"><span>{t.team}</span><div className="sv2-avatars"><i>JM</i><i>AR</i><i>LC</i><i>+1</i></div><strong>4</strong></div>
          </aside>
        </div>
      </section>

      <section className="sv2-section sv2-platform" id="platform">
        <div className="sv2-section-head">
          <p className="sv2-eyebrow">WEBFACTORY PR</p>
          <h2>{t.modulesTitle}</h2>
          <p>{t.modulesLead}</p>
        </div>
        <div className="sv2-module-grid">
          {t.modules.map((m,i)=><article className={'sv2-module m'+(i+1)} key={m[0]}>
            <div className="sv2-module-icon"><Glyph name={glyphs[i]}/></div>
            <span>0{i+1}</span><h3>{m[0]}</h3><p>{m[1]}</p>
          </article>)}
        </div>
      </section>

      <section className="sv2-section sv2-flow" id="flow">
        <div className="sv2-flow-title"><p className="sv2-eyebrow">{t.flowEyebrow}</p><h2>{t.flowTitle}</h2></div>
        <div className="sv2-flow-list">
          {t.flow.map((f,i)=><article key={f[0]} style={{'--delay':(i*90)+'ms'} as React.CSSProperties}>
            <span>{f[0]}</span><div><h3>{f[1]}</h3><p>{f[2]}</p></div><i/>
          </article>)}
        </div>
      </section>

      <section className="sv2-section sv2-two-worlds">
        <article className="sv2-world sv2-customer">
          <div><p className="sv2-eyebrow">{t.customerEyebrow}</p><h2>{t.customerTitle}</h2></div>
          <div className="sv2-phone">
            <div className="sv2-phone-top"><span>Nova Studio</span><i/></div>
            <div className="sv2-phone-hero"><span>CARE · STUDIO</span><strong>Feel ready for your day.</strong><button>{t.book}</button></div>
            <div className="sv2-phone-cards">
              <article><div/><strong>{t.product}</strong><span>$48.35</span><button>{t.add}</button></article>
              <article><div/><strong>{t.service}</strong><span>45 min</span><button>{t.book}</button></article>
            </div>
            <div className="sv2-cart"><span>{t.checkout}</span><strong>$48.35</strong></div>
          </div>
        </article>

        <article className="sv2-world sv2-business" id="control">
          <div><p className="sv2-eyebrow">{t.controlEyebrow}</p><h2>{t.controlTitle}</h2></div>
          <div className="sv2-ops-panel">
            <div className="sv2-ops-head"><span>ACTIVITY</span><b>Live</b></div>
            {t.controlRows.map((r,i)=><div className="sv2-ops-row" key={r[0]}><time>{r[0]}</time><div><strong>{r[1]}</strong><span>{i===0?'Andrea M.':i===1?'Order #1048':'Web booking'}</span></div><b>{r[2]}</b></div>)}
            <div className="sv2-ops-actions"><button>POS</button><button>Bookings</button><button>QR & Share</button></div>
          </div>
        </article>
      </section>

      <section className="sv2-section sv2-pricing" id="pricing">
        <div className="sv2-price-copy"><p className="sv2-eyebrow">{t.priceEyebrow}</p><h2>{t.priceTitle}</h2><p>{t.priceLead}</p></div>
        <div className="sv2-price-card">
          <div><strong>{t.price}</strong><span>/month</span><small>{t.annual}</small></div>
          <ul>{t.priceItems.map(x=><li key={x}>{x}</li>)}</ul>
          <a className="sv2-primary sv2-primary-large" href="#top">{t.cta}</a>
        </div>
      </section>

      <section className="sv2-section sv2-faq" id="faq">
        <div><p className="sv2-eyebrow">FAQ</p><h2>{t.faqTitle}</h2></div>
        <div>{t.faqs.map((f,i)=><details key={f[0]} open={i===0}><summary>{f[0]}<span>+</span></summary><p>{f[1]}</p></details>)}</div>
      </section>
    </main>

    <footer className="sv2-footer"><img src={light?'/webfactory-pr-logo.png':'/webfactory-pr-logo-dark.png'} alt=""/><span>{t.footer}</span></footer>
  </div>
}
