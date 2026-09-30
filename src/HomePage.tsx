import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { AdaptiveLogo, ThemeToggle } from './theme'
import { FeedbackPreferences } from './feedback/FeedbackPreferences'
import './home-premium.css'

type Language = 'en' | 'es'

const copy = {
  en: {
    nav: ['Platform', 'Tour', 'Demo', 'Plans'], templatesNav: 'Templates', login: 'Log In', menu: 'Menu', mainNav: 'Main navigation',
    eyebrow: 'BUILT IN PUERTO RICO · FOR YOUR BUSINESS', title: 'Your whole business,', accent: 'one control center.',
    lead: 'Launch a bilingual website, sell products and services, accept bookings, get paid and manage your team, all connected to your Business Control Center.',
    modules: ['Website', 'Commerce', 'Payments', 'Employees', 'Bookings'],
    start: 'Start 7-day free trial', templates: 'Browse templates', trial: '7 days free · No card · Then $30/month or $350/year',
    heroAlt: 'Illustration of the Business Control Center with sample data', sample: 'Sample data', sampleBusiness: 'Sample business', center: 'Business Control Center', scroll: 'Scroll to see it come together',
    tourLabel: 'HOW IT COMES TOGETHER', tourTitle: 'From your first page to your daily operation.', tourText: 'Keep scrolling. The Control Center updates with every step.',
    steps: [
      ['Create', 'Create your website', 'Start from a template or ask Factory AI to propose structure, bilingual content, catalog and team inside the Builder.'],
      ['Sell', 'Sell products and services', 'Catalog, inventory, cart and POS, all connected to your website.'],
      ['Book', 'Accept bookings', 'Customers choose a service, a professional and a time. Schedules and availability live in one calendar.'],
      ['Get paid', 'Get paid your way', 'Connect Stripe and ATH Móvil to your business accounts and send payment links. No WebFactory commission on your sales.'],
      ['Manage', 'Manage everything', 'Sales, bookings, payments, customers and employees together, with quick access to POS, your website and QR & Share.'],
    ],
    stepOf: 'Step', goTo: 'Go to step',
    // Scene labels
    ai: 'Factory AI', aiPrompt: 'Sample prompt: a bilingual studio website with services and bookings.', aiItems: ['Page structure', 'Content EN / ES', 'Catalog', 'Team'], publish: 'Website preview', siteHero: 'Care that fits your schedule.', siteCta: 'Book now', siteCards: ['Service', 'Product', 'Team'],
    catalog: 'Catalog', product: 'Sample product', service: 'Sample service', addToCart: 'Add', cart: 'Cart', items: 'items', orderIn: 'New sample order', pos: 'POS',
    calendar: 'Availability', month: 'October 2026', week: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], professional: 'Professional', confirmed: 'Confirmed', bookingSample: 'Sample booking',
    checkout: 'Checkout', card: 'Card · Stripe', ath: 'ATH Móvil', link: 'Payment link', pending: 'Pending', paid: 'Paid', receipt: 'Sample receipt', noCharge: 'Demo only · No charge',
    overview: 'Your business at a glance', sales: 'Sales', bookings: 'Bookings', customers: 'Customers', payments: 'Payments', team: 'Team', recent: 'Recent activity', quick: 'Quick access', sevenDays: '7 sample days',
    quickActions: [['POS', 'Record a sale'], ['Bookings', 'Manage your schedule'], ['Payments', 'Payments and receipts'], ['Team', 'Employees and schedules'], ['Website', 'Edit your website'], ['QR & Share', 'Download your QR and share your website'], ['Catalog', 'Products and services']],
    // Interactive demo
    explore: 'TRY IT', exploreTitle: 'Try the customer side.', exploreText: 'Local demos with sample data. Nothing is charged, ordered or booked.', tabs: ['Sell', 'Book', 'Pay', 'Manage'],
    sellTitle: 'From your catalog to the cart.', sellText: 'Products and services on your website, with payments connected to your business.', item: 'Care kit', add: 'Add to cart', yourCart: 'Your cart', empty: 'Add a product to get started.', clear: 'Clear cart', total: 'Sample total', remove: 'Remove one product',
    bookTitle: 'An appointment, fewer steps.', bookText: 'Service, professional and time in a clear experience for your customers.', serviceLabel: 'Service', schedule: 'Sample time', book: 'Preview booking', bookingReady: 'Sample booking prepared', serviceName: 'Personal consultation', proA: 'Professional A', proB: 'Professional B',
    payTitle: 'A clear checkout.', payText: 'Customers pay with the methods you connect. Funds go to your business accounts; payment provider fees apply.', method: 'Payment method', simulate: 'Simulate payment', processing: 'Simulating…', paidSample: 'Sample payment complete', again: 'Reset demo', amountLabel: 'Sample amount',
    qrDemo: 'Demo · Sample QR', qrTitle: 'Your QR, ready to share', qrText: 'In your Control Center, QR & Share creates the QR for your real website. This demo uses an example link on example.com and is not connected to any business.', qrBusiness: 'Sample business', qrLink: 'Sample link', qrCopy: 'Copy link', qrDownload: 'Download QR', qrCopied: 'Sample link copied', qrCopyFailed: 'Could not copy. Select the link and copy it manually.', qrDownloaded: 'Sample QR downloaded', qrAlt: 'Sample QR code linking to example.com',
    manageTitle: 'Your next step, in view.', manageText: 'Pick a quick action to see what it does in your Business Control Center.', openPortal: 'Log In to your Control Center',
    demoNote: 'Local demo. No payments, orders or bookings are created.',
    // Platform
    platformLabel: 'ONE PLATFORM', platformTitle: 'Five pieces of your business. Connected.',
    platform: [
      ['Website', 'Templates and the Builder with Factory AI, bilingual content and your brand.'],
      ['Commerce', 'Catalog, inventory, cart, POS and orders with tracking.'],
      ['Payments', 'Stripe, ATH Móvil and payment links connected to your business.'],
      ['Employees', 'Profiles, services, schedules, time off and access by role.'],
      ['Bookings', 'Services, professionals, hours and a monthly availability calendar.'],
    ],
    alsoLabel: 'Also included', also: ['Templates', 'Factory AI', 'Training to learn and practice', 'Integrations', 'English + Español', 'Light / Dark'],
    howLabel: 'FROM YOUR IDEA TO YOUR OPERATION', howTitle: 'Start with your business.', how: [['Create', 'Choose your starting point and add your logo, colors and content.'], ['Configure', 'Add products, services, team and your payment methods.'], ['Manage', 'Handle sales and bookings from your portal.']],
    priceLabel: 'ONE CLEAR PLAN', priceTitle: 'Your platform. Your brand.', perMonth: '/month', annual: 'Or $350 per year', priceText: 'Website, sales, bookings, payments, employees and the Business Control Center.', noCommission: 'No WebFactory commission on your sales.', trialShort: '7 days free · No card',
    faq: [['Can I sell and accept bookings?', 'Yes. Offer products and services with appointments on the same website.'], ['Where do payments go?', 'Stripe and ATH Móvil connect to your business accounts. Payment provider fees apply.'], ['Can I edit my content later?', 'Yes. Manage your catalog, prices, employees and hours from your portal.']],
    finalTitle: 'Ready to put your business in control?', finalText: 'Build your website in the Builder and manage it from day one.',
    footer: 'Your website. Your operation. Your control.', legal: ['Privacy', 'Terms', 'Refunds'], legalNav: 'Legal links',
  },
  es: {
    nav: ['Plataforma', 'Recorrido', 'Demo', 'Planes'], templatesNav: 'Templates', login: 'Log In', menu: 'Menú', mainNav: 'Navegación principal',
    eyebrow: 'CREADO EN PUERTO RICO · PARA TU NEGOCIO', title: 'Todo tu negocio,', accent: 'un centro de control.',
    lead: 'Lanza un website bilingüe, vende productos y servicios, recibe reservas, cobra y administra tu equipo, todo conectado a tu Business Control Center.',
    modules: ['Website', 'Ventas', 'Pagos', 'Empleados', 'Reservas'],
    start: 'Prueba 7 días gratis', templates: 'Ver templates', trial: '7 días gratis · Sin tarjeta · Luego $30/mes o $350/año',
    heroAlt: 'Ilustración del Business Control Center con datos de ejemplo', sample: 'Datos de ejemplo', sampleBusiness: 'Negocio de ejemplo', center: 'Business Control Center', scroll: 'Haz scroll y míralo tomar forma',
    tourLabel: 'CÓMO SE CONECTA TODO', tourTitle: 'De tu primera página a tu operación diaria.', tourText: 'Sigue bajando. El Control Center se actualiza en cada paso.',
    steps: [
      ['Crear', 'Crea tu website', 'Comienza con un template o pídele a Factory AI que proponga estructura, contenido bilingüe, catálogo y equipo dentro del Builder.'],
      ['Vender', 'Vende productos y servicios', 'Catálogo, inventario, carrito y POS, conectados a tu website.'],
      ['Reservar', 'Recibe reservas', 'Tus clientes eligen servicio, profesional y horario. Horarios y disponibilidad en un solo calendario.'],
      ['Cobrar', 'Cobra a tu manera', 'Conecta Stripe y ATH Móvil a las cuentas de tu negocio y envía enlaces de pago. Sin comisión de WebFactory sobre tus ventas.'],
      ['Administrar', 'Adminístralo todo', 'Ventas, reservas, pagos, clientes y empleados juntos, con acceso rápido a POS, tu website y QR y compartir.'],
    ],
    stepOf: 'Paso', goTo: 'Ir al paso',
    ai: 'Factory AI', aiPrompt: 'Ejemplo: un website bilingüe para un estudio con servicios y reservas.', aiItems: ['Estructura', 'Contenido EN / ES', 'Catálogo', 'Equipo'], publish: 'Vista del website', siteHero: 'Atención que se ajusta a tu horario.', siteCta: 'Reservar', siteCards: ['Servicio', 'Producto', 'Equipo'],
    catalog: 'Catálogo', product: 'Producto de ejemplo', service: 'Servicio de ejemplo', addToCart: 'Añadir', cart: 'Carrito', items: 'artículos', orderIn: 'Nuevo pedido de ejemplo', pos: 'POS',
    calendar: 'Disponibilidad', month: 'Octubre 2026', week: ['L', 'M', 'M', 'J', 'V', 'S', 'D'], professional: 'Profesional', confirmed: 'Confirmada', bookingSample: 'Reserva de ejemplo',
    checkout: 'Pago', card: 'Tarjeta · Stripe', ath: 'ATH Móvil', link: 'Enlace de pago', pending: 'Pendiente', paid: 'Pagado', receipt: 'Recibo de ejemplo', noCharge: 'Solo demo · Sin cargo',
    overview: 'Tu negocio de un vistazo', sales: 'Ventas', bookings: 'Reservas', customers: 'Clientes', payments: 'Pagos', team: 'Equipo', recent: 'Actividad reciente', quick: 'Accesos rápidos', sevenDays: '7 días de ejemplo',
    quickActions: [['POS', 'Registrar una venta'], ['Reservaciones', 'Organiza tu agenda'], ['Pagos', 'Cobros y recibos'], ['Equipo', 'Empleados y horarios'], ['Website', 'Edita tu página'], ['QR y compartir', 'Descarga tu QR y comparte tu página'], ['Catálogo', 'Productos y servicios']],
    explore: 'PRUÉBALO', exploreTitle: 'Prueba el lado del cliente.', exploreText: 'Demos locales con datos de ejemplo. No se cobra, ni se crean pedidos o reservas.', tabs: ['Vender', 'Reservar', 'Cobrar', 'Administrar'],
    sellTitle: 'De tu catálogo al carrito.', sellText: 'Productos y servicios en tu website, con pagos conectados a tu negocio.', item: 'Kit de cuidado', add: 'Añadir al carrito', yourCart: 'Tu carrito', empty: 'Añade un producto para comenzar.', clear: 'Vaciar carrito', total: 'Total de ejemplo', remove: 'Quitar un producto',
    bookTitle: 'Una cita, menos pasos.', bookText: 'Servicio, profesional y horario en una experiencia clara para tus clientes.', serviceLabel: 'Servicio', schedule: 'Horario de ejemplo', book: 'Previsualizar reserva', bookingReady: 'Reserva de ejemplo preparada', serviceName: 'Consulta personalizada', proA: 'Profesional A', proB: 'Profesional B',
    payTitle: 'Un pago claro.', payText: 'Tus clientes pagan con los métodos que conectes. Los fondos llegan a las cuentas de tu negocio; aplican las tarifas del proveedor de pago.', method: 'Método de pago', simulate: 'Simular pago', processing: 'Simulando…', paidSample: 'Pago de ejemplo completado', again: 'Reiniciar demo', amountLabel: 'Monto de ejemplo',
    qrDemo: 'Demo · QR de ejemplo', qrTitle: 'Tu QR, listo para compartir', qrText: 'En tu Control Center, QR y compartir crea el QR de tu website real. Esta demo usa un enlace de ejemplo en example.com y no está conectada a ningún negocio.', qrBusiness: 'Negocio de ejemplo', qrLink: 'Enlace de ejemplo', qrCopy: 'Copiar enlace', qrDownload: 'Descargar QR', qrCopied: 'Enlace de ejemplo copiado', qrCopyFailed: 'No se pudo copiar. Selecciona el enlace y cópialo manualmente.', qrDownloaded: 'QR de ejemplo descargado', qrAlt: 'Código QR de ejemplo que enlaza a example.com',
    manageTitle: 'El siguiente paso, a la vista.', manageText: 'Elige un acceso rápido para ver lo que hace en tu Business Control Center.', openPortal: 'Entra a tu Control Center',
    demoNote: 'Demo local. No procesa pagos ni crea pedidos o reservas.',
    platformLabel: 'UNA PLATAFORMA', platformTitle: 'Cinco piezas de tu negocio. Conectadas.',
    platform: [
      ['Website', 'Templates y el Builder con Factory AI, contenido bilingüe y tu marca.'],
      ['Ventas', 'Catálogo, inventario, carrito, POS y pedidos con seguimiento.'],
      ['Pagos', 'Stripe, ATH Móvil y enlaces de pago conectados a tu negocio.'],
      ['Empleados', 'Perfiles, servicios, horarios, días libres y acceso por rol.'],
      ['Reservas', 'Servicios, profesionales, horarios y un calendario mensual de disponibilidad.'],
    ],
    alsoLabel: 'También incluye', also: ['Templates', 'Factory AI', 'Training para aprender y practicar', 'Integraciones', 'English + Español', 'Claro / Oscuro'],
    howLabel: 'DE LA IDEA A TU OPERACIÓN', howTitle: 'Empieza con tu negocio.', how: [['Crea', 'Elige tu base y aplica tu logo, colores y contenido.'], ['Configura', 'Añade productos, servicios, equipo y tus métodos de pago.'], ['Administra', 'Gestiona ventas y reservas desde tu portal.']],
    priceLabel: 'UN PLAN CLARO', priceTitle: 'Tu plataforma. Tu marca.', perMonth: '/mes', annual: 'O $350 al año', priceText: 'Website, ventas, reservas, pagos, empleados y el Business Control Center.', noCommission: 'Sin comisión de WebFactory sobre tus ventas.', trialShort: '7 días gratis · Sin tarjeta',
    faq: [['¿Puedo vender y recibir citas?', 'Sí. Puedes ofrecer productos y servicios con reservaciones en el mismo website.'], ['¿A dónde llegan los pagos?', 'Stripe y ATH Móvil se conectan a las cuentas de tu negocio. Aplican las tarifas del proveedor de pago.'], ['¿Puedo cambiar el contenido después?', 'Sí. Administra catálogo, precios, empleados y horarios desde tu portal.']],
    finalTitle: '¿Listo para tener tu negocio en control?', finalText: 'Crea tu website en el Builder y adminístralo desde el primer día.',
    footer: 'Tu website. Tu operación. Tu control.', legal: ['Privacidad', 'Términos', 'Reembolsos'], legalNav: 'Enlaces legales',
  },
}
type Copy = typeof copy.en

