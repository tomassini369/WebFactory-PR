import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { demoBySlug } from './demoData'
import './demo.css'
import './client-storefront.css'

type Item={id:string;type:'product'|'service';name:string;description:string;price:number;inventory:number|null;requiresAppointment:boolean;duration:number;imageUrl:string}
type Employee={id:string;name:string;role:string;serviceIds:string[]}
type Site={siteId:string;slug:string;business:any;design:any;features:Record<string,boolean>;catalog:Item[];employees:Employee[];hours:any;paymentRules:any;settings:any}
type CartLine={id:string;quantity:number}
const money=(value:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value)
const digits=(value:string)=>String(value||'').replace(/\D/g,'')
const socialUrl=(value:string,network:'instagram'|'facebook'|'x')=>{
  const raw=String(value||'').trim()
  if(!raw)return ''
  if(/^https?:\/\//i.test(raw))return raw
  const handle=raw.replace(/^@/,'')
  return network==='instagram'?`https://instagram.com/${handle}`:network==='facebook'?`https://facebook.com/${handle}`:`https://x.com/${handle}`
}
const formatHours=(hours:any)=>{
  const active=Object.entries(hours||{}).filter(([,value]:any)=>value?.enabled)
  if(!active.length)return ''
  const first=active[0] as [string,any]
  const last=active[active.length-1] as [string,any]
  return `${first[0]}–${last[0]} · ${first[1].open}–${first[1].close}`
}

export default function ClientStorefront({slug}:{slug:string}){
  const [site,setSite]=useState<Site|null>(null)
  const [error,setError]=useState('')
  const [lang,setLang]=useState<'es'|'en'>('es')
  const [catalog,setCatalog]=useState(false)
  const [cart,setCart]=useState<CartLine[]>([])
  const [booking,setBooking]=useState<{serviceId:string;employeeId:string;date:string;start:string}|null>(null)
  const [slots,setSlots]=useState<Array<{start:string;end:string}>>([])
  const [customer,setCustomer]=useState({name:'',email:'',phone:''})
  const [busy,setBusy]=useState(false)
  const [checkoutOpen,setCheckoutOpen]=useState(false)
  const [contact,setContact]=useState({name:'',email:'',phone:'',message:''})
  const [contactStatus,setContactStatus]=useState('')

  useEffect(()=>{
    let active=true
    let initial=true
    let loadedAt=0
    const load=()=>fetch(`/.netlify/functions/public-client-site?slug=${encodeURIComponent(slug)}`).then(async r=>{
      const x=await r.json()
      if(!r.ok)throw new Error(x.message)
      if(!active)return
      loadedAt=Date.now()
      setError('')
      setSite(x.site)
      if(initial){setLang(x.site.settings?.locale==='en'?'en':'es');initial=false}
      document.title=x.site.business.name
    }).catch(e=>{if(active)setError(e instanceof Error?e.message:'No se pudo actualizar la página.')})
    const refresh=()=>{if(document.visibilityState==='visible'&&Date.now()-loadedAt>60000)void load()}
    void load()
    window.addEventListener('focus',refresh)
    document.addEventListener('visibilitychange',refresh)
    return()=>{active=false;window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh)}
  },[slug])

  const visibleCatalog=useMemo(()=>site?.catalog.filter(item=>item.type==='product'?site.features.products!==false:site.features.services!==false)||[],[site])
  const cartItems=useMemo(()=>cart.map(line=>({line,item:visibleCatalog.find(x=>x.id===line.id)})).filter(x=>x.item),[cart,visibleCatalog])
  const total=cartItems.reduce((sum,x)=>sum+(x.item?.price||0)*x.line.quantity,0)
  const add=(item:Item)=>{
    if(site?.features.cart===false)return
    setCart(current=>{const found=current.find(x=>x.id===item.id);return found?current.map(x=>x.id===item.id?{...x,quantity:Math.min(20,x.quantity+1)}:x):[...current,{id:item.id,quantity:1}]})
  }
  const beginBooking=(item:Item)=>{
    if(site?.features.bookings===false)return
    setBooking({serviceId:item.id,employeeId:'',date:'',start:''});setSlots([]);setCatalog(false)
  }
  const employees=site?.employees.filter(x=>x.serviceIds.includes(booking?.serviceId||''))||[]
  const getSlots=async(next:{serviceId:string;employeeId:string;date:string;start:string})=>{
    setBooking(next)
    if(!next.employeeId||!next.date||!site)return
    setBusy(true)
    try{
      const r=await fetch('/.netlify/functions/booking-availability',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({siteId:site.siteId,serviceId:next.serviceId,employeeId:next.employeeId,date:next.date})})
      const x=await r.json()
      if(!r.ok)throw new Error(x.message)
      setSlots(x.slots)
    }catch(e){setError(e instanceof Error?e.message:'No se pudo consultar disponibilidad.')}finally{setBusy(false)}
  }
  const checkout=async(event:FormEvent)=>{
    event.preventDefault()
    if(!site)return
    setBusy(true);setError('')
    try{
      const body=booking?{siteId:site.siteId,customer,booking}:{siteId:site.siteId,customer,items:cart}
      const r=await fetch('/.netlify/functions/create-client-checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      const x=await r.json()
      if(!r.ok)throw new Error(x.message)
      if(x.checkoutUrl)location.assign(x.checkoutUrl)
      else{setCheckoutOpen(false);setBooking(null);setCart([]);alert(lang==='es'?'Confirmación recibida. El pago se realizará presencialmente.':'Confirmation received. Payment is due in person.')}
    }catch(e){setError(e instanceof Error?e.message:'No se pudo iniciar el pago.')}finally{setBusy(false)}
  }
  const submitContact=async(event:FormEvent)=>{
    event.preventDefault()
    setContactStatus(lang==='es'?'Enviando…':'Sending…')
    try{
      const r=await fetch('/.netlify/functions/client-contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug,...contact})})
      const x=await r.json()
      if(!r.ok)throw new Error(x.message)
      setContact({name:'',email:'',phone:'',message:''})
      setContactStatus(lang==='es'?'Mensaje enviado.':'Message sent.')
    }catch(e){setContactStatus(e instanceof Error?e.message:(lang==='es'?'No se pudo enviar.':'Could not send.'))}
  }

  if(error&&!site)return <main className="cs-state"><h1>No disponible</h1><p>{error}</p></main>
  if(!site)return <main className="cs-state">Cargando website…</main>

  const t=lang==='es'
    ?{catalog:'Catálogo',book:'Reservar',shop:'Comprar',cart:'Carrito',contact:'Contacto',available:'Productos y servicios',empty:'Todavía no hay artículos publicados.',team:'Selecciona un profesional',date:'Selecciona una fecha',times:'Horas disponibles',continue:'Continuar',customer:'Tus datos',pay:'Continuar al pago seguro',about:'Sobre nosotros',services:'Servicios',send:'Enviar mensaje'}
    :{catalog:'Catalog',book:'Book',shop:'Add to cart',cart:'Cart',contact:'Contact',available:'Products and services',empty:'No items have been published yet.',team:'Choose a professional',date:'Choose a date',times:'Available times',continue:'Continue',customer:'Your details',pay:'Continue to secure payment',about:'About',services:'Services',send:'Send message'}

  const template=demoBySlug(site.design?.templateSlug||'')
  const whatsapp=digits(site.business.whatsapp)
  const instagram=socialUrl(site.business.instagram,'instagram')
  const facebook=socialUrl(site.business.facebook,'facebook')
  const xUrl=socialUrl(site.business.x,'x')
  const activeFeatureLabels=[
    site.features.products!==false&&(lang==='es'?'Productos':'Products'),
    site.features.services!==false&&(lang==='es'?'Servicios':'Services'),
    site.features.bookings&&(lang==='es'?'Reservaciones':'Bookings'),
    site.features.cart&&(lang==='es'?'Carrito':'Cart'),
    site.features.whatsapp&&'WhatsApp',
    site.features.calendar&&'Google Calendar',
  ].filter(Boolean) as string[]
  const heroImage=site.business.heroUrl||template?.heroImage||visibleCatalog.find(item=>item.imageUrl)?.imageUrl||''
  const galleryImages=site.business.galleryUrls?.length?site.business.galleryUrls:(template?.gallery||[])
  const sectionOrder=site.design?.templateSlug?['catalog','team','about','gallery','contact']:(site.design?.sectionOrder?.length?site.design.sectionOrder:['catalog','team','about','gallery','contact'])
  const sectionPosition=(key:string)=>sectionOrder.indexOf(key)>=0?sectionOrder.indexOf(key)+2:99
  const customLayout=site.design?.templateSlug?'demo':(site.design?.customLayout||'split')
  const hours=formatHours(site.hours)
  const initials=(name:string)=>name.split(/\s+/).slice(0,2).map((part:string)=>part[0]||'').join('').toUpperCase()
  const styles={
    '--demo-accent':site.design?.secondary||template?.accent||'#3C86F6',
    '--demo-accent-2':template?.accent2||site.design?.secondary||'#4D96F3',
    '--demo-dark':site.design?.primary||template?.dark||'#0B1529',
    '--demo-cream':template?.cream||'#F3F6FB',
  } as CSSProperties

  return <div className={`demo-site client-template template-${site.design?.templateSlug||'custom'} custom-layout-${customLayout}`} style={styles}>
    <header className="demo-header">
      <a className="demo-brand" href="#site-top">{site.business.logoUrl?<img className="cs-template-logo" src={site.business.logoUrl} alt={site.business.name}/>:site.business.name}</a>
      <nav>
        {(site.features.products!==false||site.features.services!==false)&&<a href="#services">{t.services}</a>}
        {site.employees.length>0&&site.features.bookings&&<a href="#team">{lang==='es'?'Equipo':'Team'}</a>}
        <a href="#about">{t.about}</a>
        <a href="#contact">{t.contact}</a>
      </nav>
      <div className="demo-header-actions">
        <div className="demo-languages"><button className={lang==='es'?'active':''} onClick={()=>setLang('es')}>ES</button><button className={lang==='en'?'active':''} onClick={()=>setLang('en')}>EN</button></div>
        {site.features.bookings&&visibleCatalog.some(x=>x.requiresAppointment)&&<button className="demo-outline" onClick={()=>beginBooking(visibleCatalog.find(x=>x.requiresAppointment)!)}>{t.book}</button>}
        {site.features.cart!==false&&<button className="demo-cart-button" onClick={()=>{setBooking(null);setCheckoutOpen(true)}}>{t.cart} <b>{cart.reduce((s,x)=>s+x.quantity,0)}</b></button>}
      </div>
    </header>

    <main id="site-top" className={site.design?.templateSlug?'':'cs-custom-main'}>
      <section className="demo-hero">
        {heroImage&&<img src={heroImage} alt="" />}
        <div className="demo-hero-overlay"/>
        <div className="demo-hero-content">
          <p>{site.business.category}</p>
          <h1>{site.business.name}</h1>
          <span>{site.business.description}</span>
          <div className="demo-hero-actions">
            {site.features.bookings&&visibleCatalog.some(x=>x.requiresAppointment)&&<button className="demo-solid large" onClick={()=>beginBooking(visibleCatalog.find(x=>x.requiresAppointment)!)}>{t.book}</button>}
            {(site.features.products!==false||site.features.services!==false)&&<button className="demo-glass large" onClick={()=>setCatalog(true)}>{t.catalog}</button>}
            {site.features.whatsapp&&whatsapp&&<a className="demo-glass large" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a>}
          </div>
        </div>
        <aside className="demo-hero-meta">
          {site.features.maps&&site.business.mapsUrl&&<div><small>MAPS</small><a href={site.business.mapsUrl} target="_blank" rel="noreferrer">Google Maps ↗</a></div>}
          {hours&&<div><small>{lang==='es'?'HORARIO':'HOURS'}</small><strong>{hours}</strong></div>}
          {site.features.calls&&site.business.phone&&<div><small>{lang==='es'?'LLAMAR':'CALL'}</small><a href={`tel:${site.business.phone}`}>{site.business.phone}</a></div>}
        </aside>
      </section>

      {activeFeatureLabels.length>0&&<section className="demo-feature-strip">{activeFeatureLabels.slice(0,6).map((feature,index)=><div key={feature}><span>{String(index+1).padStart(2,'0')}</span><strong>{feature}</strong></div>)}</section>}

      {(site.features.products!==false||site.features.services!==false)&&<section className="demo-section demo-catalog" id="services" style={{order:sectionPosition('catalog')}}>
        <div className="demo-section-heading"><div><small>{site.business.category?.toUpperCase()}</small><h2>{t.available}</h2></div><p>{site.business.description}</p></div>
        <div className="demo-catalog-gateway"><div><small>{lang==='es'?'CATÁLOGO DISPONIBLE':'CATALOG AVAILABLE'}</small><strong>{visibleCatalog.length} {lang==='es'?'productos y servicios':'products and services'}</strong><span>{lang==='es'?'Explora el catálogo completo cuando estés listo.':'Open the full catalog when you are ready.'}</span></div><button className="demo-solid" onClick={()=>setCatalog(true)}>{t.catalog}</button></div>
      </section>}

      {site.employees.length>0&&site.features.bookings&&<section className="demo-section demo-team-section" id="team" style={{order:sectionPosition('team')}}>
        <div className="demo-section-heading"><div><small>{lang==='es'?'EQUIPO':'TEAM'}</small><h2>{lang==='es'?'Profesionales disponibles':'Available professionals'}</h2></div><p>{lang==='es'?'Cada servicio se conecta con las personas autorizadas para ofrecerlo.':'Each service connects to the people authorized to provide it.'}</p></div>
        <div className="demo-team-grid">{site.employees.map(employee=><article key={employee.id}><span>{initials(employee.name)}</span><small>{employee.role}</small><h3>{employee.name}</h3><div>{employee.serviceIds.map(id=>{const item=site.catalog.find(x=>x.id===id);return item?<b key={id}>{item.name}</b>:null})}</div></article>)}</div>
      </section>}

      <section className="demo-section" id="about" style={{order:sectionPosition('about')}}>
        <div className="demo-section-heading"><div><small>{site.business.category?.toUpperCase()}</small><h2>{site.business.name}</h2></div><p>{site.business.description}</p></div>
      </section>
      {galleryImages.length>0&&<section className="demo-gallery" style={{order:sectionPosition('gallery')}}>{galleryImages.map((image,index)=><figure key={image} className={index===0?'wide':''}><img src={image} alt="" loading="lazy"/></figure>)}</section>}

      <section className="demo-section cs-template-contact" id="contact" style={{order:sectionPosition('contact')}}>
        <div className="demo-section-heading"><div><small>{lang==='es'?'CONTACTO':'CONTACT'}</small><h2>{lang==='es'?'Conecta con nosotros':'Get in touch'}</h2></div><p>{lang==='es'?'Usa cualquiera de las opciones activadas por el negocio.':'Use any contact option enabled by the business.'}</p></div>
        <div className="cs-contact-grid">
          <div className="cs-contact-links">
            {site.features.calls&&site.business.phone&&<a href={`tel:${site.business.phone}`}>☎ {site.business.phone}</a>}
            {site.business.email&&<a href={`mailto:${site.business.email}`}>✉ {site.business.email}</a>}
            {site.features.whatsapp&&whatsapp&&<a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">WhatsApp ↗</a>}
            {site.features.maps&&site.business.mapsUrl&&<a href={site.business.mapsUrl} target="_blank" rel="noreferrer">Google Maps ↗</a>}
            {site.features.social&&instagram&&<a href={instagram} target="_blank" rel="noreferrer">Instagram ↗</a>}
            {site.features.social&&facebook&&<a href={facebook} target="_blank" rel="noreferrer">Facebook ↗</a>}
            {site.features.social&&xUrl&&<a href={xUrl} target="_blank" rel="noreferrer">X ↗</a>}
          </div>
          {site.features.form&&<form className="cs-contact-form" onSubmit={submitContact}>
            <input placeholder={lang==='es'?'Nombre':'Name'} value={contact.name} onChange={e=>setContact({...contact,name:e.target.value})} required/>
            <input type="email" placeholder="Email" value={contact.email} onChange={e=>setContact({...contact,email:e.target.value})} required/>
            <input placeholder={lang==='es'?'Teléfono':'Phone'} value={contact.phone} onChange={e=>setContact({...contact,phone:e.target.value})}/>
            <textarea placeholder={lang==='es'?'Mensaje':'Message'} value={contact.message} onChange={e=>setContact({...contact,message:e.target.value})} required/>
            <button className="demo-solid">{t.send}</button>
            {contactStatus&&<small>{contactStatus}</small>}
          </form>}
        </div>
      </section>
    </main>

    {catalog&&<div className="cs-modal" onMouseDown={()=>setCatalog(false)}><section onMouseDown={e=>e.stopPropagation()}><header><div><small>CATALOG</small><h2>{t.available}</h2></div><button onClick={()=>setCatalog(false)}>×</button></header>{visibleCatalog.length===0?<p>{t.empty}</p>:<div className="cs-catalog-grid">{visibleCatalog.map(item=><article key={item.id}>{item.imageUrl&&<img src={item.imageUrl}/>}<div><small>{item.type}</small><h3>{item.name}</h3><p>{item.description}</p><b>{money(item.price)}</b><button disabled={item.inventory===0} onClick={()=>item.requiresAppointment&&site.features.bookings?beginBooking(item):site.features.cart!==false?add(item):undefined}>{item.inventory===0?'Sold out':item.requiresAppointment&&site.features.bookings?t.book:site.features.cart!==false?t.shop:(lang==='es'?'Ver':'View')}</button></div></article>)}</div>}</section></div>}

    {booking&&<div className="cs-modal"><section><header><div><small>BOOKING</small><h2>{site.catalog.find(x=>x.id===booking.serviceId)?.name}</h2></div><button onClick={()=>setBooking(null)}>×</button></header><div className="cs-booking"><label>{t.team}<select value={booking.employeeId} onChange={e=>getSlots({...booking,employeeId:e.target.value,start:''})}><option value="">—</option>{employees.map(x=><option key={x.id} value={x.id}>{x.name} · {x.role}</option>)}</select></label><label>{t.date}<input type="date" min={new Date().toISOString().slice(0,10)} value={booking.date} onChange={e=>getSlots({...booking,date:e.target.value,start:''})}/></label><fieldset><legend>{t.times}</legend>{busy?<p>Consultando…</p>:slots.map(slot=><button className={booking.start===slot.start?'active':''} key={slot.start} onClick={()=>setBooking({...booking,start:slot.start})}>{new Date(slot.start).toLocaleTimeString(lang==='es'?'es-PR':'en-US',{hour:'numeric',minute:'2-digit',timeZone:site.settings?.timezone||'America/Puerto_Rico'})}</button>)}</fieldset><button className="cs-primary" disabled={!booking.start} onClick={()=>setCheckoutOpen(true)}>{t.continue}</button></div></section></div>}

    {checkoutOpen&&<div className="cs-modal"><section className="cs-checkout"><header><div><small>CHECKOUT</small><h2>{t.customer}</h2></div><button onClick={()=>setCheckoutOpen(false)}>×</button></header>{!booking&&<div className="cs-cart-lines">{cartItems.map(({line,item})=><div key={line.id}><span>{item?.name} × {line.quantity}</span><b>{money((item?.price||0)*line.quantity)}</b></div>)}<strong>Total <b>{money(total)}</b></strong></div>}<form onSubmit={checkout}><label>Nombre / Name<input value={customer.name} onChange={e=>setCustomer({...customer,name:e.target.value})} required/></label><label>Email<input type="email" value={customer.email} onChange={e=>setCustomer({...customer,email:e.target.value})} required/></label><label>Teléfono / Phone<input value={customer.phone} onChange={e=>setCustomer({...customer,phone:e.target.value})}/></label><button disabled={busy||(!booking&&cart.length===0)}>{busy?'Preparando…':t.pay}</button></form><p>Stripe procesa el pago. Esta página no confirma una transacción hasta recibir verificación segura del servidor.</p>{error&&<div className="cs-error">{error}</div>}</section></div>}
  </div>
}
