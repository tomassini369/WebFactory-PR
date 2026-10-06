import { useState, type ReactNode, type CSSProperties } from 'react'
import type { TemplateConfig, TemplateItem } from './templateData'
import type { TemplateLanguage, TemplateUi } from './templateI18n'
import './template-preview.css'
import './template-polish.css'

type Props = {
 config: TemplateConfig; ui: {[K in keyof TemplateUi]: TemplateUi[K] extends string ? string : TemplateUi[K]}; language: TemplateLanguage; setLanguage: (language: TemplateLanguage) => void;
 startBooking: (item?: TemplateItem) => void; setCatalogOpen: (open: boolean) => void; setCartOpen: (open: boolean) => void;
 cart: Array<{quantity: number}>; showcaseFeatures: string[]; contact?: ReactNode; footer?: ReactNode; extraSections?: ReactNode;
 catalogEnabled?: boolean; mainClass?: string; sectionOrder?: string[]; logoUrl?: string; locationHref?: string; phoneHref?: string; contactTitle?:string;
}
/** The product layout. Demo, Builder and live storefront all render this component. */
export default function TemplateLayout({config,ui,language,setLanguage,startBooking,setCatalogOpen,setCartOpen,cart,showcaseFeatures,contact,footer,extraSections,catalogEnabled=true,mainClass='',sectionOrder,logoUrl,locationHref,phoneHref,contactTitle}: Props) {
 const [menuOpen,setMenuOpen] = useState(false)
 const sectionStyle = (key:string): CSSProperties | undefined => sectionOrder ? {order:sectionOrder.includes(key)?sectionOrder.indexOf(key)+2:99} : undefined
 return <>      <header className="template-header">
        <a className="template-brand" href="#template-top">{logoUrl ? <img className="cs-template-logo" src={logoUrl} alt={config.shortName}/> : config.shortName}</a>
        <button className="template-menu-button" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen}>
          {ui.menu}
        </button>
        <nav className={menuOpen ? 'open' : ''}>
          {catalogEnabled && <a href="#services" onClick={() => setMenuOpen(false)}>{ui.services}</a>}
          {config.employees.length > 0 && <a href="#team" onClick={() => setMenuOpen(false)}>{ui.team}</a>}
          <a href="#about" onClick={() => setMenuOpen(false)}>{ui.about}</a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>{ui.contact}</a>
        </nav>
        <div className="template-header-actions">
          <div className="template-languages" role="group" aria-label={ui.language}>
            <button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')} aria-pressed={language === 'en'}>EN</button>
            <button className={language === 'es' ? 'active' : ''} onClick={() => setLanguage('es')} aria-pressed={language === 'es'}>ES</button>
          </div>
          {config.bookingEnabled && <button className="template-outline" onClick={() => startBooking()}>{config.bookingLabel}</button>}
          {config.cartEnabled && (
            <button className="template-cart-button" onClick={() => setCartOpen(true)}>
              {ui.cart} <b>{cart.reduce((sum, line) => sum + line.quantity, 0)}</b>
            </button>
          )}
        </div>
      </header>

      <main id="template-top" className={mainClass}>
        <section className="template-hero">
          <img src={config.heroImage} alt="" />
          <div className="template-hero-overlay" />
          <div className="template-hero-content">
            <p>{config.kicker}</p>
            <h1>{config.headline}</h1>
            <span>{config.description}</span>
            <div className="template-hero-actions">
              {config.bookingEnabled && <button className="template-solid large" onClick={() => startBooking()}>{config.bookingLabel}</button>}
              <button className="template-glass large" onClick={() => setCatalogOpen(true)}>{config.cartEnabled ? ui.exploreCatalog : ui.viewServices}</button>
            </div>
          </div>
          <aside className="template-hero-meta">
            {(config.location || locationHref) && <div><small>{ui.location}</small>{locationHref ? <a href={locationHref} target="_blank" rel="noreferrer">{config.location || 'Google Maps ↗'}</a> : <strong>{config.location}</strong>}</div>}
            {config.hours && <div><small>{ui.hours}</small><strong>{config.hours}</strong></div>}
            {config.phone && <div><small>{ui.call}</small>{phoneHref ? <a href={phoneHref}>{config.phone}</a> : <strong>{config.phone}</strong>}</div>}
          </aside>
        </section>

        <section className="template-feature-strip">
          {showcaseFeatures.map((feature, index) => (
            <div key={feature}>
              <span>0{index + 1}</span>
              <strong>{feature}</strong>
            </div>
          ))}
        </section>

        {catalogEnabled && <section className="template-section template-catalog" id="services" style={sectionStyle("catalog")}>
          <div className="template-section-heading">
            <div>
              <small>{config.category.toUpperCase()} · {ui.experience}</small>
              <h2>{config.cartEnabled ? ui.commerceHeading : ui.servicesHeading}</h2>
            </div>
            <p>{ui.catalogIntro}</p>
          </div>
          <div className="template-catalog-gateway">
            <div><small>{ui.catalogAvailable}</small><strong>{config.items.length} {ui.productsServices}</strong><span>{ui.catalogHint}</span></div>
            <button className="template-solid" onClick={() => setCatalogOpen(true)}>{ui.viewCatalog}</button>
          </div>
        </section>

        }
        {config.employees.length > 0 && (
          <section className="template-section template-team-section" id="team" style={sectionStyle("team")}>
            <div className="template-section-heading">
              <div>
                <small>{ui.teamLabel}</small>
                <h2>{ui.teamHeading}</h2>
              </div>
              <p>{ui.teamIntro}</p>
            </div>
            <div className="template-team-grid">
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

        <section className="template-story" id="about" style={sectionStyle("about")}>
          <div className="template-story-copy">
            <small>{ui.aboutTemplate}</small>
            <h2>{config.aboutTitle}</h2>
            <p>{config.aboutText}</p>
            <div className="template-trust-row">
              {config.trust.map((item) => <span key={item}>✓ {item}</span>)}
            </div>
          </div>
          <div className="template-story-images">
            <img src={config.gallery[0] || config.heroImage} alt="" loading="lazy" />
            <img src={config.gallery[1] || config.heroImage} alt="" loading="lazy" />
          </div>
        </section>

        <section className="template-gallery" style={sectionStyle("gallery")}>
          {config.gallery.map((image, index) => (
            <figure key={image} className={index === 0 ? 'wide' : ''}>
              <img src={image} alt="" loading="lazy" />
            </figure>
          ))}
        </section>

        {(config.bookingEnabled || config.cartEnabled) && <section className="template-booking-showcase">
          <div>
            <small>{ui.livePreview}</small>
            <h2>{config.bookingEnabled ? ui.bookingPreview : ui.commercePreview}</h2>
            <p>{ui.interactHint}</p>
          </div>
          <div className="template-showcase-card">
            <span className="template-pulse" />
            <small>{ui.templateMode}</small>
            <strong>{config.bookingEnabled ? ui.availabilityReady : ui.commerceReady}</strong>
            <div>
              {config.bookingEnabled && <button className="template-solid" onClick={() => startBooking()}>{config.bookingLabel}</button>}
              {config.cartEnabled && <button className="template-outline" onClick={() => setCartOpen(true)}>{ui.openCart}</button>}
            </div>
          </div>
        </section>

        }
        {extraSections}
        <section className="template-contact" id="contact" style={sectionStyle("contact")}>
          <div>
            <small>{ui.visitContact}</small>
            <h2>{contactTitle||config.name}</h2>
            <p>{config.location}</p>
          </div>
          <div className="template-contact-grid">
            <article><small>{ui.phone}</small><strong>{config.phone}</strong></article>
            <article><small>{ui.hours}</small><strong>{config.hours}</strong></article>
            {!contact && <article><small>{ui.status}</small><strong>{ui.fictionalBusiness}</strong></article>}
          </div>
          {contact || <><div className="template-map-faux">
            <span>{ui.mapPreview}</span>
            <i />
            <b>{config.location}</b>
          </div>
          <div className="template-function-showcase">
            <article><small>WHATSAPP</small><strong>Chat directo</strong><span>Ejemplo de acceso rápido al número configurado.</span></article>
            <article><small>CALL</small><strong>Llamada con un toque</strong><span>El teléfono del negocio abre la función de llamadas.</span></article>
            <article><small>SOCIAL</small><strong>Instagram · Facebook · X</strong><span>Las redes activas aparecen como enlaces públicos.</span></article>
            <article><small>FORM</small><strong>Formulario de contacto</strong><span>El visitante puede enviar un mensaje al email del negocio.</span></article>
            <article><small>MAPS</small><strong>Google Maps</strong><span>La ubicación configurada se enlaza desde la página.</span></article>
            <article><small>CALENDAR</small><strong>Google Calendar</strong><span>Ejemplo de sincronización con disponibilidad y reservaciones.</span></article>
          </div></>}
        </section>
      </main>

      {footer || <footer className="template-footer">
        <div><strong>{config.shortName}</strong><span>{config.category} · {ui.templateBy}</span></div>
        <nav><a href={`/builder?template=${config.slug}`}>{language==='es'?'Usar este Template':'Use this Template'} →</a><a href="/templates">{ui.moreTemplates}</a></nav>
      </footer>}

</>
}