const icons: Record<string, string> = {
  website: 'M3 5h18v14H3V5Zm0 4h18M7 7h.01M10 7h.01',
  sales: 'M4 7h16l-2 10H6L4 7Zm0 0L3 3H1M8 21h.01M17 21h.01',
  bookings: 'M5 5h14v15H5V5Zm3-3v6m8-6v6M5 10h14',
  payments: 'M3 6h18v12H3V6Zm0 5h18M7 15h3',
  customers: 'M15 21v-3a5 5 0 0 0-10 0v3M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm10 9v-3a5 5 0 0 0-3-4',
  team: 'M16 20v-2a4 4 0 0 0-8 0v2M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 20v-1a3 3 0 0 1 3-3M20 20v-1a3 3 0 0 0-3-3',
  reports: 'M4 20V4m0 16h16M8 15l4-5 4 2 4-7',
  qr: 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h2v2h-2v-2Zm4 0h2v2h-2Zm-4 4h2v2h-2Zm4 0h2v2h-2Z',
  catalog: 'M12 3 3 8l9 5 9-5-9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
  pos: 'M5 3h14v18H5V3Zm3 4h8M8 11h2m4 0h2m-8 4h2m4 0h2',
  spark: 'M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
  check: 'M5 12.5 10 17l9-10',
}
const moduleIcons = ['website', 'sales', 'payments', 'team', 'bookings']
const quickIcons = ['pos', 'bookings', 'payments', 'team', 'website', 'qr', 'catalog']
const sidebarForStep = ['website', 'sales', 'bookings', 'payments', 'reports']

