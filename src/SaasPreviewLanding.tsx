import {useEffect, useState, type PointerEvent, type ReactNode} from 'react'
import {AnimatePresence, motion, useReducedMotion} from 'framer-motion'
import {
  ArrowRight, BadgeCheck, BarChart3, CalendarDays, Check, CreditCard, Globe2, LayoutDashboard,
  MapPin, Menu, QrCode, ShieldCheck, Store, UsersRound, X,
} from 'lucide-react'
import {membershipIds, membershipPlans, membershipTrialDays, type MembershipId} from '../shared/membership-plans.mjs'
import {businessName, marketplaceRequest, type DirectoryBusiness} from './marketplace-api'
import {AdaptiveLogo, ThemeToggle} from './theme'
import './saas-preview-landing.css'

type Language = 'es' | 'en'
type Interval = 'monthly' | 'annual'
type DashTab = 'overview' | 'bookings' | 'payments'

// Real portal routes. Login opens the business portal; the trial starts in the Builder.
const LOGIN_HREF = '/client-admin'
const TRIAL_HREF = '/builder'

const copy = {
  es: {
    banner: 'Vista Previa Conceptual • WebFactory PR',
    langLabel: 'Idioma',
    nav: [['#funciones', 'Funciones'], ['#precios', 'Precios'], ['#marketplace', 'Marketplace']],
    login: 'Iniciar sesión',
    trial: `Probar ${membershipTrialDays} días gratis`,
    menu: 'Abrir menú', close: 'Cerrar menú',
    eyebrow: 'Hecho para negocios en Puerto Rico',
    title: ['Tu negocio en línea', 'en minutos.'],
    subtitle: 'Crea tu sitio web, vende en línea y recibe reservas desde un solo lugar. Cobra con ATH Móvil y Stripe con 0% de comisión de WebFactory por venta.',
    secondary: 'Ver plantillas',
    note: `${membershipTrialDays} días gratis · Sin tarjeta · Cancela cuando quieras`,
    chips: ['ATH Móvil', 'Stripe', 'Google Calendar', 'ES / EN'],
    demo: 'Demostración · datos de ejemplo',
    tabs: {overview: 'Resumen', bookings: 'Reservas', payments: 'Pagos'},
    dash: {
      today: 'Hoy', sales: 'Ventas', bookings: 'Citas', clients: 'Clientes nuevos',
      week: 'Actividad de la semana', days: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
      upcoming: 'Próximas citas', method: 'Método', status: 'Estado', paid: 'Pagado', pending: 'Pendiente',
      fee: 'Comisión WebFactory', zero: '$0.00',
    },
    phone: {store: 'Barbería Ejemplo', open: 'Abierto · Arecibo', book: 'Reservar', booked: 'Reservado ✓', pay: 'Pagar con', card: 'Tarjeta'},
    featuresEyebrow: 'Todo en uno',
    featuresTitle: 'Todo lo que tu negocio necesita, sin pagar comisión por venta.',
    features: {
      pay: ['ATH Móvil + Stripe', 'Cobra con ATH Móvil, tarjeta y enlaces de pago conectados a las cuentas de tu negocio. WebFactory no cobra comisión sobre tus ventas.'],
      book: ['Reservas y agenda', 'Tus clientes reservan solos. Cada empleado tiene su agenda, sus servicios y su horario.'],
      web: ['Web bilingüe', 'Tu página en español e inglés, lista desde una plantilla y editable cuando quieras.'],
      market: ['Marketplace PR', 'Aparece en el directorio de negocios locales de WebFactory PR.'],
      calendar: ['Google Calendar', 'Sincroniza las citas con el calendario de cada empleado.'],
      admin: ['Panel administrativo', 'Catálogo, empleados, inventario y recibos en un solo portal.'],
    },
    pricingEyebrow: 'Precios',
    pricingTitle: 'Planes simples. Sin comisiones por venta.',
    monthly: 'Mensual', annual: 'Anual', save: '2 meses gratis',
    perMonth: '/mes', perYear: '/año', equivalent: (n: number) => `Equivale a $${n}/mes`,
    recommended: 'Recomendado', choose: 'Empezar prueba gratis',
    providerFees: 'Pueden aplicar las tarifas de Stripe y ATH Móvil. WebFactory no cobra comisión por venta.',
    marketEyebrow: 'Marketplace PR',
    marketTitle: 'Negocios locales que ya están en WebFactory.',
    marketText: 'Cada negocio publicado aparece en el Marketplace para que más clientes lo encuentren.',
    marketCta: 'Explorar Marketplace',
    marketEmpty: 'El Marketplace está abriendo. Los primeros negocios publicados aparecerán aquí.',
    marketError: 'No pudimos cargar el Marketplace ahora mismo.',
    retry: 'Reintentar',
    finalTitle: 'Lleva tu negocio en línea hoy.',
    finalText: `Empieza con ${membershipTrialDays} días gratis. No necesitas tarjeta.`,
    footer: ['Privacidad', 'Términos', 'Reembolsos'],
  },
  en: {
    banner: 'Concept Preview • WebFactory PR',
    langLabel: 'Language',
    nav: [['#funciones', 'Features'], ['#precios', 'Pricing'], ['#marketplace', 'Marketplace']],
    login: 'Log in',
    trial: `Try ${membershipTrialDays} days free`,
    menu: 'Open menu', close: 'Close menu',
    eyebrow: 'Built for businesses in Puerto Rico',
    title: ['Your business online', 'in minutes.'],
    subtitle: 'Build your website, sell online and take bookings from one place. Get paid with ATH Móvil and Stripe with 0% WebFactory commission per sale.',
    secondary: 'See templates',
    note: `${membershipTrialDays} days free · No card · Cancel anytime`,
    chips: ['ATH Móvil', 'Stripe', 'Google Calendar', 'ES / EN'],
    demo: 'Demo · sample data',
    tabs: {overview: 'Overview', bookings: 'Bookings', payments: 'Payments'},
    dash: {
      today: 'Today', sales: 'Sales', bookings: 'Appointments', clients: 'New clients',
      week: 'This week', days: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
      upcoming: 'Upcoming appointments', method: 'Method', status: 'Status', paid: 'Paid', pending: 'Pending',
      fee: 'WebFactory commission', zero: '$0.00',
    },
    phone: {store: 'Sample Barbershop', open: 'Open · Arecibo', book: 'Book', booked: 'Booked ✓', pay: 'Pay with', card: 'Card'},
    featuresEyebrow: 'All in one',
    featuresTitle: 'Everything your business needs, with no per-sale commission.',
    features: {
      pay: ['ATH Móvil + Stripe', 'Accept ATH Móvil, cards and payment links connected to your business accounts. WebFactory takes no commission on your sales.'],
      book: ['Bookings & schedules', 'Customers book on their own. Each employee has their own calendar, services and hours.'],
      web: ['Bilingual website', 'Your site in Spanish and English, ready from a template and editable anytime.'],
      market: ['Marketplace PR', 'Get listed in the WebFactory PR local business directory.'],
      calendar: ['Google Calendar', "Sync appointments with each employee's calendar."],
      admin: ['Admin portal', 'Catalog, employees, inventory and receipts in one portal.'],
    },
    pricingEyebrow: 'Pricing',
    pricingTitle: 'Simple plans. No per-sale commission.',
    monthly: 'Monthly', annual: 'Annual', save: '2 months free',
    perMonth: '/mo', perYear: '/yr', equivalent: (n: number) => `Works out to $${n}/mo`,
    recommended: 'Recommended', choose: 'Start free trial',
    providerFees: 'Stripe and ATH Móvil fees may apply. WebFactory charges no commission per sale.',
    marketEyebrow: 'Marketplace PR',
    marketTitle: 'Local businesses already on WebFactory.',
    marketText: 'Every published business appears in the Marketplace so more customers can find it.',
    marketCta: 'Explore Marketplace',
    marketEmpty: 'The Marketplace is opening. The first published businesses will appear here.',
    marketError: "We couldn't load the Marketplace right now.",
    retry: 'Try again',
    finalTitle: 'Take your business online today.',
    finalText: `Start with ${membershipTrialDays} days free. No card required.`,
    footer: ['Privacy', 'Terms', 'Refunds'],
  },
} as const

