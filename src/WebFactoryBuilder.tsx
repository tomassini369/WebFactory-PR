Warning: truncated output (original token count: 20357)
Total output lines: 1309

import { useEffect, useMemo, useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react'
import { templateConfigs, templateGroups, templateGroupForCategory, templateVisualStyle } from './templateData'
import BuilderAiAssistant from './BuilderAiAssistant'
import { feedback } from './feedback/feedback'
import { contrastTextColor } from './color-contrast'
import './builder.css'

type Language = 'es' | 'en'
type BuilderStyle = 'Modern' | 'Luxury' | 'Minimal' | 'Bold'
type Device = 'desktop' | 'tablet' | 'mobile'
type ItemType = 'product' | 'service'

type CatalogItem = {
  id: string
  type: ItemType
  name: string
  nameEn?: string
  nameEs?: string
  price: number
  description: string
  descriptionEn?: string
  descriptionEs?: string
  image?: string
  imageAssetKey?: string
  imageName?: string
  imageType?: string
  requiresAppointment: boolean
  duration: number
}

type TeamMember = {
  id: string
  name: string
  role: string
  roleEn?: string
  roleEs?: string
  serviceIds: string[]
}

type DayHours = {
  enabled: boolean
  open: string
  close: string
}

type PaymentConfiguration = {
  methods: {
    stripe: boolean
    ath: boolean
    inPerson: boolean
  }
  stripe: {
    connection: 'connect'
    accountStatus: 'new' | 'existing'
    checkoutExperience: 'hosted'
    settlementCurrency: 'usd'
    dynamicPaymentMethods: true
  }
  ath: {
    accountStatus: 'needs_account' | 'active'
    publicPath: string
  }
  inPerson: {
    instructions: string
  }
  productPayment: 'online' | 'in_person'
  bookingPayment: 'full' | 'deposit' | 'in_person'
  bookingDepositPercent: number
  sendCustomerReceipt: boolean
  allowTips: boolean
}

type BuilderState = {
  business: {
    name: string
    nameEn?: string
    nameEs?: string
    slug: string
    contactName: string
    category: string
    description: string
    descriptionEn?: string
    descriptionEs?: string
    phone: string
    whatsapp: string
    email: string
    mapsUrl: string
    instagram: string
    facebook: string
    x: string
    hero?: string
    heroAssetKey?: string
    heroAssetName?: string
    heroAssetType?: string
    gallery?: string[]
    galleryAssets?: Array<{assetKey:string;fileName:string;contentType:string}>
    logo?: string
    logoAssetKey?: string
    logoAssetName?: string
    logoAssetType?: string
  }
  design: {
    templateSlug: string
    customLayout: 'split' | 'centered' | 'editorial' | 'showcase'
    sectionOrder: string[]
    style: BuilderStyle
    primary: string
    secondary: string
  }
  features: Record<string, boolean>
  catalog: CatalogItem[]
  team: TeamMember[]
  hours: Record<string, DayHours>
  payments: PaymentConfiguration
}

const PRICE = '$30'
const CATALOG_LIMIT = 100
const STORAGE_KEY = 'webfactory-v3-builder-draft'
const DRAFT_ID_KEY = 'webfactory-v2-draft-id'

const initialState: BuilderState = {
  business: {
    name: '',
    slug: '',
    contactName: '',
    category: 'Other',
    description: '',
    phone: '',
    whatsapp: '',
    email: '',
    mapsUrl: '',
    instagram: '',
    facebook: '',
    x: '',
    gallery: [],
    galleryAssets: [],
  },
  design: {
    templateSlug: '',
    customLayout: 'split',
    sectionOrder: ['catalog','team','about','gallery','contact'],
    style: 'Modern',
    primary: '#0B1529',
    secondary: '#3C86F6',
  },
  features: {
    products: true,
    services: true,
    cart: true,
    whatsapp: true,
    calls: true,
    social: true,
    form: true,
    maps: true,
    stripe: true,
    ath: true,
    inPersonPayments: true,
    bookings: true,
    calendar: true,
  },
  catalog: [],
  team: [],
  hours: {
    Lunes: { enabled: true, open: '09:00', close: '17:00' },
    Martes: { enabled: true, open: '09:00', close: '17:00' },
    Miércoles: { enabled: true, open: '09:00', close: '17:00' },
    Jueves: { enabled: true, open: '09:00', close: '17:00' },
    Viernes: { enabled: true, open: '09:00', close: '17:00' },
    Sábado: { enabled: true, open: '10:00', close: '15:00' },
    Domingo: { enabled: false, open: '10:00', close: '15:00' },
  },
  payments: {
    methods: { stripe: true, ath: true, inPerson: true },
    stripe: {
      connection: 'connect',
      accountStatus: 'new',
      checkoutExperience: 'hosted',
      settlementCurrency: 'usd',
      dynamicPaymentMethods: true,
    },
    ath: { accountStatus: 'needs_account', publicPath: '' },
    inPerson: { instructions: 'Paga al recibir el producto o al completar el servicio.' },
    productPayment: 'online',
    bookingPayment: 'deposit',
    bookingDepositPercent: 25,
    sendCustomerReceipt: true,
    allowTips: false,
  },
}

const categories = [...new Set([...templateConfigs.map((template)=>template.category),'Other'])].sort()
const styles: BuilderStyle[] = ['Modern','Luxury','Minimal','Bold']

const featureHelp: Record<Language,Record<string,string>> = {
  es: {
    products:'Muestra productos físicos o digitales dentro del catálogo.',
    services:'Muestra servicios y permite marcar cuáles requieren cita.',
    cart:'Permite añadir artículos y continuar al checkout.',
    whatsapp:'Abre una conversación directa con el WhatsApp configurado.',
    calls:'Permite llamar al teléfono del negocio con un toque.',
    social:'Muestra Instagram, Facebook y X cuando estén configurados.',
    form:'Añade un formulario de contacto para visitantes.',
    maps:'Muestra o enlaza la ubicación real de Google Maps.',
    bookings:'Activa reservaciones por servicio, empleado y horario.',
    calendar:'Conecta Google Calendar para disponibilidad y conflictos.',
  },
  en: {
    products:'Shows physical or digital products in the catalog.',
    services:'Shows services and lets you mark which ones require appointments.',
    cart:'Lets visitors add items and continue to checkout.',
    whatsapp:'Opens a direct conversation with the configured WhatsApp number.',
    calls:'Lets visitors call the business phone with one tap.',
    social:'Shows Instagram, Facebook and X when configured.',
    form:'Adds a visitor contact form.',
    maps:'Shows or links the real Google Maps location.',
    bookings:'Enables bookings by service, employee and time.',
    calendar:'Connects Google Calendar for availability and conflicts.',
  },
}

const featureLabels: Record<Language,Record<string,string>> = {
  es: {
  products: 'Productos', services: 'Servicios', cart: 'Carrito',
  whatsapp: 'WhatsApp',
  calls: 'Llamadas', social: 'Redes sociales', form: 'Formulario',
  maps: 'Google Maps', bookings: 'Reservaciones', calendar: 'Google Calendar',
  },
  en: {
  products: 'Products', services: 'Services', cart: 'Cart',
  whatsapp: 'WhatsApp', calls: 'Calls', social: 'Social media', form: 'Contact form',
  maps: 'Google Maps', bookings: 'Bookings', calendar: 'Google Calendar',
  },
}

const googleMapsHosts = new Set([
  'google.com',
  'www.google.com',
  'maps.google.com',
  'maps.app.goo.gl',
  'goo.gl',
])

const isGoogleMapsUrl = (value: string) => {
  if (!value.trim()) return false
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' && (
      googleMapsHosts.has(url.hostname) ||
      url.hostname.endsWith('.google.com')
    ) && (
      url.hostname.includes('maps') ||
      url.pathname.includes('/maps') ||
      url.searchParams.has('query') ||
      url.searchParams.has('q')
    )
  } catch {
    return false
  }
}