function Icon({ name }: { name: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icons[name] || icons.reports} /></svg>
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return reduced
}

/* ---------- Control Center scenes (illustrative, sample data only) ---------- */

function SceneWebsite({ t }: { t: Copy }) {
  return <div className="wf-s-website">
    <div className="wf-s-ai">
      <span className="wf-s-ai-head"><Icon name="spark" />{t.ai}</span>
      <p>{t.aiPrompt}</p>
      <ul>{t.aiItems.map((item, i) => <li key={item} style={{ '--i': i } as CSSProperties}><Icon name="check" />{item}</li>)}</ul>
    </div>
    <div className="wf-s-site">
      <div className="wf-s-site-bar"><i /><i /><i /><span>{t.publish}</span><b>EN · ES</b></div>
      <div className="wf-s-site-hero"><small>{t.sampleBusiness}</small><strong>{t.siteHero}</strong><span>{t.siteCta}</span></div>
      <div className="wf-s-site-cards">{t.siteCards.map((c, i) => <div key={c} style={{ '--i': i } as CSSProperties}><i />{c}</div>)}</div>
    </div>
  </div>
}

function SceneSell({ t }: { t: Copy }) {
  const products = [[t.product, '$29.00'], [t.service, '$45.00'], [t.product, '$18.00']]
  return <div className="wf-s-sell">
    <div className="wf-s-catalog">
      <b className="wf-s-label">{t.catalog}</b>
      <div>{products.map(([name, price], i) => <article key={i} style={{ '--i': i } as CSSProperties}><div className="wf-s-art" data-v={i} /><span>{name}</span><strong>{price}</strong><em>{t.addToCart} +</em></article>)}</div>
    </div>
    <div className="wf-s-cart">
      <b className="wf-s-label">{t.cart}<span>2 {t.items}</span></b>
      <p><span>{t.product}</span><strong>$29.00</strong></p>
      <p><span>{t.service}</span><strong>$45.00</strong></p>
      <div className="wf-s-total"><small>{t.total}</small><strong>$74.00</strong></div>
      <div className="wf-s-toast"><Icon name="sales" />{t.orderIn}</div>
    </div>
  </div>
}