// Same plan contents as the existing membership cards (src/MembershipPlans.tsx).
const planFeatures: Record<Language, Record<MembershipId, readonly string[]>> = {
  es: {
    basic: ['Recibe reservas y mantén tu agenda al día.', 'Página web bilingüe', 'Reservas para un profesional', 'Sincronización con Google Calendar', 'Confirmaciones y recordatorios por correo'],
    standard: ['Organiza tu equipo y cobra en línea.', 'Todo lo de Básico', 'Reservas para varios profesionales', 'Depósitos y pagos con Stripe', 'Lista de espera, inventario y reportes'],
    premium: ['Atiende, cobra y prepara pedidos en tu local.', 'Todo lo de Standard', 'POS de cajero y kiosco de autoservicio', 'Pantalla del cliente, Cocina y seguimiento'],
  },
  en: {
    basic: ['Take bookings and keep your calendar in sync.', 'Bilingual website', 'Bookings for one professional', 'Google Calendar sync', 'Email confirmations and reminders'],
    standard: ['Organize your team and get paid online.', 'Everything in Basic', 'Bookings for multiple professionals', 'Deposits and payments with Stripe', 'Waitlist, inventory and reporting'],
    premium: ['Take orders, collect payment and prepare orders on site.', 'Everything in Standard', 'Cashier POS and self-service kiosk', 'Customer display, kitchen and order tracking'],
  },
}

