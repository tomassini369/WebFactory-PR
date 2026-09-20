import { useEffect, useState } from 'react'
import DemoSite from './DemoSite'
import { demoConfigs } from './demoData'
import WebFactoryBuilder from './WebFactoryBuilder'
import PaymentSetupPage from './PaymentSetupPage'
import ClientAdminPage from './ClientAdminPage'
import ClientStorefront from './ClientStorefront'

type Language = 'es' | 'en'

const PRICE = '$300'
const LOGO = '/webfactory-pr-logo.png'

const content = {
  es: {
    nav: ['Demos','Qué incluye','Builder','Cómo funciona','FAQ'],
    hero: {
      eyebrow:'WEBSITE + COMMERCE + BOOKINGS',
      title:['Tu negocio.','Tu website.','Todo en un solo lugar.'],
      highlight:'Vende. Recibe citas. Cobra online.',
      text:'Website profesional preparado para productos, servicios, ventas, pagos y reservaciones.',
      primary:'Crear mi website',
      secondary:'Ver ejemplos',
      once:'Pago único'
    },
    value:['UNA SOLA SOLUCIÓN','Un website. Un precio. Todo incluido.','Sin paquetes complicados. Sin conocimientos técnicos. Sin necesidad de programar. WebFactory adapta la experiencia al negocio.'],
    demos:['DEMOS','Diseñado para diferentes tipos de negocio.','Puedes solicitar un diseño personalizado o escoger cualquiera de estos demos como diseño base para tu página.'],
    includes:['WHAT YOU GET','Todo lo que necesita un negocio para vender y organizarse online.','Una experiencia unificada para mostrar, vender, cobrar y reservar.'],
    commerce:['COMMERCE','Vende tus productos y servicios.','Catálogo unificado, detalle por item, carrito global y checkout preparado para pagos seguros.'],
    services:['SERVICES','Servicios simples o con reservación.','Un servicio puede venderse directamente o activar booking con empleado, duración, depósito y disponibilidad.'],
    booking:['BOOKING','Tus clientes reservan. Tu equipo se organiza.','La disponibilidad se calcula por Service + Employee + Time, no por una capacidad genérica del negocio.'],
    employees:['EMPLOYEES','Cada servicio se conecta con el empleado correcto.','Asigna servicios, horarios, descansos, vacaciones, límites diarios y reglas individuales sin duplicar el catálogo.'],
    calendar:['GOOGLE CALENDAR','El calendario real de tu equipo entra en la ecuación.','WebFactory podrá consultar conflictos, crear eventos, actualizar, cancelar y reprogramar por empleado o calendario.'],
    builder:['WEBFACTORY BUILDER','Avanzado por dentro. Fácil por fuera.','El cliente configura su negocio paso a paso mientras ve cómo cambia su website en tiempo real.'],
    payments:['PAYMENTS','Recibe tu dinero directamente.','Stripe y ATH Móvil se conectan a las cuentas del negocio. WebFactory no recibe el dinero generado por las ventas del cliente.'],
    how:['HOW IT WORKS','De configuración a publicación en cinco pasos.'],
    trust:['TRUST','Construido para una experiencia clara, segura y profesional.'],
    faq:['FAQ','Preguntas frecuentes.'],
    final:['Build. Sell. Book. Grow.','Website profesional, commerce, pagos y reservaciones en una sola solución.'],
    footer:'Todos los derechos reservados.'
  },
  en: {
    nav: ['Demos','What’s included','Builder','How it works','FAQ'],
    hero: {
      eyebrow:'WEBSITE + COMMERCE + BOOKINGS',
      title:['Your business.','Your website.','Everything in one place.'],
      highlight:'Sell. Book. Get paid online.',
      text:'A professional website prepared for products, services, sales, payments and bookings.',
      primary:'Create my website',
      secondary:'View examples',
      once:'One-time payment'
    },
    value:['ONE COMPLETE SOLUTION','One website. One price. Everything included.','No complicated packages. No technical knowledge. No coding required. WebFactory adapts the experience to the business.'],
    demos:['DEMOS','Built for different types of businesses.','You can request a custom design or choose any of these demos as the base design for your website.'],
    includes:['WHAT YOU GET','Everything a business needs to sell and stay organized online.','One unified experience to present, sell, collect payments and manage bookings.'],
    commerce:['COMMERCE','Sell your products and services.','Unified catalog, item detail views, a global cart and checkout prepared for secure payments.'],
    services:['SERVICES','Services with or without appointments.','A service can be sold directly or activate booking with employee, duration, deposit and availability.'],
    booking:['BOOKING','Your customers book. Your team stays organized.','Availability is calculated by Service + Employee + Time, not by generic business-wide capacity.'],
    employees:['EMPLOYEES','Every service connects to the right employee.','Assign services, schedules, breaks, vacations, daily limits and individual rules without duplicating the catalog.'],
    calendar:['GOOGLE CALENDAR','Your team’s real calendar becomes part of availability.','WebFactory can check conflicts, create events, update, cancel and reschedule by employee or calendar.'],
    builder:['WEBFACTORY BUILDER','Powerful underneath. Simple on the surface.','Customers configure their business step by step while seeing the website update in real time.'],
    payments:['PAYMENTS','Receive your money directly.','Stripe and ATH Móvil connect to the business accounts. WebFactory does not receive the money generated by client sales.'],
    how:['HOW IT WORKS','From setup to publishing in five steps.'],
    trust:['TRUST','Built for a clear, secure and professional experience.'],
    faq:['FAQ','Frequently asked questions.'],
    final:['Build. Sell. Book. Grow.','Professional website, commerce, payments and bookings in one solution.'],
    footer:'All rights reserved.'
  }
}