function SceneBook({ t }: { t: Copy }) {
  // Real month so dates line up with weekdays (Monday-first): October 2026 starts on a Thursday.
  const offset = (new Date(2026, 9, 1).getDay() + 6) % 7
  const isOpen = (day: number) => (offset + day - 1) % 7 < 5 && day % 4 !== 0
  const picked = 15
  return <div className="wf-s-book">
    <div className="wf-s-calendar">
      <b className="wf-s-label">{t.calendar}<span>{t.month}</span></b>
      <div className="wf-s-grid">{t.week.map((d, i) => <small key={i}>{d}</small>)}{Array.from({ length: 31 }, (_, i) => <span key={i} style={i === 0 ? { gridColumnStart: offset + 1 } : undefined} className={(isOpen(i + 1) ? 'open ' : '') + (i + 1 === picked ? 'picked' : '')}>{i + 1}</span>)}</div>
    </div>
    <div className="wf-s-slots">
      <b className="wf-s-label">{t.professional}</b>
      <div className="wf-s-pros"><span className="on">A</span><span>B</span><span>C</span></div>
      {['10:00 AM', '11:30 AM', '2:00 PM'].map((s, i) => <p key={s} className={i === 0 ? 'on' : ''} style={{ '--i': i } as CSSProperties}>{s}</p>)}
      <div className="wf-s-toast"><Icon name="bookings" />{t.bookingSample} · {t.confirmed}</div>
    </div>
  </div>
}

function ScenePay({ t }: { t: Copy }) {
  return <div className="wf-s-pay">
    <div className="wf-s-checkout">
      <b className="wf-s-label">{t.checkout}<span>{t.noCharge}</span></b>
      <strong className="wf-s-amount">$74.00</strong>
      <div className="wf-s-methods">{[t.card, t.ath, t.link].map((m, i) => <span key={m} className={i === 0 ? 'on' : ''}>{m}</span>)}</div>
      <div className="wf-s-status"><span>{t.pending}</span><i /><span className="done">{t.paid}</span></div>
    </div>
    <div className="wf-s-receipt">
      <b className="wf-s-label">{t.receipt}</b>
      <p><span>{t.product}</span><strong>$29.00</strong></p>
      <p><span>{t.service}</span><strong>$45.00</strong></p>
      <p className="wf-s-receipt-total"><span>{t.total}</span><strong>$74.00</strong></p>
      <em><Icon name="check" />{t.paid}</em>
    </div>
  </div>
}

