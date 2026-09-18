import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { demoBySlug, type DemoItem } from './demoData'
import './demo.css'

type CartLine = { item: DemoItem; quantity: number }

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

function DemoNotice() {
  return (
    <div className="wf-demo-notice">
      <a href="/#demos">← WebFactory PR</a>
      <span>DEMO WEBSITE · negocio e información ficticia · no se procesan pagos ni reservaciones reales</span>
      <a href="/#builder">Crear mi website ↗</a>
    </div>
  )
}

function CatalogCard({
  item,
  accent,
  onView,
  onAdd,
  onBook,
}: {
  item: DemoItem
  accent: string
  onView: () => void
  onAdd: () => void
  onBook: () => void
}) {
  const price = item.displayPrice ?? money(item.price)
  return (
    <article className="demo-catalog-card">
      <button className="demo-card-image" onClick={onView} aria-label={`Ver ${item.name}`}>
        <img src={item.image} alt="" loading="lazy" />
        {item.badge && <span style={{ background: accent }}>{item.badge}</span>}
      </button>
      <div className="demo-card-copy">
        <div>
          <small>{item.type}</small>
          <h3>{item.name}</h3>
        </div>
        <strong>{price}</strong>
        <p>{item.description}</p>
        <div className="demo-card-actions">
          <button className="demo-outline" onClick={onView}>Ver detalle</button>
          {item.appointment ? (
            <button className="demo-solid" onClick={onBook}>Reservar</button>
          ) : item.purchasable !== false ? (
            <button className="demo-solid" onClick={onAdd}>Añadir</button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function DemoSite({ slug }: { slug: string }) {
  const config = demoBySlug(slug)
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<DemoItem | null>(null)
  const [bookingItem, setBookingItem] = useState<DemoItem | null>(null)
  const [cart, setCart] = useState<CartLine[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [bookingConfirmed, setBookingConfirmed] = useState(false)
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
    if (!config) return
    document.title = `${config.name} — WebFactory Demo`
  }, [config])

  if (!config) {
    return (
      <main className="demo-not-found">
        <h1>Demo no encontrado</h1>
        <a href="/#demos">Volver a WebFactory PR</a>
      </main>
    )
  }

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
    setBookingConfirmed(false)
  }

  const employeesForBooking = bookingItem?.employees?.length
    ? config.employees.filter((employee) =>
        bookingItem.employees?.some((name) => employee.name.startsWith(name)),
      )
    : config.employees

  return (
    <div className="demo-site" style={styles}>
      <DemoNotice />

      <header className="demo-header">
        <a className="demo-brand" href="#demo-top">{config.shortName}</a>
        <button className="demo-menu-button" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen}>
          Menu
        </button>
        <nav className={menuOpen ? 'open' : ''}>
          <a href="#services" onClick={() => setMenuOpen(false)}>Servicios / Shop</a>
          {config.employees.length > 0 && <a href="#team" onClick={() => setMenuOpen(false)}>Equipo</a>}
          <a href="#about" onClick={() => setMenuOpen(false)}>Nosotros</a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>Contacto</a>
        </nav>
        <div className="demo-header-actions">
          {config.bookingEnabled && <button className="demo-outline" onClick={() => startBooking()}>{config.bookingLabel}</button>}
          {config.cartEnabled && (
            <button className="demo-cart-button" onClick={() => setCartOpen(true)}>
              Cart <b>{cart.reduce((sum, line) => sum + line.quantity, 0)}</b>
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
              <button className="demo-glass large" onClick={() => setCatalogOpen(true)}>{config.cartEnabled ? 'Explorar catálogo' : 'Ver servicios'}</button>
            </div>
          </div>
          <aside className="demo-hero-meta">
            <div><small>LOCATION</small><strong>{config.location}</strong></div>
            <div><small>HOURS</small><strong>{config.hours}</strong></div>
            <div><small>CALL</small><strong>{config.phone}</strong></div>
          </aside>
        </section>

        <section className="demo-feature-strip">
          {config.features.map((feature, index) => (
            <div key={feature}>
              <span>0{index + 1}</span>
              <strong>{feature}</strong>
            </div>
          ))}
        </section>

        <section className="demo-section demo-catalog" id="services">
          <div className="demo-section-heading">
            <div>
              <small>{config.category.toUpperCase()} EXPERIENCE</small>
              <h2>{config.cartEnabled ? 'Explore, choose and take action.' : 'Choose the service that fits.'}</h2>
            </div>
            <p>
              El catálogo permanece oculto hasta que el cliente decide abrirlo. Esto mantiene la página
              limpia incluso cuando el negocio tiene decenas de productos o servicios.
            </p>
          </div>
          <div className="demo-catalog-gateway">
            <div><small>CATÁLOGO DISPONIBLE</small><strong>{config.items.length} productos / servicios</strong><span>Abre una ventana dedicada para explorar el catálogo sin salir de la página.</span></div>
            <button className="demo-solid" onClick={() => setCatalogOpen(true)}>Ver productos y servicios →</button>
          </div>
        </section>

        {config.employees.length > 0 && (
          <section className="demo-section demo-team-section" id="team">
            <div className="demo-section-heading">
              <div>
                <small>TEAM</small>
                <h2>The right person for the right service.</h2>
              </div>
              <p>
                Cada profesional muestra solo los servicios que puede ofrecer. Esta es la lógica
                Service + Employee que utiliza el sistema de booking.
              </p>
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
                  }}>View availability</button>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="demo-story" id="about">
          <div className="demo-story-copy">
            <small>ABOUT THE DEMO</small>
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
            <small>LIVE FEATURE PREVIEW</small>
            <h2>{config.bookingEnabled ? 'See how booking feels before you buy.' : 'See how commerce feels before you buy.'}</h2>
            <p>
              Interactúa con esta página: abre detalles, añade artículos al carrito o simula una
              reservación. Todo está en modo demo.
            </p>
          </div>
          <div className="demo-showcase-card">
            <span className="demo-pulse" />
            <small>WEBFACTORY DEMO MODE</small>
            <strong>{config.bookingEnabled ? 'Availability ready' : 'Commerce ready'}</strong>
            <div>
              {config.bookingEnabled && <button className="demo-solid" onClick={() => startBooking()}>{config.bookingLabel}</button>}
              {config.cartEnabled && <button className="demo-outline" onClick={() => setCartOpen(true)}>Open cart</button>}
            </div>
          </div>
        </section>

        <section className="demo-contact" id="contact">
          <div>
            <small>VISIT / CONTACT</small>
            <h2>{config.name}</h2>
            <p>{config.location}</p>
          </div>
          <div className="demo-contact-grid">
            <article><small>PHONE</small><strong>{config.phone}</strong></article>
            <article><small>HOURS</small><strong>{config.hours}</strong></article>
            <article><small>STATUS</small><strong>Demo business · fictional</strong></article>
          </div>
          <div className="demo-map-faux">
            <span>MAP PREVIEW</span>
            <i />
            <b>{config.location}</b>
          </div>
        </section>
      </main>

      <footer className="demo-footer">
        <div><strong>{config.shortName}</strong><span>{config.category} demo by WebFactory PR</span></div>
        <a href="/#demos">Explore more WebFactory demos →</a>
      </footer>

      {catalogOpen && (
        <div className="demo-modal-backdrop" role="presentation" onMouseDown={() => setCatalogOpen(false)}>
          <section className="demo-catalog-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div><small>CATÁLOGO</small><h2>Productos y servicios</h2><p>Selecciona cualquier item para ver sus detalles.</p></div>
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
              <small>{selectedItem.type.toUpperCase()} DETAIL</small>
              <h2>{selectedItem.name}</h2>
              <strong>{selectedItem.displayPrice ?? money(selectedItem.price)}</strong>
              <p>{selectedItem.description}</p>
              {selectedItem.duration && <span>Duration · {selectedItem.duration} min</span>}
              {selectedItem.deposit ? <span>Deposit · {money(selectedItem.deposit)}</span> : null}
              {selectedItem.groupCapacity ? <span>Group capacity · {selectedItem.groupCapacity}</span> : null}
              {selectedItem.employees?.length ? <span>Available with · {selectedItem.employees.join(', ')}</span> : null}
              <div className="demo-detail-actions">
                {selectedItem.appointment ? (
                  <button className="demo-solid" onClick={() => startBooking(selectedItem)}>Reservar</button>
                ) : selectedItem.purchasable !== false ? (
                  <button className="demo-solid" onClick={() => addToCart(selectedItem)}>Add to cart</button>
                ) : null}
                <button className="demo-outline" onClick={() => setSelectedItem(null)}>Close</button>
              </div>
            </div>
          </article>
        </div>
      )}

      {cartOpen && (
        <div className="demo-modal-backdrop cart-backdrop" role="presentation" onMouseDown={() => setCartOpen(false)}>
          <aside className="demo-cart-drawer" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div><small>DEMO CART</small><h2>Your selections</h2></div>
              <button onClick={() => setCartOpen(false)}>×</button>
            </header>
            <div className="demo-cart-lines">
              {cart.length === 0 ? (
                <div className="demo-empty-cart"><strong>Your cart is empty.</strong><span>Add a product or service to see the full cart experience.</span></div>
              ) : cart.map((line) => (
                <article key={line.item.id}>
                  <img src={line.item.image} alt="" />
                  <div><strong>{line.item.name}</strong><span>{money(line.item.price)} · Qty {line.quantity}</span></div>
                  <button onClick={() => removeFromCart(line.item.id)}>Remove</button>
                </article>
              ))}
            </div>
            <div className="demo-cart-summary">
              <span>Subtotal <b>{money(subtotal)}</b></span>
              <span>Taxes <b>Calculated at checkout</b></span>
              <strong>Total preview <b>{money(subtotal)}</b></strong>
            </div>
            <div className="demo-payment-options">
              <button>Stripe</button><button>ATH Móvil</button>
            </div>
            <button
              className="demo-solid demo-checkout"
              disabled={cart.length === 0}
              onClick={() => setCheckoutComplete(true)}
            >
              Demo checkout
            </button>
            {checkoutComplete && <p className="demo-success">✓ Checkout simulated. No payment was processed.</p>}
            <small className="demo-safe-note">Demo mode only · authoritative pricing and payment verification occur on the backend in production.</small>
          </aside>
        </div>
      )}

      {bookingItem && (
        <div className="demo-modal-backdrop" role="presentation" onMouseDown={() => setBookingItem(null)}>
          <article className="demo-booking-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <button className="demo-modal-close" onClick={() => setBookingItem(null)}>×</button>
            {!bookingConfirmed ? (
              <>
                <header>
                  <small>DEMO BOOKING</small>
                  <h2>{bookingItem.name}</h2>
                  <p>{bookingItem.duration ? `${bookingItem.duration} min` : 'Appointment'}{bookingItem.deposit ? ` · ${money(bookingItem.deposit)} deposit` : ''}</p>
                </header>

                {employeesForBooking.length > 0 && (
                  <section>
                    <strong>1 · Choose professional</strong>
                    <div className="demo-choice-grid">
                      <button className={selectedEmployee === 'any' ? 'selected' : ''} onClick={() => setSelectedEmployee('any')}>Any available</button>
                      {employeesForBooking.map((employee) => (
                        <button key={employee.id} className={selectedEmployee === employee.name ? 'selected' : ''} onClick={() => setSelectedEmployee(employee.name)}>
                          {employee.name}<small>{employee.role}</small>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <strong>{employeesForBooking.length > 0 ? '2' : '1'} · Choose date</strong>
                  <div className="demo-date-row">
                    {['Fri 18','Sat 19','Mon 21','Tue 22'].map((date) => (
                      <button key={date} className={selectedDate === date ? 'selected' : ''} onClick={() => setSelectedDate(date)}>{date}</button>
                    ))}
                  </div>
                </section>

                <section>
                  <strong>{employeesForBooking.length > 0 ? '3' : '2'} · Choose time</strong>
                  <div className="demo-time-grid">
                    {['9:00 AM','10:30 AM','1:00 PM','3:30 PM','5:00 PM'].map((time, index) => (
                      <button key={time} disabled={index === 1} className={selectedTime === time ? 'selected' : ''} onClick={() => setSelectedTime(time)}>
                        {time}{index === 1 && <small>Busy</small>}
                      </button>
                    ))}
                  </div>
                </section>

                {selectedTime && (
                  <div className="demo-hold">
                    <span>Temporary booking hold</span>
                    <strong>10:00</strong>
                  </div>
                )}

                <button
                  className="demo-solid demo-confirm-booking"
                  disabled={!selectedDate || !selectedTime || (employeesForBooking.length > 0 && !selectedEmployee)}
                  onClick={() => setBookingConfirmed(true)}
                >
                  Confirm demo booking
                </button>
                <small className="demo-safe-note">This is an interactive demonstration. No real calendar event, charge or appointment is created.</small>
              </>
            ) : (
              <div className="demo-booking-confirmed">
                <span>✓</span>
                <small>DEMO CONFIRMED</small>
                <h2>Booking experience complete.</h2>
                <p>{bookingItem.name} · {selectedDate} · {selectedTime}</p>
                <b>{selectedEmployee && selectedEmployee !== 'any' ? selectedEmployee : 'Any available professional'}</b>
                <button className="demo-outline" onClick={() => setBookingItem(null)}>Done</button>
              </div>
            )}
          </article>
        </div>
      )}
    </div>
  )
}

export default DemoSite