const features = [
  ['Responsive','Desktop, tablet and mobile layouts designed as one experience.'],
  ['Commerce','Products, services, item views, cart and checkout architecture.'],
  ['Bookings','Employee-aware scheduling with duration, buffer and deposits.'],
  ['Payments','Stripe + ATH Móvil prepared for secure backend verification.'],
  ['Employees','Service mapping, schedules, breaks, vacations and limits.'],
  ['Launch','Preview, initial deployment, SSL, basic SEO and one revision round.']
]

const faqEs = [
  ['¿El precio cambia si activo más funciones?','No. WebFactory tiene un solo producto y el precio permanece en $300.'],
  ['¿WebFactory recibe el dinero de mis ventas?','No. Stripe y ATH Móvil se conectan a las cuentas del negocio.'],
  ['¿Puedo vender productos y también recibir citas?','Sí. El mismo website puede manejar productos, servicios, carrito y reservaciones.'],
  ['¿Mi página será igual a uno de los demos?','Tú decides. Puedes recibir un diseño personalizado por WebFactory o escoger un demo como base exacta. Al escoger un demo conservamos su estructura y experiencia, reemplazando la marca, imágenes, textos, catálogo y configuraciones con las de tu negocio.'],
  ['¿Cómo se evita el double booking?','La arquitectura revalida base de datos, empleado, horarios, holds y Google Calendar antes de confirmar.'],
  ['¿El website se crea automáticamente con IA?','No en V1. Después de un pago verificado se genera el Production Package para el flujo administrativo.'],
  ['¿Puedo usar mi propio logo?','Sí. El cliente podrá subir su logo y archivos desde el Builder.']
]

const faqEn = [
  ['Does the price change if I enable more features?','No. WebFactory has one product and the price remains $300.'],
  ['Does WebFactory receive money from my sales?','No. Stripe and ATH Móvil connect to the business accounts.'],
  ['Can I sell products and also accept appointments?','Yes. The same website can handle products, services, cart and bookings.'],
  ['Will my website look exactly like one of the demos?','You decide. You can receive a custom WebFactory design or choose a demo as the exact base. When a demo is selected, we preserve its structure and experience while replacing its branding, images, text, catalog, and settings with your business information.'],
  ['How is double booking prevented?','The architecture rechecks the database, employee, schedules, holds and Google Calendar before confirmation.'],
  ['Is the website created automatically with AI?','Not in V1. After verified payment, the Production Package is generated for the administrative workflow.'],
  ['Can I use my own logo?','Yes. Customers will be able to upload their logo and files from the Builder.']
]