function SceneManage({ t }: { t: Copy }) {
  return <div className="wf-s-manage">
    <div className="wf-s-metrics">{[[t.sales, '$645'], [t.bookings, '03'], [t.customers, '12']].map(([label, value], i) => <div key={label} style={{ '--i': i } as CSSProperties}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <div className="wf-s-chart"><b className="wf-s-label">{t.sales}<span>{t.sevenDays}</span></b><div>{[28, 47, 75, 50, 38, 100, 66].map((h, i) => <span key={i} style={{ '--h': h / 100, '--i': i } as CSSProperties} />)}</div></div>
    <div className="wf-s-quick"><b className="wf-s-label">{t.quick}</b><div>{t.quickActions.map(([label], i) => <span key={label} className={quickIcons[i] === 'qr' ? 'highlight' : ''}><Icon name={quickIcons[i]} />{label}</span>)}</div></div>
  </div>
}

const scenes = [SceneWebsite, SceneSell, SceneBook, ScenePay, SceneManage]

function ControlFrame({ t, step, only }: { t: Copy, step: number, only?: boolean }) {
  return <div className="wf-cc" data-step={step}>
    <div className="wf-cc-top"><span className="wf-dot" /><b>{t.center}</b><span className="wf-cc-crumb">{t.steps[step][0]}</span><span className="wf-cc-sample">{t.sample}</span></div>
    <div className="wf-cc-body">
      <aside aria-hidden="true"><div className="wf-cc-mono">W<span>F</span></div>{sidebarForStep.map((name, i) => <div key={name} className={i === step ? 'on' : ''}><Icon name={name} /></div>)}</aside>
      <div className="wf-cc-main">
        {only ? (() => { const Scene = scenes[step]; return <div className="wf-cc-scene on"><Scene t={t} /></div> })() : scenes.map((Scene, i) => <div key={i} className={'wf-cc-scene ' + (i === step ? 'on' : i < step ? 'past' : '')} aria-hidden={i !== step}><Scene t={t} /></div>)}
      </div>
    </div>
  </div>
}

/* ---------- Interactive local demos ---------- */

/* Local QR & Share demo: static sample QR for a reserved example.com link. No network, no real business data. */
const SAMPLE_LINK = 'https://example.com/sample-business'
const SAMPLE_QR = { size: 29, path: 'M0 0h7v1H0zM8 0h1v1H8zM12 0h9v1H12zM22 0h7v1H22zM0 1h1v1H0zM6 1h1v1H6zM10 1h1v1H10zM13 1h3v1H13zM18 1h3v1H18zM22 1h1v1H22zM28 1h1v1H28zM0 2h1v1H0zM2 2h3v1H2zM6 2h1v1H6zM9 2h1v1H9zM12 2h4v1H12zM17 2h3v1H17zM22 2h1v1H22zM24 2h3v1H24zM28 2h1v1H28zM0 3h1v1H0zM2 3h3v1H2zM6 3h1v1H6zM8 3h2v1H8zM11 3h1v1H11zM14 3h1v1H14zM17 3h1v1H17zM22 3h1v1H22zM24 3h3v1H24zM28 3h1v1H28zM0 4h1v1H0zM2 4h3v1H2zM6 4h1v1H6zM8 4h1v1H8zM10 4h4v1H10zM15 4h1v1H15zM18 4h3v1H18zM22 4h1v1H22zM24 4h3v1H24zM28 4h1v1H28zM0 5h1v1H0zM6 5h1v1H6zM8 5h1v1H8zM10 5h1v1H10zM12 5h6v1H12zM22 5h1v1H22zM28 5h1v1H28zM0 6h7v1H0zM8 6h1v1H8zM10 6h1v1H10zM12 6h1v1H12zM14 6h1v1H14zM16 6h1v1H16zM18 6h1v1H18zM20 6h1v1H20zM22 6h7v1H22zM8 7h2v1H8zM15 7h1v1H15zM17 7h3v1H17zM0 8h3v1H0zM4 8h1v1H4zM6 8h1v1H6zM8 8h1v1H8zM13 8h2v1H13zM16 8h2v1H16zM20 8h6v1H20zM28 8h1v1H28zM1 9h2v1H1zM4 9h1v1H4zM8 9h1v1H8zM11 9h4v1H11zM16 9h1v1H16zM18 9h1v1H18zM20 9h1v1H20zM23 9h4v1H23zM28 9h1v1H28zM0 10h4v1H0zM6 10h3v1H6zM10 10h1v1H10zM15 10h5v1H15zM21 10h1v1H21zM0 11h1v1H0zM2 11h4v1H2zM7 11h8v1H7zM20 11h1v1H20zM23 11h1v1H23zM25 11h1v1H25zM27 11h1v1H27zM0 12h1v1H0zM2 12h2v1H2zM5 12h2v1H5zM8 12h1v1H8zM12 12h2v1H12zM23 12h1v1H23zM25 12h1v1H25zM27 12h2v1H27zM0 13h3v1H0zM4 13h2v1H4zM8 13h1v1H8zM12 13h1v1H12zM15 13h1v1H15zM18 13h8v1H18zM0 14h4v1H0zM5 14h8v1H5zM14 14h2v1H14zM18 14h1v1H18zM25 14h2v1H25zM28 14h1v1H28zM0 15h2v1H0zM3 15h2v1H3zM7 15h8v1H7zM16 15h4v1H16zM21 15h2v1H21zM25 15h4v1H25zM3 16h1v1H3zM6 16h1v1H6zM10 16h2v1H10zM13 16h1v1H13zM18 16h3v1H18zM22 16h4v1H22zM27 16h2v1H27zM3 17h3v1H3zM8 17h4v1H8zM18 17h1v1H18zM20 17h1v1H20zM23 17h1v1H23zM0 18h1v1H0zM5 18h3v1H5zM9 18h1v1H9zM11 18h1v1H11zM13 18h1v1H13zM16 18h2v1H16zM21 18h3v1H21zM1 19h2v1H1zM4 19h1v1H4zM8 19h2v1H8zM11 19h1v1H11zM14 19h1v1H14zM16 19h3v1H16zM22 19h3v1H22zM26 19h1v1H26zM28 19h1v1H28zM3 20h1v1H3zM5 20h4v1H5zM11 20h4v1H11zM16 20h2v1H16zM20 20h5v1H20zM28 20h1v1H28zM8 21h3v1H8zM19 21h2v1H19zM24 21h1v1H24zM26 21h3v1H26zM0 22h7v1H0zM11 22h3v1H11zM15 22h1v1H15zM18 22h1v1H18zM20 22h1v1H20zM22 22h1v1H22zM24 22h1v1H24zM28 22h1v1H28zM0 23h1v1H0zM6 23h1v1H6zM9 23h1v1H9zM12 23h3v1H12zM16 23h1v1H16zM18 23h1v1H18zM20 23h1v1H20zM24 23h4v1H24zM0 24h1v1H0zM2 24h3v1H2zM6 24h1v1H6zM8 24h3v1H8zM13 24h3v1H13zM17 24h2v1H17zM20 24h5v1H20zM26 24h3v1H26zM0 25h1v1H0zM2 25h3v1H2zM6 25h1v1H6zM11 25h1v1H11zM13 25h1v1H13zM16 25h1v1H16zM18 25h5v1H18zM24 25h1v1H24zM27 25h1v1H27zM0 26h1v1H0zM2 26h3v1H2zM6 26h1v1H6zM8 26h3v1H8zM13 26h3v1H13zM17 26h1v1H17zM19 26h2v1H19zM26 26h2v1H26zM0 27h1v1H0zM6 27h1v1H6zM8 27h2v1H8zM13 27h1v1H13zM17 27h1v1H17zM20 27h1v1H20zM23 27h2v1H23zM26 27h1v1H26zM0 28h7v1H0zM8 28h1v1H8zM11 28h5v1H11zM18 28h1v1H18zM24 28h4v1H24z' }
const sampleQrSvg = (label: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 ${SAMPLE_QR.size + 8} ${SAMPLE_QR.size + 8}" width="512" height="512" shape-rendering="crispEdges" role="img" aria-label="${label}"><rect x="-4" y="-4" width="${SAMPLE_QR.size + 8}" height="${SAMPLE_QR.size + 8}" fill="#fff"/><path d="${SAMPLE_QR.path}" fill="#0b1529"/></svg>`

function QrShareDemo({ t }: { t: Copy }) {
  const [status, setStatus] = useState('')
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(SAMPLE_LINK); setStatus(t.qrCopied) }
    catch {
      const field = document.getElementById('wf-qr-demo-link') as HTMLInputElement | null
      field?.select()
      setStatus(document.execCommand?.('copy') ? t.qrCopied : t.qrCopyFailed)
    }
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([sampleQrSvg(t.qrAlt)], { type: 'image/svg+xml' }))
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = 'webfactory-sample-qr-demo.svg'
    document.body.append(anchor); anchor.click(); anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setStatus(t.qrDownloaded)
  }
  return <div className="wf-qr-demo">
    <span className="wf-qr-badge">{t.qrDemo}</span>
    <figure><svg viewBox={`-4 -4 ${SAMPLE_QR.size + 8} ${SAMPLE_QR.size + 8}`} shape-rendering="crispEdges" role="img" aria-label={t.qrAlt}><rect x="-4" y="-4" width={SAMPLE_QR.size + 8} height={SAMPLE_QR.size + 8} fill="#fff" /><path d={SAMPLE_QR.path} fill="#0b1529" /></svg><figcaption>{t.qrBusiness}</figcaption></figure>
    <div className="wf-qr-info">
      <b>{t.qrTitle}</b><p>{t.qrText}</p>
      <label htmlFor="wf-qr-demo-link">{t.qrLink}</label>
      <input id="wf-qr-demo-link" readOnly value={SAMPLE_LINK} onFocus={e => e.currentTarget.select()} />
      <div className="wf-qr-actions"><button type="button" className="wf-btn" onClick={copyLink}>{t.qrCopy}</button><button type="button" className="wf-qr-secondary" onClick={download}>{t.qrDownload} ↓</button></div>
      <small role="status" aria-live="polite">{status}</small>
    </div>
  </div>
}

