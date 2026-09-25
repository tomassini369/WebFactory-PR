import { Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react'
import { AdaptiveLogo } from './theme'

const TemplatePreview = lazy(() => import('./TemplatePreview'))
const TemplatesPage = lazy(() => import('./TemplatesPage'))
const WebFactoryBuilder = lazy(() => import('./WebFactoryBuilder'))
const ClientAdminPage = lazy(() => import('./ClientAdminPage'))
const ClientStorefront = lazy(() => import('./ClientStorefront'))
const WebFactoryAdminPage = lazy(() => import('./WebFactoryAdminPage'))
const PasswordRecoveryPage = lazy(() => import('./PasswordRecoveryPage'))
const LegalPage = lazy(() => import('./LegalPage'))
const PaymentLinkPage = lazy(() => import('./PaymentLinkPage'))

function RouteLoading(){
  return <main className="route-loading" role="status" aria-live="polite"><span/><b>Loading WebFactory…</b></main>
}

function RouteView({children}:{children:ReactNode}){
  return <Suspense fallback={<RouteLoading/>}>{children}</Suspense>
}

type Language = 'es' | 'en'

const PRICE = '$30'

const content = {
  es: {
    nav: ['Templates','Qué incluye','Builder','Cómo funciona','FAQ'],
    hero: {
      eyebrow:'WEBSITE + COMMERCE + BOOKINGS',
      title:['Tu negocio.','Tu plataforma.','Todo en un solo lugar.'],
      highlight:'Build. Sell. Book. Manage. Grow.',
      text:'Crea, publica y administra tu negocio online desde una sola plataforma. WebFactory combina website builder, comercio, pagos, reservaciones, equipo y herramientas de administración. Prueba por 7 días sin tarjeta.',
      primary:'Crear mi website',
      secondary:'Ver Templates',
      once:'al mes'
    },
    value:['UNA SOLA SOLUCIÓN','Tu website y portal administrativo, siempre editables.','Sin programar y sin comisión sobre tus ventas. Actualiza catálogo, equipo, horarios, pagos y reservaciones desde tu portal.'],
    demos:['TEMPLATES','Diseños organizados por tipo de negocio.','Explora categorías, abre un Template y úsalo como base editable para tu negocio.'],
    includes:['WHAT YOU GET','Todo lo que necesita un negocio para vender y organizarse online.','Una experiencia unificada para mostrar, vender, cobrar y reservar.'],
    commerce:['COMMERCE','Vende tus productos y servicios.','Catálogo unificado, detalle por item, carrito global y checkout preparado para pagos seguros.'],
    services:['SERVICES','Servicios simples o con reservación.','Un servicio puede venderse directamente o activar booking con empleado, duración, depósito y disponibilidad.'],
    booking:['BOOKING','Tus clientes reservan. Tu equipo se organiza.','La disponibilidad se calcula por Service + Employee + Time, no por una capacidad genérica del negocio.'],
    employees:['EMPLOYEES','Cada servicio se conecta con el empleado correcto.','Asigna servicios, horarios, descansos, vacaciones, límites diarios y reglas individuales sin duplicar el catálogo.'],
    calendar:['GOOGLE CALENDAR','El calendario real de tu equipo entra en la ecuación.','WebFactory podrá consultar conflictos, crear eventos, actualizar, cancelar y reprogramar por empleado o calendario.'],
    builder:['WEBFACTORY BUILDER + AI','Avanzado por dentro. Fácil por fuera.','Configura tu negocio paso a paso o pídele a Factory AI que proponga estructura, contenido bilingüe, catálogo y equipo dentro del mismo Builder.'],
    payments:['PAYMENTS','Recibe tu dinero directamente.','Stripe y ATH Móvil se conectan a las cuentas del negocio. WebFactory no recibe el dinero generado por las ventas del cliente.'],
    how:['HOW IT WORKS','De configuración a publicación en cinco pasos.'],
    trust:['TRUST','Construido para una experiencia clara, segura y profesional.'],
    faq:['FAQ','Preguntas frecuentes.'],
    final:['Build. Sell. Book. Manage. Get Paid.','Website profesional, commerce, pagos y reservaciones en una sola solución.'],
    footer:'Todos los derechos reservados.'
  },
  en: {
    nav: ['Templates','What’s included','Builder','How it works','FAQ'],
    hero: {
      eyebrow:'WEBSITE + COMMERCE + BOOKINGS',
      title:['Your business.','Your platform.','Everything in one place.'],
      highlight:'Build. Sell. Book. Manage. Grow.',
      text:'Create, publish and run your online business from one platform. WebFactory brings together a website builder, commerce, payments, bookings, employees and business tools. Try it free for 7 days with no card required.',
      primary:'Create my website',
      secondary:'View Templates',
      once:'per month'
    },
    value:['ONE COMPLETE SOLUTION','Your website and admin portal, always editable.','No coding and no commission on your sales. Update your catalog, team, hours, payments and bookings from your portal.'],
    demos:['TEMPLATES','Designs organized by business type.','Browse categories, open a Template and use it as an editable base for your business.'],
    includes:['WHAT YOU GET','Everything a business needs to sell and stay organized online.','One unified experience to present, sell, collect payments and manage bookings.'],
    commerce:['COMMERCE','Sell your products and services.','Unified catalog, item detail views, a global cart and checkout prepared for secure payments.'],
    services:['SERVICES','Services with or without appointments.','A service can be sold directly or activate booking with employee, duration, deposit and availability.'],
    booking:['BOOKING','Your customers book. Your team stays organized.','Availability is calculated by Service + Employee + Time, not by generic business-wide capacity.'],
    employees:['EMPLOYEES','Every service connects to the right employee.','Assign services, schedules, breaks, vacations, daily limits and individual rules without duplicating the catalog.'],
    calendar:['GOOGLE CALENDAR','Your team’s real calendar becomes part of availability.','WebFactory can check conflicts, create events, update, cancel and reschedule by employee or calendar.'],
    builder:['WEBFACTORY BUILDER + AI','Powerful underneath. Simple on the surface.','Configure your business step by step or ask Factory AI to propose structure, bilingual content, catalog and team inside the same Builder.'],
    payments:['PAYMENTS','Receive your money directly.','Stripe and ATH Móvil connect to the business accounts. WebFactory does not receive the money generated by client sales.'],
    how:['HOW IT WORKS','From setup to publishing in five steps.'],
    trust:['TRUST','Built for a clear, secure and professional experience.'],
    faq:['FAQ','Frequently asked questions.'],
    final:['Build. Sell. Book. Manage. Get Paid.','Professional website, commerce, payments and bookings in one solution.'],
    footer:'All rights reserved.'
  }
}

const features = {
  es: [
    ['Website Builder','Diseña, previsualiza y publica tu website desde un Builder visual.'],
    ['Comercio','Administra productos, servicios, catálogo, carrito y pedidos.'],
    ['Pagos','Conecta Stripe y ATH Móvil, comparte Payment Links y revisa transacciones.'],
    ['Reservaciones','Disponibilidad por empleado con horarios, descansos y depósitos.'],
    ['POS','Completa ventas presenciales con carrito, IVU y recibos.'],
    ['CRM','Organiza clientes y actividad de ventas y reservaciones.'],
    ['Inventario','Controla existencias, ajustes y productos con poco inventario.'],
    ['Analítica','Consulta ventas, reservaciones y rendimiento del negocio.'],
    ['Equipo','Asigna servicios, empleados, horarios y permisos.'],
    ['Integraciones','Administra Stripe, Google Calendar y otros servicios conectados.'],
    ['Factory AI','Prepara contenido y estructura bilingüe dentro del mismo Builder.'],
  ],
  en: [
    ['Website Builder','Design, preview and publish your website from a visual Builder.'],
    ['Commerce','Manage products, services, catalog, cart and orders.'],
    ['Payments','Connect Stripe and ATH Móvil, share Payment Links and track transactions.'],
    ['Bookings','Employee-aware scheduling with hours, breaks and deposits.'],
    ['POS','Complete in-person sales with cart, tax and receipts.'],
    ['CRM','Organize customers and sales and booking activity.'],
    ['Inventory','Track stock, adjustments and low inventory.'],
    ['Analytics','Review sales, bookings and business performance.'],
    ['Employees','Assign services, schedules and portal roles.'],
    ['Integrations','Manage Stripe, Google Calendar and connected services.'],
    ['Factory AI','Prepare bilingual copy and page structure inside the Builder.'],
  ],
}

const faqEs = [
  ['¿Cuánto cuesta WebFactory?','$30 al mes o $350 al año. Puedes probarlo por 7 días sin tarjeta y no cobramos comisión sobre tus ventas.'],
  ['¿WebFactory recibe el dinero de mis ventas?','No. Stripe y ATH Móvil se conectan a las cuentas del negocio.'],
  ['¿Puedo vender productos y también recibir citas?','Sí. El mismo website puede manejar productos, servicios, carrito y reservaciones.'],
  ['¿Mi página será igual a uno de los Templates?','Tú decides. Puedes comenzar con un diseño personalizado o escoger un Template como base. El Builder aplica tu marca, colores, textos, catálogo y configuraciones.'],
  ['¿Cómo se evita el double booking?','La arquitectura revalida base de datos, empleado, horarios, holds y Google Calendar antes de confirmar.'],
  ['¿Puedo modificarlo después de publicarlo?','Sí. Tu portal administrativo permite cambiar productos, servicios, precios, empleados, horarios, pagos y calendario sin solicitar otro deployment.'],
  ['¿Puedo usar mi propio logo?','Sí. Puedes subir tu logo e imágenes desde el Builder y administrar el contenido desde tu portal.'],
  ['¿Factory AI crea otra página o deployment aparte?','No. Factory AI trabaja únicamente dentro del Builder y genera configuración para tu website en /sites/:slug. Todo permanece dentro de la misma plataforma WebFactory.']
]

const faqEn = [
  ['How much does WebFactory cost?','$30 per month or $350 per year. Try it free for 7 days with no card, and we charge no commission on your sales.'],
  ['Does WebFactory receive money from my sales?','No. Stripe and ATH Móvil connect to the business accounts.'],
  ['Can I sell products and also accept appointments?','Yes. The same website can handle products, services, cart and bookings.'],
  ['Will my website look exactly like one of the Templates?','You decide. Start with a custom design or choose a Template as your base. The Builder applies your brand, colors, copy, catalog and settings.'],
  ['How is double booking prevented?','The architecture rechecks the database, employee, schedules, holds and Google Calendar before confirmation.'],
  ['Can I edit it after publishing?','Yes. Your admin portal lets you change products, services, prices, employees, hours, payments and calendar without requesting another deployment.'],
  ['Can I use my own logo?','Yes. Upload your logo and images in the Builder and manage your content from the portal.'],
  ['Does Factory AI create a separate website or deployment?','No. Factory AI works only inside the Builder and generates configuration for your website at /sites/:slug. Everything stays inside the same WebFactory platform.']
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

function HeroMedia(){
  const videoRef = useRef<HTMLVideoElement>(null)
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setReducedMotion(preference.matches)
    preference.addEventListener('change', updatePreference)
    return () => preference.removeEventListener('change', updatePreference)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (reducedMotion) {
      video.pause()
      video.currentTime = 0
      return
    }
    void video.play().catch(() => {})
  }, [reducedMotion])

  return <div className="wf-home-hero-media" aria-hidden="true">
    <video
      ref={videoRef}
      className="wf-home-hero-video"
      src="/webfactory-hero-tech-hud.mp4"
      poster="/webfactory-hero-tech-hud-poster.webp"
      autoPlay={!reducedMotion}
      muted
      loop
      playsInline
      preload={reducedMotion ? 'none' : 'metadata'}
      disablePictureInPicture
    />
  </div>
}

