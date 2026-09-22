import { useEffect, useMemo, useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react'
import { demoConfigs } from './demoData'
import './builder.css'

type Language = 'es' | 'en'
type BuilderStyle = 'Modern' | 'Luxury' | 'Minimal' | 'Bold'
type Device = 'desktop' | 'tablet' | 'mobile'
type ItemType = 'product' | 'service'

type CatalogItem = {
  id: string
  type: ItemType
  name: string
  price: number
  description: string
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
    slug: string
    contactName: string
    category: string
    description: string
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

const categories = ['Restaurant','Automotive','Barber','Beauty','Wellness','Retail','Professional Services','Real Estate','Other']
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
  const response = await fetch('/.netlify/functions/upload-order-asset',{
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

function Field({label,value,onChange,placeholder,type='text'}:{
  label:string
  value:string
  onChange:(value:string)=>void
  placeholder?:string
  type?:string
}) {
  return (
    <label className="wf-field">
      <span>{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(event)=>onChange(event.target.value)} />
    </label>
  )
}

function Preview({state,device,lang}:{state:BuilderState;device:Device;lang:Language}) {
  const [catalogOpen,setCatalogOpen] = useState(false)
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
  } as CSSProperties

  return (
    <div className={`wf-preview-shell ${device}`} style={style}>
      <div className={`wf-preview-page style-${state.design.style.toLowerCase()}`}>
        <header>
          <div className="wf-preview-brand">
            {state.business.logo ? <img src={state.business.logo} alt="" /> : <span>{state.business.name.slice(0,2).toUpperCase()}</span>}
            <strong>{state.business.name || (lang==='es'?'Tu negocio':'Your business')}</strong>
          </div>
          <nav>
            <span>{lang==='es'?'Inicio':'Home'}</span>
            {(state.features.services || state.features.products) && <button className="wf-preview-catalog-link" onClick={()=>setCatalogOpen(true)}>{lang==='es'?'Catálogo':'Catalog'}</button>}
            {state.features.bookings && <button>{lang==='es'?'Reservar':'Book'}</button>}
          </nav>
        </header>

        <section className="wf-preview-hero">
          <small>{state.business.category || 'BUSINESS'}</small>
          <h3>{state.business.name || (lang==='es'?'Tu negocio':'Your business')}</h3>
          <p>{state.business.description || (lang==='es'?'Describe aquí lo que hace especial a tu negocio.':'Describe what makes your business special.')}</p>
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

        {state.team.length > 0 && (
          <section className="wf-preview-team">
            <small>{lang==='es'?'EQUIPO':'TEAM'}</small>
            <div>
              {state.team.slice(0,4).map((member) => (
                <article key={member.id}>
                  <b>{member.name.slice(0,1).toUpperCase()}</b>
                  <span><strong>{member.name}</strong><em>{member.role}</em></span>
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
          <strong>{state.business.name || (lang==='es'?'Tu negocio':'Your business')}</strong>
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
                    <div><small>{item.type==='service'?(lang==='es'?'servicio':'service'):(lang==='es'?'producto':'product')}</small><strong>{item.name || (lang==='es'?'Sin nombre':'Untitled')}</strong><b>${Number(item.price || 0).toFixed(2)}</b></div>
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
                <h4>{selectedItem.name || (lang==='es'?'Sin nombre':'Untitled')}</h4>
                <strong>${Number(selectedItem.price || 0).toFixed(2)}</strong>
                <p>{selectedItem.description || (lang==='es'?'Descripción del producto o servicio.':'Product or service description.')}</p>
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

function BusinessStep({state,setState,lang}:{state:BuilderState;setState:Dispatch<SetStateAction<BuilderState>>;lang:Language}) {
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
    if (currentCount >= 4) return
    setUploadingLogo(true)
    setUploadError('')
    try {
      const [preview,asset] = await Promise.all([readFile(file),uploadOrderAsset(file,'business-gallery-'+String(currentCount+1))])
      setState((current)=>({...current,business:{
        ...current.business,
        gallery:[...(current.business.gallery||[]),preview].slice(0,4),
        galleryAssets:[...(current.business.galleryAssets||[]),{assetKey:asset.assetKey,fileName:asset.fileName,contentType:asset.contentType}].slice(0,4),
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
      <Field label={lang==='es'?'Nombre del negocio':'Business name'} value={state.business.name} onChange={(v)=>setBusiness('name',v)} />
      <Field label={lang==='es'?'Enlace preferido':'Preferred link'} value={state.business.slug} onChange={(v)=>setBusiness('slug',v.toLowerCase().replace(/[^a-z0-9-]/g,''))} placeholder="business-name" />
      <small className="wf-field-help">{lang==='es'?'Tu página usará':'Your page will use'} /sites/{state.business.slug || 'business-name'}</small>
      <Field label={lang==='es'?'Nombre del cliente / contacto':'Owner / contact name'} value={state.business.contactName} onChange={(v)=>setBusiness('contactName',v)} placeholder={lang==='es'?'Persona responsable de la cuenta':'Person responsible for the account'} />
      <label className="wf-field">
        <span>{lang==='es'?'Categoría':'Category'}</span>
        <select value={state.business.category} onChange={(event)=>setBusiness('category',event.target.value)}>
          {categories.map((category)=><option key={category}>{category}</option>)}
        </select>
      </label>
      <label className="wf-field">
        <span>{lang==='es'?'Descripción':'Description'}</span>
        <textarea rows={4} value={state.business.description} onChange={(event)=>setBusiness('description',event.target.value)} />
      </label>
      <div className="wf-field-grid">
        <Field label={lang==='es'?'Teléfono':'Phone'} value={state.business.phone} onChange={(v)=>setBusiness('phone',v)} />
        <Field label="WhatsApp" value={state.business.whatsapp} onChange={(v)=>setBusiness('whatsapp',v)} />
        <Field label={lang==='es'?'Email del cliente':'Customer email'} type="email" value={state.business.email} onChange={(v)=>setBusiness('email',v)} />
        <Field label="Instagram" value={state.business.instagram} onChange={(v)=>setBusiness('instagram',v)} placeholder="https://instagram.com/..." />
        <Field label="Facebook" value={state.business.facebook} onChange={(v)=>setBusiness('facebook',v)} placeholder="https://facebook.com/..." />
        <Field label="X" value={state.business.x} onChange={(v)=>setBusiness('x',v)} placeholder="https://x.com/..." />
      </div>
      <label className="wf-field wf-maps-field">
        <span>{lang==='es'?'Enlace de Google Maps':'Google Maps link'}</span>
        <input
          type="url"
          value={state.business.mapsUrl}
          placeholder="https://maps.app.goo.gl/..."
          onChange={(event)=>setBusiness('mapsUrl',event.target.value)}
        />
        <small className={state.business.mapsUrl && !isGoogleMapsUrl(state.business.mapsUrl) ? 'invalid' : ''}>
          {state.business.mapsUrl
            ? isGoogleMapsUrl(state.business.mapsUrl)
              ? (lang==='es'?'✓ Enlace válido · la ubicación real aparecerá en la página':'✓ Valid link · the real location will appear on the page')
              : (lang==='es'?'Usa un enlace válido de Google Maps':'Use a valid Google Maps link')
            : (lang==='es'?'Abre Google Maps → Compartir → Copiar enlace y pégalo aquí':'Open Google Maps → Share → Copy link and paste it here')}
        </small>
      </label>
      <label className="wf-upload">
        <input type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif" disabled={uploadingLogo} onChange={(event)=>uploadLogo(event.target.files?.[0])} />
        <span>{uploadingLogo?(lang==='es'?'Guardando logo…':'Saving logo…'):state.business.logoAssetKey?(lang==='es'?'✓ Logo guardado':'✓ Logo saved'):(lang==='es'?'Subir logo del cliente':'Upload customer logo')}</span>
        <small>{lang==='es'?'El archivo se guarda de forma segura para tu website y portal administrativo.':'The file is stored securely for your website and administrative portal.'}</small>
      </label>
      <div className="wf-step-intro compact"><small>{lang==='es'?'FOTOS DE LA PLANTILLA':'TEMPLATE PHOTOS'}</small><h3>{lang==='es'?'Usa las fotos reales de tu negocio.':'Use your real business photos.'}</h3><p>{lang==='es'?'La composición del demo se conserva; solo reemplazamos las imágenes de muestra.':'The demo composition is preserved; only the sample photography is replaced.'}</p></div>
      <label className="wf-upload">
        <input type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif" disabled={uploadingLogo} onChange={(event)=>uploadHero(event.target.files?.[0])} />
        <span>{state.business.heroAssetKey?(lang==='es'?'✓ Imagen principal guardada':'✓ Hero image saved'):(lang==='es'?'Subir imagen principal / Hero':'Upload main / Hero image')}</span>
        <small>{lang==='es'?'Mantendrá el encuadre y estilo visual del demo seleccionado.':'It will preserve the framing and visual style of the selected demo.'}</small>
      </label>
      <label className="wf-upload">
        <input type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif" disabled={uploadingLogo || (state.business.galleryAssets?.length||0)>=4} onChange={(event)=>uploadGallery(event.target.files?.[0])} />
        <span>{lang==='es'?'Añadir foto de galería':'Add gallery photo'} ({state.business.galleryAssets?.length||0}/4)</span>
        <small>{lang==='es'?'Estas fotos sustituyen la galería del demo sin alterar la estructura.':'These photos replace the demo gallery without changing its structure.'}</small>
      </label>
      {(state.business.gallery||[]).length>0&&<div className="wf-builder-photo-grid">{(state.business.gallery||[]).map((image,index)=><img key={index} src={image} alt="" />)}</div>}
      {uploadError && <small className="wf-upload-error">{uploadError}</small>}
    </div>
  )
}

function DesignStep({state,setState,lang}:{state:BuilderState;setState:Dispatch<SetStateAction<BuilderState>>;lang:Language}) {
  const setDesign = <K extends keyof BuilderState['design']>(key:K, value:BuilderState['design'][K]) =>
    setState((current)=>({...current,design:{...current.design,[key]:value}}))
  const selectedTemplate = demoConfigs.find((demo)=>demo.slug===state.design.templateSlug)

  const selectTemplate = (slug:string) => {
    const demo = demoConfigs.find((entry)=>entry.slug===slug)
    setState((current)=>({
      ...current,
      design:{
        ...current.design,
        templateSlug:slug,
        ...(demo ? {primary:demo.dark,secondary:demo.accent} : {}),
      },
    }))
  }

  const restoreTemplateColors = () => {
    if (!selectedTemplate) return
    setState((current)=>({
      ...current,
      design:{...current.design,primary:selectedTemplate.dark,secondary:selectedTemplate.accent},
    }))
  }

  return (
    <div className="wf-step-content">
      <div className="wf-step-intro">
        <small>{lang==='es'?'PASO 2 · DISEÑO BASE':'STEP 2 · BASE DESIGN'}</small>
        <h3>{lang==='es'?'Elige cómo comenzará tu diseño.':'Choose how your design will begin.'}</h3>
        <p>{lang==='es'
          ? 'Puedes mantener un diseño personalizado por WebFactory o escoger uno de los demos como diseño base. Si eliges un demo, conservaremos su estructura, navegación y experiencia mientras sustituimos la marca y el contenido.'
          : 'You can keep a custom WebFactory design or choose one of the demos as your base design. If you choose a demo, we will preserve its structure, navigation, and experience while replacing its branding and content.'}</p>
      </div>
      <div className="wf-template-grid">
        <article className={`wf-template-custom ${state.design.templateSlug===''?'selected':''}`}>
          <button type="button" onClick={()=>selectTemplate('')} aria-pressed={state.design.templateSlug===''}>
            <span className="wf-template-custom-art">
              <i/><i/><i/>
              {state.design.templateSlug==='' && <b>✓ {lang==='es'?'Seleccionado':'Selected'}</b>}
            </span>
            <small>WEBFACTORY</small>
            <strong>{lang==='es'?'Diseño personalizado':'Custom design'}</strong>
          </button>
          <em>{lang==='es'?'Construido según tu configuración actual':'Built from your current configuration'}</em>
        </article>
        {demoConfigs.map((demo)=>(
          <article key={demo.slug} className={state.design.templateSlug===demo.slug?'selected':''}>
          <button type="button" onClick={()=>selectTemplate(demo.slug)} aria-pressed={state.design.templateSlug===demo.slug}>
              <span style={{backgroundImage:`linear-gradient(180deg,transparent,rgba(5,10,16,.78)),url(${demo.heroImage})`}}>
                {state.design.templateSlug===demo.slug && <b>✓ {lang==='es'?'Seleccionado':'Selected'}</b>}
              </span>
              <small>{lang==='es'?'DISEÑO BASE':'BASE DESIGN'}</small>
              <strong>{demo.category}</strong>
              <em>{demo.name}</em>
            </button>
            <a href={`/demos/${demo.slug}`} target="_blank" rel="noreferrer">{lang==='es'?'Ver demo completo':'View full demo'} ↗</a>
          </article>
        ))}
      </div>
      <div className="wf-template-note">
        <strong>{state.design.templateSlug
          ? (lang==='es'?'El demo seleccionado será la base exacta de producción.':'The selected demo will be the exact production base.')
          : (lang==='es'?'WebFactory creará un diseño personalizado.':'WebFactory will create a custom design.')}</strong>
        <span>{lang==='es'
          ? (state.design.templateSlug
              ? 'El demo elegido se personaliza para tu negocio y mantiene su estructura y funciones compatibles.'
              : 'Se utilizarán tu estilo, colores, contenido y funciones sin copiar obligatoriamente uno de los demos.')
          : (state.design.templateSlug
              ? 'The chosen demo is customized for your business while preserving its structure and compatible features.'
              : 'Your style, colors, content, and features will be used without requiring a copy of a demo.')}</span>
      </div>
      <div className="wf-step-intro compact"><small>{lang==='es'?'PERSONALIZACIÓN':'CUSTOMIZATION'}</small><h3>{lang==='es'?'Ajusta estilo y colores.':'Adjust style and colors.'}</h3><p>{lang==='es'?'Estos cambios aplican tu identidad sobre el diseño base seleccionado. Todos los colores permanecen editables.':'These changes apply your identity to the selected base design. Every color remains editable.'}</p></div>
      <div className="wf-style-grid">
        {styles.map((style)=>(
          <button key={style} className={state.design.style===style?'selected':''} onClick={()=>setDesign('style',style)}>
            <span className={`wf-style-thumb ${style.toLowerCase()}`}><i/><i/><i/></span>
            <strong>{style}</strong>
          </button>
        ))}
      </div>
      <div className="wf-color-preferences">
        <div>
          <strong>{lang==='es'?'Preferencias de colores':'Color preferences'}</strong>
          <span>{selectedTemplate
            ? (lang==='es'?`Colores originales de ${selectedTemplate.category} cargados. Puedes alterarlos libremente.`:`Original ${selectedTemplate.category} colors loaded. You can change them freely.`)
            : (lang==='es'?'Selecciona cualquier combinación para tu diseño personalizado.':'Choose any color combination for your custom design.')}</span>
        </div>
        {selectedTemplate && <button type="button" onClick={restoreTemplateColors}>{lang==='es'?'Restaurar colores del demo':'Restore demo colors'}</button>}
      </div>
      <div className="wf-color-grid">
        <label><span>{lang==='es'?'Color principal · editable':'Primary color · editable'}</span><div><input type="color" value={state.design.primary} onChange={(e)=>setDesign('primary',e.target.value)} /><input value={state.design.primary} onChange={(e)=>setDesign('primary',e.target.value)} /></div></label>
        <label><span>{lang==='es'?'Color secundario · editable':'Secondary color · editable'}</span><div><input type="color" value={state.design.secondary} onChange={(e)=>setDesign('secondary',e.target.value)} /><input value={state.design.secondary} onChange={(e)=>setDesign('secondary',e.target.value)} /></div></label>
      </div>
      <div className="wf-palette-row">
        {[
          ['#0B1529','#3C86F6'],
          ['#201A17','#C69C6D'],
          ['#111111','#E3E3E3'],
          ['#191970','#FF6B35'],
          ['#17352B','#B4D59C'],
        ].map(([primary,secondary])=>(
          <button key={primary+secondary} onClick={()=>setState((current)=>({...current,design:{...current.design,primary,secondary}}))}>
            <i style={{background:primary}}/><i style={{background:secondary}}/>
          </button>
        ))}
      </div>
    </div>
  )
}

function FeaturesStep({state,setState,lang}:{state:BuilderState;setState:Dispatch<SetStateAction<BuilderState>>;lang:Language}) {
  return (
    <div className="wf-step-content">
      <div className="wf-step-intro"><small>{lang==='es'?'PASO 3 · FUNCIONES':'STEP 3 · FEATURES'}</small><h3>{lang==='es'?'Activa exactamente lo que tu negocio necesita.':'Enable exactly what your business needs.'}</h3><p>{lang==='es'?'Cada interruptor controla una función real del website. Si lo apagas, esa función no debe aparecer en la página publicada.':'Each switch controls a real website capability. If you turn it off, that capability should not appear on the published site.'}</p></div>
      <div className="wf-guidance"><b>{lang==='es'?'Cómo funciona':'How it works'}</b><span>{lang==='es'?'Activa solo las funciones que quieras ofrecer. Las opciones se aplican directamente a la página generada y luego pueden cambiarse desde el portal.':'Enable only the capabilities you want. These choices apply directly to the generated website and can later be changed from the portal.'}</span></div>
      <div className="wf-feature-grid">
        {Object.entries(featureLabels[lang]).map(([key,label])=>(
          <Toggle
            key={key}
            label={label}
            help={featureHelp[lang][key]}
            checked={Boolean(state.features[key])}
            onChange={(value)=>setState((current)=>({...current,features:{...current.features,[key]:value}}))}
          />
        ))}
      </div>
      <div className="wf-fixed-price"><span>WEBFACTORY COMMERCE PLATFORM</span><strong>{PRICE} / {lang==='es'?'mes':'month'}</strong><b>{lang==='es'?'o $350 / año · 48 horas gratis · sin comisión':'or $350 / year · 48 hours free · no sales commission'}</b></div>
    </div>
  )
}

function CatalogStep({state,setState,lang}:{state:BuilderState;setState:Dispatch<SetStateAction<BuilderState>>;lang:Language}) {
  const [editingId,setEditingId] = useState<string | null>(null)
  const editingItem = state.catalog.find((item)=>item.id===editingId) ?? null

  const addItem = (type:ItemType) => {
    if (state.catalog.length>=CATALOG_LIMIT) return
    const item:CatalogItem = {
      id:createId(type),
      type,
      name:type==='service'?(lang==='es'?'Nuevo servicio':'New service'):(lang==='es'?'Nuevo producto':'New product'),
      price:0,
      description:'',
      requiresAppointment:type==='service',
      duration:type==='service'?45:0,
    }
    setState((current)=>({...current,catalog:[...current.catalog,item]}))
    setEditingId(item.id)
  }

  const update = (id:string, patch:Partial<CatalogItem>) =>
    setState((current)=>({...current,catalog:current.catalog.map((item)=>item.id===id?{...item,...patch}:item)}))

  const remove = (id:string) => {
    setState((current)=>({
      ...current,
      catalog:current.catalog.filter((item)=>item.id!==id),
      team:current.team.map((member)=>({...member,serviceIds:member.serviceIds.filter((serviceId)=>serviceId!==id)})),
    }))
    if (editingId===id) setEditingId(null)
  }

  const [uploadingId,setUploadingId] = useState<string | null>(null)
  const [uploadError,setUploadError] = useState('')

  const uploadImage = async (id:string,file?:File) => {
    if (!file) return
    setUploadingId(id)
    setUploadError('')
    try {
      const [preview,asset] = await Promise.all([
        readFile(file),
        uploadOrderAsset(file,id),
      ])
      update(id,{
        image:preview,
        imageAssetKey:asset.assetKey,
        imageName:asset.fileName,
        imageType:asset.contentType,
      })
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : (lang==='es'?'No se pudo guardar la imagen.':'The image could not be saved.'))
    } finally {
      setUploadingId(null)
    }
  }

  return (
    <div className="wf-step-content">
      <div className="wf-step-intro"><small>{lang==='es'?'PASO 4':'STEP 4'}</small><h3>{lang==='es'?'Construye tu catálogo.':'Build your catalog.'}</h3><p>{lang==='es'?`Productos y servicios viven en un mismo sistema. Puedes configurar hasta ${CATALOG_LIMIT} en total.`:`Products and services live in one system. You can configure up to ${CATALOG_LIMIT} total.`}</p></div>
      <div className="wf-catalog-actions">
        <button onClick={()=>addItem('product')} disabled={state.catalog.length>=CATALOG_LIMIT}>+ {lang==='es'?'Producto':'Product'}</button>
        <button onClick={()=>addItem('service')} disabled={state.catalog.length>=CATALOG_LIMIT}>+ {lang==='es'?'Servicio':'Service'}</button>
        <span>{state.catalog.length}/{CATALOG_LIMIT} {lang==='es'?'configurados':'configured'}</span>
      </div>

      <div className="wf-catalog-library">
        {state.catalog.map((item,index)=>(
          <button key={item.id} className="wf-catalog-tile" onClick={()=>setEditingId(item.id)}>
            {item.image ? <img src={item.image} alt="" /> : <span className="wf-catalog-tile-placeholder">{item.type==='service'?'S':'P'}</span>}
            <div>
              <small>{String(index+1).padStart(2,'0')} · {item.type==='service'?(lang==='es'?'SERVICIO':'SERVICE'):(lang==='es'?'PRODUCTO':'PRODUCT')}</small>
              <strong>{item.name || (lang==='es'?'Sin nombre':'Untitled')}</strong>
              <span>${Number(item.price || 0).toFixed(2)}</span>
            </div>
            <em>{lang==='es'?'Editar':'Edit'} →</em>
          </button>
        ))}
        {state.catalog.length===0 && <div className="wf-empty-editor">{lang==='es'?'Añade tu primer producto o servicio.':'Add your first product or service.'}</div>}
      </div>
      {uploadError && <small className="wf-upload-error">{uploadError}</small>}

      {editingItem && (
        <div className="wf-builder-modal-backdrop" onMouseDown={()=>setEditingId(null)}>
          <section className="wf-builder-item-modal" onMouseDown={(event)=>event.stopPropagation()}>
            <header>
              <div><small>{editingItem.type==='service'?(lang==='es'?'SERVICIO':'SERVICE'):(lang==='es'?'PRODUCTO':'PRODUCT')}</small><h4>{editingItem.name || (lang==='es'?'Sin nombre':'Untitled')}</h4></div>
              <button onClick={()=>setEditingId(null)}>×</button>
            </header>
            <div className="wf-item-editor modal">
              <label className="wf-item-image">
                <input type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif" disabled={uploadingId===editingItem.id} onChange={(e)=>uploadImage(editingItem.id,e.target.files?.[0])} />
                {editingItem.image?<img src={editingItem.image} alt="" />:<span>{uploadingId===editingItem.id?(lang==='es'?'Guardando…':'Saving…'):(lang==='es'?'+ Imagen':'+ Image')}</span>}
              </label>
              <div>
                <Field label={lang==='es'?'Nombre':'Name'} value={editingItem.name} onChange={(v)=>update(editingItem.id,{name:v})} />
                <div className="wf-mini-grid">
                  <label className="wf-field"><span>{lang==='es'?'Precio':'Price'}</span><input type="number" min="0" step=".01" value={editingItem.price} onChange={(e)=>update(editingItem.id,{price:Number(e.target.value)})}/></label>
                  {editingItem.type==='service' && <label className="wf-field"><span>{lang==='es'?'Duración':'Duration'}</span><select value={editingItem.duration} onChange={(e)=>update(editingItem.id,{duration:Number(e.target.value)})}>{[15,30,45,60,75,90,120,180,240].map((min)=><option key={min} value={min}>{min} min</option>)}</select></label>}
                </div>
                <label className="wf-field"><span>{lang==='es'?'Descripción':'Description'}</span><textarea rows={4} value={editingItem.description} onChange={(e)=>update(editingItem.id,{description:e.target.value})}/></label>
                {editingItem.type==='service' && <Toggle label={lang==='es'?'Requiere cita':'Appointment required'} checked={editingItem.requiresAppointment} onChange={(v)=>update(editingItem.id,{requiresAppointment:v})}/>}
                <div className="wf-modal-actions">
                  <button className="danger" onClick={()=>remove(editingItem.id)}>{lang==='es'?'Eliminar':'Delete'}</button>
                  <button className="done" onClick={()=>setEditingId(null)}>{lang==='es'?'Guardar y cerrar':'Save and close'}</button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function TeamStep({state,setState,lang}:{state:BuilderState;setState:Dispatch<SetStateAction<BuilderState>>;lang:Language}) {
  const services = state.catalog.filter((item)=>item.type==='service' && item.requiresAppointment)
  const addMember = () => setState((current)=>({...current,team:[...current.team,{id:createId('employee'),name:lang==='es'?'Nuevo empleado':'New team member',role:lang==='es'?'Profesional':'Professional',serviceIds:[]}]}))
  const update = (id:string,patch:Partial<TeamMember>) => setState((current)=>({...current,team:current.team.map((member)=>member.id===id?{...member,...patch}:member)}))
  const remove = (id:string) => setState((current)=>({...current,team:current.team.filter((member)=>member.id!==id)}))

  return (
    <div className="wf-step-content">
      <div className="wf-step-intro"><small>{lang==='es'?'PASO 5':'STEP 5'}</small><h3>{lang==='es'?'Configura tu equipo.':'Configure your team.'}</h3><p>{lang==='es'?'Relaciona cada servicio reservable con las personas autorizadas para brindarlo.':'Assign each bookable service to the team members authorized to provide it.'}</p></div>
      <button className="wf-add-member" onClick={addMember}>+ {lang==='es'?'Añadir empleado':'Add team member'}</button>
      <div className="wf-team-editor">
        {state.team.map((member)=>(
          <article key={member.id}>
            <header><b>{member.name.slice(0,1).toUpperCase()}</b><button onClick={()=>remove(member.id)}>{lang==='es'?'Eliminar':'Delete'}</button></header>
            <Field label={lang==='es'?'Nombre':'Name'} value={member.name} onChange={(v)=>update(member.id,{name:v})}/>
            <Field label={lang==='es'?'Rol':'Role'} value={member.role} onChange={(v)=>update(member.id,{role:v})}/>
            <div className="wf-service-assignment">
              <span>{lang==='es'?'Servicios que puede brindar':'Services this person can provide'}</span>
              {services.length===0?<small>{lang==='es'?'Añade un servicio que requiera cita en Catálogo.':'Add an appointment-based service in Catalog.'}</small>:services.map((service)=>(
                <label key={service.id}>
                  <input
                    type="checkbox"
                    checked={member.serviceIds.includes(service.id)}
                    onChange={(e)=>update(member.id,{serviceIds:e.target.checked?[...member.serviceIds,service.id]:member.serviceIds.filter((id)=>id!==service.id)})}
                  />
                  <b>{service.name}</b>
                </label>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function HoursStep({state,setState,lang}:{state:BuilderState;setState:Dispatch<SetStateAction<BuilderState>>;lang:Language}) {
  const update = (day:string,patch:Partial<DayHours>) =>
    setState((current)=>({...current,hours:{...current.hours,[day]:{...current.hours[day],...patch}}}))

  return (
    <div className="wf-step-content">
      <div className="wf-step-intro"><small>{lang==='es'?'PASO 6':'STEP 6'}</small><h3>{lang==='es'?'Define los horarios generales.':'Set general business hours.'}</h3><p>{lang==='es'?'Cada empleado podrá usar estos horarios o tener un horario individual desde el portal.':'Each team member can use these hours or have an individual schedule in the portal.'}</p></div>
      <div className="wf-hours-editor">
        {Object.entries(state.hours).map(([day,hours])=>(
          <article key={day}>
            <label><input type="checkbox" checked={hours.enabled} onChange={(e)=>update(day,{enabled:e.target.checked})}/><strong>{lang==='es'?day:({Lunes:'Monday',Martes:'Tuesday','Miércoles':'Wednesday',Jueves:'Thursday',Viernes:'Friday','Sábado':'Saturday',Domingo:'Sunday'} as Record<string,string>)[day]}</strong></label>
            {hours.enabled?<div><input type="time" value={hours.open} onChange={(e)=>update(day,{open:e.target.value})}/><span>{lang==='es'?'hasta':'to'}</span><input type="time" value={hours.close} onChange={(e)=>update(day,{close:e.target.value})}/></div>:<em>{lang==='es'?'Cerrado':'Closed'}</em>}
          </article>
        ))}
      </div>
      <div className="wf-hours-note"><strong>{lang==='es'?'Regla de disponibilidad':'Availability rule'}</strong><span>{lang==='es'?'Una cita tendrá que caber completamente dentro del horario antes de poder ofrecerse al cliente.':'An appointment must fit completely within business hours before it can be offered.'}</span></div>
    </div>
  )
}

function PaymentsStep({state,setState,lang}:{state:BuilderState;setState:Dispatch<SetStateAction<BuilderState>>;lang:Language}) {
  const payments = state.payments
  const setMethod = (method:keyof PaymentConfiguration['methods'], value:boolean) => {
    setState((current)=>({
      ...current,
      features:{
        ...current.features,
        ...(method==='stripe'?{stripe:value}:{}),
        ...(method==='ath'?{ath:value}:{}),
        ...(method==='inPerson'?{inPersonPayments:value}:{}),
      },
      payments:{...current.payments,methods:{...current.payments.methods,[method]:value}},
    }))
  }
  const patchPayments = (patch:Partial<PaymentConfiguration>) =>
    setState((current)=>({...current,payments:{...current.payments,...patch}}))

  return (
    <div className="wf-step-content">
      <div className="wf-step-intro"><small>{lang==='es'?'PASO 7':'STEP 7'}</small><h3>{lang==='es'?'Configura cómo cobrará el negocio.':'Configure how the business gets paid.'}</h3><p>{lang==='es'?'El dinero de las ventas irá directamente a las cuentas del cliente. Nunca introduzcas contraseñas ni claves secretas aquí.':'Sales funds go directly to the business accounts. Never enter passwords or secret keys here.'}</p></div>

      <div className="wf-payment-methods">
        <article className={payments.methods.stripe?'selected':''}>
          <Toggle label="Stripe Connect" checked={payments.methods.stripe} onChange={(value)=>setMethod('stripe',value)} />
          <p>{lang==='es'?'Tarjetas y métodos elegibles se mostrarán dinámicamente mediante Stripe Checkout.':'Cards and eligible payment methods appear dynamically through Stripe Checkout.'}</p>
          {payments.methods.stripe && <>
            <label className="wf-field"><span>{lang==='es'?'Cuenta Stripe':'Stripe account'}</span><select value={payments.stripe.accountStatus} onChange={(event)=>patchPayments({stripe:{...payments.stripe,accountStatus:event.target.value as 'new'|'existing'}})}><option value="new">{lang==='es'?'Necesito crear una cuenta':'I need to create an account'}</option><option value="existing">{lang==='es'?'Ya tengo una cuenta Stripe':'I already have a Stripe account'}</option></select></label>
            <small className="wf-secure-note">{lang==='es'?'Desde tu portal recibirás un enlace privado para conectar o crear la cuenta directamente con Stripe.':'Your portal will provide a private link to connect or create the account directly with Stripe.'}</small>
          </>}
        </article>

        <article className={payments.methods.ath?'selected':''}>
          <Toggle label="ATH Móvil Business" checked={payments.methods.ath} onChange={(value)=>setMethod('ath',value)} />
          <p>{lang==='es'?'Para clientes en Puerto Rico con una cuenta ATH Móvil Business administrada por el negocio.':'For Puerto Rico businesses that manage their own ATH Móvil Business account.'}</p>
          {payments.methods.ath && <>
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

function FinalStep({state,setStep,lang}:{state:BuilderState;setStep:(step:number)=>void;lang:Language}) {
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
  const selectedTemplate = demoConfigs.find((demo)=>demo.slug===state.design.templateSlug)
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
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : (lang==='es'?'No se pudo crear tu acceso.':'Your access could not be created.'))
      setCheckingOut(false)
    }
  }

  return (
    <div className="wf-step-content">
      <div className="wf-step-intro"><small>{lang==='es'?'PASO 8':'STEP 8'}</small><h3>{lang==='es'?'Tu configuración está lista para activar.':'Your setup is ready to activate.'}</h3><p>{lang==='es'?'Recibirás acceso privado para iniciar tu prueba gratuita de 48 horas. No se solicita tarjeta.':'You will receive private access to start your free 48-hour trial. No card is required.'}</p></div>
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
          <p>{lang==='es'?'El trial comienza solamente cuando entras a tu portal y lo activas.':'Your trial starts only when you enter your portal and activate it.'}</p>
        </header>
        <div>
          <article><em>01</em><strong>{lang==='es'?'Acceso seguro':'Secure access'}</strong><span>{lang==='es'?'Recibirás por email el enlace privado para establecer tu contraseña.':'You will receive a private email link to set your password.'}</span></article>
          <article><em>02</em><strong>{lang==='es'?'Conecta tus cuentas':'Connect your accounts'}</strong><span>{lang==='es'?'Desde tu acceso privado podrás conectar Stripe y autorizar Google Calendar en sus pantallas oficiales.':'From your private portal, connect Stripe and authorize Google Calendar on their official screens.'}</span></article>
          <article><em>03</em><strong>{lang==='es'?'Administra tu página':'Manage your page'}</strong><span>{lang==='es'?'Podrás cambiar productos, servicios, precios, empleados, horarios y reglas sin solicitar otro deployment.':'Change products, services, prices, team members, hours, and rules without requesting another deployment.'}</span></article>
        </div>
        <p className="wf-after-payment-security">{lang==='es'?'WebFactory nunca te pedirá contraseñas, códigos de seguridad, datos bancarios ni llaves secretas.':'WebFactory will never ask for passwords, security codes, bank details, or secret keys.'}</p>
      </section>
      {created ? <div className="wf-checkout-placeholder success"><div><small>{lang==='es'?'ACCESO ENVIADO':'ACCESS SENT'}</small><strong>{lang==='es'?'Revisa tu email':'Check your email'}</strong><span>{lang==='es'?'Establece tu contraseña, entra al portal y activa las 48 horas gratis cuando estés listo.':'Set your password, enter the portal, and activate the free 48 hours when you are ready.'}</span></div><a className="wf-builder-access-link" href={created.portalUrl}>{lang==='es'?'Abrir portal administrativo':'Open administrative portal'}</a></div> : <div className="wf-checkout-placeholder">
        <div><small>{lang==='es'?'SIGUIENTE ETAPA':'NEXT STEP'}</small><strong>{lang==='es'?'Crear acceso · 48 horas gratis':'Create access · 48 hours free'}</strong><span>{lang==='es'?'Después escoge $30 mensual o $350 anual. Sin comisión sobre tus ventas.':'Then choose $30 monthly or $350 yearly. No commission on your sales.'}</span></div>
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
      const parsed = JSON.parse(saved) as Partial<BuilderState> & { business?: Partial<BuilderState['business']> & { address?: string } }
      const legacyMapsUrl = parsed.business?.address && isGoogleMapsUrl(parsed.business.address)
        ? parsed.business.address
        : undefined
      return {
        ...initialState,
        ...parsed,
        business: {
          ...initialState.business,
          ...parsed.business,
          mapsUrl: parsed.business?.mapsUrl || legacyMapsUrl || initialState.business.mapsUrl,
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

  useEffect(()=>{
    const templateSlug = new URLSearchParams(window.location.search).get('template') || ''
    const demo = demoConfigs.find((entry)=>entry.slug===templateSlug)
    if (!demo) return
    setState((current)=>({
      ...current,
      design:{...current.design,templateSlug:demo.slug,primary:demo.dark,secondary:demo.accent},
    }))
    setStep(1)
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
    <BusinessStep key="business" state={state} setState={setState} lang={lang}/>,
    <DesignStep key="design" state={state} setState={setState} lang={lang}/>,
    <FeaturesStep key="features" state={state} setState={setState} lang={lang}/>,
    <CatalogStep key="catalog" state={state} setState={setState} lang={lang}/>,
    <TeamStep key="team" state={state} setState={setState} lang={lang}/>,
    <HoursStep key="hours" state={state} setState={setState} lang={lang}/>,
    <PaymentsStep key="payments" state={state} setState={setState} lang={lang}/>,
    <FinalStep key="preview" state={state} setStep={setStep} lang={lang}/>,
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