function InteractiveDemo({ t }: { t: Copy }) {
  const [tab, setTab] = useState(0)
  const [quantity, setQuantity] = useState(0)
  const [professional, setProfessional] = useState('A')
  const [time, setTime] = useState('10:00 AM')
  const [booking, setBooking] = useState(false)
  const [method, setMethod] = useState(0)
  const [payState, setPayState] = useState<'idle' | 'processing' | 'done'>('idle')
  const [quick, setQuick] = useState(5)
  useEffect(() => {
    if (payState !== 'processing') return
    const timer = window.setTimeout(() => setPayState('done'), 900)
    return () => window.clearTimeout(timer)
  }, [payState])
  const titles = [t.sellTitle, t.bookTitle, t.payTitle, t.manageTitle]
  const texts = [t.sellText, t.bookText, t.payText, t.manageText]
  const tabIcons = ['sales', 'bookings', 'payments', 'reports']
  return <div className="wf-demo" data-reveal>
    <div className="wf-demo-tabs" role="tablist" aria-label={t.explore}>{t.tabs.map((label, i) => <button key={label} id={`wf-demo-tab-${i}`} role="tab" aria-selected={tab === i} aria-controls="wf-demo-panel" tabIndex={tab === i ? 0 : -1} onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const next = (i + (e.key === 'ArrowRight' ? 1 : t.tabs.length - 1)) % t.tabs.length; setTab(next); document.getElementById(`wf-demo-tab-${next}`)?.focus() } }} onClick={() => setTab(i)}><Icon name={tabIcons[i]} />{label}</button>)}<span className="wf-demo-badge">{t.sample}</span></div>
    <div className="wf-demo-content" id="wf-demo-panel" role="tabpanel" aria-labelledby={`wf-demo-tab-${tab}`} tabIndex={0} key={tab}>
      <div className="wf-demo-copy"><span className="wf-num">0{tab + 1}</span><h3>{titles[tab]}</h3><p>{texts[tab]}</p><small>{t.demoNote}</small></div>
      {tab === 0 && <div className="wf-demo-shop">
        <div className="wf-demo-product"><div className="wf-demo-art" aria-hidden="true"><div>WF<span>CARE</span></div><div /></div><small>WEBFACTORY DEMO</small><h4>{t.item}</h4><strong>$29.00</strong><button className="wf-btn" onClick={() => setQuantity(q => q + 1)}>{t.add} +</button></div>
        <div className="wf-demo-cart" aria-live="polite"><h4>{t.yourCart}<span>{quantity}</span></h4>{quantity ? <><p>{quantity} × {t.item}<button aria-label={t.remove} onClick={() => setQuantity(q => Math.max(0, q - 1))}>−</button></p><div className="wf-demo-total"><small>{t.total}</small><strong>${(quantity * 29).toFixed(2)}</strong></div><button className="wf-link" onClick={() => setQuantity(0)}>{t.clear}</button></> : <p className="wf-demo-empty">{t.empty}</p>}</div>
      </div>}
      {tab === 1 && <div className="wf-demo-booking">
        <div className="wf-demo-label">{t.serviceLabel}<div className="wf-demo-field">{t.serviceName}<span>$45 · 30 min</span></div></div>
        <label>{t.professional}<select value={professional} onChange={e => { setProfessional(e.target.value); setBooking(false) }}><option value="A">{t.proA}</option><option value="B">{t.proB}</option></select></label>
        <fieldset><legend>{t.schedule}</legend>{['10:00 AM', '11:30 AM', '2:00 PM'].map(v => <button key={v} aria-pressed={v === time} onClick={() => { setTime(v); setBooking(false) }}>{v}</button>)}</fieldset>
        <button className="wf-btn" onClick={() => setBooking(true)}>{t.book} →</button>
        {booking && <div className="wf-demo-ok" role="status">✓ {t.bookingReady}<small>{professional === 'A' ? t.proA : t.proB} · {time} · $45</small></div>}
      </div>}
      {tab === 2 && <div className="wf-demo-pay">
        <div className="wf-demo-amount"><small>{t.amountLabel}</small><strong>$45.00</strong><span>{t.serviceName}</span></div>
        <fieldset><legend>{t.method}</legend>{[t.card, t.ath].map((m, i) => <button key={m} aria-pressed={method === i} disabled={payState !== 'idle'} onClick={() => setMethod(i)}>{m}</button>)}</fieldset>
        {payState === 'done'
          ? <><div className="wf-demo-ok" role="status">✓ {t.paidSample}<small>{[t.card, t.ath][method]} · $45.00 · {t.noCharge}</small></div><button className="wf-link" onClick={() => setPayState('idle')}>{t.again}</button></>
          : <button className="wf-btn" aria-busy={payState === 'processing'} disabled={payState === 'processing'} onClick={() => setPayState('processing')}>{payState === 'processing' ? t.processing : t.simulate + ' →'}</button>}
      </div>}
      {tab === 3 && <div className="wf-demo-manage">
        <div className="wf-demo-quick">{t.quickActions.map(([label], i) => <button key={label} aria-pressed={quick === i} onClick={() => setQuick(i)}><Icon name={quickIcons[i]} />{label}</button>)}</div>
        {quickIcons[quick] === 'qr' ? <QrShareDemo t={t} /> : <div className="wf-demo-quick-detail" aria-live="polite"><Icon name={quickIcons[quick]} /><div><b>{t.quickActions[quick][0]}</b><p>{t.quickActions[quick][1]}</p></div></div>}
        <a href="/client-admin" className="wf-link accent">{t.openPortal} →</a>
      </div>}
    </div>
  </div>
}