function App(){
  const [lang,setLang]=useState<Language>('en')
  const [menu,setMenu]=useState(false)
  const t=content[lang]
  const faqs=lang==='es'?faqEs:faqEn
  useEffect(()=>{
    if (!/^\/templates\//.test(window.location.pathname)) document.documentElement.lang=lang
  },[lang])

  const anchors=['/templates','#incluye','/builder','#como-funciona','#faq']
  const templateMatch = window.location.pathname.match(/^\/templates\/([^/]+)\/?$/)
    const templatesRoute = /^\/templates\/?$/.test(window.location.pathname)
    const clientAdminRoute = /^\/client-admin\/?$/.test(window.location.pathname)
  const webFactoryAdminRoute = /^\/webfactory-admin\/?$/.test(window.location.pathname)
  const identityInviteRoute = /^#invite_token=/.test(window.location.hash)
  const identityRecoveryRoute = /^#recovery_token=/.test(window.location.hash)
  const clientSiteMatch = window.location.pathname.match(/^\/sites\/([^/]+)\/?$/)
  const paymentLinkMatch = window.location.pathname.match(/^\/pay\/([^/]+)\/([^/]+)\/?$/)
  const builderRoute = /^\/builder\/?$/.test(window.location.pathname)
  const privacyRoute = /^\/privacy\/?$/.test(window.location.pathname)
  const termsRoute = /^\/terms\/?$/.test(window.location.pathname)
  const refundRoute = /^\/refund-policy\/?$/.test(window.location.pathname)

  if (identityRecoveryRoute) return <RouteView><PasswordRecoveryPage /></RouteView>
  if (privacyRoute) return <RouteView><LegalPage kind="privacy" /></RouteView>
  if (termsRoute) return <RouteView><LegalPage kind="terms" /></RouteView>
  if (refundRoute) return <RouteView><LegalPage kind="refund" /></RouteView>
  if (webFactoryAdminRoute || identityInviteRoute) return <RouteView><WebFactoryAdminPage /></RouteView>
  if (clientAdminRoute) return <RouteView><ClientAdminPage /></RouteView>
  if (clientSiteMatch) return <RouteView><ClientStorefront slug={decodeURIComponent(clientSiteMatch[1])} /></RouteView>
  if (paymentLinkMatch) return <RouteView><PaymentLinkPage slug={decodeURIComponent(paymentLinkMatch[1])} token={decodeURIComponent(paymentLinkMatch[2])} /></RouteView>
  if (templateMatch) return <RouteView><TemplatePreview slug={templateMatch[1]} /></RouteView>
  if (templatesRoute) return <><header className="header"><a href="/" className="logo"><AdaptiveLogo alt="WebFactory PR"/></a><div className="header-actions"><a className="btn secondary desktop-cta" href="/client-admin">Log In</a><a className="btn secondary desktop-cta" href="/">{lang==='es'?'Volver al inicio':'Back to home'}</a><div className="langs"><button className={lang==='en'?'active':''} onClick={()=>setLang('en')}>EN</button><button className={lang==='es'?'active':''} onClick={()=>setLang('es')}>ES</button></div></div></header><RouteView><TemplatesPage lang={lang}/></RouteView></>
  if (builderRoute) return <><header className="header"><a href="/" className="logo"><AdaptiveLogo alt="WebFactory PR"/></a><div className="header-actions"><a className="btn secondary desktop-cta" href="/client-admin">Log In</a><a className="btn secondary desktop-cta" href="/">{lang==='es'?'Volver al inicio':'Back to home'}</a><div className="langs"><button className={lang==='en'?'active':''} onClick={()=>setLang('en')}>EN</button><button className={lang==='es'?'active':''} onClick={()=>setLang('es')}>ES</button></div></div></header><main className="standalone-builder"><section className="section white builder"><div className="shell"><div className="builder-head"><Heading data={t.builder}/><div className="builder-price"><strong>7 días</strong><span>{lang==='es'?'gratis · sin tarjeta':'free · no card'}</span></div></div><RouteView><WebFactoryBuilder lang={lang}/></RouteView></div></section></main></>

  return <>
    <header className="header wf-home-header">
      <a href="#top" className="logo"><AdaptiveLogo alt="WebFactory PR"/></a>
      <nav className={menu?'open':''}>{t.nav.map((n,i)=><a key={n} href={anchors[i]} onClick={()=>setMenu(false)}>{n}</a>)}<a className="mobile-portal-link" href="/client-admin" onClick={()=>setMenu(false)}>Log In</a></nav>
      <div className="header-actions">
        <a href="/client-admin" className="btn secondary desktop-cta">Log In</a>
        <div className="langs"><button className={lang==='en'?'active':''} onClick={()=>setLang('en')}>EN</button><button className={lang==='es'?'active':''} onClick={()=>setLang('es')}>ES</button></div>
        <a href="/builder" className="btn primary desktop-cta">{t.hero.primary}</a>
        <button className="hamburger" aria-expanded={menu} onClick={()=>setMenu(v=>!v)}><i/><i/><i/></button>
      </div>
    </header>

    <main id="top" className="wf-home">
      <section className="hero shell">
        <HeroMedia/>
        <div>
          <p className="eyebrow">{t.hero.eyebrow}</p>
          <h1>{t.hero.title.map(x=><span key={x}>{x}</span>)}</h1>
          <h3>{t.hero.highlight}</h3>
          <p className="lead">{t.hero.text}</p>
          <div className="price"><strong>{PRICE}<small>{lang==='es'?'/mes':'/month'}</small></strong><span>{lang==='es'?'Prueba gratis por 7 días · No requiere tarjeta':'7-day free trial · No card required'}<br/>{lang==='es'?'o $350 al año':'or $350/year'}</span></div>
          <div className="actions"><a className="btn primary" href="/builder">{t.hero.primary} <b>↗</b></a><a className="btn secondary" href="/templates">{t.hero.secondary}</a></div>
          <div className="badges">{(lang==='es'?['Responsive','Carrito','Stripe','ATH Móvil','Reservaciones','Google Calendar']:['Responsive','Cart','Stripe','ATH Móvil','Bookings','Google Calendar']).map(x=><span key={x}>{x}</span>)}</div>
        </div>
        <Devices/>
      </section>

      <section className="value" id="incluye"><div className="shell value-grid"><Heading data={t.value}/><aside><small>WEBFACTORY COMMERCE PLATFORM</small><strong>{PRICE}</strong><span>{t.hero.once} · {lang==='es'?'o $350 al año':'or $350 yearly'}</span></aside></div></section>

      <section className="section white" id="templates"><div className="shell"><Heading data={t.demos}/><div className="demo-design-options"><article><b>01</b><div><strong>{lang==='es'?'Custom':'Custom'}</strong><span>{lang==='es'?'Crea una estructura personalizada con layouts y orden de secciones editables.':'Create a custom structure with editable layouts and section order.'}</span></div></article><article><b>02</b><div><strong>Templates</strong><span>{lang==='es'?'Escoge por categoría una estructura prefabricada y personalízala con tus fotos, marca y contenido.':'Choose a ready-made structure by category and customize it with your photos, brand and content.'}</span></div></article></div><div className="demo-base-assurance"><strong>{lang==='es'?'Los Templates viven en su propia biblioteca.':'Templates now live in their own library.'}</strong><span>{lang==='es'?'La página principal permanece limpia y puedes explorar todos los diseños por categoría cuando quieras.':'The homepage stays clean and you can browse every design by category whenever you want.'}</span></div><div className="actions"><a className="btn primary" href="/templates">{lang==='es'?'Explorar Templates por categoría':'Browse Templates by category'} →</a><a className="btn secondary" href="/builder">{lang==='es'?'Comenzar con Custom':'Start with Custom'}</a></div></div></section>
      <section className="section soft"><div className="shell"><Heading data={t.includes}/><div className="feature-grid">{features[lang].map(([a,b],i)=><article key={a}><em>0{i+1}</em><h3>{a}</h3><p>{b}</p></article>)}</div></div></section>

      <section className="section navy wf-home-ai"><div className="shell split">
        <div className="wf-home-ai-copy">
          <p className="eyebrow">FACTORY AI · BY WEBFACTORY</p>
          <h2>{lang==='es'?'Describe tu negocio. Deja que la IA prepare la base.':'Describe your business. Let AI prepare the foundation.'}</h2>
          <p>{lang==='es'?'Dentro del mismo Builder, Factory AI puede recomendar un Template o Custom, proponer layout, colores, contenido en English + Español, servicios, productos y roles del equipo. Tú revisas la propuesta antes de aplicarla.':'Inside the same Builder, Factory AI can recommend a Template or Custom, propose layout, colors, English + Spanish content, services, products and team roles. You review the proposal before applying it.'}</p>
          <div className="actions"><a className="btn light" href="/builder">{lang==='es'?'Probar Factory AI':'Try Factory AI'} →</a></div>
          <small>{lang==='es'?'Sin proyectos separados · Sin deployments por cliente · Todo permanece dentro de WebFactory.':'No separate projects · No per-customer deployments · Everything stays inside WebFactory.'}</small>
        </div>
        <div className="wf-home-ai-card">
          <header><span>✦</span><div><small>FACTORY AI</small><strong>{lang==='es'?'Build with Factory AI':'Build with Factory AI'}</strong></div></header>
          <div className="wf-home-ai-prompt">{lang==='es'?'Tengo un salón de belleza. Quiero un diseño moderno con color, keratina, uñas y booking por especialista.':'I own a beauty salon. I want a modern design with color, keratin, nails and specialist booking.'}</div>
          <div className="wf-home-ai-result"><span>Template · Bella Vita Salon</span><span>6 {lang==='es'?'servicios':'services'}</span><span>3 {lang==='es'?'miembros':'team members'}</span></div>
          <button>{lang==='es'?'Aplicar al Builder':'Apply to Builder'} →</button>
        </div>
      </div></section>

      <section className="section white"><div className="shell split"><Heading data={t.commerce}/><div className="commerce"><div className="catalog"><small>CATALOG</small><article><i/><span><b>Premium Shampoo</b><small>$29.99</small></span><button>+</button></article><article><i/><span><b>Hair Treatment</b><small>$45.00</small></span><button>+</button></article></div><b className="arrow">→</b><div className="cart"><small>CART</small><strong>2 items</strong><span>Subtotal</span><h3>$74.99</h3><button>Checkout</button></div></div></div></section>

      <section className="section soft"><div className="shell split reverse"><div className="service-stack"><article><small>SERVICE</small><h3>Premium Haircut</h3><p>$35 · 45 min</p><div><span>Carlos</span><span>José</span></div><button>{lang==='es'?'Reservar cita':'Book appointment'}</button></article><article><small>SERVICE</small><h3>Basic Wash</h3><p>$40</p><button>{lang==='es'?'Comprar servicio':'Buy service'}</button></article></div><Heading data={t.services}/></div></section>

      <section className="section navy"><div className="shell split"><Heading data={t.booking} invert/><div className="booking-flow">{['Service','Employee','Date','Time','Payment','Confirmed'].map((x,i)=><div key={x}><small>0{i+1}</small><strong>{x}</strong>{i<5&&<span>↓</span>}</div>)}</div></div></section>

      <section className="section white"><div className="shell split reverse"><div className="employees"><article><b>C</b><span><small>CARLOS</small><strong>Barber</strong><em>Mon · Tue · Thu · Fri</em></span><i>8/day</i></article><article><b>M</b><span><small>MARÍA</small><strong>Color Specialist</strong><em>Tue · Wed · Fri · Sat</em></span><i>5/day</i></article><div>Premium Haircut <span>→</span> <b>Carlos</b><b>José</b></div></div><Heading data={t.employees}/></div></section>

      <section className="section soft"><div className="shell split"><Heading data={t.calendar}/><div className="calendar"><header><strong>September</strong><span>Team calendar</span></header><div className="week">{['M','T','W','T','F','S','S'].map((x,i)=><b key={i}>{x}</b>)}</div><div className="days">{Array.from({length:28},(_,i)=><i className={[3,8,12,17,18,23].includes(i)?'busy':''} key={i}>{i+1}</i>)}</div><footer><span>● Carlos · 10:00 Haircut</span><span>● María · 1:30 Color</span></footer></div></div></section>

      <section className="section soft"><div className="shell split reverse"><div className="payments"><article className="stripe"><b>stripe</b><strong>$74.99</strong><small>Secure checkout</small></article><article className="ath"><b>ATH Móvil</b><strong>$35.00</strong><small>Business payment</small></article><span>✓ {lang==='es'?'Fondos directos al negocio':'Funds go directly to the business'}</span></div><Heading data={t.payments}/></div></section>

      <section className="section white" id="como-funciona"><div className="shell"><Heading data={t.how}/><div className="steps">{(lang==='es'?[['Describe o personaliza','Configura manualmente o usa Factory AI para proponer Template/Custom, contenido bilingüe y estructura.'],['Revisa','Mira el preview y decide si aplicar o descartar la propuesta de IA antes de guardar cambios.'],['Verifica','Recibe el acceso privado por email y establece tu contraseña.'],['Prueba','Activa 7 días gratis sin tarjeta y publica tu website dentro de WebFactory.'],['Conecta y continúa','Vincula Stripe Connect y Google Calendar cuando los necesites y luego escoge $30 mensual o $350 anual.']]:[['Describe or customize','Configure manually or use Factory AI to propose Template/Custom, bilingual content and structure.'],['Review','Preview the result and choose whether to apply or discard the AI proposal before saving changes.'],['Verify','Receive private access by email and set your password.'],['Try it','Activate 7 days free with no card and publish your website inside WebFactory.'],['Connect and continue','Link Stripe Connect and Google Calendar when needed, then choose $30 monthly or $350 yearly.']]).map(([a,b],i)=><article key={a}><em>0{i+1}</em><h3>{a}</h3><p>{b}</p></article>)}</div></div></section>

      <section className="section soft"><div className="shell"><Heading data={t.trust}/><div className="trust">{['Responsive','Secure Payments','Employee Booking','Google Calendar','Direct Payments','Factory AI'].map((x,i)=><div key={x}><span>{['↔','✓','◉','▦','$','✦'][i]}</span><b>{x}</b></div>)}</div></div></section>

      <section className="section white" id="faq"><div className="shell faq"><Heading data={t.faq}/><div>{faqs.map(([q,a])=><details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></div></section>

      <section className="final"><div className="shell"><div><p className="eyebrow">WEBFACTORY PR</p><h2>{t.final[0]}</h2><p>{t.final[1]}</p></div><aside><strong>7 días</strong><span>{lang==='es'?'gratis · luego $30/mes o $350/año':'free · then $30/month or $350/year'}</span><a href="/builder" className="btn light">{t.hero.primary} ↗</a></aside></div></section>
    </main>

    <footer className="footer"><div className="shell"><div><AdaptiveLogo alt="WebFactory PR" variant="dark"/><p>Build. Sell. Book. Manage. Get Paid.</p></div><nav>{(lang==='es'?['Producto','Templates','Funciones','Builder','FAQ','Contacto','Privacidad','Términos','Política de Reembolsos']:['Product','Templates','Features','Builder','FAQ','Contact','Privacy','Terms','Refund Policy']).map((x,i)=>{const href=i===1?'/templates':i===2?'#incluye':i===3?'/builder':i===4?'#faq':i===5?'mailto:info@webfactorypr.com':i===6?'/privacy':i===7?'/terms':i===8?'/refund-policy':'#top';const legal=i>=6;return <a key={x} href={href} target={legal?'_blank':undefined} rel={legal?'noreferrer':undefined}>{x}</a>})}</nav><p className="copyright">info@webfactorypr.com · © 2026 WebFactory PR. {t.footer}</p></div></footer>
  </>
}

export default App
