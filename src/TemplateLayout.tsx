import { useLayoutEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react'
import type { TemplateConfig, TemplateItem } from './templateData'
import type { TemplateLanguage, TemplateUi } from './templateI18n'
import './template-preview.css'
import './template-polish.css'
import './template-evolution.css'
import './template-glass.css'
import './template-team.css'
import {mountAtlas} from './vendor/atlas-runtime.mjs'
import TemplateHighlights from './TemplateHighlights'

type Props = {
 config: TemplateConfig; ui: {[K in keyof TemplateUi]: TemplateUi[K] extends string ? string : TemplateUi[K]}; language: TemplateLanguage; setLanguage: (language: TemplateLanguage) => void;
 teamBooking?: boolean; startBooking: (item?: TemplateItem, employeeId?: string) => void; setCatalogOpen: (open: boolean) => void; setCartOpen: (open: boolean) => void;
 cart: Array<{quantity: number}>; contact?: ReactNode; map?: ReactNode; footer?: ReactNode; extraSections?: ReactNode; social?: ReactNode; music?: ReactNode;
 catalogEnabled?: boolean; mainClass?: string; sectionOrder?: string[]; logoUrl?: string; locationHref?: string; phoneHref?: string;
}
/** The product layout. Demo, Builder and live storefront all render this component. */
export default function TemplateLayout({config,ui,language,setLanguage,startBooking,teamBooking=false,setCatalogOpen,setCartOpen,cart,contact,map,footer,extraSections,social,music,catalogEnabled=true,mainClass='',sectionOrder,logoUrl,locationHref,phoneHref}: Props) {
 const [menuOpen,setMenuOpen] = useState(false)
 const sectionStyle = (key:string): CSSProperties | undefined => sectionOrder ? {order:sectionOrder.includes(key)?sectionOrder.indexOf(key)+2:99} : undefined
 return <>      <header className="template-header">
        <a className="template-brand" href="#template-top">{logoUrl ? <img className="cs-template-logo" src={logoUrl} alt={config.shortName}/> : config.shortName}</a>
        <button className="template-menu-button" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen} aria-controls="template-main-nav">
          {ui.menu}
        </button>
        <nav id="template-main-nav" aria-label={ui.menu} className={menuOpen ? 'open' : ''}>
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
          {config.cartEnabled && (
            <button className="template-cart-button" onClick={() => setCartOpen(true)}>
              {ui.cart} <b>{cart.reduce((sum, line) => sum + line.quantity, 0)}</b>
            </button>
          )}
        </div>
      </header>

      <main id="template-top" className={mainClass}>
        <section className="template-hero">
          {(config.heroImage)&&<img src={config.heroImage} alt="" />}
          <div className="template-hero-overlay" />
          <div className="template-hero-content">
            <p>{config.kicker}</p>
            <h1>{config.headline}</h1>
            <span>{config.description}</span>
            <div className="template-hero-actions">
              {config.bookingEnabled && <button className="template-solid large" onClick={() => startBooking()}>{config.bookingLabel}</button>}
              {catalogEnabled && <button className="template-glass large" onClick={() => setCatalogOpen(true)}>{config.cartEnabled ? ui.exploreCatalog : ui.viewServices}</button>}
            </div>
          </div>
          <aside className="template-hero-meta">
            {(config.location || locationHref) && <div><small>{ui.location}</small>{locationHref ? <a href={locationHref} target="_blank" rel="noreferrer">{config.location || 'Google Maps ↗'}</a> : <strong>{config.location}</strong>}</div>}
            {config.hours && <div><small>{ui.hours}</small><strong>{config.hours}</strong></div>}
            {config.phone && <div><small>{ui.call}</small>{phoneHref ? <a href={phoneHref}>{config.phone}</a> : <strong>{config.phone}</strong>}</div>}
            {social}
          </aside>
        </section>

        {catalogEnabled && <section className="template-section template-catalog" id="services" style={sectionStyle("catalog")}>
          <div className="template-section-heading">
            <div>
              <small>{config.category.toUpperCase()} · {ui.experience}</small>
              <h2>{config.cartEnabled ? ui.commerceHeading : ui.servicesHeading}</h2>
            </div>
            <p>{ui.catalogIntro}</p>
          </div>
          <TemplateHighlights items={config.items} language={language}/>
          {music}
        </section>

        }
        {!catalogEnabled && music}
        {config.employees.length > 0 && (
          <section className="template-section template-team-section" id="team" style={sectionStyle("team")}>
            <div className="template-section-heading">
              <div>
                <small>{ui.teamLabel}</small>
                <h2>{ui.teamHeading}</h2>
              </div>
              <p>{ui.teamIntro}</p>
            </div>
            <TeamCards key={config.slug} config={config} language={language} label={ui.viewAvailability} teamBooking={teamBooking} startBooking={startBooking}/>
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
            {(config.gallery[0] || config.heroImage)&&<img src={config.gallery[0] || config.heroImage} alt="" loading="lazy" />}
            {(config.gallery[1] || config.heroImage)&&<img src={config.gallery[1] || config.heroImage} alt="" loading="lazy" />}
          </div>
        </section>

        <section className="template-gallery" style={sectionStyle("gallery")}>
          {config.gallery.map((image, index) => (
            <figure key={image} className={index === 0 ? 'wide' : ''}>
              <img src={image} alt="" loading="lazy" />
            </figure>
          ))}
        </section>

        {extraSections}
        <section className="template-contact" id="contact" style={sectionStyle("contact")}>
          <div>
            <small>{ui.visitContact}</small>
            <h2>{config.name}</h2>
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
</>}
          {map}
        </section>
      </main>

      {footer || <footer className="template-footer">
        <div><strong>{config.shortName}</strong><span>{config.category} · {ui.templateBy}</span></div>
        <nav><a href={`/builder?template=${config.slug}`}>{language==='es'?'Usar este Template':'Use this Template'} →</a><a href="/templates">{ui.moreTemplates}</a></nav>
      </footer>}

</>
}

function TeamCards({config,language,label,teamBooking,startBooking}: Pick<Props,'config'|'language'|'teamBooking'|'startBooking'> & {label:string}){
 const people=config.employees
 const count=people.length
 const [index,setIndex]=useState(config.slug==='sonido-vivo-artist'&&count===3?1:0)
 const current=Math.min(index,count-1)
 const stage=useRef<HTMLDivElement>(null)
 const engine=useRef<ReturnType<typeof mountAtlas>|null>(null)
 const membership=people.map(person=>person.id).join('|')
 const es=language==='es'
 useLayoutEffect(()=>{
  if(!stage.current||count<2)return
  const runtime=mountAtlas(stage.current,current,setIndex)
  engine.current=runtime
  return ()=>{runtime.destroy();engine.current=null}
 },[count,membership])
 const advance=(direction:number)=>engine.current?.advance(direction)
 return <div className="team-carousel" role="group" aria-label={es?'Integrantes del equipo':'Team members'} onKeyDown={event=>{
  if(count<2)return
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();advance(event.key==='ArrowLeft'?-1:1)}
 }}>
  <div ref={stage} className="team-carousel-stage" data-count={count}>
   {people.map((person,member)=>{
    const active=member===current
    const matching=config.items.find(item=>item.appointment&&(item.employeeIds?.includes(person.id)??item.employees?.some(name=>person.name.startsWith(name))))
    const canBook=config.bookingEnabled&&(teamBooking||matching)
    return <article key={person.id} className="team-card" data-active={active} inert={!active&&count>3&&Math.min(Math.abs(member-current),count-Math.abs(member-current))>1}>
     <div className="team-card-portrait" aria-hidden="true">
      <span>{person.initials}</span>
      {person.photoUrl&&<img src={person.photoUrl} alt="" loading="lazy" draggable={false} decoding="async" onError={event=>{event.currentTarget.hidden=true}}/>}
      <div className="team-atlas-mono">{person.photoUrl&&<img src={person.photoUrl} alt="" loading="lazy" draggable={false} decoding="async" onError={event=>{event.currentTarget.hidden=true}}/>}</div>
     </div>
     <div className="team-card-copy">
      {person.role&&<small>{person.role}</small>}
      <h3>{person.name}</h3>
      {active&&person.services.length>0&&<ul className="team-card-services">{person.services.map(service=><li key={service}>{service}</li>)}</ul>}
      {active&&canBook&&<button className="team-card-book" type="button" onClick={()=>teamBooking?startBooking():startBooking(matching,person.id)}>{label}</button>}
     </div>
     {!active&&<button className="team-card-select" type="button" aria-label={person.name} onClick={()=>engine.current?.goTo(member)}/>}
    </article>
   })}
  </div>
  {count>1&&<div className="team-card-controls">
   <button className="team-card-arrow" type="button" aria-label={es?'Integrante anterior':'Previous team member'} onClick={()=>advance(-1)}>‹</button>
   <div className="team-card-dots">
    {people.map((person,i)=><button key={person.id} type="button" aria-label={person.name} aria-current={i===current?'true':undefined} onClick={()=>engine.current?.goTo(i)}/>)}
   </div>
   <button className="team-card-arrow" type="button" aria-label={es?'Siguiente integrante':'Next team member'} onClick={()=>advance(1)}>›</button>
  </div>}
 </div>
}
