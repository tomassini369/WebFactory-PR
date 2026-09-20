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
    contactName: string
    category: string
    description: string
    phone: string
    whatsapp: string
    email: string
    mapsUrl: string
    instagram: string
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

const PRICE = '$300'
const CATALOG_LIMIT = 100
const STORAGE_KEY = 'webfactory-v2-builder-draft'
const DRAFT_ID_KEY = 'webfactory-v2-draft-id'

const initialState: BuilderState = {
  business: {
    name: 'Northline Studio',
    contactName: '',
    category: 'Barber',
    description: 'Cortes modernos, grooming y reservaciones fáciles desde cualquier dispositivo.',
    phone: '(787) 555-0101',
    whatsapp: '(787) 555-0101',
    email: 'hello@example.com',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=San+Juan%2C+Puerto+Rico',
    instagram: '@northlinestudio',
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
  catalog: [
    {
      id: 'service-1',
      type: 'service',
      name: 'Premium Haircut',
      price: 35,
      description: 'Corte profesional con terminación y styling.',
      requiresAppointment: true,
      duration: 45,
    },
    {
      id: 'product-1',
      type: 'product',
      name: 'Styling Clay',
      price: 24,
      description: 'Producto de styling con acabado natural.',
      requiresAppointment: false,
      duration: 0,
    },
  ],
  team: [
    {
      id: 'employee-1',
      name: 'Carlos Rivera',
      role: 'Barber',
      serviceIds: ['service-1'],
    },
  ],
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

const featureLabels: Record<string,string> = {
  products: 'Productos',
  services: 'Servicios',
  cart: 'Carrito',
  whatsapp: 'WhatsApp',
  calls: 'Llamadas',
  social: 'Redes sociales',
  form: 'Formulario',
  maps: 'Google Maps',
  bookings: 'Reservaciones',
  calendar: 'Google Calendar',
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

function Toggle({checked,onChange,label}:{checked:boolean;onChange:(value:boolean)=>void;label:string}) {
  return (
    <button
      type="button"
      className={`wf-toggle ${checked?'on':''}`}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
    >
      <span><i /></span>
      <b>{label}</b>
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

function Preview({state,device}:{state:BuilderState;device:Device}) {
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
            <strong>{state.business.name || 'Tu negocio'}</strong>
          </div>
          <nav>
            <span>Inicio</span>
            {(state.features.services || state.features.products) && <button className="wf-preview-catalog-link" onClick={()=>setCatalogOpen(true)}>Catálogo</button>}
            {state.features.bookings && <button>Reservar</button>}
          </nav>
        </header>

        <section className="wf-preview-hero">
          <small>{state.business.category || 'BUSINESS'}</small>
          <h3>{state.business.name || 'Tu negocio'}</h3>
          <p>{state.business.description || 'Describe aquí lo que hace especial a tu negocio.'}</p>
          <div>
            {(state.features.products || state.features.services) && <button onClick={()=>setCatalogOpen(true)}>Ver productos y servicios</button>}
            {state.features.bookings && <button className="ghost">Reservar ahora</button>}
            {state.features.whatsapp && <button className="ghost">WhatsApp</button>}
          </div>
        </section>

        <section className="wf-preview-catalog-gateway">
          <small>CATÁLOGO</small>
          <strong>{visibleCatalog.length} productos y servicios disponibles</strong>
          <p>El catálogo permanece oculto para mantener la página limpia. El cliente lo abre solamente cuando desea explorar.</p>
          <button onClick={()=>setCatalogOpen(true)}>Abrir catálogo →</button>
        </section>

        {state.features.bookings && appointments.length > 0 && (
          <section className="wf-preview-booking">
            <small>BOOKING</small>
            <strong>Reserva en pocos pasos.</strong>
            <div>
              <span>Servicio</span><i>→</i>
              <span>Empleado</span><i>→</i>
              <span>Hora</span>
            </div>
          </section>
        )}

        {state.team.length > 0 && (
          <section className="wf-preview-team">
            <small>EQUIPO</small>
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
              <small>UBICACIÓN</small>
              <strong>Encuéntranos en Google Maps.</strong>
              <a href={state.business.mapsUrl} target="_blank" rel="noreferrer">Ver ubicación real ↗</a>
            </div>
            {mapsEmbed ? (
              <iframe
                title="Ubicación de Google Maps"
                src={mapsEmbed}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <a className="wf-preview-map-link" href={state.business.mapsUrl} target="_blank" rel="noreferrer">
                <span>Google Maps</span>
                <b>Abrir ubicación real ↗</b>
              </a>
            )}
          </section>
        )}

        <footer>
          <strong>{state.business.name || 'Tu negocio'}</strong>
          <span>{state.business.phone}</span>
          {state.features.maps && mapsValid && (
            <a href={state.business.mapsUrl} target="_blank" rel="noreferrer">Google Maps ↗</a>
          )}
        </footer>

        {catalogOpen && (
          <div className="wf-preview-modal-backdrop" onMouseDown={()=>setCatalogOpen(false)}>
            <section className="wf-preview-catalog-window" onMouseDown={(event)=>event.stopPropagation()}>
              <header>
                <div><small>CATÁLOGO</small><strong>Productos y servicios</strong></div>
                <button onClick={()=>setCatalogOpen(false)}>×</button>
              </header>
              <div className="wf-preview-modal-items">
                {visibleCatalog.length===0 ? (
                  <div className="wf-preview-empty">No hay productos o servicios activos en el preview.</div>
                ) : visibleCatalog.map((item)=>(
                  <button key={item.id} className="wf-preview-modal-card" onClick={()=>setSelectedItem(item)}>
                    {item.image ? <img src={item.image} alt="" /> : <span className="wf-preview-placeholder">{item.type==='service'?'SERVICE':'PRODUCT'}</span>}
                    <div><small>{item.type}</small><strong>{item.name || 'Sin nombre'}</strong><b>${Number(item.price || 0).toFixed(2)}</b></div>
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
                <h4>{selectedItem.name || 'Sin nombre'}</h4>
                <strong>${Number(selectedItem.price || 0).toFixed(2)}</strong>
                <p>{selectedItem.description || 'Descripción del producto o servicio.'}</p>
                {selectedItem.requiresAppointment && <span>{selectedItem.duration} min · Requiere reservación</span>}
                <button>{selectedItem.requiresAppointment?'Reservar':'Añadir al carrito'}</button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

function BusinessStep({state,setState}:{state:BuilderState;setState:Dispatch<SetStateAction<BuilderState>>}) {
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
      setUploadError(error instanceof Error ? error.message : 'No se pudo guardar el logo.')
    } finally {
      setUploadingLogo(false)
    }
  }

  return (
    <div className="wf-step-content">
      <div className="wf-step-intro"><small>PASO 1</small><h3>Cuéntanos sobre tu negocio.</h3><p>Estos datos alimentan el preview y el pedido de producción.</p></div>
      <Field label="Nombre del negocio" value={state.business.name} onChange={(v)=>setBusiness('name',v)} />
      <Field label="Nombre del cliente / contacto" value={state.business.contactName} onChange={(v)=>setBusiness('contactName',v)} placeholder="Persona responsable del pedido" />
      <label className="wf-field">
        <span>Categoría</span>
        <select value={state.business.category} onChange={(event)=>setBusiness('category',event.target.value)}>
          {categories.map((category)=><option key={category}>{category}</option>)}
        </select>
      </label>
      <label className="wf-field">
        <span>Descripción</span>
        <textarea rows={4} value={state.business.description} onChange={(event)=>setBusiness('description',event.target.value)} />
      </label>
      <div className="wf-field-grid">
        <Field label="Teléfono" value={state.business.phone} onChange={(v)=>setBusiness('phone',v)} />
        <Field label="WhatsApp" value={state.business.whatsapp} onChange={(v)=>setBusiness('whatsapp',v)} />
        <Field label="Email del cliente" type="email" value={state.business.email} onChange={(v)=>setBusiness('email',v)} />
        <Field label="Instagram" value={state.business.instagram} onChange={(v)=>setBusiness('instagram',v)} />
      </div>
      <label className="wf-field wf-maps-field">
        <span>Enlace de Google Maps</span>
        <input
          type="url"
          value={state.business.mapsUrl}
          placeholder="https://maps.app.goo.gl/..."
          onChange={(event)=>setBusiness('mapsUrl',event.target.value)}
        />
        <small className={state.business.mapsUrl && !isGoogleMapsUrl(state.business.mapsUrl) ? 'invalid' : ''}>
          {state.business.mapsUrl
            ? isGoogleMapsUrl(state.business.mapsUrl)
              ? '✓ Enlace válido · la ubicación real aparecerá en la página'
              : 'Usa un enlace válido de Google Maps'
            : 'Abre Google Maps → Compartir → Copiar enlace y pégalo aquí'}
        </small>
      </label>
      <label className="wf-upload">
        <input type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif" disabled={uploadingLogo} onChange={(event)=>uploadLogo(event.target.files?.[0])} />
        <span>{uploadingLogo?'Guardando logo…':state.business.logoAssetKey?'✓ Logo guardado para el pedido':'Subir logo del cliente'}</span>
        <small>El archivo se guarda de forma temporal para incluirlo en el Production Package después del pago.</small>
      </label>
      {uploadError && <small className="wf-upload-error">{uploadError}</small>}
    </div>
  )
}

function DesignStep({state,setState,lang}:{state:BuilderState;setState:Dispatch<SetStateAction<BuilderState>>;lang:Language}) {
  const setDesign = <K extends keyof BuilderState['design']>(key:K, value:BuilderState['design'][K]) =>
    setState((current)=>({...current,design:{...current.design,[key]:value}}))

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
          <button type="button" onClick={()=>setDesign('templateSlug','')} aria-pressed={state.design.templateSlug===''}>
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
            <button type="button" onClick={()=>setDesign('templateSlug',demo.slug)} aria-pressed={state.design.templateSlug===demo.slug}>
              <span style={{backgroundImage:`linear-gradient(180deg,transparent,rgba(5,10,16,.78)),url(${demo.heroImage})`}}>
                {state.design.templateSlug===demo.slug && <b>✓ {lang==='es'?'Seleccionado':'Selected'}</b>}
              </span>
              <small>{demo.category}</small>
              <strong>{demo.name}</strong>
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
      <div className="wf-step-intro compact"><small>{lang==='es'?'PERSONALIZACIÓN':'CUSTOMIZATION'}</small><h3>{lang==='es'?'Ajusta estilo y colores.':'Adjust style and colors.'}</h3><p>{lang==='es'?'Estos cambios aplican tu identidad sobre el diseño base seleccionado.':'These changes apply your identity to the selected base design.'}</p></div>
      <div className="wf-style-grid">
        {styles.map((style)=>(
          <button key={style} className={state.design.style===style?'selected':''} onClick={()=>setDesign('style',style)}>
            <span className={`wf-style-thumb ${style.toLowerCase()}`}><i/><i/><i/></span>
            <strong>{style}</strong>
          </button>
        ))}
      </div>
      <div className="wf-color-grid">
        <label><span>Color primario</span><div><input type="color" value={state.design.primary} onChange={(e)=>setDesign('primary',e.target.value)} /><input value={state.design.primary} onChange={(e)=>setDesign('primary',e.target.value)} /></div></label>
        <label><span>Color secundario</span><div><input type="color" value={state.design.secondary} onChange={(e)=>setDesign('secondary',e.target.value)} /><input value={state.design.secondary} onChange={(e)=>setDesign('secondary',e.target.value)} /></div></label>
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

function FeaturesStep({state,setState}:{state:BuilderState;setState:Dispatch<SetStateAction<BuilderState>>}) {
  return (
    <div className="wf-step-content">
      <div className="wf-step-intro"><small>PASO 3</small><h3>Activa lo que tu negocio necesita.</h3><p>El precio permanece igual: {PRICE}.</p></div>
      <div className="wf-feature-grid">
        {Object.entries(featureLabels).map(([key,label])=>(
          <Toggle
            key={key}
            label={label}
            checked={Boolean(state.features[key])}
            onChange={(value)=>setState((current)=>({...current,features:{...current.features,[key]:value}}))}
          />
        ))}
      </div>
      <div className="wf-fixed-price"><span>WEBFACTORY PREMIUM COMMERCE WEBSITE</span><strong>{PRICE}</strong><b>Pago único · las funciones no cambian el precio</b></div>
    </div>
  )
}

function CatalogStep({state,setState}:{state:BuilderState;setState:Dispatch<SetStateAction<BuilderState>>}) {
  const [editingId,setEditingId] = useState<string | null>(null)
  const editingItem = state.catalog.find((item)=>item.id===editingId) ?? null

  const addItem = (type:ItemType) => {
    if (state.catalog.length>=CATALOG_LIMIT) return
    const item:CatalogItem = {
      id:createId(type),
      type,
      name:type==='service'?'Nuevo servicio':'Nuevo producto',
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
      setUploadError(error instanceof Error ? error.message : 'No se pudo guardar la imagen.')
    } finally {
      setUploadingId(null)
    }
  }

  return (
    <div className="wf-step-content">
      <div className="wf-step-intro"><small>PASO 4</small><h3>Construye tu catálogo.</h3><p>Productos y servicios viven en un mismo sistema. Puedes configurar hasta {CATALOG_LIMIT} en total.</p></div>
      <div className="wf-catalog-actions">
        <button onClick={()=>addItem('product')} disabled={state.catalog.length>=CATALOG_LIMIT}>+ Producto</button>
        <button onClick={()=>addItem('service')} disabled={state.catalog.length>=CATALOG_LIMIT}>+ Servicio</button>
        <span>{state.catalog.length}/{CATALOG_LIMIT} configurados</span>
      </div>

      <div className="wf-catalog-library">
        {state.catalog.map((item,index)=>(
          <button key={item.id} className="wf-catalog-tile" onClick={()=>setEditingId(item.id)}>
            {item.image ? <img src={item.image} alt="" /> : <span className="wf-catalog-tile-placeholder">{item.type==='service'?'S':'P'}</span>}
            <div>
              <small>{String(index+1).padStart(2,'0')} · {item.type==='service'?'SERVICIO':'PRODUCTO'}</small>
              <strong>{item.name || 'Sin nombre'}</strong>
              <span>${Number(item.price || 0).toFixed(2)}</span>
            </div>
            <em>Editar →</em>
          </button>
        ))}
        {state.catalog.length===0 && <div className="wf-empty-editor">Añade tu primer producto o servicio.</div>}
      </div>
      {uploadError && <small className="wf-upload-error">{uploadError}</small>}

      {editingItem && (
        <div className="wf-builder-modal-backdrop" onMouseDown={()=>setEditingId(null)}>
          <section className="wf-builder-item-modal" onMouseDown={(event)=>event.stopPropagation()}>
            <header>
              <div><small>{editingItem.type==='service'?'SERVICIO':'PRODUCTO'}</small><h4>{editingItem.name || 'Sin nombre'}</h4></div>
              <button onClick={()=>setEditingId(null)}>×</button>
            </header>
            <div className="wf-item-editor modal">
              <label className="wf-item-image">
                <input type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif" disabled={uploadingId===editingItem.id} onChange={(e)=>uploadImage(editingItem.id,e.target.files?.[0])} />
                {editingItem.image?<img src={editingItem.image} alt="" />:<span>{uploadingId===editingItem.id?'Guardando…':'+ Imagen'}</span>}
              </label>
              <div>
                <Field label="Nombre" value={editingItem.name} onChange={(v)=>update(editingItem.id,{name:v})} />
                <div className="wf-mini-grid">
                  <label className="wf-field"><span>Precio</span><input type="number" min="0" step=".01" value={editingItem.price} onChange={(e)=>update(editingItem.id,{price:Number(e.target.value)})}/></label>
                  {editingItem.type==='service' && <label className="wf-field"><span>Duración</span><select value={editingItem.duration} onChange={(e)=>update(editingItem.id,{duration:Number(e.target.value)})}>{[15,30,45,60,75,90,120,180,240].map((min)=><option key={min} value={min}>{min} min</option>)}</select></label>}
                </div>
                <label className="wf-field"><span>Descripción</span><textarea rows={4} value={editingItem.description} onChange={(e)=>update(editingItem.id,{description:e.target.value})}/></label>
                {editingItem.type==='service' && <Toggle label="Requiere cita" checked={editingItem.requiresAppointment} onChange={(v)=>update(editingItem.id,{requiresAppointment:v})}/>}
                <div className="wf-modal-actions">
                  <button className="danger" onClick={()=>remove(editingItem.id)}>Eliminar</button>
                  <button className="done" onClick={()=>setEditingId(null)}>Guardar y cerrar</button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function TeamStep({state,setState}:{state:BuilderState;setState:Dispatch<SetStateAction<BuilderState>>}) {
  const services = state.catalog.filter((item)=>item.type==='service' && item.requiresAppointment)
  const addMember = () => setState((current)=>({...current,team:[...current.team,{id:createId('employee'),name:'Nuevo empleado',role:'Profesional',serviceIds:[]}]}))
  const update = (id:string,patch:Partial<TeamMember>) => setState((current)=>({...current,team:current.team.map((member)=>member.id===id?{...member,...patch}:member)}))
  const remove = (id:string) => setState((current)=>({...current,team:current.team.filter((member)=>member.id!==id)}))

  return (
    <div className="wf-step-content">
      <div className="wf-step-intro"><small>PASO 5</small><h3>Configura tu equipo.</h3><p>Relaciona cada servicio reservable con las personas autorizadas para brindarlo.</p></div>
      <button className="wf-add-member" onClick={addMember}>+ Añadir empleado</button>
      <div className="wf-team-editor">
        {state.team.map((member)=>(
          <article key={member.id}>
            <header><b>{member.name.slice(0,1).toUpperCase()}</b><button onClick={()=>remove(member.id)}>Eliminar</button></header>
            <Field label="Nombre" value={member.name} onChange={(v)=>update(member.id,{name:v})}/>
            <Field label="Rol" value={member.role} onChange={(v)=>update(member.id,{role:v})}/>
            <div className="wf-service-assignment">
              <span>Servicios que puede brindar</span>
              {services.length===0?<small>Añade un servicio que requiera cita en Catálogo.</small>:services.map((service)=>(
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

function HoursStep({state,setState}:{state:BuilderState;setState:Dispatch<SetStateAction<BuilderState>>}) {
  const update = (day:string,patch:Partial<DayHours>) =>
    setState((current)=>({...current,hours:{...current.hours,[day]:{...current.hours[day],...patch}}}))

  return (
    <div className="wf-step-content">
      <div className="wf-step-intro"><small>PASO 6</small><h3>Define los horarios generales.</h3><p>En fases posteriores cada empleado podrá usar estos horarios o tener un horario individual.</p></div>
      <div className="wf-hours-editor">
        {Object.entries(state.hours).map(([day,hours])=>(
          <article key={day}>
            <label><input type="checkbox" checked={hours.enabled} onChange={(e)=>update(day,{enabled:e.target.checked})}/><strong>{day}</strong></label>
            {hours.enabled?<div><input type="time" value={hours.open} onChange={(e)=>update(day,{open:e.target.value})}/><span>hasta</span><input type="time" value={hours.close} onChange={(e)=>update(day,{close:e.target.value})}/></div>:<em>Cerrado</em>}
          </article>
        ))}
      </div>
      <div className="wf-hours-note"><strong>Regla de disponibilidad</strong><span>Una cita tendrá que caber completamente dentro del horario antes de poder ofrecerse al cliente.</span></div>
    </div>
  )
}

function PaymentsStep({state,setState}:{state:BuilderState;setState:Dispatch<SetStateAction<BuilderState>>}) {
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
      <div className="wf-step-intro"><small>PASO 7</small><h3>Configura cómo cobrará el negocio.</h3><p>El dinero de las ventas irá directamente a las cuentas del cliente. Nunca solicites contraseñas ni claves secretas aquí.</p></div>

      <div className="wf-payment-methods">
        <article className={payments.methods.stripe?'selected':''}>
          <Toggle label="Stripe Connect" checked={payments.methods.stripe} onChange={(value)=>setMethod('stripe',value)} />
          <p>Tarjetas y métodos elegibles se mostrarán dinámicamente mediante Stripe Checkout.</p>
          {payments.methods.stripe && <>
            <label className="wf-field"><span>Cuenta Stripe</span><select value={payments.stripe.accountStatus} onChange={(event)=>patchPayments({stripe:{...payments.stripe,accountStatus:event.target.value as 'new'|'existing'}})}><option value="new">Necesito crear una cuenta</option><option value="existing">Ya tengo una cuenta Stripe</option></select></label>
            <small className="wf-secure-note">Después del pago recibirás un enlace privado para conectar o crear la cuenta directamente con Stripe.</small>
          </>}
        </article>

        <article className={payments.methods.ath?'selected':''}>
          <Toggle label="ATH Móvil Business" checked={payments.methods.ath} onChange={(value)=>setMethod('ath',value)} />
          <p>Para clientes en Puerto Rico con una cuenta ATH Móvil Business administrada por el negocio.</p>
          {payments.methods.ath && <>
            <label className="wf-field"><span>Estado de la cuenta</span><select value={payments.ath.accountStatus} onChange={(event)=>patchPayments({ath:{...payments.ath,accountStatus:event.target.value as 'needs_account'|'active'}})}><option value="needs_account">Necesito crear/configurarla</option><option value="active">Ya está activa</option></select></label>
            <Field label="pATH público del negocio (opcional)" value={payments.ath.publicPath} onChange={(value)=>patchPayments({ath:{...payments.ath,publicPath:value}})} placeholder="Ej. /MiNegocio" />
            <small className="wf-secure-note">No introduzcas usuario, contraseña, llave API ni información bancaria.</small>
          </>}
        </article>

        <article className={payments.methods.inPerson?'selected':''}>
          <Toggle label="Pago presencial" checked={payments.methods.inPerson} onChange={(value)=>setMethod('inPerson',value)} />
          <p>Permite reservar o realizar una orden y pagar directamente en el establecimiento.</p>
          {payments.methods.inPerson && <label className="wf-field"><span>Instrucciones para el cliente</span><textarea rows={3} value={payments.inPerson.instructions} onChange={(event)=>patchPayments({inPerson:{instructions:event.target.value}})} /></label>}
        </article>
      </div>

      <div className="wf-payment-rules">
        <label className="wf-field"><span>Pago de productos</span><select value={payments.productPayment} onChange={(event)=>patchPayments({productPayment:event.target.value as 'online'|'in_person'})}><option value="online">Pago online requerido</option><option value="in_person" disabled={!payments.methods.inPerson}>Pagar al recoger / presencial</option></select></label>
        <label className="wf-field"><span>Pago de reservaciones</span><select value={payments.bookingPayment} onChange={(event)=>patchPayments({bookingPayment:event.target.value as 'full'|'deposit'|'in_person'})}><option value="full">Pago completo para confirmar</option><option value="deposit">Depósito para confirmar</option><option value="in_person" disabled={!payments.methods.inPerson}>Reservar y pagar presencial</option></select></label>
        {payments.bookingPayment==='deposit' && <label className="wf-field"><span>Depósito requerido</span><select value={payments.bookingDepositPercent} onChange={(event)=>patchPayments({bookingDepositPercent:Number(event.target.value)})}>{[10,20,25,30,50].map((value)=><option key={value} value={value}>{value}%</option>)}</select></label>}
      </div>

      <div className="wf-payment-extras">
        <Toggle label="Enviar recibo al comprador" checked={payments.sendCustomerReceipt} onChange={(value)=>patchPayments({sendCustomerReceipt:value})} />
        <Toggle label="Permitir propinas" checked={payments.allowTips} onChange={(value)=>patchPayments({allowTips:value})} />
      </div>

      {!payments.methods.stripe && !payments.methods.ath && !payments.methods.inPerson && <div className="wf-checkout-warning">Selecciona al menos un método de pago para el website del negocio.</div>}
      <div className="wf-hours-note"><strong>Configuración segura</strong><span>Stripe Connect recopilará identidad, banco y datos fiscales en sus propias pantallas. ATH Móvil se completará durante producción. Los secretos nunca se guardan en el Production Package.</span></div>
    </div>
  )
}

function FinalStep({state,setStep}:{state:BuilderState;setStep:(step:number)=>void}) {
  const [readiness,setReadiness] = useState<{ready:boolean;checks?:Record<string,boolean>} | null>(null)
  const [checkoutError,setCheckoutError] = useState('')
  const [checkingOut,setCheckingOut] = useState(false)
  const appointmentServices = state.catalog.filter((item)=>item.requiresAppointment)
  const enabledFeatures = Object.values(state.features).filter(Boolean).length
  const missingUpload = Boolean(state.business.logo && !state.business.logoAssetKey) ||
    state.catalog.some((item)=>Boolean(item.image && !item.imageAssetKey))
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.business.email.trim())
  const customerReady = Boolean(state.business.name.trim() && state.business.contactName.trim() && emailValid)
  const paymentReady = Object.values(state.payments.methods).some(Boolean)
  const selectedTemplate = demoConfigs.find((demo)=>demo.slug===state.design.templateSlug)
  const canCheckout = Boolean(readiness?.ready && customerReady && paymentReady && !missingUpload && !checkingOut)

  useEffect(()=>{
    let active=true
    fetch('/.netlify/functions/checkout-readiness',{cache:'no-store'})
      .then((response)=>response.json())
      .then((result)=>{ if(active) setReadiness(result) })
      .catch(()=>{ if(active) setReadiness({ready:false}) })
    return ()=>{active=false}
  },[])

  const startCheckout = async () => {
    if (!canCheckout) return
    setCheckingOut(true)
    setCheckoutError('')
    try {
      const {logo,...business} = state.business
      const catalog = state.catalog.map(({image,...item})=>item)
      const response = await fetch('/.netlify/functions/create-checkout-session',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          draftId:getDraftId(),
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
      if(!response.ok || !result.ok || !result.checkoutUrl){
        throw new Error(result.message || 'No se pudo iniciar Stripe Checkout.')
      }
      window.location.assign(result.checkoutUrl)
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'No se pudo iniciar el checkout.')
      setCheckingOut(false)
    }
  }

  const readinessText = !readiness
    ? 'Verificando configuración segura de pagos…'
    : readiness.ready
      ? 'Stripe está conectado. Al confirmarse el pago, WebFactory genera el Production Package y envía la orden administrativa automáticamente.'
      : 'La automatización administrativa todavía necesita completar su configuración segura antes de aceptar pagos.'

  return (
    <div className="wf-step-content">
      <div className="wf-step-intro"><small>PASO 8</small><h3>Tu configuración está lista para revisar.</h3><p>El pedido se bloquea para producción solamente después de que Stripe confirma el pago.</p></div>
      <div className="wf-review-grid">
        <article><span>Negocio</span><strong>{state.business.name}</strong><small>{state.business.category}</small><button onClick={()=>setStep(0)}>Editar</button></article>
        <article><span>Diseño</span><strong>{selectedTemplate?.name || 'Personalizado por WebFactory'}</strong><small>{state.design.style}</small><div><i style={{background:state.design.primary}}/><i style={{background:state.design.secondary}}/></div><button onClick={()=>setStep(1)}>Editar</button></article>
        <article><span>Funciones</span><strong>{enabledFeatures} activas</strong><small>Precio fijo {PRICE}</small><button onClick={()=>setStep(2)}>Editar</button></article>
        <article><span>Catálogo</span><strong>{state.catalog.length} items</strong><small>{appointmentServices.length} con booking</small><button onClick={()=>setStep(3)}>Editar</button></article>
        <article><span>Equipo</span><strong>{state.team.length} empleados</strong><small>Service + Employee</small><button onClick={()=>setStep(4)}>Editar</button></article>
        <article><span>Horarios</span><strong>{Object.values(state.hours).filter((day)=>day.enabled).length} días abiertos</strong><small>Disponibilidad general</small><button onClick={()=>setStep(5)}>Editar</button></article>
        <article><span>Pagos del website</span><strong>{Object.values(state.payments.methods).filter(Boolean).length} métodos</strong><small>{state.payments.bookingPayment==='deposit'?`${state.payments.bookingDepositPercent}% depósito para citas`:state.payments.bookingPayment}</small><button onClick={()=>setStep(6)}>Editar</button></article>
      </div>
      {!customerReady && <div className="wf-checkout-warning">Completa el nombre del cliente, nombre del negocio y un email válido antes de pagar.</div>}
      {!paymentReady && <div className="wf-checkout-warning">Selecciona al menos un método de pago para la página del negocio.</div>}
      {missingUpload && <div className="wf-checkout-warning">Hay imágenes todavía sin guardar. Vuelve a cargarlas antes del checkout para incluirlas en el pedido.</div>}
      <div className="wf-checkout-placeholder">
        <div><small>SIGUIENTE ETAPA</small><strong>Checkout seguro — {PRICE}</strong><span>{readinessText}</span></div>
        <button disabled={!canCheckout} onClick={startCheckout}>{checkingOut?'Preparando orden…':'Continuar al checkout'}</button>
      </div>
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
    try {
      const persistentState = {
        ...state,
        business: {...state.business,logo:undefined},
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
    <BusinessStep key="business" state={state} setState={setState}/>,
    <DesignStep key="design" state={state} setState={setState} lang={lang}/>,
    <FeaturesStep key="features" state={state} setState={setState}/>,
    <CatalogStep key="catalog" state={state} setState={setState}/>,
    <TeamStep key="team" state={state} setState={setState}/>,
    <HoursStep key="hours" state={state} setState={setState}/>,
    <PaymentsStep key="payments" state={state} setState={setState}/>,
    <FinalStep key="preview" state={state} setStep={setStep}/>,
  ][step]

  return (
    <div className="wf-builder-app">
      <div className="wf-builder-topbar">
        <div>
          <span>WEBFACTORY BUILDER</span>
          <strong>PREVIEW — NOT PUBLISHED</strong>
        </div>
        <div className="wf-builder-status">
          <span className={saved?'saved':''}>{saved?'✓ Draft saved':'Local draft'}</span>
          <button onClick={reset}>Reset</button>
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
          {stepContent}
          <div className="wf-builder-navigation">
            <button className="secondary" disabled={step===0} onClick={()=>setStep((current)=>Math.max(0,current-1))}>← Atrás</button>
            <span>Paso {step+1} de {labels.length}</span>
            <button className="primary" disabled={step===labels.length-1} onClick={()=>setStep((current)=>Math.min(labels.length-1,current+1))}>Continuar →</button>
          </div>
        </section>

        <section className="wf-live-panel">
          <header>
            <div className="wf-device-switcher">
              {(['desktop','tablet','mobile'] as Device[]).map((value)=>(
                <button key={value} className={device===value?'selected':''} onClick={()=>setDevice(value)}>
                  {value==='desktop'?'▱':value==='tablet'?'▯':'▯'} <span>{value}</span>
                </button>
              ))}
            </div>
            <strong>{PRICE}</strong>
          </header>
          <div className="wf-live-stage">
            <Preview state={state} device={device}/>
          </div>
        </section>
      </div>
    </div>
  )
}