const googleMapsEmbedUrl = (value: string) => {
  if (!isGoogleMapsUrl(value)) return null
  try {
    const url = new URL(value.trim())
    if (url.pathname.startsWith('/maps/embed')) return url.toString()

    const coordMatch = url.toString().match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
    if (coordMatch) {
      return `https://www.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}&output=embed`
    }

    const query = url.searchParams.get('query') || url.searchParams.get('q')
    if (query) {
      return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`
    }
  } catch {
    return null
  }
  return null
}

const getDraftId = () => {
  const existing = localStorage.getItem(DRAFT_ID_KEY)
  if (existing) return existing
  const next = crypto.randomUUID()
  localStorage.setItem(DRAFT_ID_KEY,next)
  return next
}

const uploadOrderAsset = async (file:File,itemId:string) => {
  const form = new FormData()
  form.append('draftId',getDraftId())
  form.append('itemId',itemId)
  form.append('file',file)
  const response = await fetch('/.netlify/functions/upload-builder-asset',{
    method:'POST',
    body:form,
  })
  const result = await response.json()
  if (!response.ok || !result.ok) {
    throw new Error(result.message || 'No se pudo guardar el archivo.')
  }
  return result as {assetKey:string;fileName:string;contentType:string;size:number}
}

const readFile = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`

function Toggle({checked,onChange,label,help}:{checked:boolean;onChange:(value:boolean)=>void;label:string;help?:string}) {
  return (
    <button
      type="button"
      className={`wf-toggle ${checked?'on':''}`}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
    >
      <span><i /></span>
      <div className="wf-toggle-copy"><b>{label}</b>{help&&<small>{help}</small>}</div>
      <em>{checked?'ON':'OFF'}</em>
    </button>
  )
}

function Field({label,value,onChange,placeholder,type='text',disabled=false}:{
  label:string
  value:string
  onChange:(value:string)=>void
  placeholder?:string
  type?:string
  disabled?:boolean
}) {
  return (
    <label className="wf-field">
      <span>{label}</span>
      <input type={type} value={value} placeholder={placeholder} disabled={disabled} onChange={(event)=>onChange(event.target.value)} />
    </label>
  )
}

function Preview({state,device,lang}:{state:BuilderState;device:Device;lang:Language}) {
  const [catalogOpen,setCatalogOpen] = useState(false)
  const businessName = lang==='es' ? (state.business.nameEs || state.business.nameEn || state.business.name) : (state.business.nameEn || state.business.name || state.business.nameEs || '')
  const businessDescription = lang==='es' ? (state.business.descriptionEs || state.business.descriptionEn || state.business.description) : (state.business.descriptionEn || state.business.description || state.business.descriptionEs || '')
  const itemName = (item:CatalogItem) => lang==='es' ? (item.nameEs || item.nameEn || item.name) : (item.nameEn || item.name || item.nameEs || '')
  const itemDescription = (item:CatalogItem) => lang==='es' ? (item.descriptionEs || item.descriptionEn || item.description) : (item.descriptionEn || item.description || item.descriptionEs || '')
  const memberRole = (member:TeamMember) => lang==='es' ? (member.roleEs || member.roleEn || member.role) : (member.roleEn || member.role || member.roleEs || '')
  const [selectedItem,setSelectedItem] = useState<CatalogItem | null>(null)
  const appointments = state.catalog.filter((item)=>item.type==='service' && item.requiresAppointment)
  const mapsValid = isGoogleMapsUrl(state.business.mapsUrl)
  const mapsEmbed = googleMapsEmbedUrl(state.business.mapsUrl)
  const visibleCatalog = state.catalog.filter((item)=>
    item.type==='product' ? state.features.products : state.features.services
  )
  const style = {
    '--preview-primary': state.design.primary,
    '--preview-secondary': state.design.secondary,
    '--preview-primary-contrast': contrastTextColor(state.design.primary),
    '--preview-secondary-contrast': contrastTextColor(state.design.secondary),
  } as CSSProperties

  return (
    <div className={`wf-preview-shell ${device}`} style={style}>
      <div className={`wf-preview-page style-${state.design.style.toLowerCase()}`}>
        <header>
          <div className="wf-preview-brand">
            {state.business.logo ? <img src={state.business.logo} alt="" /> : <span>{businessName.slice(0,2).toUpperCase()}</span>}
            <strong>{businessName || (lang==='es'?'Tu negocio':'Your business')}</strong>
          </div>
          <nav>
            <span>{lang==='es'?'Inicio':'Home'}</span>
            {(state.features.services || state.features.products) && <button className="wf-preview-catalog-link" onClick={()=>setCatalogOpen(true)}>{lang==='es'?'Catálogo':'Catalog'}</button>}
            {state.features.bookings && <button>{lang==='es'?'Reservar':'Book'}</button>}
          </nav>
        </header>

        <section className="wf-preview-hero">
          {state.business.hero&&<img className="wf-preview-hero-photo" src={state.business.hero} alt="" />}
          <small>{state.business.category || 'BUSINESS'}</small>
          <h3>{businessName || (lang==='es'?'Tu negocio':'Your business')}</h3>
          <p>{businessDescription || (lang==='es'?'Describe aquí lo que hace especial a tu negocio.':'Describe what makes your business special.')}</p>
          <div>
            {(state.features.products || state.features.services) && <button onClick={()=>setCatalogOpen(true)}>{lang==='es'?'Ver productos y servicios':'View products and services'}</button>}
            {state.features.bookings && <button className="ghost">{lang==='es'?'Reservar ahora':'Book now'}</button>}
            {state.features.whatsapp && <button className="ghost">WhatsApp</button>}
          </div>
        </section>

        <section className="wf-preview-catalog-gateway">
          <small>{lang==='es'?'CATÁLOGO':'CATALOG'}</small>
          <strong>{visibleCatalog.length} {lang==='es'?'productos y servicios disponibles':'products and services available'}</strong>
          <p>{lang==='es'?'El catálogo permanece oculto para mantener la página limpia. El cliente lo abre solamente cuando desea explorar.':'The catalog stays tucked away to keep the page clean and opens when a customer wants to browse.'}</p>
          <button onClick={()=>setCatalogOpen(true)}>{lang==='es'?'Abrir catálogo':'Open catalog'} →</button>
        </section>

        {state.features.bookings && appointments.length > 0 && (
          <section className="wf-preview-booking">
            <small>BOOKING</small>
            <strong>{lang==='es'?'Reserva en pocos pasos.':'Book in a few steps.'}</strong>
            <div>
              <span>{lang==='es'?'Servicio':'Service'}</span><i>→</i>
              <span>{lang==='es'?'Empleado':'Team member'}</span><i>→</i>
              <span>{lang==='es'?'Hora':'Time'}</span>
            </div>
          </section>
        )}

        {(state.business.gallery||[]).length>0&&<section className="wf-preview-gallery">{(state.business.gallery||[]).map((image,index)=><img key={index} src={image} alt="" />)}</section>}

        {state.team.length > 0 && (
          <section className="wf-preview-team">
            <small>{lang==='es'?'EQUIPO':'TEAM'}</small>
            <div>
              {state.team.slice(0,4).map((member) => (
                <article key={member.id}>
                  <b>{member.name.slice(0,1).toUpperCase()}</b>
                  <span><strong>{member.name}</strong><em>{memberRole(member)}</em></span>
                </article>
              ))}
            </div>
          </section>
        )}

        {state.features.maps && mapsValid && (
          <section className="wf-preview-location">
            <div>
              <small>{lang==='es'?'UBICACIÓN':'LOCATION'}</small>
              <strong>{lang==='es'?'Encuéntranos en Google Maps.':'Find us on Google Maps.'}</strong>
              <a href={state.business.mapsUrl} target="_blank" rel="noreferrer">{lang==='es'?'Ver ubicación real':'View location'} ↗</a>
            </div>
            {mapsEmbed ? (
              <iframe
                title={lang==='es'?'Ubicación de Google Maps':'Google Maps location'}
                src={mapsEmbed}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <a className="wf-preview-map-link" href={state.business.mapsUrl} target="_blank" rel="noreferrer">
                <span>Google Maps</span>
                <b>{lang==='es'?'Abrir ubicación real':'Open location'} ↗</b>
              </a>
            )}
          </section>
        )}

        <footer>
          <strong>{businessName || (lang==='es'?'Tu negocio':'Your business')}</strong>
          <span>{state.business.phone}</span>
          {state.features.maps && mapsValid && (
            <a href={state.business.mapsUrl} target="_blank" rel="noreferrer">Google Maps ↗</a>
          )}
        </footer>

        {catalogOpen && (
          <div className="wf-preview-modal-backdrop" onMouseDown={()=>setCatalogOpen(false)}>
            <section className="wf-preview-catalog-window" onMouseDown={(event)=>event.stopPropagation()}>
              <header>
                <div><small>{lang==='es'?'CATÁLOGO':'CATALOG'}</small><strong>{lang==='es'?'Productos y servicios':'Products and services'}</strong></div>
                <button onClick={()=>setCatalogOpen(false)}>×</button>
              </header>
              <div className="wf-preview-modal-items">
                {visibleCatalog.length===0 ? (
                  <div className="wf-preview-empty">{lang==='es'?'No hay productos o servicios activos en el preview.':'There are no active products or services in this preview.'}</div>
                ) : visibleCatalog.map((item)=>(
                  <button key={item.id} className="wf-preview-modal-card" onClick={()=>setSelectedItem(item)}>
                    {item.image ? <img src={item.image} alt="" /> : <span className="wf-preview-placeholder">{item.type==='service'?'SERVICE':'PRODUCT'}</span>}
                    <div><small>{item.type==='service'?(lang==='es'?'servicio':'service'):(lang==='es'?'producto':'product')}</small><strong>{itemName(item) || (lang==='es'?'Sin nombre':'Untitled')}</strong><b>${Number(item.price || 0).toFixed(2)}</b></div>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {selectedItem && (
          <div className="wf-preview-modal-backdrop detail" onMouseDown={()=>setSelectedItem(null)}>
            <section className="wf-preview-item-window" onMouseDown={(event)=>event.stopPropagation()}>
              <button className="wf-preview-close" onClick={()=>setSelectedItem(null)}>×</button>
              {selectedItem.image ? <img src={selectedItem.image} alt="" /> : <div className="wf-preview-item-placeholder">{selectedItem.type==='service'?'SERVICE':'PRODUCT'}</div>}
              <div>
                <small>{selectedItem.type.toUpperCase()}</small>
                <h4>{itemName(selectedItem) || (lang==='es'?'Sin nombre':'Untitled')}</h4>
                <strong>${Number(selectedItem.price || 0).toFixed(2)}</strong>
                <p>{itemDescription(selectedItem) || (lang==='es'?'Descripción del producto o servicio.':'Product or service description.')}</p>
                {selectedItem.requiresAppointment && <span>{selectedItem.duration} min · {lang==='es'?'Requiere reservación':'Booking required'}</span>}
                <button>{selectedItem.requiresAppointment?(lang==='es'?'Reservar':'Book'):(lang==='es'?'Añadir al carrito':'Add to cart')}</button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

function BusinessStep({state,setState,lang,lockedEmail}:{state:BuilderState;setState:Dispatch<SetStateAction<BuilderState>>;lang:Language;lockedEmail?:string}) {
  const [uploadingLogo,setUploadingLogo] = useState(false)
  const [uploadError,setUploadError] = useState('')
  const setBusiness = <K extends keyof BuilderState['business']>(key:K, value:BuilderState['business'][K]) =>
    setState((current)=>({...current,business:{...current.business,[key]:value}}))

  const uploadLogo = async (file?:File) => {
    if (!file) return
    setUploadingLogo(true)
    setUploadError('')
    try {
      const [preview,asset] = await Promise.all([
        readFile(file),
        uploadOrderAsset(file,'business-logo'),
      ])
      setState((current)=>({
        ...current,
        business:{
          ...current.business,
          logo:preview,
          logoAssetKey:asset.assetKey,
          logoAssetName:asset.fileName,
          logoAssetType:asset.contentType,
        },
      }))
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : (lang==='es'?'No se pudo guardar el logo.':'The logo could not be saved.'))
    } finally {
      setUploadingLogo(false)
    }
  }

  const uploadHero = async (file?:File) => {
    if (!file) return
    setUploadingLogo(true)
    setUploadError('')
    try {
      const [preview,asset] = await Promise.all([readFile(file),uploadOrderAsset(file,'business-hero')])
      setState((current)=>({...current,business:{...current.business,hero:preview,heroAssetKey:asset.assetKey,heroAssetName:asset.fileName,heroAssetType:asset.contentType}}))
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : (lang==='es'?'No se pudo guardar la imagen principal.':'The hero image could not be saved.'))
    } finally {
      setUploadingLogo(false)
    }
  }

  const uploadGallery = async (file?:File) => {
    if (!file) return
    const currentCount = state.business.galleryAssets?.length || 0
    setUploadingLogo(true)
    setUploadError('')
    try {
      const [preview,asset] = await Promise.all([readFile(file),uploadOrderAsset(file,'business-gallery-'+String(currentCount+1))])
      setState((current)=>({...current,business:{
        ...current.business,
        gallery:[...(current.business.gallery||[]),preview],
        galleryAssets:[...(current.business.galleryAssets||[]),{assetKey:asset.assetKey,fileName:asset.fileName,contentType:asset.contentType}],
      }}))
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : (lang==='es'?'No se pudo guardar la imagen de galería.':'The gallery image could not be saved.'))
    } finally {
      setUploadingLogo(false)
    }
  }

  return (
    <div className="wf-step-content">
      <div className="wf-step-intro"><small>{lang==='es'?'PASO 1 · INFORMACIÓN':'STEP 1 · BUSINESS INFO'}</small><h3>{lang==='es'?'Cuéntanos sobre tu negocio.':'Tell us about your business.'}</h3><p>{lang==='es'?'Completa únicamente tus datos reales. Todo lo que escribas aquí se reflejará en tu website y portal administrativo.':'Enter only your real business information. Everything entered here will be reflected on your website and administrative portal.'}</p></div>
      <div className="wf-guidance"><b>{lang==='es'?'Guía':'Guidance'}</b><span>{lang==='es'?'Empieza por nombre y enlace. Luego añade las formas de contacto que quieras publicar. Puedes dejar en blanco cualquier red social que no utilices.':'Start with the name and preferred link. Then add only the contact methods you want to publish. Leave any unused social network blank.'}</span></div>
      <div className="wf-bilingual-grid">
        <Field label="Business name · English" value={state.business.nameEn ?? state.business.name} onChange={(v)=>setState((current)=>({...current,business:{...current.business,name:v,nameEn:v}}))} />
        <Field label="Nombre del negocio · Español" value={state.business.nameEs ?? ''} onChange={(v)=>setBusiness('nameEs',v)} />
      </div>
      <Field label={lang==='es'?'Enlace preferido':'Preferred link'} value={state.business.slug} onChange={(v)=>setBusiness('slug',v.toLowerCase().replace(/[^a-z0-9-]/g,''))} placeholder="business-name" />
      <small className="wf-field-help">{lang==='es'?'Tu página usará':'Your page will use'} /sites/{state.business.slug || 'busines…8357 tokens truncated… {payments.methods.ath && <>
            <label className="wf-field"><span>{lang==='es'?'Estado de la cuenta':'Account status'}</span><select value={payments.ath.accountStatus} onChange={(event)=>patchPayments({ath:{...payments.ath,accountStatus:event.target.value as 'needs_account'|'active'}})}><option value="needs_account">{lang==='es'?'Necesito crear/configurarla':'I need to create or configure it'}</option><option value="active">{lang==='es'?'Ya está activa':'It is already active'}</option></select></label>
            <Field label={lang==='es'?'pATH público del negocio (opcional)':'Business public pATH (optional)'} value={payments.ath.publicPath} onChange={(value)=>patchPayments({ath:{...payments.ath,publicPath:value}})} placeholder={lang==='es'?'Ej. /MiNegocio':'E.g. /MyBusiness'} />
            <small className="wf-secure-note">{lang==='es'?'No introduzcas usuario, contraseña, llave API ni información bancaria.':'Do not enter a username, password, API key, or bank information.'}</small>
          </>}
        </article>

        <article className={payments.methods.inPerson?'selected':''}>
          <Toggle label={lang==='es'?'Pago presencial':'In-person payment'} checked={payments.methods.inPerson} onChange={(value)=>setMethod('inPerson',value)} />
          <p>{lang==='es'?'Permite reservar o realizar una orden y pagar directamente en el establecimiento.':'Allow customers to book or place an order and pay at the business.'}</p>
          {payments.methods.inPerson && <label className="wf-field"><span>{lang==='es'?'Instrucciones para el cliente':'Customer instructions'}</span><textarea rows={3} value={payments.inPerson.instructions} onChange={(event)=>patchPayments({inPerson:{instructions:event.target.value}})} /></label>}
        </article>
      </div>

      <div className="wf-payment-rules">
        <label className="wf-field"><span>{lang==='es'?'Pago de productos':'Product payments'}</span><select value={payments.productPayment} onChange={(event)=>patchPayments({productPayment:event.target.value as 'online'|'in_person'})}><option value="online">{lang==='es'?'Pago online requerido':'Online payment required'}</option><option value="in_person" disabled={!payments.methods.inPerson}>{lang==='es'?'Pagar al recoger / presencial':'Pay at pickup / in person'}</option></select></label>
        <label className="wf-field"><span>{lang==='es'?'Pago de reservaciones':'Booking payments'}</span><select value={payments.bookingPayment} onChange={(event)=>patchPayments({bookingPayment:event.target.value as 'full'|'deposit'|'in_person'})}><option value="full">{lang==='es'?'Pago completo para confirmar':'Full payment to confirm'}</option><option value="deposit">{lang==='es'?'Depósito para confirmar':'Deposit to confirm'}</option><option value="in_person" disabled={!payments.methods.inPerson}>{lang==='es'?'Reservar y pagar presencial':'Book and pay in person'}</option></select></label>
        {payments.bookingPayment==='deposit' && <label className="wf-field"><span>{lang==='es'?'Depósito requerido':'Required deposit'}</span><select value={payments.bookingDepositPercent} onChange={(event)=>patchPayments({bookingDepositPercent:Number(event.target.value)})}>{[10,20,25,30,50].map((value)=><option key={value} value={value}>{value}%</option>)}</select></label>}
      </div>

      <div className="wf-payment-extras">
        <Toggle label={lang==='es'?'Enviar recibo al comprador':'Send customer receipt'} checked={payments.sendCustomerReceipt} onChange={(value)=>patchPayments({sendCustomerReceipt:value})} />
        <Toggle label={lang==='es'?'Permitir propinas':'Allow tips'} checked={payments.allowTips} onChange={(value)=>patchPayments({allowTips:value})} />
      </div>

      {!payments.methods.stripe && !payments.methods.ath && !payments.methods.inPerson && <div className="wf-checkout-warning">{lang==='es'?'Selecciona al menos un método de pago para el website del negocio.':'Select at least one payment method for the business website.'}</div>}
      <div className="wf-hours-note"><strong>{lang==='es'?'Configuración segura':'Secure setup'}</strong><span>{lang==='es'?'Stripe Connect recopilará identidad, banco y datos fiscales en sus propias pantallas. ATH Móvil se completa desde el portal. WebFactory nunca guarda contraseñas ni llaves bancarias.':'Stripe Connect collects identity, banking, and tax details on Stripe screens. ATH Móvil setup is completed through the portal. WebFactory never stores passwords or banking keys.'}</span></div>
    </div>
  )
}

function FinalStep({state,setStep,lang,complimentaryInviteToken,trialInviteToken}:{state:BuilderState;setStep:(step:number)=>void;lang:Language;complimentaryInviteToken:string;trialInviteToken:string}) {
  const [checkoutError,setCheckoutError] = useState('')
  const [checkingOut,setCheckingOut] = useState(false)
  const [created,setCreated] = useState<{portalUrl:string;publicUrl:string}|null>(null)
  const appointmentServices = state.catalog.filter((item)=>item.requiresAppointment)
  const enabledFeatures = Object.values(state.features).filter(Boolean).length
  const missingUpload = Boolean(state.business.logo && !state.business.logoAssetKey) ||
    state.catalog.some((item)=>Boolean(item.image && !item.imageAssetKey))
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.business.email.trim())
  const customerReady = Boolean(state.business.name.trim() && state.business.contactName.trim() && emailValid)
  const paymentReady = Object.values(state.payments.methods).some(Boolean)
  const selectedTemplate = templateConfigs.find((template)=>template.slug===state.design.templateSlug)
  const canCheckout = Boolean(customerReady && paymentReady && state.business.slug.trim() && !missingUpload && !checkingOut)

  const startCheckout = async () => {
    if (!canCheckout) return
    setCheckingOut(true)
    setCheckoutError('')
    try {
      const {logo,...business} = state.business
      const catalog = state.catalog.map(({image,...item})=>item)
      const response = await fetch('/.netlify/functions/request-saas-site',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          draftId:getDraftId(),
          slug:state.business.slug,
          locale:lang,
          complimentaryInviteToken,
          trialInviteToken,
          orderData:{
            client:{
              name:state.business.contactName,
              email:state.business.email,
              phone:state.business.phone,
            },
            business,
            design:state.design,
            features:state.features,
            catalog,
            team:state.team,
            hours:state.hours,
            payments:state.payments,
          },
        }),
      })
      const result = await response.json()
      if(!response.ok || !result.ok){
        throw new Error(result.message || (lang==='es'?'No se pudo preparar tu acceso.':'Your access could not be prepared.'))
      }
      setCreated({portalUrl:result.portalUrl,publicUrl:result.publicUrl})
      feedback.success()
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : (lang==='es'?'No se pudo crear tu acceso.':'Your access could not be created.'))
      feedback.error()
      setCheckingOut(false)
    }
  }

  return (
    <div className="wf-step-content">
      <div className="wf-step-intro"><small>{lang==='es'?'PASO 8':'STEP 8'}</small><h3>{lang==='es'?'Tu configuración está lista para activar.':'Your setup is ready to activate.'}</h3><p>{complimentaryInviteToken?(lang==='es'?'Tu invitación gratuita está activa. Completa el Builder para crear tu website con acceso complimentary.':'Your complimentary invitation is active. Complete the Builder to create your website with complimentary access.'):(lang==='es'?'Recibirás acceso privado para iniciar tu prueba gratuita de 7 días. No se solicita tarjeta.':'You will receive private access to start your free 7-day trial. No card is required.')}</p></div>
      <div className="wf-review-grid">
        <article><span>{lang==='es'?'Negocio':'Business'}</span><strong>{state.business.name}</strong><small>{state.business.category}</small><button onClick={()=>setStep(0)}>{lang==='es'?'Editar':'Edit'}</button></article>
        <article><span>{lang==='es'?'Diseño':'Design'}</span><strong>{selectedTemplate ? `${selectedTemplate.category} — ${selectedTemplate.name}` : (lang==='es'?'Personalizado por WebFactory':'Custom by WebFactory')}</strong><small>{state.design.style}</small><div><i style={{background:state.design.primary}}/><i style={{background:state.design.secondary}}/></div><button onClick={()=>setStep(1)}>{lang==='es'?'Editar':'Edit'}</button></article>
        <article><span>{lang==='es'?'Funciones':'Features'}</span><strong>{enabledFeatures} {lang==='es'?'activas':'active'}</strong><small>{lang==='es'?'$30 mensual · $350 anual':'$30 monthly · $350 yearly'}</small><button onClick={()=>setStep(2)}>{lang==='es'?'Editar':'Edit'}</button></article>
        <article><span>{lang==='es'?'Catálogo':'Catalog'}</span><strong>{state.catalog.length} {lang==='es'?'elementos':'items'}</strong><small>{appointmentServices.length} {lang==='es'?'con reservación':'with booking'}</small><button onClick={()=>setStep(3)}>{lang==='es'?'Editar':'Edit'}</button></article>
        <article><span>{lang==='es'?'Equipo':'Team'}</span><strong>{state.team.length} {lang==='es'?'empleados':'team members'}</strong><small>Service + Employee</small><button onClick={()=>setStep(4)}>{lang==='es'?'Editar':'Edit'}</button></article>
        <article><span>{lang==='es'?'Horarios':'Hours'}</span><strong>{Object.values(state.hours).filter((day)=>day.enabled).length} {lang==='es'?'días abiertos':'open days'}</strong><small>{lang==='es'?'Disponibilidad general':'General availability'}</small><button onClick={()=>setStep(5)}>{lang==='es'?'Editar':'Edit'}</button></article>
        <article><span>{lang==='es'?'Pagos del website':'Website payments'}</span><strong>{Object.values(state.payments.methods).filter(Boolean).length} {lang==='es'?'métodos':'methods'}</strong><small>{state.payments.bookingPayment==='deposit'?`${state.payments.bookingDepositPercent}% ${lang==='es'?'depósito para citas':'booking deposit'}`:state.payments.bookingPayment}</small><button onClick={()=>setStep(6)}>{lang==='es'?'Editar':'Edit'}</button></article>
      </div>
      {!customerReady && <div className="wf-checkout-warning">{lang==='es'?'Completa el nombre del cliente, nombre del negocio y un email válido.':'Enter the customer name, business name, and a valid email.'}</div>}
      {!state.business.slug.trim() && <div className="wf-checkout-warning">{lang==='es'?'Escoge el enlace preferido de tu website.':'Choose your preferred website link.'}</div>}
      {!paymentReady && <div className="wf-checkout-warning">{lang==='es'?'Selecciona al menos un método de pago para la página del negocio.':'Select at least one payment method for the business page.'}</div>}
      {missingUpload && <div className="wf-checkout-warning">{lang==='es'?'Hay imágenes todavía sin guardar. Vuelve a cargarlas antes de crear tu acceso.':'Some images are not saved yet. Upload them again before creating your access.'}</div>}
      <section className="wf-after-payment" aria-labelledby="wf-after-payment-title">
        <header>
          <small>{lang==='es'?'INCLUIDO CON TU CUENTA':'INCLUDED WITH YOUR ACCOUNT'}</small>
          <h4 id="wf-after-payment-title">{lang==='es'?'Tu portal y las integraciones están incluidos.':'Your portal and integrations are included.'}</h4>
          <p>{complimentaryInviteToken?(lang==='es'?'El acceso complimentary se activa automáticamente cuando terminas de crear tu website.':'Complimentary access is activated automatically when you finish creating your website.'):(lang==='es'?'El trial comienza solamente cuando entras a tu portal y lo activas.':'Your trial starts only when you enter your portal and activate it.')}</p>
        </header>
        <div>
          <article><em>01</em><strong>{lang==='es'?'Acceso seguro':'Secure access'}</strong><span>{lang==='es'?'Recibirás por email el enlace privado para establecer tu contraseña.':'You will receive a private email link to set your password.'}</span></article>
          <article><em>02</em><strong>{lang==='es'?'Conecta tus cuentas':'Connect your accounts'}</strong><span>{lang==='es'?'Desde tu acceso privado podrás conectar Stripe y autorizar Google Calendar en sus pantallas oficiales.':'From your private portal, connect Stripe and authorize Google Calendar on their official screens.'}</span></article>
          <article><em>03</em><strong>{lang==='es'?'Administra tu página':'Manage your page'}</strong><span>{lang==='es'?'Podrás cambiar productos, servicios, precios, empleados, horarios y reglas sin solicitar otro deployment.':'Change products, services, prices, team members, hours, and rules without requesting another deployment.'}</span></article>
        </div>
        <p className="wf-after-payment-security">{lang==='es'?'WebFactory nunca te pedirá contraseñas, códigos de seguridad, datos bancarios ni llaves secretas.':'WebFactory will never ask for passwords, security codes, bank details, or secret keys.'}</p>
      </section>
      {created ? <div className="wf-checkout-placeholder success"><div><small>{lang==='es'?'ACCESO ENVIADO':'ACCESS SENT'}</small><strong>{lang==='es'?'Revisa tu email':'Check your email'}</strong><span>{lang==='es'?'Establece tu contraseña, entra al portal y activa los 7 días gratis cuando estés listo.':'Set your password, enter the portal, and activate the free 7 days when you are ready.'}</span></div><a className="wf-builder-access-link" href={created.portalUrl}>{lang==='es'?'Abrir portal administrativo':'Open administrative portal'}</a></div> : <div className="wf-checkout-placeholder">
        <div><small>{lang==='es'?'SIGUIENTE ETAPA':'NEXT STEP'}</small><strong>{complimentaryInviteToken?(lang==='es'?'Crear website con acceso gratuito':'Create website with complimentary access'):(lang==='es'?'Crear acceso · 7 días gratis':'Create access · 7 days free')}</strong><span>{complimentaryInviteToken?(lang==='es'?'No se requiere suscripción mientras el acceso complimentary permanezca activo.':'No subscription is required while complimentary access remains active.'):(lang==='es'?'Activa el trial desde el portal cuando estés listo; después podrás escoger $30 mensual o $350 anual.':'Activate the trial from your portal when ready; then choose $30 monthly or $350 yearly.')}</span></div>
        <button disabled={!canCheckout} onClick={startCheckout}>{checkingOut?(lang==='es'?'Preparando acceso…':'Preparing access…'):(lang==='es'?'Crear mi cuenta':'Create my account')}</button>
      </div>}
      {checkoutError && <div className="wf-checkout-warning error">{checkoutError}</div>}
    </div>
  )
}

export default function WebFactoryBuilder({lang}:{lang:Language}) {
  const [state,setState] = useState<BuilderState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return initialState
      const parsed = JSON.parse(saved) as Partial<BuilderState> & { business?: Partial<BuilderState['business']> }
      return {
        ...initialState,
        ...parsed,
        business: {
          ...initialState.business,
          ...parsed.business,
          mapsUrl: parsed.business?.mapsUrl || initialState.business.mapsUrl,
        },
        design: {...initialState.design,...parsed.design},
        features: {...initialState.features,...parsed.features},
        hours: {...initialState.hours,...parsed.hours},
        payments: {
          ...initialState.payments,
          ...parsed.payments,
          methods: {...initialState.payments.methods,...parsed.payments?.methods},
          stripe: {...initialState.payments.stripe,...parsed.payments?.stripe},
          ath: {...initialState.payments.ath,...parsed.payments?.ath},
          inPerson: {...initialState.payments.inPerson,...parsed.payments?.inPerson},
        },
      }
    } catch {
      return initialState
    }
  })
  const [step,setStep] = useState(0)
  const [device,setDevice] = useState<Device>('desktop')
  const [saved,setSaved] = useState(false)
  const [complimentaryInviteToken,setComplimentaryInviteToken] = useState('')
  const [complimentaryInviteError,setComplimentaryInviteError] = useState('')
  const [trialInviteToken,setTrialInviteToken] = useState('')

  useEffect(()=>{
    const params = new URLSearchParams(window.location.search)
    const templateSlug = params.get('template') || ''
    const template = templateConfigs.find((entry)=>entry.slug===templateSlug)
    if (template) {
      setState((current)=>({
        ...current,
        design:{...current.design,templateSlug:template.slug,primary:template.dark,secondary:template.accent,style:({modern:'Modern',luxury:'Luxury',minimal:'Minimal',bold:'Bold'} as const)[templateVisualStyle(template.category)]},
      }))
      setStep(1)
    }
    const inviteToken = params.get('complimentary_invite') || ''
    if (inviteToken) {
      fetch('/.netlify/functions/complimentary-invite-status?token='+encodeURIComponent(inviteToken),{cache:'no-store'})
        .then(async(response)=>{const result=await response.json();if(!response.ok||!result.valid)throw new Error(lang==='es'?'La invitación gratuita es inválida o expiró.':'The complimentary invitation is invalid or expired.');setComplimentaryInviteToken(inviteToken);setState((current)=>({...current,business:{...current.business,email:result.email}}))})
        .catch((error)=>setComplimentaryInviteError(error instanceof Error?error.message:String(error)))
      return
    }
    const trialToken = params.get('trial_invite') || ''
    if (!trialToken) return
    fetch('/.netlify/functions/trial-invite-status?token='+encodeURIComponent(trialToken),{cache:'no-store'})
      .then(async(response)=>{const result=await response.json();if(!response.ok||!result.valid)throw new Error(lang==='es'?'La invitación de prueba de 7 días es inválida o expiró.':'The 7-day trial invitation is invalid or expired.');setTrialInviteToken(trialToken);setState((current)=>({...current,business:{...current.business,email:result.email}}))})
      .catch((error)=>setComplimentaryInviteError(error instanceof Error?error.message:String(error)))
  },[])

  useEffect(()=>{
    try {
      const persistentState = {
        ...state,
        business: {...state.business,logo:undefined,hero:undefined,gallery:undefined},
        catalog: state.catalog.map((item)=>({...item,image:undefined})),
      }
      localStorage.setItem(STORAGE_KEY,JSON.stringify(persistentState))
      setSaved(true)
      const timer=window.setTimeout(()=>setSaved(false),900)
      return ()=>window.clearTimeout(timer)
    } catch {
      return
    }
  },[state])

  const labels = lang==='es'
    ? ['Negocio','Diseño','Funciones','Catálogo','Equipo','Horarios','Pagos','Preview']
    : ['Business','Design','Features','Catalog','Team','Hours','Payments','Preview']

  const completion = useMemo(()=>Math.round(((step+1)/labels.length)*100),[step,labels.length])

  const reset = () => {
    if (!window.confirm(lang==='es'?'¿Reiniciar la configuración del Builder?':'Reset Builder configuration?')) return
    setState(initialState)
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(DRAFT_ID_KEY)
    setStep(0)
  }

  const stepContent = [
    <BusinessStep key="business" state={state} setState={setState} lang={lang} lockedEmail={complimentaryInviteToken||trialInviteToken?state.business.email:undefined}/>,
    <DesignStep key="design" state={state} setState={setState} lang={lang}/>,
    <FeaturesStep key="features" state={state} setState={setState} lang={lang}/>,
    <CatalogStep key="catalog" state={state} setState={setState} lang={lang}/>,
    <TeamStep key="team" state={state} setState={setState} lang={lang}/>,
    <HoursStep key="hours" state={state} setState={setState} lang={lang}/>,
    <PaymentsStep key="payments" state={state} setState={setState} lang={lang}/>,
    <FinalStep key="preview" state={state} setStep={setStep} lang={lang} complimentaryInviteToken={complimentaryInviteToken} trialInviteToken={trialInviteToken}/>,
  ][step]

  return (
    <div className="wf-builder-app">
      <div className="wf-builder-topbar">
        <div>
          <span>WEBFACTORY BUILDER</span>
          <strong>{lang==='es'?'PREVIEW — NO PUBLICADO':'PREVIEW — NOT PUBLISHED'}</strong>
        </div>
        <div className="wf-builder-status">
          <span className={saved?'saved':''}>{saved?(lang==='es'?'✓ Borrador guardado':'✓ Draft saved'):(lang==='es'?'Borrador local':'Local draft')}</span>
          <button onClick={reset}>{lang==='es'?'Reiniciar':'Reset'}</button>
        </div>
      </div>

      <div className="wf-builder-progress"><i style={{width:`${completion}%`}} /></div>

      <div className="wf-builder-workspace">
        <aside className="wf-builder-nav">
          {labels.map((label,index)=>(
            <button key={label} className={step===index?'selected':''} onClick={()=>setStep(index)}>
              <b>{index+1}</b><span>{label}</span>{index<step&&<em>✓</em>}
            </button>
          ))}
        </aside>

        <section className="wf-builder-panel">
          <div className="wf-setup-guidance">
            <div><small>{lang==='es'?'CONFIGURACIÓN GUIADA':'GUIDED SETUP'}</small><strong>{labels[step]}</strong></div>
            <span>{completion}%</span>
          </div>
          {(complimentaryInviteToken||trialInviteToken)&&<div className="wf-invite-banner"><strong>{complimentaryInviteToken?(lang==='es'?'Acceso complimentary activo':'Complimentary access active'):(lang==='es'?'Invitación de prueba de 7 días activa':'7-day trial invitation active')}</strong><span>{complimentaryInviteToken?(lang==='es'?'Completa el Builder usando el email invitado. No se cobrará suscripción mientras este acceso permanezca activo.':'Complete the Builder using the invited email. No subscription will be charged while this access remains active.'):(lang==='es'?'Completa el Builder con el email invitado. No se requiere tarjeta; activarás los 7 días desde tu portal.':'Complete the Builder with the invited email. No card is required; activate the 7 days from your portal.')}</span></div>}{complimentaryInviteError&&<div className="wf-checkout-warning error">{complimentaryInviteError}</div>}<BuilderAiAssistant state={state} setState={setState} lang={lang}/>
          {stepContent}
          <div className="wf-builder-navigation">
            <button className="secondary" disabled={step===0} onClick={()=>setStep((current)=>Math.max(0,current-1))}>← {lang==='es'?'Atrás':'Back'}</button>
            <span>{lang==='es'?'Paso':'Step'} {step+1} {lang==='es'?'de':'of'} {labels.length}</span>
            <button className="primary" disabled={step===labels.length-1} onClick={()=>setStep((current)=>Math.min(labels.length-1,current+1))}>{lang==='es'?'Continuar':'Continue'} →</button>
          </div>
        </section>

        <section className="wf-live-panel">
          <header>
            <div className="wf-device-switcher">
              {(['desktop','tablet','mobile'] as Device[]).map((value)=>(
                <button key={value} className={device===value?'selected':''} onClick={()=>setDevice(value)}>
                  {value==='desktop'?'▱':value==='tablet'?'▯':'▯'} <span>{lang==='es'?({desktop:'escritorio',tablet:'tableta',mobile:'móvil'} as Record<Device,string>)[value]:value}</span>
                </button>
              ))}
            </div>
            <strong>{PRICE} / {lang==='es'?'mes':'month'}</strong>
          </header>
          <div className="wf-live-stage">
            <Preview state={state} device={device} lang={lang}/>
          </div>
        </section>
      </div>
    </div>
  )
}