/* ---------- Page ---------- */

/* Hero background video: the original 910x512 H.264 file, shown with object-fit: contain (never cropped or
   stretched) over a navy fill. MP4 is a stream-copy remux of the MOV (identical video stream); MOV is kept as a fallback.
   Sources are attached after the page load event; reduced motion and Save-Data show the poster frame only. */
const HERO_MEDIA = { mp4: '/media/webfactory-hero-original.mp4', mov: '/media/webfactory-hero-original.mov', poster: '/media/webfactory-hero-poster.webp' }

// Preview-only switch used by /preview-review to compare the hero with and without video. Compiled out of production.
const heroVideoDisabledForReview = () => typeof __WF_PREVIEW_REVIEW__ !== 'undefined' && __WF_PREVIEW_REVIEW__ && new URLSearchParams(window.location.search).get('hero-video') === 'off'

function HeroVideo({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData)
  const showVideo = ready && !reduced && !saveData && !failed
  useEffect(() => {
    const start = () => setReady(true)
    if (document.readyState === 'complete') start()
    else window.addEventListener('load', start, { once: true })
    return () => window.removeEventListener('load', start)
  }, [])
  // Play only while the hero is on screen; if autoplay is refused, the poster stays visible.
  useEffect(() => {
    const video = ref.current
    if (!showVideo || !video) return
    video.muted = true
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) video.play().catch(() => {}); else video.pause() })
    observer.observe(video)
    return () => observer.disconnect()
  }, [showVideo])
  return <div className="wf-hero-media" aria-hidden="true">
    {showVideo
      ? <video ref={ref} muted playsInline loop autoPlay preload="auto" poster={HERO_MEDIA.poster} width={910} height={512} disablePictureInPicture><source src={HERO_MEDIA.mp4} type="video/mp4" /><source src={HERO_MEDIA.mov} type="video/quicktime" onError={() => setFailed(true)} /></video>
      : <img src={HERO_MEDIA.poster} alt="" width={910} height={512} decoding="async" />}
    <div className="wf-hero-scrim" />
  </div>
}

