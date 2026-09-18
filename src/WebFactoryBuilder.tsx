import { useEffect, useMemo, useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react'
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

type BuilderState = {
  business: {
    name: string
    category: string
    description: string
    phone: string
    whatsapp: string
    email: string
    address: string
    instagram: string
    logo?: string
  }
  design: {
    style: BuilderStyle
    primary: string
    secondary: string
  }
  features: Record<string, boolean>
  catalog: CatalogItem[]
  team: TeamMember[]
  hours: Record<string, DayHours>
}

const PRICE = '$299.99'
const STORAGE_KEY = 'webfactory-v2-builder-draft'

const initialState: BuilderState = {
  business: {
    name: 'Northline Studio',
    category: 'Barber',
    description: 'Cortes modernos, grooming y reservaciones fáciles desde cualquier dispositivo.',
    phone: '(787) 555-0101',
    whatsapp: '(787) 555-0101',
    email: 'hello@example.com',
    address: 'San Juan, Puerto Rico',
    instagram: '@northlinestudio',
  },
  design: {
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
  stripe: 'Stripe',
  ath: 'ATH Móvil',
  bookings: 'Reservaciones',
  calendar: 'Google Calendar',
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
  const appointments = state.catalog.filter((item)=>item.type==='service' && item.requiresAppointment)
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
            {state.features.services && <span>Servicios</span>}
            {state.features.products && <span>Shop</span>}
            {state.features.bookings && <button>Reservar</button>}
          </nav>
        </header>

        <section className="wf-preview-hero">
          <small>{state.business.category || 'BUSINESS'}</small>
          <h3>{state.business.name || 'Tu negocio'}</h3>
          <p>{state.business.description || 'Describe aquí lo que hace especial a tu negocio.'}</p>
          <div>
            {state.features.bookings && <button>Reservar ahora</button>}
            {state.features.whatsapp && <button className="ghost">WhatsApp</button>}
          </div>
        </section>

        <section className="wf-preview-catalog">
          <div className="wf-preview-title">
            <small>{state.features.products && state.features.services ? 'PRODUCTOS + SERVICIOS' : state.features.services ? 'SERVICIOS' : 'PRODUCTOS'}</small>
            <strong>Explora lo que ofrecemos.</strong>
          </div>
          <div className="wf-preview-items">
            {state.catalog.length === 0 ? (
              <div className="wf-preview-empty">Añade productos o servicios desde Catálogo.</div>
            ) : state.catalog.slice(0,6).map((item) => (
              <article key={item.id}>
                {item.image ? <img src={item.image} alt="" /> : <div className="wf-preview-placeholder">{item.type==='service'?'SERVICE':'PRODUCT'}</div>}
                <div>
                  <small>{item.type}</small>
                  <strong>{item.name || 'Sin nombre'}</strong>
                  <span>${Number(item.price || 0).toFixed(2)}</span>
                  {item.requiresAppointment && <em>{item.duration} min · Booking</em>}
                </div>
              </article>
            ))}
          </div>
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

        <footer>
          <strong>{state.business.name || 'Tu negocio'}</strong>
          <span>{state.business.phone}</span>
          <span>{state.business.address}</span>
        </footer>
      </div>
    </div>
  )
}

function BusinessStep({state,setState}:{state:BuilderState;setState:Dispatch<SetStateAction<BuilderState>>}) {
  const setBusiness = (key:keyof BuilderState['business'], value:string) =>
    setState((current)=>({...current,business:{...current.business,[key]:value}}))

  const uploadLogo = async (file?:File) => {
    if (!file) return
    const data = await readFile(file)
    setBusiness('logo',data)
  }

  return (
    <div className="wf-step-content">
      <div className="wf-step-intro"><small>PASO 1</small><h3>Cuéntanos sobre tu negocio.</h3><p>Estos datos alimentan el preview inmediatamente.</p></div>
      <Field label="Nombre del negocio" value={state.business.name} onChange={(v)=>setBusiness('name',v)} />
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
        <Field label="Email" type="email" value={state.business.email} onChange={(v)=>setBusiness('email',v)} />
        <Field label="Instagram" value={state.business.instagram} onChange={(v)=>setBusiness('instagram',v)} />
      </div>
      <Field label="Dirección / ubicación" value={state.business.address} onChange={(v)=>setBusiness('address',v)} />
      <label className="wf-upload">
        <input type="file" accept="image/*" onChange={(event)=>uploadLogo(event.target.files?.[0])} />
        <span>{state.business.logo?'✓ Logo cargado':'Subir logo del cliente'}</span>
        <small>PNG, JPG o WEBP · solo preview local en esta fase</small>
      </label>
    </div>
  )
}

function DesignStep({state,setState}:{state:BuilderState;setState:Dispatch<SetStateAction<BuilderState>>}) {
  const setDesign = (key:keyof BuilderState['design'], value:string) =>
    setState((current)=>({...current,design:{...current.design,[key]:value}}))

  return (
    <div className="wf-step-content">
      <div className="wf-step-intro"><small>PASO 2</small><h3>Elige el estilo visual.</h3><p>El cambio aparece inmediatamente en el preview.</p></div>
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
  const addItem = (type:ItemType) => {
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
  }

  const update = (id:string, patch:Partial<CatalogItem>) =>
    setState((current)=>({...current,catalog:current.catalog.map((item)=>item.id===id?{...item,...patch}:item)}))

  const remove = (id:string) =>
    setState((current)=>({
      ...current,
      catalog:current.catalog.filter((item)=>item.id!==id),
      team:current.team.map((member)=>({...member,serviceIds:member.serviceIds.filter((serviceId)=>serviceId!==id)})),
    }))

  const uploadImage = async (id:string,file?:File) => {
    if (!file) return
    update(id,{image:await readFile(file)})
  }

  return (
    <div className="wf-step-content">
      <div className="wf-step-intro"><small>PASO 4</small><h3>Construye tu catálogo.</h3><p>Productos y servicios viven en un mismo sistema. Puedes configurar hasta 10 inicialmente.</p></div>
      <div className="wf-catalog-actions">
        <button onClick={()=>addItem('product')} disabled={state.catalog.length>=10}>+ Producto</button>
        <button onClick={()=>addItem('service')} disabled={state.catalog.length>=10}>+ Servicio</button>
        <span>{state.catalog.length}/10 configurados</span>
      </div>
      <div className="wf-builder-catalog">
        {state.catalog.map((item,index)=>(
          <article key={item.id}>
            <header><span>{String(index+1).padStart(2,'0')} · {item.type==='service'?'SERVICIO':'PRODUCTO'}</span><button onClick={()=>remove(item.id)}>Eliminar</button></header>
            <div className="wf-item-editor">
              <label className="wf-item-image">
                <input type="file" accept="image/*" onChange={(e)=>uploadImage(item.id,e.target.files?.[0])} />
                {item.image?<img src={item.image} alt="" />:<span>+ Imagen</span>}
              </label>
              <div>
                <Field label="Nombre" value={item.name} onChange={(v)=>update(item.id,{name:v})} />
                <div className="wf-mini-grid">
                  <label className="wf-field"><span>Precio</span><input type="number" min="0" step=".01" value={item.price} onChange={(e)=>update(item.id,{price:Number(e.target.value)})}/></label>
                  {item.type==='service' && <label className="wf-field"><span>Duración</span><select value={item.duration} onChange={(e)=>update(item.id,{duration:Number(e.target.value)})}>{[15,30,45,60,75,90,120,180].map((min)=><option key={min} value={min}>{min} min</option>)}</select></label>}
                </div>
                <label className="wf-field"><span>Descripción</span><textarea rows={3} value={item.description} onChange={(e)=>update(item.id,{description:e.target.value})}/></label>
                {item.type==='service' && <Toggle label="Requiere cita" checked={item.requiresAppointment} onChange={(v)=>update(item.id,{requiresAppointment:v})}/>}
              </div>
            </div>
          </article>
        ))}
        {state.catalog.length===0 && <div className="wf-empty-editor">Añade tu primer producto o servicio.</div>}
      </div>
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

function FinalStep({state,setStep}:{state:BuilderState;setStep:(step:number)=>void}) {
  const appointmentServices = state.catalog.filter((item)=>item.requiresAppointment)
  const enabledFeatures = Object.values(state.features).filter(Boolean).length
  return (
    <div className="wf-step-content">
      <div className="wf-step-intro"><small>PASO 7</small><h3>Tu configuración está lista para revisar.</h3><p>Este preview aún no está publicado y no crea una orden hasta que exista checkout verificado.</p></div>
      <div className="wf-review-grid">
        <article><span>Negocio</span><strong>{state.business.name}</strong><small>{state.business.category}</small><button onClick={()=>setStep(0)}>Editar</button></article>
        <article><span>Diseño</span><strong>{state.design.style}</strong><div><i style={{background:state.design.primary}}/><i style={{background:state.design.secondary}}/></div><button onClick={()=>setStep(1)}>Editar</button></article>
        <article><span>Funciones</span><strong>{enabledFeatures} activas</strong><small>Precio fijo {PRICE}</small><button onClick={()=>setStep(2)}>Editar</button></article>
        <article><span>Catálogo</span><strong>{state.catalog.length} items</strong><small>{appointmentServices.length} con booking</small><button onClick={()=>setStep(3)}>Editar</button></article>
        <article><span>Equipo</span><strong>{state.team.length} empleados</strong><small>Service + Employee</small><button onClick={()=>setStep(4)}>Editar</button></article>
        <article><span>Horarios</span><strong>{Object.values(state.hours).filter((day)=>day.enabled).length} días abiertos</strong><small>Disponibilidad general</small><button onClick={()=>setStep(5)}>Editar</button></article>
      </div>
      <div className="wf-checkout-placeholder">
        <div><small>SIGUIENTE ETAPA</small><strong>Checkout seguro — {PRICE}</strong><span>La conexión real a Stripe/ATH Móvil se implementa en la fase de pagos. El Builder ya entrega la configuración necesaria.</span></div>
        <button disabled>Continuar al checkout</button>
      </div>
    </div>
  )
}

export default function WebFactoryBuilder({lang}:{lang:Language}) {
  const [state,setState] = useState<BuilderState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? {...initialState,...JSON.parse(saved)} : initialState
    } catch {
      return initialState
    }
  })
  const [step,setStep] = useState(0)
  const [device,setDevice] = useState<Device>('desktop')
  const [saved,setSaved] = useState(false)

  useEffect(()=>{
    try {
      localStorage.setItem(STORAGE_KEY,JSON.stringify(state))
      setSaved(true)
      const timer=window.setTimeout(()=>setSaved(false),900)
      return ()=>window.clearTimeout(timer)
    } catch {
      return
    }
  },[state])

  const labels = lang==='es'
    ? ['Negocio','Diseño','Funciones','Catálogo','Equipo','Horarios','Preview']
    : ['Business','Design','Features','Catalog','Team','Hours','Preview']

  const completion = useMemo(()=>Math.round(((step+1)/labels.length)*100),[step,labels.length])

  const reset = () => {
    if (!window.confirm(lang==='es'?'¿Reiniciar la configuración del Builder?':'Reset Builder configuration?')) return
    setState(initialState)
    localStorage.removeItem(STORAGE_KEY)
    setStep(0)
  }

  const stepContent = [
    <BusinessStep key="business" state={state} setState={setState}/>,
    <DesignStep key="design" state={state} setState={setState}/>,
    <FeaturesStep key="features" state={state} setState={setState}/>,
    <CatalogStep key="catalog" state={state} setState={setState}/>,
    <TeamStep key="team" state={state} setState={setState}/>,
    <HoursStep key="hours" state={state} setState={setState}/>,
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