function Heading({data,invert=false}:{data:string[],invert?:boolean}) {
  return <div className={'heading '+(invert?'invert':'')}><p>{data[0]}</p><h2>{data[1]}</h2>{data[2]&&<span>{data[2]}</span>}</div>
}

function Devices(){
  return <div className="devices">
    <div className="desktop-device">
      <div className="browser"><i/><i/><i/></div>
      <div className="screen-nav"><b>STUDIO</b><span>Services</span><span>Shop</span><span>Book</span></div>
      <div className="screen-hero"><small>PREMIUM SERVICE</small><strong>Designed to move your business forward.</strong><button>Book now</button></div>
      <div className="screen-cards"><i/><i/><i/></div>
    </div>
    <div className="tablet-device"><b>STUDIO</b><small>Premium service</small><strong>Book your next visit.</strong></div>
    <div className="phone-device"><b>STUDIO</b><small>Shop · Book</small><strong>Simple. Fast. Ready.</strong></div>
  </div>
}

function App(){
  const [lang,setLang]=useState<Language>('es')
  const [menu,setMenu]=useState(false)
  const t=content[lang]
  const faqs=lang==='es'?faqEs:faqEn
  useEffect(()=>{
    if (!/^\/demos\//.test(window.location.pathname)) document.documentElement.lang=lang
  },[lang])

  const anchors=['#demos','#incluye','#builder','#como-funciona','#faq']
  const demoMatch = window.location.pathname.match(/^\/demos\/([^/]+)\/?$/)
  const paymentSetupRoute = /^\/payment-setup\/?$/.test(window.location.pathname)
  const clientAdminRoute = /^\/client-admin\/?$/.test(window.location.pathname)
  const clientSiteMatch = window.location.pathname.match(/^\/sites\/([^/]+)\/?$/)

  if (clientAdminRoute) return <ClientAdminPage />
  if (clientSiteMatch) return <ClientStorefront slug={decodeURIComponent(clientSiteMatch[1])} />
  if (paymentSetupRoute) return <PaymentSetupPage />
  if (demoMatch) return <DemoSite slug={demoMatch[1]} />

  return <>
    <header className="header">
      <a href="#top" className="logo"><img src={LOGO} alt="WebFactory PR"/></a>
      <nav className={menu?'open':''}>{t.nav.map((n,i)=><a key={n} href={anchors[i]} onClick={()=>setMenu(false)}>{n}</a>)}</nav>
      <div className="header-actions">
        <div className="langs"><button className={lang==='es'?'active':''} onClick={()=>setLang('es')}>ES</button><button className={lang==='en'?'active':''} onClick={()=>setLang('en')}>EN</button></div>
        <a href="#builder" className="btn primary desktop-cta">{t.hero.primary}</a>
        <button className="hamburger" aria-expanded={menu} onClick={()=>setMenu(v=>!v)}><i/><i/><i/></button>
      </div>
    </header>

    <main id="top">
      <section className="hero shell">
        <div>
          <p className="eyebrow">{t.hero.eyebrow}</p>
          <h1>{t.hero.title.map(x=><span key={x}>{x}</span>)}</h1>
          <h3>{t.hero.highlight}</h3>
          <p className="lead">{t.hero.text}</p>
          <div className="price"><strong>{PRICE}</strong><span>{t.hero.once}</span></div>
          <div className="actions"><a className="btn primary" href="#builder">{t.hero.primary} <b>↗</b></a><a className="btn secondary" href="#demos">{t.hero.secondary}</a></div>
          <div className="badges">{['Responsive','Carrito','Stripe','ATH Móvil','Bookings','Google Calendar'].map(x=><span key={x}>{x}</span>)}</div>
        </div>
        <Devices/>
      </section>

      <section className="value" id="incluye"><div className="shell value-grid"><Heading data={t.value}/><aside><small>WEBFACTORY PREMIUM COMMERCE WEBSITE</small><strong>{PRICE}</strong><span>{t.hero.once}</span></aside></div></section>

      <section className="section white" id="demos"><div className="shell"><Heading data={t.demos}/><div className="demo-design-options"><article><b>01</b><div><strong>{lang==='es'?'Diseño personalizado':'Custom design'}</strong><span>{lang==='es'?'WebFactory crea la página según la identidad, contenido y configuración de tu negocio.':'WebFactory creates the page around your business identity, content, and configuration.'}</span></div></article><article><b>02</b><div><strong>{lang==='es'?'Diseño basado en un demo':'Demo-based design'}</strong><span>{lang==='es'?'Escoges el demo que prefieres; conservamos su estructura y experiencia, y sustituimos la marca, imágenes, textos, catálogo y configuraciones.':'Choose the demo you prefer; we preserve its structure and experience while replacing the branding, images, text, catalog, and settings.'}</span></div></article></div><div className="demo-base-assurance"><strong>{lang==='es'?'Lo que ves es la base que recibirás.':'What you see is the base you will receive.'}</strong><span>{lang==='es'?'Cuando seleccionas un demo en el Builder, esa elección queda guardada en tu pedido y en el Production Package.':'When you select a demo in the Builder, that choice is saved with your order and in the Production Package.'}</span></div><div className="demo-grid">{demoConfigs.map((demo,i)=><article className="demo" key={demo.slug}><div className={'demo-art d'+i} style={{backgroundImage:`linear-gradient(180deg,rgba(11,21,41,.05),rgba(11,21,41,.4)),url(${demo.heroImage})`,backgroundSize:'cover',backgroundPosition:'center'}}><div className="demo-window"><span>{demo.name}</span><strong>{demo.category}</strong><i/><i/><i/></div><div className="demo-mobile"><b>{demo.shortName.slice(0,2)}</b><i/><i/></div></div><small>{demo.category} · {lang==='es'?'DISEÑO BASE DISPONIBLE':'BASE DESIGN AVAILABLE'}</small><h3>{demo.name}</h3><a href={`/demos/${demo.slug}`}>{lang==='es'?'Ver demo en vivo':'View live demo'} ↗</a></article>)}</div></div></section>

      <section className="section soft"><div className="shell"><Heading data={t.includes}/><div className="feature-grid">{features.map(([a,b],i)=><article key={a}><em>0{i+1}</em><h3>{a}</h3><p>{b}</p></article>)}</div></div></section>

      <section className="section white"><div className="shell split"><Heading data={t.commerce}/><div className="commerce"><div className="catalog"><small>CATALOG</small><article><i/><span><b>Premium Shampoo</b><small>$29.99</small></span><button>+</button></article><article><i/><span><b>Hair Treatment</b><small>$45.00</small></span><button>+</button></article></div><b className="arrow">→</b><div className="cart"><small>CART</small><strong>2 items</strong><span>Subtotal</span><h3>$74.99</h3><button>Checkout</button></div></div></div></section>

      <section className="section soft"><div className="shell split reverse"><div className="service-stack"><article><small>SERVICE</small><h3>Premium Haircut</h3><p>$35 · 45 min</p><div><span>Carlos</span><span>José</span></div><button>Reservar cita</button></article><article><small>SERVICE</small><h3>Basic Wash</h3><p>$40</p><button>Comprar servicio</button></article></div><Heading data={t.services}/></div></section>

      <section className="section navy"><div className="shell split"><Heading data={t.booking} invert/><div className="booking-flow">{['Service','Employee','Date','Time','Payment','Confirmed'].map((x,i)=><div key={x}><small>0{i+1}</small><strong>{x}</strong>{i<5&&<span>↓</span>}</div>)}</div></div></section>

      <section className="section white"><div className="shell split reverse"><div className="employees"><article><b>C</b><span><small>CARLOS</small><strong>Barber</strong><em>Mon · Tue · Thu · Fri</em></span><i>8/day</i></article><article><b>M</b><span><small>MARÍA</small><strong>Color Specialist</strong><em>Tue · Wed · Fri · Sat</em></span><i>5/day</i></article><div>Premium Haircut <span>→</span> <b>Carlos</b><b>José</b></div></div><Heading data={t.employees}/></div></section>

      <section className="section soft"><div className="shell split"><Heading data={t.calendar}/><div className="calendar"><header><strong>September</strong><span>Team calendar</span></header><div className="week">{['M','T','W','T','F','S','S'].map((x,i)=><b key={i}>{x}</b>)}</div><div className="days">{Array.from({length:28},(_,i)=><i className={[3,8,12,17,18,23].includes(i)?'busy':''} key={i}>{i+1}</i>)}</div><footer><span>● Carlos · 10:00 Haircut</span><span>● María · 1:30 Color</span></footer></div></div></section>

      <section className="section white builder" id="builder"><div className="shell"><div className="builder-head"><Heading data={t.builder}/><div className="builder-price"><strong>{PRICE}</strong><span>{t.hero.once}</span></div></div><WebFactoryBuilder lang={lang}/></div></section>

      <section className="section soft"><div className="shell split reverse"><div className="payments"><article className="stripe"><b>stripe</b><strong>$300</strong><small>Secure checkout</small></article><article className="ath"><b>ATH Móvil</b><strong>$300</strong><small>Business payment</small></article><span>✓ Backend verified payment</span></div><Heading data={t.payments}/></div></section>

      <section className="section white" id="como-funciona"><div className="shell"><Heading data={t.how}/><div className="steps">{(lang==='es'?[['Personaliza','Configura tu negocio y elige entre diseño personalizado o un demo como diseño base.'],['Compra','Revisa el preview y completa el pago único de $300.'],['Creamos','Con pago verificado el proyecto entra al flujo de producción respetando tu opción de diseño.'],['Revisa','Recibes un preview y una ronda de revisión.'],['Publicamos','Completamos el deployment inicial y queda listo.']]:[['Customize','Configure your business and choose between a custom design or a demo as the base design.'],['Purchase','Review the preview and complete the one-time $300 payment.'],['We build','Verified payment moves the project into production while preserving your design choice.'],['Review','Receive a preview and one revision round.'],['Publish','Initial deployment is completed and ready.']]).map(([a,b],i)=><article key={a}><em>0{i+1}</em><h3>{a}</h3><p>{b}</p></article>)}</div></div></section>

      <section className="section soft"><div className="shell"><Heading data={t.trust}/><div className="trust">{['Responsive','Secure Payments','Employee Booking','Google Calendar','Direct Payments','Preview Before Publishing'].map((x,i)=><div key={x}><span>{['↔','✓','◉','▦','$','◫'][i]}</span><b>{x}</b></div>)}</div></div></section>

      <section className="section white" id="faq"><div className="shell faq"><Heading data={t.faq}/><div>{faqs.map(([q,a])=><details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></div></section>

      <section className="final"><div className="shell"><div><p className="eyebrow">WEBFACTORY PR</p><h2>{t.final[0]}</h2><p>{t.final[1]}</p></div><aside><strong>{PRICE}</strong><span>{t.hero.once}</span><a href="#builder" className="btn light">{t.hero.primary} ↗</a></aside></div></section>
    </main>

    <footer className="footer"><div className="shell"><div><img src={LOGO} alt="WebFactory PR"/><p>Build. Sell. Book. Grow.</p></div><nav>{['Product','Demos','Features','Builder','FAQ','Contact','Privacy','Terms','Refund Policy'].map((x,i)=><a key={x} href={i===1?'#demos':i===2?'#incluye':i===3?'#builder':i===4?'#faq':i===5?'mailto:WebFactoryPR@gmail.com':'#top'}>{x}</a>)}</nav><p className="copyright">WebFactoryPR@gmail.com · © 2026 WebFactory PR. {t.footer}</p></div></footer>
  </>
}

export default App