function Reveal({children, delay = 0, className}: {children: ReactNode; delay?: number; className?: string}) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduced ? false : {opacity: 0, y: 28}}
      whileInView={{opacity: 1, y: 0}}
      viewport={{once: true, margin: '0px 0px -60px 0px'}}
      transition={{duration: 0.6, delay, ease: [0.22, 1, 0.36, 1]}}
    >
      {children}
    </motion.div>
  )
}

// Hover glow follows the pointer through CSS variables; no continuous animation.
function trackGlow(event: PointerEvent<HTMLElement>) {
  const box = event.currentTarget.getBoundingClientRect()
  event.currentTarget.style.setProperty('--sx-mx', `${event.clientX - box.left}px`)
  event.currentTarget.style.setProperty('--sx-my', `${event.clientY - box.top}px`)
}

function DashboardMockup({lang}: {lang: Language}) {
  const t = copy[lang]
  const reduced = useReducedMotion()
  const [tab, setTab] = useState<DashTab>('overview')
  const bars = [42, 58, 51, 74, 66, 92, 80]
  const appointments = [['9:00', 'Corte clásico', 'Ana'], ['10:30', 'Corte + barba', 'Luis'], ['1:00', 'Barba', 'Ana']]
  const payments = [['ATH Móvil', '$25.00', true], [lang === 'es' ? 'Tarjeta · Stripe' : 'Card · Stripe', '$40.00', true], [lang === 'es' ? 'Enlace de pago' : 'Payment link', '$18.00', false]] as const
  return (
    <div className="sx-dash" aria-label={t.demo}>
      <div className="sx-dash-bar">
        <span className="sx-dots" aria-hidden="true"><i/><i/><i/></span>
        <span className="sx-dash-url">webfactorypr.com/client-admin</span>
        <span className="sx-demo-chip">{t.demo}</span>
      </div>
      <div className="sx-dash-body">
        <nav className="sx-dash-side" aria-hidden="true">
          <LayoutDashboard size={16}/><CalendarDays size={16}/><CreditCard size={16}/><UsersRound size={16}/><BarChart3 size={16}/>
        </nav>
        <div className="sx-dash-main">
          <div className="sx-tabs" role="tablist" aria-label={t.demo}>
            {(Object.keys(t.tabs) as DashTab[]).map(key => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'is-active' : ''} onClick={() => setTab(key)}>
                {tab === key && <motion.span layoutId="sx-tab-pill" className="sx-tab-pill" transition={reduced ? {duration: 0} : {type: 'spring', stiffness: 420, damping: 34}}/>}
                <span>{t.tabs[key]}</span>
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              role="tabpanel"
              className="sx-panel"
              initial={reduced ? false : {opacity: 0, y: 8}}
              animate={{opacity: 1, y: 0}}
              exit={reduced ? {opacity: 0} : {opacity: 0, y: -8}}
              transition={{duration: 0.22}}
            >
              {tab === 'overview' && <>
                <div className="sx-kpis">
                  <div><small>{t.dash.sales} · {t.dash.today}</small><strong>$83</strong></div>
                  <div><small>{t.dash.bookings}</small><strong>3</strong></div>
                  <div><small>{t.dash.clients}</small><strong>2</strong></div>
                </div>
                <div className="sx-chart">
                  <small>{t.dash.week}</small>
                  <div className="sx-bars">
                    {bars.map((height, index) => (
                      <div key={index} className="sx-bar-col">
                        <motion.span style={{height: `${height}%`}} initial={reduced ? false : {scaleY: 0}} animate={{scaleY: 1}} transition={{duration: 0.5, delay: index * 0.05}}/>
                        <em>{t.dash.days[index]}</em>
                      </div>
                    ))}
                  </div>
                </div>
              </>}
              {tab === 'bookings' && <ul className="sx-list">
                <li className="sx-list-head"><span>{t.dash.upcoming}</span></li>
                {appointments.map(([time, service, person]) => (
                  <li key={time}><span className="sx-time">{time}</span><span>{service}</span><span className="sx-avatar">{person}</span></li>
                ))}
              </ul>}
              {tab === 'payments' && <ul className="sx-list">
                {payments.map(([method, amount, paid]) => (
                  <li key={method}><span>{method}</span><strong>{amount}</strong><span className={paid ? 'sx-status ok' : 'sx-status'}>{paid ? t.dash.paid : t.dash.pending}</span></li>
                ))}
                <li className="sx-fee"><span>{t.dash.fee}</span><strong>{t.dash.zero}</strong></li>
              </ul>}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function PhoneMockup({lang}: {lang: Language}) {
  const t = copy[lang].phone
  const [booked, setBooked] = useState(false)
  const [method, setMethod] = useState<'ath' | 'card'>('ath')
  const services = lang === 'es' ? [['Corte clásico', '$20'], ['Corte + barba', '$30']] : [['Classic cut', '$20'], ['Cut + beard', '$30']]
  return (
    <div className="sx-phone" aria-label={copy[lang].demo}>
      <div className="sx-notch" aria-hidden="true"/>
      <div className="sx-phone-hero"><Store size={18}/><div><strong>{t.store}</strong><small>{t.open}</small></div></div>
      <ul className="sx-phone-list">
        {services.map(([name, price]) => <li key={name}><span>{name}</span><strong>{price}</strong></li>)}
      </ul>
      <p className="sx-phone-label">{t.pay}</p>
      <div className="sx-pay-switch">
        <button type="button" aria-pressed={method === 'ath'} className={method === 'ath' ? 'is-active' : ''} onClick={() => setMethod('ath')}>ATH Móvil</button>
        <button type="button" aria-pressed={method === 'card'} className={method === 'card' ? 'is-active' : ''} onClick={() => setMethod('card')}>{t.card}</button>
      </div>
      <button type="button" className={'sx-phone-cta' + (booked ? ' is-done' : '')} onClick={() => setBooked(value => !value)}>{booked ? t.booked : t.book}</button>
    </div>
  )
}

function FeatureCard({icon, title, text, className = '', children}: {icon: ReactNode; title: string; text: string; className?: string; children?: ReactNode}) {
  return (
    <article className={'sx-card ' + className} onPointerMove={trackGlow}>
      <span className="sx-card-icon" aria-hidden="true">{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </article>
  )
}

function Pricing({lang}: {lang: Language}) {
  const t = copy[lang]
  const reduced = useReducedMotion()
  const [interval, setInterval] = useState<Interval>('monthly')
  return (
    <section className="sx-section" id="precios" aria-labelledby="sx-pricing-title">
      <Reveal className="sx-heading">
        <p className="sx-eyebrow">{t.pricingEyebrow}</p>
        <h2 id="sx-pricing-title">{t.pricingTitle}</h2>
      </Reveal>
      <Reveal className="sx-toggle-wrap" delay={0.05}>
        <div className="sx-toggle" role="group" aria-label={t.pricingEyebrow}>
          {(['monthly', 'annual'] as const).map(value => (
            <button key={value} type="button" aria-pressed={interval === value} className={interval === value ? 'is-active' : ''} onClick={() => setInterval(value)}>
              {interval === value && <motion.span layoutId="sx-interval-pill" className="sx-toggle-pill" transition={reduced ? {duration: 0} : {type: 'spring', stiffness: 420, damping: 34}}/>}
              <span>{value === 'monthly' ? t.monthly : t.annual}</span>
              {value === 'annual' && <em>{t.save}</em>}
            </button>
          ))}
        </div>
      </Reveal>
      <div className="sx-plans">
        {membershipIds.map((id, index) => {
          const plan = membershipPlans[id]
          const featured = id === 'standard'
          const [summary, ...features] = planFeatures[lang][id]
          const price = interval === 'monthly' ? plan.monthly : plan.annual
          return (
            <Reveal key={id} delay={0.08 * index} className={'sx-plan-wrap' + (featured ? ' is-featured' : '')}>
              <article className={'sx-plan' + (featured ? ' is-featured' : '')} onPointerMove={trackGlow}>
                {featured && <span className="sx-plan-badge"><BadgeCheck size={14}/>{t.recommended}</span>}
                <h3>{lang === 'es' ? plan.name : plan.nameEn}</h3>
                <p className="sx-plan-summary">{summary}</p>
                <div className="sx-price" aria-live="polite">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.strong key={interval + price} initial={reduced ? false : {opacity: 0, y: 12}} animate={{opacity: 1, y: 0}} exit={reduced ? {opacity: 0} : {opacity: 0, y: -12}} transition={{duration: 0.25}}>${price}</motion.strong>
                  </AnimatePresence>
                  <span>{interval === 'monthly' ? t.perMonth : t.perYear}</span>
                </div>
                <p className="sx-price-note">{interval === 'annual' ? t.equivalent(Math.round(plan.annual / 12)) : ' '}</p>
                <a className={'sx-btn ' + (featured ? 'sx-btn-primary' : 'sx-btn-ghost')} href={TRIAL_HREF}>{t.choose}<ArrowRight size={16}/></a>
                <ul>
                  {features.map(feature => <li key={feature}><Check size={16} aria-hidden="true"/>{feature}</li>)}
                </ul>
              </article>
            </Reveal>
          )
        })}
      </div>
      <p className="sx-fineprint">{t.providerFees}</p>
    </section>
  )
}

function MarketplaceShowcase({lang}: {lang: Language}) {
  const t = copy[lang]
  const [entries, setEntries] = useState<DirectoryBusiness[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setState('loading')
    marketplaceRequest('directory')
      .then(result => { if (active) { setEntries((result.entries as DirectoryBusiness[]).slice(0, 6)); setState('ready') } })
      .catch(() => { if (active) setState('error') })
    return () => { active = false }
  }, [attempt])
  return (
    <section className="sx-section" id="marketplace" aria-labelledby="sx-market-title">
      <Reveal className="sx-heading">
        <p className="sx-eyebrow">{t.marketEyebrow}</p>
        <h2 id="sx-market-title">{t.marketTitle}</h2>
        <p className="sx-lead">{t.marketText}</p>
      </Reveal>
      {state === 'loading' && <div className="sx-market-grid" aria-busy="true">{[0, 1, 2].map(key => <div key={key} className="sx-biz sx-skeleton"/>)}</div>}
      {state === 'error' && <div className="sx-empty"><p>{t.marketError}</p><button type="button" className="sx-btn sx-btn-ghost" onClick={() => setAttempt(value => value + 1)}>{t.retry}</button></div>}
      {state === 'ready' && entries.length === 0 && <div className="sx-empty"><Store size={22} aria-hidden="true"/><p>{t.marketEmpty}</p></div>}
      {state === 'ready' && entries.length > 0 && <div className="sx-market-grid">
        {entries.map((business, index) => {
          const image = business.heroUrl || business.galleryUrls[0] || ''
          const town = business.municipalities[0] || business.locations[0]?.name || ''
          return (
            <Reveal key={business.slug} delay={0.06 * index}>
              <a className="sx-biz" href={`/negocios/${business.slug}`} onPointerMove={trackGlow}>
                <div className="sx-biz-media">
                  {image ? <img src={image} alt="" loading="lazy"/> : <Store size={28} aria-hidden="true"/>}
                  {business.logoUrl && <img className="sx-biz-logo" src={business.logoUrl} alt="" loading="lazy"/>}
                </div>
                <div className="sx-biz-body">
                  <strong>{businessName(business, lang)}</strong>
                  <span>{business.categoryLabel}</span>
                  {town && <small><MapPin size={13} aria-hidden="true"/>{town}</small>}
                </div>
              </a>
            </Reveal>
          )
        })}
      </div>}
      <div className="sx-center"><a className="sx-btn sx-btn-ghost" href="/marketplace">{t.marketCta}<ArrowRight size={16}/></a></div>
    </section>
  )
}

export default function SaasPreviewLanding({lang, setLang}: {lang: Language; setLang: (lang: Language) => void}) {
  const t = copy[lang]
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, {passive: true})
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    document.title = lang === 'es' ? 'WebFactory PR · Vista previa del rediseño' : 'WebFactory PR · Redesign preview'
  }, [lang])
  const f = t.features
  return (
    <div className="sx-root">
      <div className="sx-banner">
        <span><span className="sx-pulse" aria-hidden="true"/>{t.banner}</span>
        <div className="sx-banner-actions">
          <div className="sx-lang" role="group" aria-label={t.langLabel}>
            <button type="button" aria-pressed={lang === 'es'} className={lang === 'es' ? 'is-active' : ''} onClick={() => setLang('es')}>ES</button>
            <button type="button" aria-pressed={lang === 'en'} className={lang === 'en' ? 'is-active' : ''} onClick={() => setLang('en')}>EN</button>
          </div>
          <ThemeToggle lang={lang}/>
        </div>
      </div>

      <header className={'sx-nav' + (scrolled ? ' is-scrolled' : '')}>
        <a className="sx-logo" href="/" aria-label="WebFactory PR"><AdaptiveLogo alt="WebFactory PR"/></a>
        <nav className="sx-nav-links" aria-label={lang === 'es' ? 'Secciones' : 'Sections'}>
          {t.nav.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
        </nav>
        <div className="sx-nav-actions">
          <a className="sx-btn sx-btn-text" href={LOGIN_HREF}>{t.login}</a>
          <a className="sx-btn sx-btn-primary sx-btn-sm" href={TRIAL_HREF}>{t.trial}</a>
          <button type="button" className="sx-menu-btn" aria-expanded={menuOpen} aria-controls="sx-mobile-menu" aria-label={menuOpen ? t.close : t.menu} onClick={() => setMenuOpen(value => !value)}>
            {menuOpen ? <X size={20}/> : <Menu size={20}/>}
          </button>
        </div>
        <AnimatePresence>
          {menuOpen && <motion.nav
            id="sx-mobile-menu"
            className="sx-mobile-menu"
            aria-label={lang === 'es' ? 'Menú' : 'Menu'}
            initial={{opacity: 0, y: -8}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -8}} transition={{duration: 0.18}}
            onClick={() => setMenuOpen(false)}
          >
            {t.nav.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
            <a href={LOGIN_HREF}>{t.login}</a>
            <a className="sx-btn sx-btn-primary" href={TRIAL_HREF}>{t.trial}</a>
          </motion.nav>}
        </AnimatePresence>
      </header>

      <main>
        <section className="sx-hero">
          <div className="sx-hero-glow" aria-hidden="true"/>
          <Reveal className="sx-hero-copy">
            <p className="sx-pill"><MapPin size={14} aria-hidden="true"/>{t.eyebrow}</p>
            <h1>{t.title[0]} <span className="sx-gradient-text">{t.title[1]}</span></h1>
            <p className="sx-lead">{t.subtitle}</p>
            <div className="sx-cta-row">
              <a className="sx-btn sx-btn-primary sx-btn-lg" href={TRIAL_HREF}>{t.trial}<ArrowRight size={18}/></a>
              <a className="sx-btn sx-btn-ghost sx-btn-lg" href="/templates">{t.secondary}</a>
            </div>
            <p className="sx-note"><ShieldCheck size={15} aria-hidden="true"/>{t.note}</p>
            <ul className="sx-chips">{t.chips.map(chip => <li key={chip}>{chip}</li>)}</ul>
          </Reveal>
          <Reveal className="sx-hero-visual" delay={0.12}>
            <DashboardMockup lang={lang}/>
            <PhoneMockup lang={lang}/>
          </Reveal>
        </section>

        <section className="sx-section" id="funciones" aria-labelledby="sx-features-title">
          <Reveal className="sx-heading">
            <p className="sx-eyebrow">{t.featuresEyebrow}</p>
            <h2 id="sx-features-title">{t.featuresTitle}</h2>
          </Reveal>
          <div className="sx-bento">
            <Reveal className="sx-span-2"><FeatureCard icon={<CreditCard size={20}/>} title={f.pay[0]} text={f.pay[1]} className="sx-card-pay">
              <div className="sx-pay-visual" aria-hidden="true"><span>ATH Móvil</span><span>Stripe</span><span><QrCode size={14}/> QR</span><strong>0%</strong></div>
            </FeatureCard></Reveal>
            <Reveal delay={0.05}><FeatureCard icon={<CalendarDays size={20}/>} title={f.book[0]} text={f.book[1]}>
              <div className="sx-slots" aria-hidden="true"><span>9:00</span><span className="on">10:30</span><span>1:00</span><span>3:30</span></div>
            </FeatureCard></Reveal>
            <Reveal delay={0.1}><FeatureCard icon={<Globe2 size={20}/>} title={f.web[0]} text={f.web[1]}>
              <div className="sx-lang-visual" aria-hidden="true"><span>ES</span><ArrowRight size={14}/><span>EN</span></div>
            </FeatureCard></Reveal>
            <Reveal delay={0.05} className="sx-span-2"><FeatureCard icon={<Store size={20}/>} title={f.market[0]} text={f.market[1]} className="sx-card-market"/></Reveal>
            <Reveal delay={0.1}><FeatureCard icon={<CalendarDays size={20}/>} title={f.calendar[0]} text={f.calendar[1]}/></Reveal>
            <Reveal delay={0.15}><FeatureCard icon={<LayoutDashboard size={20}/>} title={f.admin[0]} text={f.admin[1]}/></Reveal>
          </div>
        </section>

        <Pricing lang={lang}/>
        <MarketplaceShowcase lang={lang}/>

        <section className="sx-final">
          <Reveal className="sx-final-card">
            <h2>{t.finalTitle}</h2>
            <p>{t.finalText}</p>
            <div className="sx-cta-row sx-center">
              <a className="sx-btn sx-btn-primary sx-btn-lg" href={TRIAL_HREF}>{t.trial}<ArrowRight size={18}/></a>
              <a className="sx-btn sx-btn-ghost sx-btn-lg" href={LOGIN_HREF}>{t.login}</a>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="sx-footer">
        <AdaptiveLogo alt="WebFactory PR" className="sx-footer-logo"/>
        <nav aria-label={lang === 'es' ? 'Enlaces legales' : 'Legal links'}>
          <a href="/privacy">{t.footer[0]}</a><a href="/terms">{t.footer[1]}</a><a href="/refund-policy">{t.footer[2]}</a>
          <a href="mailto:info@webfactorypr.com">info@webfactorypr.com</a>
        </nav>
        <small>© 2026 WebFactory PR</small>
      </footer>
    </div>
  )
}
