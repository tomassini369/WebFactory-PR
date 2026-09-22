import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { demoBySlug, type DemoItem } from './demoData'
import { demoUi, localizeDemo, type DemoLanguage, type DemoUi } from './demoI18n'
import './demo.css'

type CartLine = { item: DemoItem; quantity: number }

const money = (value: number, language: DemoLanguage) =>
  new Intl.NumberFormat(language === 'es' ? 'es-US' : 'en-US', { style: 'currency', currency: 'USD' }).format(value)

function DemoNotice({ ui }: { ui: DemoUi }) {
  return (
    <div className="wf-demo-notice">
      <a href="/templates">← WebFactory PR</a>
      <span>{ui.demoNotice}</span>
      <a href="/#builder">{ui.createWebsite}</a>
    </div>
  )
}

function CatalogCard({
  item,
  accent,
  onView,
  onAdd,
  onBook,
  language,
  ui,
}: {
  item: DemoItem
  accent: string
  onView: () => void
  onAdd: () => void
  onBook: () => void
  language: DemoLanguage
  ui: DemoUi
}) {
  const price = item.displayPrice ?? money(item.price, language)
  const typeLabel = { product: ui.product, service: ui.serviceType, listing: ui.listing, class: ui.classType }[item.type]
  return (
    <article className="demo-catalog-card">
      <button className="demo-card-image" onClick={onView} aria-label={`${ui.view} ${item.name}`}>
        <img src={item.image} alt="" loading="lazy" />
        {item.badge && <span style={{ background: accent }}>{item.badge}</span>}
      </button>
      <div className="demo-card-copy">
        <div>
          <small>{typeLabel}</small>
          <h3>{item.name}</h3>
        </div>
        <strong>{price}</strong>
        <p>{item.description}</p>
        <div className="demo-card-actions">
          <button className="demo-outline" onClick={onView}>{ui.view}</button>
          {item.appointment ? (
            <button className="demo-solid" onClick={onBook}>{ui.reserve}</button>
          ) : item.purchasable !== false ? (
            <button className="demo-solid" onClick={onAdd}>{ui.add}</button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function DemoSite({ slug }: { slug: string }) {
  const baseConfig = demoBySlug(slug)
  const [language, setLanguage] = useState<DemoLanguage>(() => {
    const saved = window.localStorage.getItem('webfactory-demo-language')
    return saved === 'en' ? 'en' : 'es'
  })
  const config = useMemo(() => baseConfig ? localizeDemo(baseConfig, language) : undefined, [baseConfig, language])
  const ui = demoUi[language]
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<DemoItem | null>(null)
  const [bookingItem, setBookingItem] = useState<DemoItem | null>(null)
  const [cart, setCart] = useState<CartLine[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [bookingStage, setBookingStage] = useState<'selection' | 'checkout' | 'verified' | 'confirmed'>('selection')
  const [bookingPaymentMethod, setBookingPaymentMethod] = useState<'stripe' | 'ath'>('stripe')
  const [bookingCustomerName, setBookingCustomerName] = useState<string>(ui.defaultCustomer)
  const [bookingCustomerEmail, setBookingCustomerEmail] = useState('demo@example.com')
  const [checkoutComplete, setCheckoutComplete] = useState(false)

  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.item.price * line.quantity, 0),
    [cart],
  )

  useEffect(() => {
    document.body.classList.toggle('demo-overlay-open', Boolean(selectedItem || bookingItem || cartOpen || catalogOpen))
    return () => document.body.classList.remove('demo-overlay-open')
  }, [selectedItem, bookingItem, cartOpen, catalogOpen])

  useEffect(() => {
    window.localStorage.setItem('webfactory-demo-language', language)
    document.documentElement.lang = language
  }, [language])

  useEffect(() => {
    if (!config) return
    setCart((current) => current.map((line) => ({
      ...line,
      item: config.items.find((item) => item.id === line.item.id) ?? line.item,
    })))
    setSelectedItem((current) => current ? config.items.find((item) => item.id === current.id) ?? current : null)
    setBookingItem((current) => current ? config.items.find((item) => item.id === current.id) ?? current : null)
  }, [config])

  useEffect(() => {
    if (!config) return
    document.title = `${config.name} — WebFactory Template`
  }, [config])

  if (!config) {
    return (
      <main className="demo-not-found">
        <h1>{ui.notFound}</h1>
        <a href="/templates">{ui.returnWebFactory}</a>
      </main>
    )
  }

  const showcaseFeatures = Array.from(new Set([...config.features, 'WhatsApp', 'Direct calls', 'Social media', 'Contact form', 'Google Maps', 'Google Calendar']))

  const styles = {
    '--demo-accent': config.accent,
    '--demo-accent-2': config.accent2,
    '--demo-dark': config.dark,
    '--demo-cream': config.cream,
  } as CSSProperties

  const addToCart = (item: DemoItem) => {
    setCart((current) => {
      const existing = current.find((line) => line.item.id === item.id)
      if (existing) {
        return current.map((line) =>
          line.item.id === item.id ? { ...line, quantity: line.quantity + 1 } : line,
        )
      }
      return [...current, { item, quantity: 1 }]
    })
    setSelectedItem(null)
    setCartOpen(true)
    setCheckoutComplete(false)
  }

  const removeFromCart = (id: string) =>
    setCart((current) => current.filter((line) => line.item.id !== id))

  const startBooking = (item?: DemoItem) => {
    const target = item ?? config.items.find((entry) => entry.appointment)
    if (!target) return
    setSelectedItem(null)
    setBookingItem(target)
    setSelectedEmployee('')
    setSelectedDate('')
    setSelectedTime('')
    setBookingStage('selection')
    setBookingPaymentMethod('stripe')
    setBookingCustomerName(ui.defaultCustomer)
    setBookingCustomerEmail('demo@example.com')
  }

  const employeesForBooking = bookingItem?.employees?.length
    ? config.employees.filter((employee) =>
        bookingItem.employees?.some((name) => employee.name.startsWith(name)),
      )
    : config.employees

  const bookingCharge = bookingItem ? (bookingItem.deposit ?? bookingItem.price) : 0
  const bookingRequiresPayment = bookingCharge > 0
  const bookingPaymentLabel = bookingItem?.deposit
    ? `${ui.deposit} · ${money(bookingCharge, language)}`
    : bookingRequiresPayment
      ? `${ui.fullPayment} · ${money(bookingCharge, language)}`
      : ui.noPayment

  const continueDemoBooking = () => {
    if (!selectedDate || !selectedTime || (employeesForBooking.length > 0 && !selectedEmployee)) return
    setBookingStage(bookingRequiresPayment ? 'checkout' : 'verified')
  }

  const verifyDemoPayment = () => {
    if (!bookingCustomerName.trim() || !bookingCustomerEmail.trim()) return
    setBookingStage('verified')
  }

  return (
    <div className="demo-site" style={styles}>
      <DemoNotice ui={ui} />

      <header className="demo-header">
        <a className="demo-brand" href="#demo-top">{config.shortName}</a>
        <button className="demo-menu-button" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen}>
          {ui.menu}
        </button>
        <nav className={menuOpen ? 'open' : ''}>
          <a href="#services" onClick={() => setMenuOpen(false)}>{ui.services}</a>
          {config.employees.length > 0 && <a href="#team" onClick={() => setMenuOpen(false)}>{ui.team}</a>}
          <a href="#about" onClick={() => setMenuOpen(false)}>{ui.about}</a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>{ui.contact}</a>
        </nav>
        <div className="demo-header-actions">
          <div className="demo-languages" role="group" aria-label={ui.language}>
            <button className={language === 'es' ? 'active' : ''} onClick={() => setLanguage('es')} aria-pressed={language === 'es'}>ES</button>
            <button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')} aria-pressed={language === 'en'}>EN</button>
          </div>
          {config.bookingEnabled && <button className="demo-outline" onClick={() => startBooking()}>{config.bookingLabel}</button>}
          {config.cartEnabled && (
            <button className="demo-cart-button" onClick={() => setCartOpen(true)}>
              {ui.cart} <b>{cart.reduce((sum, line) => sum + line.quantity, 0)}</b>
            </button>
          )}
        </div>
      </header>

      <main id="demo-top">
        <section className="demo-hero">
          <img src={config.heroImage} alt="" />
          <div className="demo-hero-overlay" />
          <div className="demo-hero-content">
            <p>{config.kicker}</p>
            <h1>{config.headline}</h1>
            <span>{config.description}</span>
            <div className="demo-hero-actions">
              {config.bookingEnabled && <button className="demo-solid large" onClick={() => startBooking()}>{config.bookingLabel}</button>}
              <button className="demo-glass large" onClick={() => setCatalogOpen(true)}>{config.cartEnabled ? ui.exploreCatalog : ui.viewServices}</button>
            </div>
          </div>
          <aside className="demo-hero-meta">
            <div><small>{ui.location}</small><strong>{config.location}</strong></div>
            <div><small>{ui.hours}</small><strong>{config.hours}</strong></div>
            <div><small>{ui.call}</small><strong>{config.phone}</strong></div>
          </aside>
        </section>

        <section className="demo-feature-strip">
          {showcaseFeatures.map((feature, index) => (
            <div key={feature}>
              <span>0{index + 1}</span>
              <strong>{feature}</strong>
            </div>
          ))}
        </section>

        <section className="demo-section demo-catalog" id="services">
          <div className="demo-section-heading">
            <div>
              <small>{config.category.toUpperCase()} · {ui.experience}</small>
              <h2>{config.cartEnabled ? ui.commerceHeading : ui.servicesHeading}</h2>
            </div>
            <p>{ui.catalogIntro}</p>
          </div>
          <div className="demo-catalog-gateway">
            <div><small>{ui.catalogAvailable}</small><strong>{config.items.length} {ui.productsServices}</strong><span>{ui.catalogHint}</span></div>
            <button className="demo-solid" onClick={() => setCatalogOpen(true)}>{ui.viewCatalog}</button>
          </div>
        </section>

        {config.employees.length > 0 && (
          <section className="demo-section demo-team-section" id="team">
            <div className="demo-section-heading">
              <div>
                <small>{ui.teamLabel}</small>
                <h2>{ui.teamHeading}</h2>
              </div>
              <p>{ui.teamIntro}</p>
            </div>
            <div className="demo-team-grid">
              {config.employees.map((employee) => (
                <article key={employee.id}>
                  <span>{employee.initials}</span>
                  <small>{employee.role}</small>
                  <h3>{employee.name}</h3>
                  <div>{employee.services.map((service) => <b key={service}>{service}</b>)}</div>
                  <button onClick={() => {
                    const matching = config.items.find((item) => item.appointment && item.employees?.some((name) => employee.name.startsWith(name)))
                    if (matching) startBooking(matching)
                  }}>{ui.viewAvailability}</button>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="demo-story" id="about">
          <div className="demo-story-copy">
            <small>{ui.aboutDemo}</small>
            <h2>{config.aboutTitle}</h2>
            <p>{config.aboutText}</p>
            <div className="demo-trust-row">
              {config.trust.map((item) => <span key={item}>✓ {item}</span>)}
            </div>
          </div>
          <div className="demo-story-images">
            <img src={config.gallery[0]} alt="" loading="lazy" />
            <img src={config.gallery[1]} alt="" loading="lazy" />
          </div>
        </section>

        <section className="demo-gallery">
          {config.gallery.map((image, index) => (
            <figure key={image} className={index === 0 ? 'wide' : ''}>
              <img src={image} alt="" loading="lazy" />
            </figure>
          ))}
        </section>

        <section className="demo-booking-showcase">
          <div>
            <small>{ui.livePreview}</small>
            <h2>{config.bookingEnabled ? ui.bookingPreview : ui.commercePreview}</h2>
            <p>{ui.interactHint}</p>
          </div>
          <div className="demo-showcase-card">
            <span className="demo-pulse" />
            <small>{ui.demoMode}</small>
            <strong>{config.bookingEnabled ? ui.availabilityReady : ui.commerceReady}</strong>
            <div>
              {config.bookingEnabled && <button className="demo-solid" onClick={() => startBooking()}>{config.bookingLabel}</button>}
              {config.cartEnabled && <button className="demo-outline" onClick={() => setCartOpen(true)}>{ui.openCart}</button>}
            </div>
          </div>
        </section>

        <section className="demo-contact" id="contact">
          <div>
            <small>{ui.visitContact}</small>
            <h2>{config.name}</h2>
            <p>{config.location}</p>
          </div>
          <div className="demo-contact-grid">
            <article><small>{ui.phone}</small><strong>{config.phone}</strong></article>
            <article><small>{ui.hours}</small><strong>{config.hours}</strong></article>
            <article><small>{ui.status}</small><strong>{ui.fictionalBusiness}</strong></article>
          </div>
          <div className="demo-map-faux">
            <span>{ui.mapPreview}</span>
            <i />
            <b>{config.location}</b>
          </div>
          <div className="demo-function-showcase">
            <article><small>WHATSAPP</small><strong>Chat directo</strong><span>Ejemplo de acceso rápido al número configurado.</span></article>
            <article><small>CALL</small><strong>Llamada con un toque</strong><span>El teléfono del negocio abre la función de llamadas.</span></article>
            <article><small>SOCIAL</small><strong>Instagram · Facebook · X</strong><span>Las redes activas aparecen como enlaces públicos.</span></article>
            <article><small>FORM</small><strong>Formulario de contacto</strong><span>El visitante puede enviar un mensaje al email del negocio.</span></article>
            <article><small>MAPS</small><strong>Google Maps</strong><span>La ubicación configurada se enlaza desde la página.</span></article>
            <article><small>CALENDAR</small><strong>Google Calendar</strong><span>Ejemplo de sincronización con disponibilidad y reservaciones.</span></article>
          </div>
        </section>
      </main>

      <footer className="demo-footer">
        <div><strong>{config.shortName}</strong><span>{config.category} · {ui.demoBy}</span></div>
        <nav><a href={`/builder?template=${config.slug}`}>{language==='es'?'Usar este Template':'Use this Template'} →</a><a href="/templates">{ui.moreDemos}</a></nav>
      </footer>

      {catalogOpen && (
        <div className="demo-modal-backdrop" role="presentation" onMouseDown={() => setCatalogOpen(false)}>
          <section className="demo-catalog-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div><small>{ui.catalog}</small><h2>{ui.catalogTitle}</h2><p>{ui.catalogSelect}</p></div>
              <button className="demo-modal-close catalog-close" onClick={() => setCatalogOpen(false)}>×</button>
            </header>
            <div className="demo-catalog-modal-grid">
              {config.items.map((item) => (
                <CatalogCard
                  key={item.id}
                  item={item}
                  accent={config.accent}
                  onView={() => { setCatalogOpen(false); setSelectedItem(item) }}
                  onAdd={() => { setCatalogOpen(false); addToCart(item) }}
                  onBook={() => { setCatalogOpen(false); startBooking(item) }}
                  language={language}
                  ui={ui}
                />
              ))}
            </div>
          </section>
        </div>
      )}

      {selectedItem && (
        <div className="demo-modal-backdrop" role="presentation" onMouseDown={() => setSelectedItem(null)}>
          <article className="demo-detail-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <button className="demo-modal-close" onClick={() => setSelectedItem(null)}>×</button>
            <div className="demo-detail-image"><img src={selectedItem.image} alt="" /></div>
            <div className="demo-detail-copy">
              <small>{({ product: ui.product, service: ui.serviceType, listing: ui.listing, class: ui.classType }[selectedItem.type]).toUpperCase()} · {ui.detail}</small>
              <h2>{selectedItem.name}</h2>
              <strong>{selectedItem.displayPrice ?? money(selectedItem.price, language)}</strong>
              <p>{selectedItem.description}</p>
              {selectedItem.duration && <span>{ui.duration} · {selectedItem.duration} min</span>}
              {selectedItem.deposit ? <span>{ui.deposit} · {money(selectedItem.deposit, language)}</span> : null}
              {selectedItem.groupCapacity ? <span>{ui.groupCapacity} · {selectedItem.groupCapacity}</span> : null}
              {selectedItem.employees?.length ? <span>{ui.availableWith} · {selectedItem.employees.join(', ')}</span> : null}
              <div className="demo-detail-actions">
                {selectedItem.appointment ? (
                  <button className="demo-solid" onClick={() => startBooking(selectedItem)}>{ui.reserve}</button>
                ) : selectedItem.purchasable !== false ? (
                  <button className="demo-solid" onClick={() => addToCart(selectedItem)}>{ui.addToCart}</button>
                ) : null}
                <button className="demo-outline" onClick={() => setSelectedItem(null)}>{ui.close}</button>
              </div>
            </div>
          </article>
        </div>
      )}

      {cartOpen && (
        <div className="demo-modal-backdrop cart-backdrop" role="presentation" onMouseDown={() => setCartOpen(false)}>
          <aside className="demo-cart-drawer" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div><small>{ui.demoCart}</small><h2>{ui.selections}</h2></div>
              <button onClick={() => setCartOpen(false)}>×</button>
            </header>
            <div className="demo-cart-lines">
              {cart.length === 0 ? (
                <div className="demo-empty-cart"><strong>{ui.emptyCart}</strong><span>{ui.emptyCartHint}</span></div>
              ) : cart.map((line) => (
                <article key={line.item.id}>
                  <img src={line.item.image} alt="" />
                  <div><strong>{line.item.name}</strong><span>{money(line.item.price, language)} · {ui.qty} {line.quantity}</span></div>
                  <button onClick={() => removeFromCart(line.item.id)}>{ui.remove}</button>
                </article>
              ))}
            </div>
            <div className="demo-cart-summary">
              <span>{ui.subtotal} <b>{money(subtotal, language)}</b></span>
              <span>{ui.taxes} <b>{ui.calculatedCheckout}</b></span>
              <strong>{ui.totalPreview} <b>{money(subtotal, language)}</b></strong>
            </div>
            <div className="demo-payment-options">
              <button>Stripe</button><button>ATH Móvil</button>
            </div>
            <button
              className="demo-solid demo-checkout"
              disabled={cart.length === 0}
              onClick={() => setCheckoutComplete(true)}
            >
              {ui.demoCheckout}
            </button>
            {checkoutComplete && <p className="demo-success">{ui.checkoutSuccess}</p>}
            <small className="demo-safe-note">{ui.backendPricing}</small>
          </aside>
        </div>
      )}

      {bookingItem && (
        <div className="demo-modal-backdrop" role="presentation" onMouseDown={() => setBookingItem(null)}>
          <article className="demo-booking-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <button className="demo-modal-close" onClick={() => setBookingItem(null)}>×</button>

            <div className="demo-booking-progress" aria-label={ui.bookingProgress}>
              {[
                ['selection',ui.select],
                ['checkout',ui.checkout],
                ['verified',ui.verify],
                ['confirmed',ui.confirmed],
              ].map(([stage,label],index) => {
                const order = ['selection','checkout','verified','confirmed']
                const current = order.indexOf(bookingStage)
                return <span key={stage} className={index <= current ? 'active' : ''}><b>{index + 1}</b>{label}</span>
              })}
            </div>

            {bookingStage === 'selection' && (
              <>
                <header>
                  <small>{ui.demoBooking}</small>
                  <h2>{bookingItem.name}</h2>
                  <p>{bookingItem.duration ? `${bookingItem.duration} min` : ui.appointment} · {bookingPaymentLabel}</p>
                </header>

                {employeesForBooking.length > 0 && (
                  <section>
                    <strong>1 · {ui.chooseProfessional}</strong>
                    <div className="demo-choice-grid">
                      <button className={selectedEmployee === 'any' ? 'selected' : ''} onClick={() => setSelectedEmployee('any')}>{ui.anyAvailable}</button>
                      {employeesForBooking.map((employee) => (
                        <button key={employee.id} className={selectedEmployee === employee.name ? 'selected' : ''} onClick={() => setSelectedEmployee(employee.name)}>
                          {employee.name}<small>{employee.role}</small>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <strong>{employeesForBooking.length > 0 ? '2' : '1'} · {ui.chooseDate}</strong>
                  <div className="demo-date-row">
                    {ui.dates.map((date, index) => (
                      <button key={date} className={selectedDate === String(index) ? 'selected' : ''} onClick={() => setSelectedDate(String(index))}>{date}</button>
                    ))}
                  </div>
                </section>

                <section>
                  <strong>{employeesForBooking.length > 0 ? '3' : '2'} · {ui.chooseTime}</strong>
                  <div className="demo-time-grid">
                    {['9:00 AM','10:30 AM','1:00 PM','3:30 PM','5:00 PM'].map((time, index) => (
                      <button key={time} disabled={index === 1} className={selectedTime === time ? 'selected' : ''} onClick={() => setSelectedTime(time)}>
                        {time}{index === 1 && <small>{ui.busy}</small>}
                      </button>
                    ))}
                  </div>
                </section>

                {selectedTime && (
                  <div className="demo-hold">
                    <span>{ui.bookingHold}</span>
                    <strong>10:00</strong>
                  </div>
                )}

                <button
                  className="demo-solid demo-confirm-booking"
                  disabled={!selectedDate || !selectedTime || (employeesForBooking.length > 0 && !selectedEmployee)}
                  onClick={continueDemoBooking}
                >
                  {bookingRequiresPayment ? ui.continueCheckout : ui.continueNoPayment}
                </button>
                <small className="demo-safe-note">{ui.holdSafe}</small>
              </>
            )}

            {bookingStage === 'checkout' && (
              <div className="demo-booking-checkout">
                <header>
                  <small>{ui.demoCheckoutLabel}</small>
                  <h2>{ui.completeFlow}</h2>
                  <p>{ui.noPaymentInfo}</p>
                </header>

                <div className="demo-booking-order">
                  <span><b>{ui.service}</b><strong>{bookingItem.name}</strong></span>
                  <span><b>{ui.professional}</b><strong>{selectedEmployee === 'any' ? ui.anyAvailable : selectedEmployee}</strong></span>
                  <span><b>{ui.dateTime}</b><strong>{ui.dates[Number(selectedDate)]} · {selectedTime}</strong></span>
                  <span><b>{bookingItem.deposit ? ui.depositDue : ui.amountDue}</b><strong>{money(bookingCharge, language)}</strong></span>
                </div>

                <div className="demo-customer-grid">
                  <label><span>{ui.name}</span><input value={bookingCustomerName} onChange={(event)=>setBookingCustomerName(event.target.value)} /></label>
                  <label><span>{ui.email}</span><input type="email" value={bookingCustomerEmail} onChange={(event)=>setBookingCustomerEmail(event.target.value)} /></label>
                </div>

                <section className="demo-payment-step">
                  <strong>{ui.choosePayment}</strong>
                  <div className="demo-payment-options booking">
                    <button className={bookingPaymentMethod === 'stripe' ? 'selected' : ''} onClick={() => setBookingPaymentMethod('stripe')}>Stripe</button>
                    <button className={bookingPaymentMethod === 'ath' ? 'selected' : ''} onClick={() => setBookingPaymentMethod('ath')}>ATH Móvil</button>
                  </div>
                </section>

                <div className="demo-hold">
                  <span>{ui.bookingHold}</span>
                  <strong>10:00</strong>
                </div>

                <div className="demo-booking-actions">
                  <button className="demo-outline" onClick={() => setBookingStage('selection')}>{ui.back}</button>
                  <button className="demo-solid" disabled={!bookingCustomerName.trim() || !bookingCustomerEmail.trim()} onClick={verifyDemoPayment}>{ui.simulatePayment}</button>
                </div>
                <small className="demo-safe-note">{ui.noExternalRecord}</small>
              </div>
            )}

            {bookingStage === 'verified' && (
              <div className="demo-booking-verified">
                <span>✓</span>
                <small>{bookingRequiresPayment ? ui.paymentVerified : ui.noPaymentRequired}</small>
                <h2>{ui.readyConfirm}</h2>
                <p>{ui.verifiedIntro}</p>
                <div>
                  <b>{ui.revalidated}</b>
                  <b>{ui.holdActive}</b>
                  {bookingRequiresPayment ? <b>✓ {bookingPaymentMethod === 'stripe' ? 'Stripe' : 'ATH Móvil'} {ui.paymentVerifiedLine}</b> : <b>{ui.paymentSkipped}</b>}
                  <b>{ui.calendarPassed}</b>
                </div>
                <button className="demo-solid" onClick={() => setBookingStage('confirmed')}>{ui.confirmBooking}</button>
                <small className="demo-safe-note">{ui.checksVisual}</small>
              </div>
            )}

            {bookingStage === 'confirmed' && (
              <div className="demo-booking-confirmed">
                <span>✓</span>
                <small>{ui.demoConfirmed}</small>
                <h2>{ui.bookingComplete}</h2>
                <p>{bookingItem.name} · {ui.dates[Number(selectedDate)]} · {selectedTime}</p>
                <b>{selectedEmployee && selectedEmployee !== 'any' ? selectedEmployee : ui.anyAvailable}</b>
                <div className="demo-confirmation-receipt">
                  <span>{ui.bookingStatus} <b>{ui.confirmedDemo}</b></span>
                  <span>{ui.payment} <b>{bookingRequiresPayment ? ui.verifiedDemo : ui.notRequired}</b></span>
                  <span>{ui.calendar} <b>{ui.eventReady}</b></span>
                </div>
                <button className="demo-outline" onClick={() => setBookingItem(null)}>{ui.done}</button>
                <small className="demo-safe-note">{ui.nothingCreated}</small>
              </div>
            )}
          </article>
        </div>
      )}

    </div>
  )
}

export default DemoSite