export default function HomePage({ lang, setLang }: { lang: Language, setLang: (value: Language) => void }) {
  const t = copy[lang]
  const [menu, setMenu] = useState(false)
  const [step, setStep] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const reduced = usePrefersReducedMotion()
  const [heroVideo] = useState(() => !heroVideoDisabledForReview())
  const rootRef = useRef<HTMLDivElement>(null)
  const tourRef = useRef<HTMLElement>(null)
  const stepRefs = useRef<(HTMLElement | null)[]>([])

  // Active tour step follows the step nearest the middle of the viewport.
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) setStep(Number((entry.target as HTMLElement).dataset.step)) })
    }, { rootMargin: '-45% 0px -45% 0px' })
    stepRefs.current.forEach(el => el && observer.observe(el))
    return () => observer.disconnect()
  }, [lang])

  // Reveal-on-scroll and scroll-linked depth. Passive listeners only: scrolling is never blocked.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const reveal = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in'); reveal.unobserve(entry.target) } })
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 })
    root.querySelectorAll('[data-reveal]:not(.in)').forEach(el => reveal.observe(el))
    let frame = 0
    const update = () => {
      frame = 0
      const y = window.scrollY
      setScrolled(y > 8)
      if (reduced) return
      root.style.setProperty('--hero-p', Math.min(1, y / Math.max(1, window.innerHeight)).toFixed(3))
      const tour = tourRef.current
      if (tour) {
        const rect = tour.getBoundingClientRect()
        const p = Math.min(1, Math.max(0, (window.innerHeight * 0.5 - rect.top) / Math.max(1, rect.height)))
        root.style.setProperty('--tour-p', p.toFixed(3))
      }
    }
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => { reveal.disconnect(); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (frame) window.cancelAnimationFrame(frame) }
  }, [reduced, lang])

  const goToStep = (i: number) => stepRefs.current[i]?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })
  const nav = ['#plataforma', '#recorrido', '#explorar', '#planes']

  return <div ref={rootRef} className={'wf-premium-home' + (reduced ? '' : ' motion')} id="top" style={{ '--step': step } as CSSProperties}>
    <header className={'wf-h-header' + (scrolled ? ' scrolled' : '')}>
      <div className="wf-h-header-inner">
        <a href="/" className="wf-h-logo"><AdaptiveLogo alt="WebFactory PR" /></a>
        <nav id="wf-main-nav" className={menu ? 'open' : ''} aria-label={t.mainNav}>{t.nav.map((label, i) => <a key={label} href={nav[i]} onClick={() => setMenu(false)}>{label}</a>)}<a href="/templates" onClick={() => setMenu(false)}>{t.templatesNav}</a></nav>
        <div className="wf-h-actions">
          <div className="wf-h-languages" role="group" aria-label="Language / Idioma"><button aria-pressed={lang === 'en'} onClick={() => setLang('en')}>EN</button><button aria-pressed={lang === 'es'} onClick={() => setLang('es')}>ES</button></div>
          <ThemeToggle />
          <a className="wf-h-login" href="/client-admin">{t.login}</a>
          <button className="wf-h-menu" aria-label={t.menu} aria-controls="wf-main-nav" aria-expanded={menu} onClick={() => setMenu(!menu)}><span /><span /></button>
        </div>
      </div>
    </header>

    <main>
      <section className={'wf-hero' + (heroVideo ? ' has-video' : '')}>
        {heroVideo && <HeroVideo reduced={reduced} />}
        <div className="wf-hero-glow" aria-hidden="true" />
        <div className="wf-shell wf-hero-grid">
          <div className="wf-hero-copy">
            <p className="wf-eyebrow"><span className="wf-dot" />{t.eyebrow}</p>
            <h1>{t.title}<em>{t.accent}</em></h1>
            <p className="wf-lead">{t.lead}</p>
            <ul className="wf-hero-modules" aria-label={t.platformLabel}>{t.modules.map((m, i) => <li key={m} style={{ '--i': i } as CSSProperties}><Icon name={moduleIcons[i]} />{m}</li>)}</ul>
            <div className="wf-actions"><a className="wf-btn" href="/builder">{t.start}<span aria-hidden="true">↗</span></a><a className="wf-link" href="/templates">{t.templates} →</a></div>
            <p className="wf-trial">{t.trial}</p>
          </div>
          <div className="wf-hero-visual">
            <div className="wf-hero-stage" role="img" aria-label={t.heroAlt}><ControlFrame t={t} step={4} only /></div>
            <div className="wf-float wf-float-a" aria-hidden="true"><Icon name="website" /><span>{t.modules[0]}<small>EN · ES</small></span></div>
            <div className="wf-float wf-float-b" aria-hidden="true"><Icon name="bookings" /><span>{t.bookingSample}<small>10:00 AM · {t.confirmed}</small></span></div>
            <div className="wf-float wf-float-c" aria-hidden="true"><Icon name="payments" /><span>{t.paid}<small>$45.00 · {t.sample}</small></span></div>
          </div>
        </div>
        <a className="wf-scroll-cue" href="#recorrido"><span aria-hidden="true" />{t.scroll}</a>
      </section>

      <section className="wf-tour" id="recorrido" ref={tourRef} aria-labelledby="wf-tour-title">
        <div className="wf-shell">
          <div className="wf-heading" data-reveal><p className="wf-eyebrow">{t.tourLabel}</p><h2 id="wf-tour-title">{t.tourTitle}</h2><p>{t.tourText}</p></div>
          <div className="wf-tour-grid">
            <ol className="wf-tour-steps">
              {t.steps.map(([short, title, text], i) => <li key={i} ref={el => { stepRefs.current[i] = el }} data-step={i} className={'wf-tour-step' + (i === step ? ' on' : '')} aria-current={i === step ? 'step' : undefined}>
                <div className="wf-tour-text"><span className="wf-num">0{i + 1} · {short}</span><h3>{title}</h3><p>{text}</p></div>
                <div className="wf-tour-inline" aria-hidden="true"><ControlFrame t={t} step={i} only /></div>
              </li>)}
            </ol>
            <div className="wf-tour-stage">
              <div className="wf-tour-light" aria-hidden="true" />
              <div aria-hidden="true"><ControlFrame t={t} step={step} /></div>
              <nav className="wf-tour-rail" aria-label={t.tourLabel}><i aria-hidden="true" />{t.steps.map(([short], i) => <button key={i} className={i <= step ? 'done' : ''} aria-label={`${t.goTo} ${i + 1}: ${short}`} aria-current={i === step ? 'step' : undefined} onClick={() => goToStep(i)}>{short}</button>)}</nav>
            </div>
          </div>
        </div>
      </section>

      <section className="wf-section wf-shell" id="plataforma">
        <div className="wf-heading" data-reveal><p className="wf-eyebrow">{t.platformLabel}</p><h2>{t.platformTitle}</h2></div>
        <div className="wf-platform">{t.platform.map(([title, text], i) => <article key={i} data-reveal style={{ '--i': i } as CSSProperties}><span className="wf-platform-icon"><Icon name={moduleIcons[i]} /></span><h3>{title}</h3><p>{text}</p></article>)}</div>
        <div className="wf-also" data-reveal><b>{t.alsoLabel}</b>{t.also.map(a => <span key={a}>{a}</span>)}</div>
      </section>

      <section className="wf-section wf-shell" id="explorar">
        <div className="wf-heading" data-reveal><p className="wf-eyebrow">{t.explore}</p><h2>{t.exploreTitle}</h2><p>{t.exploreText}</p></div>
        <InteractiveDemo t={t} />
      </section>

      <section className="wf-section wf-shell" id="como-funciona">
        <div className="wf-heading" data-reveal><p className="wf-eyebrow">{t.howLabel}</p><h2>{t.howTitle}</h2></div>
        <div className="wf-how">{t.how.map(([title, text], i) => <article key={i} data-reveal style={{ '--i': i } as CSSProperties}><span>0{i + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className="wf-section wf-shell" id="planes">
        <div className="wf-pricing" data-reveal>
          <div><p className="wf-eyebrow">{t.priceLabel}</p><h2>{t.priceTitle}</h2><p>{t.priceText}</p><span>{t.noCommission}</span></div>
          <div className="wf-price"><strong>$30<small>{t.perMonth}</small></strong><p>{t.annual}</p><a className="wf-btn" href="/builder">{t.start}<span aria-hidden="true">↗</span></a><small>{t.trialShort}</small></div>
        </div>
        <div className="wf-faq">{t.faq.map(([q, a]) => <details key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}</div>
      </section>

      <section className="wf-final wf-shell" data-reveal>
        <h2>{t.finalTitle}</h2><p>{t.finalText}</p>
        <div className="wf-actions"><a className="wf-btn" href="/builder">{t.start}<span aria-hidden="true">↗</span></a><a className="wf-link" href="/client-admin">{t.login} →</a></div>
      </section>
    </main>

    <footer className="wf-footer wf-shell">
      <div><a className="wf-h-logo" href="/"><AdaptiveLogo alt="WebFactory PR" /></a><p>{t.footer}</p><small>© 2026 WebFactory PR</small></div>
      <nav aria-label={t.legalNav}><a href="mailto:info@webfactorypr.com">info@webfactorypr.com</a>{t.legal.map((s, i) => <a key={s} href={['/privacy', '/terms', '/refund-policy'][i]}>{s}</a>)}<FeedbackPreferences lang={lang} /></nav>
    </footer>
  </div>
}
