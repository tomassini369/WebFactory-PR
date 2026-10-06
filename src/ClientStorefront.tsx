import { BusinessPolicies, CustomerDataNotice } from './BusinessPolicies'
import {templateButtonInk} from './templateVisual'
import CatalogCard from './TemplateCatalogCard'
import TemplateLayout from './TemplateLayout'
import { templateUi } from './templateI18n'
import type { TemplateConfig, TemplateItem } from './templateData'
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { templateBySlug, templateVisualStyle } from './templateData'
import MonthCalendar from './MonthCalendar'
import './template-preview.css'
import './client-storefront.css'

type Item={id:string;type:'product'|'service';name:string;nameEn?:string;nameEs?:string;description:string;descriptionEn?:string;descriptionEs?:string;price:number;inventory:number|null;requiresAppointment:boolean;duration:number;imageUrl:string}
type Employee={id:string;name:string;role:string;roleEn?:string;roleEs?:string;serviceIds:string[];locationIds?:string[]}
type Location={id:string;name:string;address:string;phone:string;mapsUrl:string;hours:any}
export type StorefrontSite={siteId:string;slug:string;business:any;design:any;features:Record<string,boolean>;catalog:Item[];employees:Employee[];hours:any;paymentRules:any;settings:any}
type CartLine={id:string;quantity:number}
const money=(value:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value)
const digits=(value:string)=>String(value||'').replace(/\D/g,'')
const currentMonth=(timeZone='America/Puerto_Rico')=>{
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit'}).formatToParts(new Date()).reduce((acc,part)=>({...acc,[part.type]:part.value}),{} as Record<string,string>)
  return `${parts.year}-${parts.month}`
}
const currentDate=(timeZone='America/Puerto_Rico')=>new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
const socialUrl=(value:string,network:'instagram'|'facebook'|'x')=>{
  const raw=String(value||'').trim()
  if(!raw)return ''
  if(/^https?:\/\//i.test(raw))return raw
  const handle=raw.replace(/^@/,'')
  return network==='instagram'?`https://instagram.com/${handle}`:network==='facebook'?`https://facebook.com/${handle}`:`https://x.com/${handle}`
}
const formatHours=(hours:any,lang:'es'|'en')=>{
  const active=Object.entries(hours||{}).filter(([,value]:any)=>value?.enabled)
  if(!active.length)return ''
  const names:Record<string,{en:string;es:string}>={monday:{en:'Monday',es:'Lunes'},lunes:{en:'Monday',es:'Lunes'},tuesday:{en:'Tuesday',es:'Martes'},martes:{en:'Tuesday',es:'Martes'},wednesday:{en:'Wednesday',es:'Miércoles'},miercoles:{en:'Wednesday',es:'Miércoles'},'miércoles':{en:'Wednesday',es:'Miércoles'},thursday:{en:'Thursday',es:'Jueves'},jueves:{en:'Thursday',es:'Jueves'},friday:{en:'Friday',es:'Viernes'},viernes:{en:'Friday',es:'Viernes'},saturday:{en:'Saturday',es:'Sábado'},sabado:{en:'Saturday',es:'Sábado'},'sábado':{en:'Saturday',es:'Sábado'},sunday:{en:'Sunday',es:'Domingo'},domingo:{en:'Sunday',es:'Domingo'}}
  const label=(day:string)=>names[day.toLowerCase()]?.[lang]||day
  const first=active[0] as [string,any]
  const last=active[active.length-1] as [string,any]
  return `${label(first[0])}–${label(last[0])} · ${first[1].open}–${first[1].close}`
}

export default function ClientStorefront({slug,previewSite,previewLanguage='en'}:{slug:string;previewSite?:StorefrontSite;previewLanguage?:'es'|'en'}){
  const [site,setSite]=useState<StorefrontSite|null>(previewSite||null)
  const [error,setError]=useState('')
  const [lang,setLang]=useState<'es'|'en'>(previewLanguage)
  const [catalog,setCatalog]=useState(false)
  const [selectedItem,setSelectedItem]=useState<Item|null>(null)
  const [cart,setCart]=useState<CartLine[]>([])
  const [removed,setRemoved]=useState<{line:CartLine;index:number;name:string}|null>(null)
  const [copyStatus,setCopyStatus]=useState('')
  useEffect(()=>{if(!removed)return;const timer=window.setTimeout(()=>setRemoved(null),8000);return()=>window.clearTimeout(timer)},[removed])
  const [selectedLocationId,setSelectedLocationId]=useState('')
  const [booking,setBooking]=useState<{serviceId:string;employeeId:string;date:string;start:string;locationId:string}|null>(null)
  const [slots,setSlots]=useState<Array<{start:string;end:string}>>([])
  const [bookingMonth,setBookingMonth]=useState(()=>currentMonth())
  const [availableDates,setAvailableDates]=useState<Record<string,number>>({})
  const [calendarLoading,setCalendarLoading]=useState(false)
  const [calendarView,setCalendarView]=useState(true)
  const [customer,setCustomer]=useState({name:'',email:'',phone:'',reviewOptIn:false})
  const [busy,setBusy]=useState(false)
  const [checkoutOpen,setCheckoutOpen]=useState(false)
  const [paymentProvider,setPaymentProvider]=useState<'stripe'|'ath_movil'>('stripe')
  useEffect(()=>{setPaymentProvider(site?.paymentRules?.methods?.stripe&&site?.paymentRules?.stripeAvailable?'stripe':site?.paymentRules?.athReady?'ath_movil':'stripe')},[site?.siteId,site?.paymentRules?.athReady,site?.paymentRules?.stripeAvailable])
  const [contact,setContact]=useState({name:'',email:'',phone:'',message:'',website:''})
  const [contactStatus,setContactStatus]=useState('')
  const [trackingUrl,setTrackingUrl]=useState('')
  const [manageUrl,setManageUrl]=useState('')
  const [calendarUrl,setCalendarUrl]=useState('')

  useEffect(()=>{
    if(previewSite){setSite(previewSite);setLang(previewLanguage);return}
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
      if(initial){setLang(x.site.settings?.locale==='es'?'es':'en');initial=false}
      document.title=x.site.business.nameEn||x.site.business.name||x.site.business.nameEs||'WebFactory'
    }).catch(e=>{if(active)setError(e instanceof Error?e.message:'No se pudo actualizar la página.')})
    const refresh=()=>{if(document.visibilityState==='visible'&&Date.now()-loadedAt>60000)void load()}
    void load()
    window.addEventListener('focus',refresh)
    document.addEventListener('visibilitychange',refresh)
    return()=>{active=false;window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh)}
  },[slug,previewSite,previewLanguage])
  useEffect(()=>{if(previewSite)return;const token=new URLSearchParams(location.search).get('tracking');if(token){const url=`${location.origin}/track/${encodeURIComponent(token)}`;setTrackingUrl(url);history.replaceState({},'',location.pathname)}},[previewSite])

  const visibleCatalog=useMemo(()=>site?.catalog.filter(item=>item.type==='product'?site.features.products!==false:site.features.services!==false)||[],[site])
  const cartItems=useMemo(()=>cart.map(line=>({line,item:visibleCatalog.find(x=>x.id===line.id)})).filter(x=>x.item),[cart,visibleCatalog])
  const total=cartItems.reduce((sum,x)=>sum+(x.item?.price||0)*x.line.quantity,0)
  const add=(item:Item)=>{
    if(site?.features.cart===false)return
    setCart(current=>{const found=current.find(x=>x.id===item.id);return found?current.map(x=>x.id===item.id?{...x,quantity:Math.min(20,x.quantity+1)}:x):[...current,{id:item.id,quantity:1}]})
  }
  const removeFromCart=(id:string)=>{
    if(busy)return
    const index=cart.findIndex(line=>line.id===id)
    if(index<0)return
    const item=visibleCatalog.find(item=>item.id===id)
    setRemoved({line:cart[index],index,name:item?itemName(item):''})
    setCart(current=>current.filter(line=>line.id!==id))
    setError('')
  }
  const undoRemove=()=>{
    if(!removed||busy)return
    const {line,index}=removed
    setCart(current=>{const found=current.find(row=>row.id===line.id);if(found)return current.map(row=>row.id===line.id?{...row,quantity:Math.min(20,row.quantity+line.quantity)}:row);const next=[...current];next.splice(Math.min(index,next.length),0,line);return next})
    setRemoved(null)
  }
  const copyTracking=async()=>{try{await navigator.clipboard.writeText(trackingUrl);setCopyStatus(lang==='es'?'Copiado':'Copied')}catch{setCopyStatus(lang==='es'?'No se pudo copiar. Mantén pulsado el enlace para copiarlo.':'Could not copy. Press and hold the link to copy it.')}}
  const beginBooking=(item:Item)=>{
    if(site?.features.bookings===false)return
    setSelectedItem(null)
    setBooking({serviceId:item.id,employeeId:'',date:'',start:'',locationId:selectedLocationId});setSlots([]);setAvailableDates({});setBookingMonth(currentMonth(site?.settings?.timezone));setCalendarView(true);setCatalog(false)
  }
  const locations=(site?.business.locations||[]) as Location[]
  const employees=site?.employees.filter(x=>x.serviceIds.includes(booking?.serviceId||'')&&(!locations.length||(booking?.locationId&&x.locationIds?.includes(booking.locationId))))||[]
  const getSlots=async(next:{serviceId:string;employeeId:string;date:string;start:string;locationId:string})=>{
    setBooking(next)
    setSlots([])
    if(previewSite||!next.employeeId||!next.date||!site)return
    setBusy(true)
    try{
      const r=await fetch('/.netlify/functions/booking-availability',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({siteId:site.siteId,serviceId:next.serviceId,employeeId:next.employeeId,date:next.date,locationId:next.locationId})})
      const x=await r.json()
      if(!r.ok)throw new Error(x.message)
      setSlots(x.slots)
    }catch(e){setError(e instanceof Error?e.message:'No se pudo consultar disponibilidad.')}finally{setBusy(false)}
  }
  useEffect(()=>{
    if(previewSite||!booking?.employeeId||!site)return
    let active=true
    setCalendarLoading(true)
    fetch('/.netlify/functions/booking-month-availability',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({siteId:site.siteId,serviceId:booking.serviceId,employeeId:booking.employeeId,month:bookingMonth,locationId:booking.locationId})})
      .then(async response=>{const result=await response.json();if(!response.ok)throw new Error(result.message);return result.available as Record<string,number>})
      .then(available=>{if(active){setAvailableDates(available);setError('')}})
      .catch(e=>{if(active){setAvailableDates({});setError(e instanceof Error?e.message:'No se pudo consultar el calendario.')}})
      .finally(()=>{if(active)setCalendarLoading(false)})
    return()=>{active=false}
  },[booking?.serviceId,booking?.employeeId,bookingMonth,site])
  const checkout=async(event:FormEvent)=>{
    event.preventDefault()
    if(previewSite){setError(lang==='es'?'Vista previa: no se procesan pagos.':'Preview: payments are not processed.');return}
    if(!site||busy||(!booking&&cartItems.length===0))return
    setRemoved(null)
    setBusy(true);setError('')
    try{
      const body=booking?{siteId:site.siteId,customer,booking,locationId:booking.locationId,lang}:{siteId:site.siteId,customer,items:cart,locationId:selectedLocationId,lang}
      const r=await fetch('/.netlify/functions/create-client-checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,paymentProvider})})
      const x=await r.json()
      if(!r.ok)throw new Error(x.message)
      if(x.checkoutUrl)location.assign(x.checkoutUrl)
      else{if(x.manageUrl)setManageUrl(x.manageUrl);if(x.calendarUrl)setCalendarUrl(x.calendarUrl);setCheckoutOpen(false);setBooking(null);setCart([]);if(x.trackingUrl){setTrackingUrl(x.trackingUrl);alert(lang==='es'?'Pedido recibido. El enlace para seguirlo aparece en la página.':'Order received. The tracking link is shown on the page.')}else alert(lang==='es'?'Confirmación recibida.':'Confirmation received.')}
    }catch(e){setError(e instanceof Error?e.message:'No se pudo iniciar el pago.')}finally{setBusy(false)}
  }
  useEffect(()=>{if(site&&!previewSite){const name=lang==='es'?(site.business.nameEs||site.business.nameEn||site.business.name):(site.business.nameEn||site.business.name||site.business.nameEs||'WebFactory');document.title=name||'WebFactory';document.documentElement.lang=lang}},[lang,site])

  const submitContact=async(event:FormEvent)=>{
    event.preventDefault()
    if(previewSite){setContactStatus(lang==='es'?'Vista previa: mensaje no enviado.':'Preview: message not sent.');return}
    setContactStatus(lang==='es'?'Enviando…':'Sending…')
    try{
      const r=await fetch('/.netlify/functions/client-contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug,...contact})})
      const x=await r.json()
      if(!r.ok)throw new Error(x.message)
      setContact({name:'',email:'',phone:'',message:'',website:''})
      setContactStatus(lang==='es'?'Mensaje enviado.':'Message sent.')
    }catch(e){setContactStatus(e instanceof Error?e.message:(lang==='es'?'No se pudo enviar.':'Could not send.'))}
  }

  if(error&&!site)return <main className="cs-state"><h1>{lang==='es'?'No disponible':'Unavailable'}</h1><p>{error}</p></main>
  if(!site)return <main className="cs-state">{lang==='es'?'Cargando website…':'Loading website…'}</main>

  const inPersonCheckout=(booking?site.paymentRules?.bookingPayment:site.paymentRules?.productPayment)==='in_person'
  const t=lang==='es'
    ?{catalog:'Catálogo',book:'Reservar',shop:'Comprar',cart:'Carrito',contact:'Contacto',available:'Productos y servicios',empty:'Todavía no hay artículos publicados.',team:'Selecciona un profesional',date:'Selecciona una fecha',times:'Horas disponibles',continue:'Continuar',customer:'Tus datos',pay:inPersonCheckout?(booking?'Confirmar reserva · pagar presencialmente':'Confirmar pedido · pagar presencialmente'):'Continuar al pago seguro',about:'Sobre nosotros',services:'Servicios',send:'Enviar mensaje',calendarView:'Calendario mensual',quickDate:'Fecha rápida'}
    :{catalog:'Catalog',book:'Book',shop:'Add to cart',cart:'Cart',contact:'Contact',available:'Products and services',empty:'No items have been published yet.',team:'Choose a professional',date:'Choose a date',times:'Available times',continue:'Continue',customer:'Your details',pay:inPersonCheckout?(booking?'Confirm booking · pay in person':'Confirm order · pay in person'):'Continue to secure payment',about:'About',services:'Services',send:'Send message',calendarView:'Month calendar',quickDate:'Quick date'}

  const businessName=lang==='es'?(site.business.nameEs||site.business.nameEn||site.business.name):(site.business.nameEn||site.business.name||site.business.nameEs||'')
  const categoryMap:Record<string,string>={Restaurant:'Restaurante',Catering:'Catering',Bartending:'Bartending',Barber:'Barbería',Beauty:'Belleza',Cosmetology:'Cosmetología',Wellness:'Bienestar',Retail:'Comercio',Landscaping:'Paisajismo','Car Wash':'Lavado de autos','Auto Repair':'Mecánica automotriz','Auto Body':'Hojalatería y pintura',Construction:'Construcción','House Cleaning':'Limpieza residencial','Roof Sealing':'Sellado de techos',Plumbing:'Plomería',Electrician:'Electricista','Music Artist':'Artista musical','DJ Services':'Servicios de DJ','Professional Services':'Servicios profesionales','Real Estate':'Bienes raíces','Care Services':'Servicios de cuido',Other:'Otros'}
  const businessCategory=lang==='es'?(categoryMap[site.business.category]||site.business.category):site.business.category
  const businessDescription=lang==='es'?(site.business.descriptionEs||site.business.descriptionEn||site.business.description):(site.business.descriptionEn||site.business.description||site.business.descriptionEs||'')
  const itemName=(item:Item)=>lang==='es'?(item.nameEs||item.nameEn||item.name):(item.nameEn||item.name||item.nameEs||'')
  const itemDescription=(item:Item)=>lang==='es'?(item.descriptionEs||item.descriptionEn||item.description):(item.descriptionEn||item.description||item.descriptionEs||'')
  const employeeRole=(employee:Employee)=>lang==='es'?(employee.roleEs||employee.roleEn||employee.role):(employee.roleEn||employee.role||employee.roleEs||'')
  const template=templateBySlug(site.design?.templateSlug||'')
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
  const galleryImages:string[]=site.business.galleryUrls?.length?site.business.galleryUrls:(template?.gallery||[])
  const hours=formatHours(site.hours,lang)
  const initials=(name:string)=>name.split(/\s+/).slice(0,2).map((part:string)=>part[0]||'').join('').toUpperCase()
  const styles={
    '--template-accent':site.design?.secondary||template?.accent||'#3C86F6',
    '--template-button-ink':templateButtonInk(site.design?.secondary||template?.accent||'#3C86F6'),
    '--template-accent-2':template?.accent2||site.design?.secondary||'#4D96F3',
    '--template-dark':site.design?.primary||template?.dark||'#0B1529',
    '--template-dark-ink':templateButtonInk(site.design?.primary||template?.dark||'#0B1529'),
    '--template-cream-ink':templateButtonInk(template?.cream||'#F3F6FB'),
    '--template-cream':template?.cream||'#F3F6FB',
    '--cs-primary':site.design?.primary||template?.dark||'#0B1529',
    '--cs-accent':site.design?.secondary||template?.accent||'#3C86F6',
  } as CSSProperties

  const preferredStyle=String(site.design?.style || '').toLowerCase()
  const visualStyle=['modern','luxury','minimal','bold'].includes(preferredStyle)?preferredStyle:template?templateVisualStyle(template.category):'modern'

  const layoutConfig: TemplateConfig = {
    slug: template?.slug || 'custom', category: businessCategory || '', name: businessName, shortName: businessName,
    kicker: site.business.kicker || businessCategory || '', headline: site.business.headline || businessName,
    description: businessDescription || '', heroImage, gallery: galleryImages, location: site.business.address || '', phone: site.features.calls ? site.business.phone || '' : '', hours,
    accent: styles['--template-accent' as keyof CSSProperties] as string, accent2: template?.accent2 || '', dark: site.design?.primary || template?.dark || '#0B1529', cream: template?.cream || '#F3F6FB',
    features: activeFeatureLabels, items: visibleCatalog.map(item=>({id:item.id,type:item.type,name:itemName(item),description:itemDescription(item),price:item.price,image:item.imageUrl,appointment:item.requiresAppointment,employees:site.employees.filter(employee=>employee.serviceIds.includes(item.id)).map(employee=>employee.name)})),
    employees: site.features.bookings ? site.employees.map(employee=>({id:employee.id,name:employee.name,role:employeeRole(employee),initials:initials(employee.name),services:employee.serviceIds.map(id=>site.catalog.find(item=>item.id===id)).filter((item):item is Item=>Boolean(item)).map(itemName)})) : [],
    bookingLabel: t.book, bookingEnabled: Boolean(site.features.bookings && visibleCatalog.some(item=>item.requiresAppointment)), cartEnabled: site.features.cart!==false,
    aboutTitle: site.business.aboutTitle || businessName, aboutText: site.business.aboutText || businessDescription || '', trust: [],
  }
  const layoutUi = {...templateUi[lang], catalogIntro:businessDescription, teamIntro:lang==='es'?'Conoce a nuestro equipo y sus servicios.':'Meet our team and explore their services.', aboutTemplate: t.about, livePreview: lang==='es'?'RESERVACIONES Y COMPRAS':'BOOKINGS AND SHOPPING', templateMode: businessName, bookingPreview:lang==='es'?'Reserva tu próxima visita':'Book your next visit', commercePreview: t.catalog, interactHint:businessDescription, availabilityReady:lang==='es'?'Consulta los horarios disponibles':'Explore available times', commerceReady:t.catalog}
  const startLayoutBooking=(item?:TemplateItem)=>{const service=item?visibleCatalog.find(entry=>entry.id===item.id):visibleCatalog.find(entry=>entry.requiresAppointment);if(service)beginBooking(service)}

  return <div className={`template-site client-template template-${site.design?.templateSlug||'custom'} visual-${visualStyle}`} style={styles}>
    <TemplateLayout config={layoutConfig} ui={layoutUi} language={lang} setLanguage={setLang} startBooking={startLayoutBooking} setCatalogOpen={setCatalog} setCartOpen={open=>{setBooking(null);setCheckoutOpen(open)}} cart={cart} showcaseFeatures={activeFeatureLabels} logoUrl={site.business.logoUrl} locationHref={site.features.maps?site.business.mapsUrl:undefined} phoneHref={site.features.calls&&site.business.phone?`tel:${site.business.phone}`:undefined} catalogEnabled={site.features.products!==false||site.features.services!==false}
      extraSections={locations.length>0&&<section className="template-section cs-locations" id="locations"><div className="template-section-heading"><div><small>{lang==='es'?'VISÍTANOS':'VISIT US'}</small><h2>{lang==='es'?'Nuestras localidades':'Our locations'}</h2></div></div><div className="cs-location-grid">{locations.map(location=><article key={location.id}><h3>{location.name}</h3>{location.address&&<p>{location.address}</p>}{location.phone&&<a href={`tel:${location.phone}`}>{location.phone}</a>}{location.mapsUrl&&<p><a href={location.mapsUrl} target="_blank" rel="noreferrer">Google Maps ↗</a></p>}</article>)}</div></section>}
      contact={<div className="cs-contact-grid">
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
            <input aria-label={lang==='es'?'Nombre':'Name'} autoComplete="name" maxLength={180} placeholder={lang==='es'?'Nombre':'Name'} value={contact.name} onChange={e=>setContact({...contact,name:e.target.value})} required/>
            <input aria-label="Email" autoComplete="email" maxLength={320} type="email" placeholder="Email" value={contact.email} onChange={e=>setContact({...contact,email:e.target.value})} required/>
            <input aria-label={lang==='es'?'Teléfono':'Phone'} autoComplete="tel" type="tel" maxLength={80} placeholder={lang==='es'?'Teléfono':'Phone'} value={contact.phone} onChange={e=>setContact({...contact,phone:e.target.value})}/>
            <textarea aria-label={lang==='es'?'Mensaje':'Message'} maxLength={5000} placeholder={lang==='es'?'Mensaje':'Message'} value={contact.message} onChange={e=>setContact({...contact,message:e.target.value})} required/>
            <div hidden aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" value={contact.website} onChange={e=>setContact({...contact,website:e.target.value})}/></label></div>
            <CustomerDataNotice lang={lang} businessName={businessName}/>
            <BusinessPolicies policies={site.business.policies} lang={lang} businessName={businessName}/>
            <button className="template-solid">{t.send}</button>
            {contactStatus&&<small role="status">{contactStatus}</small>}
          </form>}
        </div>}
      footer={<footer className="template-footer"><div><strong>{businessName}</strong><span>{businessCategory}</span></div><nav><a href="#template-top">{lang==='es'?'Inicio':'Home'}</a><a href="#contact">{t.contact}</a><BusinessPolicies policies={site.business.policies} lang={lang} businessName={businessName}/></nav></footer>}
    />

    {catalog&&<div className="template-modal-backdrop" onMouseDown={()=>setCatalog(false)}><section className="template-catalog-modal" role="dialog" aria-modal="true" onMouseDown={e=>e.stopPropagation()}><header><div><small>CATALOG</small><h2>{t.available}</h2></div><button className="template-modal-close catalog-close" onClick={()=>setCatalog(false)}>×</button></header>{visibleCatalog.length===0?<p>{t.empty}</p>:<div className="template-catalog-modal-grid">{visibleCatalog.map(item=><CatalogCard key={item.id} item={layoutConfig.items.find(entry=>entry.id===item.id)!} accent={layoutConfig.accent} language={lang} ui={templateUi[lang]} disabled={item.inventory===0} bookEnabled={site.features.bookings} cartEnabled={site.features.cart!==false} onView={()=>{setCatalog(false);setSelectedItem(item)}} onBook={()=>beginBooking(item)} onAdd={()=>add(item)}/>)}</div>}</section></div>}

    {selectedItem&&<div className="template-modal-backdrop" onMouseDown={()=>setSelectedItem(null)}><article className="template-detail-modal" role="dialog" aria-modal="true" onMouseDown={event=>event.stopPropagation()}><button className="template-modal-close" onClick={()=>setSelectedItem(null)}>×</button><div className="template-detail-image">{selectedItem.imageUrl&&<img src={selectedItem.imageUrl} alt=""/>}</div><div className="template-detail-copy"><small>{selectedItem.type==='service'?templateUi[lang].serviceType:templateUi[lang].product}</small><h2>{itemName(selectedItem)}</h2><strong>{money(selectedItem.price)}</strong><p>{itemDescription(selectedItem)}</p>{selectedItem.requiresAppointment&&<span>{selectedItem.duration} min</span>}<div className="template-detail-actions">{selectedItem.inventory===0?<span>{lang==='es'?'Agotado':'Sold out'}</span>:selectedItem.requiresAppointment&&site.features.bookings?<button className="template-solid" onClick={()=>beginBooking(selectedItem)}>{t.book}</button>:!selectedItem.requiresAppointment&&site.features.cart!==false?<button className="template-solid" onClick={()=>{add(selectedItem);setSelectedItem(null);setCheckoutOpen(true)}}>{t.shop}</button>:null}<button className="template-outline" onClick={()=>setSelectedItem(null)}>{templateUi[lang].close}</button></div></div></article></div>}

    {booking&&<div className="cs-modal"><section><header><div><small>BOOKING</small><h2>{(()=>{const service=site.catalog.find(x=>x.id===booking.serviceId);return service?itemName(service):''})()}</h2></div><button onClick={()=>setBooking(null)}>×</button></header><div className="cs-booking">{locations.length>0&&<label>{lang==='es'?'Localidad':'Location'}<select value={booking.locationId} onChange={e=>{const locationId=e.target.value;setAvailableDates({});setSlots([]);setBooking({...booking,locationId,employeeId:'',date:'',start:''})}}><option value="">—</option>{locations.map(location=><option value={location.id} key={location.id}>{location.name}</option>)}</select></label>}<label>{t.team}<select value={booking.employeeId} disabled={locations.length>0&&!booking.locationId} onChange={e=>{setAvailableDates({});void getSlots({...booking,employeeId:e.target.value,date:'',start:''})}}><option value="">—</option>{employees.map(x=><option key={x.id} value={x.id}>{x.name} · {employeeRole(x)}</option>)}</select></label><section className="cs-booking-date"><div className="cs-booking-date-heading"><strong>{t.date}</strong><div role="group" aria-label={lang==='es'?'Vista de fechas':'Date view'}><button type="button" className={calendarView?'active':''} aria-pressed={calendarView} onClick={()=>setCalendarView(true)}>{t.calendarView}</button><button type="button" className={!calendarView?'active':''} aria-pressed={!calendarView} onClick={()=>setCalendarView(false)}>{t.quickDate}</button></div></div>{calendarView?<MonthCalendar month={bookingMonth} locale={lang} timeZone={site.settings?.timezone||'America/Puerto_Rico'} selectedDate={booking.date} availability={availableDates} loading={calendarLoading} onMonthChange={setBookingMonth} onSelectDate={date=>void getSlots({...booking,date,start:''})}/>:<label className="cs-quick-date"><span>{t.date}</span><input type="date" min={currentDate(site.settings?.timezone)} value={booking.date} onChange={e=>{const date=e.target.value;if(date)setBookingMonth(date.slice(0,7));void getSlots({...booking,date,start:''})}}/></label>}</section><fieldset><legend>{t.times}</legend>{!booking.employeeId?<p>{lang==='es'?'Primero selecciona un profesional.':'Choose a professional first.'}</p>:busy?<p>{lang==='es'?'Consultando…':'Checking…'}</p>:!booking.date?<p>{lang==='es'?'Selecciona un día disponible.':'Choose an available day.'}</p>:slots.length===0?<p>{lang==='es'?'No quedan horarios para este día.':'No times remain for this day.'}</p>:slots.map(slot=><button type="button" className={booking.start===slot.start?'active':''} key={slot.start} onClick={()=>setBooking({...booking,start:slot.start})}>{new Date(slot.start).toLocaleTimeString(lang==='es'?'es-PR':'en-US',{hour:'numeric',minute:'2-digit',timeZone:site.settings?.timezone||'America/Puerto_Rico'})}</button>)}</fieldset><button className="cs-primary" disabled={!booking.start} onClick={()=>setCheckoutOpen(true)}>{t.continue}</button></div></section></div>}

    {calendarUrl&&<div className="cs-tracking-banner" role="status"><span>{lang==='es'?'Cita confirmada. Guarda tu reservación en tu calendario.':'Appointment confirmed. Save your booking to your calendar.'}</span><a href={calendarUrl} target="_blank" rel="noreferrer">{lang==='es'?'Añadir al calendario':'Add to calendar'} ↗</a>{manageUrl&&<a href={manageUrl} target="_blank" rel="noreferrer">{lang==='es'?'Administrar reserva':'Manage booking'} ↗</a>}</div>}
    {trackingUrl&&<div className="cs-tracking-banner"><span>{lang==='es'?'Guarda este enlace para ver el progreso de tu orden.':'Save this link to check your order progress.'}</span><a href={trackingUrl}>{lang==='es'?'Ver estado':'View status'} ↗</a><button onClick={copyTracking}>{lang==='es'?'Copiar':'Copy'}</button><span role="status">{copyStatus}</span></div>}{checkoutOpen&&<div className="cs-modal"><section className="cs-checkout"><header><div><small>CHECKOUT</small><h2>{t.customer}</h2></div><button onClick={()=>setCheckoutOpen(false)}>×</button></header>{locations.length>0&&!booking&&<label className="cs-location-select">{lang==='es'?'Localidad':'Location'}<select value={selectedLocationId} onChange={e=>setSelectedLocationId(e.target.value)} required><option value="">—</option>{locations.map(location=><option key={location.id} value={location.id}>{location.name}</option>)}</select></label>}{!booking&&<div className="cs-cart-lines" aria-live="polite">{cartItems.map(({line,item})=><div className="cs-cart-line" key={line.id}><span>{item?itemName(item):''} × {line.quantity}</span><b>{money((item?.price||0)*line.quantity)}</b><button type="button" className="cs-cart-remove" disabled={busy} aria-label={`${lang==='es'?'Eliminar':'Remove'} ${item?itemName(item):''}`} onClick={()=>removeFromCart(line.id)}>{lang==='es'?'Eliminar':'Remove'}</button></div>)}{cartItems.length===0&&<p role="status">{lang==='es'?'Tu carrito está vacío.':'Your cart is empty.'}</p>}<strong>Total <b>{money(total)}</b></strong>{removed&&<div className="cs-cart-notice" role="status"><span>{removed.name} · {lang==='es'?'Producto eliminado':'Item removed'}</span><button type="button" disabled={busy} onClick={undoRemove}>{lang==='es'?'Deshacer':'Undo'}</button></div>}{cartItems.length===0&&<button type="button" onClick={()=>{setCheckoutOpen(false);setCatalog(true)}}>{lang==='es'?'Explorar productos':'Browse products'}</button>}</div>}<form onSubmit={checkout}>{!inPersonCheckout&&<label>{lang==='es'?'Método de pago':'Payment method'}<select value={paymentProvider} onChange={e=>setPaymentProvider(e.target.value as 'stripe'|'ath_movil')}>{site.paymentRules?.methods?.stripe&&site.paymentRules?.stripeAvailable&&<option value="stripe">{lang==='es'?'Tarjeta · Stripe':'Card · Stripe'}</option>}{site.paymentRules?.athReady&&<option value="ath_movil">ATH Móvil</option>}</select></label>}<label>{lang==='es'?'Nombre':'Name'}<input value={customer.name} onChange={e=>setCustomer({...customer,name:e.target.value})} required/></label><label>Email<input type="email" value={customer.email} onChange={e=>setCustomer({...customer,email:e.target.value})} required/></label><label>{lang==='es'?'Teléfono':'Phone'}<input value={customer.phone} onChange={e=>setCustomer({...customer,phone:e.target.value})}/></label><label className="check"><input type="checkbox" checked={customer.reviewOptIn} onChange={e=>setCustomer({...customer,reviewOptIn:e.target.checked})}/>{lang==='es'?'Quiero recibir emails opcionales para compartir una reseña. Puedo darme de baja.':'I would like optional review request emails. I can unsubscribe.'}</label><CustomerDataNotice lang={lang} businessName={businessName}/><BusinessPolicies policies={site.business.policies} lang={lang} businessName={businessName}/><button disabled={busy||(!inPersonCheckout&&!site.paymentRules?.athReady&&!(site.paymentRules?.methods?.stripe&&site.paymentRules?.stripeAvailable))||(!booking&&cartItems.length===0)||(locations.length>0&&!(booking?.locationId||selectedLocationId))}>{busy?(lang==='es'?'Preparando…':'Preparing…'):t.pay}</button></form><p>{inPersonCheckout?(lang==='es'?'Pagarás presencialmente en el negocio. La confirmación aparecerá después de guardar la reserva o el pedido.':'You will pay in person at the business. Confirmation appears after the booking or order is saved.'):(lang==='es'?`${paymentProvider==='ath_movil'?'ATH Móvil':'Stripe'} procesa el pago en la cuenta del negocio. El servidor verifica el pago antes de confirmar.`:`${paymentProvider==='ath_movil'?'ATH Móvil':'Stripe'} processes payment through the business account. The server verifies payment before confirming.`)}</p>{error&&<div className="cs-error">{error}</div>}</section></div>}
  </div>
}
