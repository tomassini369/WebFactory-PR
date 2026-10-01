import TemplateLayout from './TemplateLayout'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { templateBySlug, templateVisualStyle, type TemplateItem } from './templateData'
import { templateUi, localizeTemplate, type TemplateLanguage, type TemplateUi } from './templateI18n'
import MonthCalendar from './MonthCalendar'
import './template-preview.css'

type CartLine = { item: TemplateItem; quantity: number }

const money = (value: number, language: TemplateLanguage) =>
  new Intl.NumberFormat(language === 'es' ? 'es-US' : 'en-US', { style: 'currency', currency: 'USD' }).format(value)

function TemplateNotice({ ui }: { ui: TemplateUi }) {
  return (
    <div className="wf-template-notice">
      <a href="/templates">← WebFactory PR</a>
      <span>{ui.templateNotice}</span>
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
  item: TemplateItem
  accent: string
  onView: () => void
  onAdd: () => void
  onBook: () => void
  language: TemplateLanguage
  ui: TemplateUi
}) {
  const price = item.displayPrice ?? money(item.price, language)
  const typeLabel = { product: ui.product, service: ui.serviceType, listing: ui.listing, class: ui.classType }[item.type]
  return (
    <article className="template-catalog-card">
      <button className="template-card-image" onClick={onView} aria-label={`${ui.view} ${item.name}`}>
        <img src={item.image} alt="" loading="lazy" />
        {item.badge && <span style={{ background: accent }}>{item.badge}</span>}
      </button>
      <div className="template-card-copy">
        <div>
          <small>{typeLabel}</small>
          <h3>{item.name}</h3>
        </div>
        <strong>{price}</strong>
        <p>{item.description}</p>
        <div className="template-card-actions">
          <button className="template-outline" onClick={onView}>{ui.view}</button>
          {item.appointment ? (
            <button className="template-solid" onClick={onBook}>{ui.reserve}</button>
          ) : item.purchasable !== false ? (
            <button className="template-solid" onClick={onAdd}>{ui.add}</button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function TemplateSite({ slug }: { slug: string }) {
  const baseConfig = templateBySlug(slug)
  const [language, setLanguage] = useState<TemplateLanguage>(() => {
    const saved = window.localStorage.getItem('webfactory-template-language')
    return saved === 'es' ? 'es' : 'en'
  })
  const config = useMemo(() => baseConfig ? localizeTemplate(baseConfig, language) : undefined, [baseConfig, language])
  const ui = templateUi[language]
  const [selectedItem, setSelectedItem] = useState<TemplateItem | null>(null)
  const [bookingItem, setBookingItem] = useState<TemplateItem | null>(null)
  const [cart, setCart] = useState<CartLine[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [calendarView, setCalendarView] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Puerto_Rico', year: 'numeric', month: '2-digit' }).formatToParts(new Date()).reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {} as Record<string, string>)
    return `${parts.year}-${parts.month}`
  })
  const [selectedTime, setSelectedTime] = useState('')
  const [bookingStage, setBookingStage] = useState<'selection' | 'checkout' | 'verified' | 'confirmed'>('selection')
  const [bookingPaymentMethod, setBookingPaymentMethod] = useState<'stripe' | 'ath'>('stripe')
  const [bookingCustomerName, setBookingCustomerName] = useState<string>(ui.defaultCustomer)
  const [bookingCustomerEmail, setBookingCustomerEmail] = useState('template@example.com')
  const [checkoutComplete, setCheckoutComplete] = useState(false)

  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.item.price * line.quantity, 0),
    [cart],
  )

  useEffect(() => {
    document.body.classList.toggle('template-overlay-open', Boolean(selectedItem || bookingItem || cartOpen || catalogOpen))
    return () => document.body.classList.remove('template-overlay-open')
  }, [selectedItem, bookingItem, cartOpen, catalogOpen])

  useEffect(() => {
    window.localStorage.setItem('webfactory-template-language', language)
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
      <main className="template-not-found">
        <h1>{ui.notFound}</h1>
        <a href="/templates">{ui.returnWebFactory}</a>
      </main>
    )
  }

  const showcaseFeatures = Array.from(new Set([...config.features, language === 'es' ? 'Calendario mensual de disponibilidad' : 'Monthly availability calendar', 'WhatsApp', 'Direct calls', 'Social media', 'Contact form', 'Google Maps', 'Google Calendar']))

  const styles = {
    '--template-accent': config.accent,
    '--template-accent-2': config.accent2,
    '--template-dark': config.dark,
    '--template-cream': config.cream,
  } as CSSProperties

  const addToCart = (item: TemplateItem) => {
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

  const startBooking = (item?: TemplateItem) => {
    const target = item ?? config.items.find((entry) => entry.appointment)
    if (!target) return
    setSelectedItem(null)
    setBookingItem(target)
    setSelectedEmployee('')
    setSelectedDate('')
    setCalendarView(true)
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Puerto_Rico', year: 'numeric', month: '2-digit' }).formatToParts(new Date()).reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {} as Record<string, string>)
    setSelectedMonth(`${parts.year}-${parts.month}`)
    setSelectedTime('')
    setBookingStage('selection')
    setBookingPaymentMethod('stripe')
    setBookingCustomerName(ui.defaultCustomer)
    setBookingCustomerEmail('template@example.com')
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

  const demoAvailability = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const dayCount = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Puerto_Rico', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    const available: Record<string, number> = {}
    for (let day = 1; day <= dayCount; day += 1) {
      const date = `${selectedMonth}-${String(day).padStart(2, '0')}`
      const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
      if (date >= today && weekday !== 0) available[date] = 4
    }
    return available
  }, [selectedMonth])
  const formattedSelectedDate = selectedDate
    ? new Intl.DateTimeFormat(language === 'es' ? 'es-PR' : 'en-US', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${selectedDate}T12:00:00Z`))
    : ''
  const quickDates = Object.keys(demoAvailability).slice(0, 4)

  const continueTemplateBooking = () => {
    if (!selectedDate || !selectedTime || (employeesForBooking.length > 0 && !selectedEmployee)) return
    setBookingStage(bookingRequiresPayment ? 'checkout' : 'verified')
  }

  const verifyTemplatePayment = () => {
    if (!bookingCustomerName.trim() || !bookingCustomerEmail.trim()) return
    setBookingStage('verified')
  }

  return (
    <div className={`template-site visual-${templateVisualStyle(config.category)}`} style={styles}>
      <TemplateNotice ui={ui} />

      <TemplateLayout config={config} ui={ui} language={language} setLanguage={setLanguage} startBooking={startBooking} setCatalogOpen={setCatalogOpen} setCartOpen={setCartOpen} cart={cart} showcaseFeatures={showcaseFeatures} />

      {catalogOpen && (
        <div className="template-modal-backdrop" role="presentation" onMouseDown={() => setCatalogOpen(false)}>
          <section className="template-catalog-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div><small>{ui.catalog}</small><h2>{ui.catalogTitle}</h2><p>{ui.catalogSelect}</p></div>
              <button className="template-modal-close catalog-close" onClick={() => setCatalogOpen(false)}>×</button>
            </header>
            <div className="template-catalog-modal-grid">
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
        <div className="template-modal-backdrop" role="presentation" onMouseDown={() => setSelectedItem(null)}>
          <article className="template-detail-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <button className="template-modal-close" onClick={() => setSelectedItem(null)}>×</button>
            <div className="template-detail-image"><img src={selectedItem.image} alt="" /></div>
            <div className="template-detail-copy">
              <small>{({ product: ui.product, service: ui.serviceType, listing: ui.listing, class: ui.classType }[selectedItem.type]).toUpperCase()} · {ui.detail}</small>
              <h2>{selectedItem.name}</h2>
              <strong>{selectedItem.displayPrice ?? money(selectedItem.price, language)}</strong>
              <p>{selectedItem.description}</p>
              {selectedItem.duration && <span>{ui.duration} · {selectedItem.duration} min</span>}
              {selectedItem.deposit ? <span>{ui.deposit} · {money(selectedItem.deposit, language)}</span> : null}
              {selectedItem.groupCapacity ? <span>{ui.groupCapacity} · {selectedItem.groupCapacity}</span> : null}
              {selectedItem.employees?.length ? <span>{ui.availableWith} · {selectedItem.employees.join(', ')}</span> : null}
              <div className="template-detail-actions">
                {selectedItem.appointment ? (
                  <button className="template-solid" onClick={() => startBooking(selectedItem)}>{ui.reserve}</button>
                ) : selectedItem.purchasable !== false ? (
                  <button className="template-solid" onClick={() => addToCart(selectedItem)}>{ui.addToCart}</button>
                ) : null}
                <button className="template-outline" onClick={() => setSelectedItem(null)}>{ui.close}</button>
              </div>
            </div>
          </article>
        </div>
      )}

      {cartOpen && (
        <div className="template-modal-backdrop cart-backdrop" role="presentation" onMouseDown={() => setCartOpen(false)}>
          <aside className="template-cart-drawer" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div><small>{ui.templateCart}</small><h2>{ui.selections}</h2></div>
              <button onClick={() => setCartOpen(false)}>×</button>
            </header>
            <div className="template-cart-lines">
              {cart.length === 0 ? (
                <div className="template-empty-cart"><strong>{ui.emptyCart}</strong><span>{ui.emptyCartHint}</span></div>
              ) : cart.map((line) => (
                <article key={line.item.id}>
                  <img src={line.item.image} alt="" />
                  <div><strong>{line.item.name}</strong><span>{money(line.item.price, language)} · {ui.qty} {line.quantity}</span></div>
                  <button onClick={() => removeFromCart(line.item.id)}>{ui.remove}</button>
                </article>
              ))}
            </div>
            <div className="template-cart-summary">
              <span>{ui.subtotal} <b>{money(subtotal, language)}</b></span>
              <span>{ui.taxes} <b>{ui.calculatedCheckout}</b></span>
              <strong>{ui.totalPreview} <b>{money(subtotal, language)}</b></strong>
            </div>
            <div className="template-payment-options">
              <button>Stripe</button><button>ATH Móvil</button>
            </div>
            <button
              className="template-solid template-checkout"
              disabled={cart.length === 0}
              onClick={() => setCheckoutComplete(true)}
            >
              {ui.templateCheckout}
            </button>
            {checkoutComplete && <p className="template-success">{ui.checkoutSuccess}</p>}
            <small className="template-safe-note">{ui.backendPricing}</small>
          </aside>
        </div>
      )}

      {bookingItem && (
        <div className="template-modal-backdrop" role="presentation" onMouseDown={() => setBookingItem(null)}>
          <article className="template-booking-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <button className="template-modal-close" onClick={() => setBookingItem(null)}>×</button>

            <div className="template-booking-progress" aria-label={ui.bookingProgress}>
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
                  <small>{ui.templateBooking}</small>
                  <h2>{bookingItem.name}</h2>
                  <p>{bookingItem.duration ? `${bookingItem.duration} min` : ui.appointment} · {bookingPaymentLabel}</p>
                </header>

                {employeesForBooking.length > 0 && (
                  <section>
                    <strong>1 · {ui.chooseProfessional}</strong>
                    <div className="template-choice-grid">
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
                  <div className="template-booking-date-controls" role="group" aria-label={language === 'es' ? 'Vista de fechas' : 'Date view'}>
                    <button type="button" className={calendarView ? 'selected' : ''} aria-pressed={calendarView} onClick={() => setCalendarView(true)}>{language === 'es' ? 'Mes completo' : 'Full month'}</button>
                    <button type="button" className={!calendarView ? 'selected' : ''} aria-pressed={!calendarView} onClick={() => setCalendarView(false)}>{language === 'es' ? 'Fechas próximas' : 'Upcoming dates'}</button>
                  </div>
                  {calendarView
                    ? <MonthCalendar month={selectedMonth} locale={language} selectedDate={selectedDate} availability={demoAvailability} onMonthChange={(month) => { setSelectedMonth(month); setSelectedDate(''); setSelectedTime('') }} onSelectDate={(date) => { setSelectedDate(date); setSelectedTime('') }} />
                    : <div className="template-date-row">{quickDates.map((date) => <button type="button" key={date} className={selectedDate === date ? 'selected' : ''} onClick={() => { setSelectedDate(date); setSelectedTime('') }}>{new Intl.DateTimeFormat(language === 'es' ? 'es-PR' : 'en-US', { weekday: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))}</button>)}</div>}
                  <small className="template-calendar-demo-note">{language === 'es' ? 'Disponibilidad de ejemplo. En una página publicada, se calcula con el horario del negocio.' : 'Sample availability. Published pages calculate this from the business schedule.'}</small>
                </section>

                <section>
                  <strong>{employeesForBooking.length > 0 ? '3' : '2'} · {ui.chooseTime}</strong>
                  <div className="template-time-grid">
                    {['9:00 AM','10:30 AM','1:00 PM','3:30 PM','5:00 PM'].map((time, index) => (
                      <button key={time} disabled={index === 1} className={selectedTime === time ? 'selected' : ''} onClick={() => setSelectedTime(time)}>
                        {time}{index === 1 && <small>{ui.busy}</small>}
                      </button>
                    ))}
                  </div>
                </section>

                {selectedTime && (
                  <div className="template-hold">
                    <span>{ui.bookingHold}</span>
                    <strong>10:00</strong>
                  </div>
                )}

                <button
                  className="template-solid template-confirm-booking"
                  disabled={!selectedDate || !selectedTime || (employeesForBooking.length > 0 && !selectedEmployee)}
                  onClick={continueTemplateBooking}
                >
                  {bookingRequiresPayment ? ui.continueCheckout : ui.continueNoPayment}
                </button>
                <small className="template-safe-note">{ui.holdSafe}</small>
              </>
            )}

            {bookingStage === 'checkout' && (
              <div className="template-booking-checkout">
                <header>
                  <small>{ui.templateCheckoutLabel}</small>
                  <h2>{ui.completeFlow}</h2>
                  <p>{ui.noPaymentInfo}</p>
                </header>

                <div className="template-booking-order">
                  <span><b>{ui.service}</b><strong>{bookingItem.name}</strong></span>
                  <span><b>{ui.professional}</b><strong>{selectedEmployee === 'any' ? ui.anyAvailable : selectedEmployee}</strong></span>
                  <span><b>{ui.dateTime}</b><strong>{formattedSelectedDate} · {selectedTime}</strong></span>
                  <span><b>{bookingItem.deposit ? ui.depositDue : ui.amountDue}</b><strong>{money(bookingCharge, language)}</strong></span>
                </div>

                <div className="template-customer-grid">
                  <label><span>{ui.name}</span><input value={bookingCustomerName} onChange={(event)=>setBookingCustomerName(event.target.value)} /></label>
                  <label><span>{ui.email}</span><input type="email" value={bookingCustomerEmail} onChange={(event)=>setBookingCustomerEmail(event.target.value)} /></label>
                </div>

                <section className="template-payment-step">
                  <strong>{ui.choosePayment}</strong>
                  <div className="template-payment-options booking">
                    <button className={bookingPaymentMethod === 'stripe' ? 'selected' : ''} onClick={() => setBookingPaymentMethod('stripe')}>Stripe</button>
                    <button className={bookingPaymentMethod === 'ath' ? 'selected' : ''} onClick={() => setBookingPaymentMethod('ath')}>ATH Móvil</button>
                  </div>
                </section>

                <div className="template-hold">
                  <span>{ui.bookingHold}</span>
                  <strong>10:00</strong>
                </div>

                <div className="template-booking-actions">
                  <button className="template-outline" onClick={() => setBookingStage('selection')}>{ui.back}</button>
                  <button className="template-solid" disabled={!bookingCustomerName.trim() || !bookingCustomerEmail.trim()} onClick={verifyTemplatePayment}>{ui.simulatePayment}</button>
                </div>
                <small className="template-safe-note">{ui.noExternalRecord}</small>
              </div>
            )}

            {bookingStage === 'verified' && (
              <div className="template-booking-verified">
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
                <button className="template-solid" onClick={() => setBookingStage('confirmed')}>{ui.confirmBooking}</button>
                <small className="template-safe-note">{ui.checksVisual}</small>
              </div>
            )}

            {bookingStage === 'confirmed' && (
              <div className="template-booking-confirmed">
                <span>✓</span>
                <small>{ui.templateConfirmed}</small>
                <h2>{ui.bookingComplete}</h2>
                <p>{bookingItem.name} · {formattedSelectedDate} · {selectedTime}</p>
                <b>{selectedEmployee && selectedEmployee !== 'any' ? selectedEmployee : ui.anyAvailable}</b>
                <div className="template-confirmation-receipt">
                  <span>{ui.bookingStatus} <b>{ui.confirmedTemplate}</b></span>
                  <span>{ui.payment} <b>{bookingRequiresPayment ? ui.verifiedTemplate : ui.notRequired}</b></span>
                  <span>{ui.calendar} <b>{ui.eventReady}</b></span>
                </div>
                <button className="template-outline" onClick={() => setBookingItem(null)}>{ui.done}</button>
                <small className="template-safe-note">{ui.nothingCreated}</small>
              </div>
            )}
          </article>
        </div>
      )}

    </div>
  )
}

export default TemplateSite
