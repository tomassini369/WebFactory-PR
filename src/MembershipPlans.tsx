import {useCallback,useLayoutEffect,useRef,useState} from 'react'
import {motion,useReducedMotion} from 'framer-motion'
import {membershipIds,membershipPlans,membershipTrialDays,type MembershipId,type MembershipInterval} from '../shared/membership-plans.mjs'
import './membership-plans.css'

function TeamLogoIcon() {
  return (
    <svg
      width="38"
      height="28"
      viewBox="0 0 42 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="card-logo"
      aria-label="Team Plan Logo"
    >
      <defs>
        <linearGradient id="logo-left-grad" x1="6" y1="5" x2="22" y2="25" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#688aff" />
          <stop offset="50%" stopColor="#4368f5" />
          <stop offset="100%" stopColor="#2c51e0" />
        </linearGradient>

        <linearGradient id="logo-right-grad" x1="18" y1="5" x2="34" y2="25" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4a6ef5" />
          <stop offset="60%" stopColor="#2f51de" />
          <stop offset="100%" stopColor="#1e3cb8" />
        </linearGradient>

        <linearGradient id="fold-shadow" x1="17" y1="8" x2="23" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10257e" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#10257e" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect
        x="7.5"
        y="8.5"
        width="15"
        height="15"
        rx="4"
        transform="rotate(45 15 16)"
        fill="url(#logo-left-grad)"
      />

      <rect
        x="19.5"
        y="8.5"
        width="15"
        height="15"
        rx="4"
        transform="rotate(45 27 16)"
        fill="url(#logo-right-grad)"
      />

      <path
        d="M21 10L27 16L21 22"
        stroke="url(#fold-shadow)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function GreenCheckIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M4.5 10.5L8.2 14.2L15.5 6.5"
        stroke="#00b894"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const descriptions = {
 es:{
  basic:['Recibe reservas y mantén tu agenda al día.','Página web bilingüe','Reservas para un profesional','Sincronización con Google Calendar','Confirmaciones y recordatorios por correo'],
  standard:['Organiza tu equipo y cobra en línea.','Todo lo de Básico','Reservas para varios profesionales','Depósitos y pagos con Stripe','Lista de espera, inventario y reportes'],
  premium:['Atiende, cobra y prepara pedidos en tu local.','Todo lo de Standard','POS de cajero y kiosco de autoservicio','Pantalla del cliente, Cocina y seguimiento'],
 },
 en:{
  basic:['Take bookings and keep your calendar in sync.','Bilingual website','Bookings for one professional','Google Calendar sync','Email confirmations and reminders'],
  standard:['Organize your team and get paid online.','Everything in Basic','Bookings for multiple professionals','Deposits and payments with Stripe','Waitlist, inventory and reporting'],
  premium:['Take orders, collect payment and prepare orders on site.','Everything in Standard','Cashier POS and self-service kiosk','Customer display, kitchen and order tracking'],
 },
} as const

type Language='en'|'es';
type Selection={tier:MembershipId;interval:MembershipInterval};

export default function MembershipPlans({lang,onSelect,onIntervalChange,disabled=false,disclosed=true}:{lang:Language;onSelect?:(selection:Selection)=>void;onIntervalChange?:()=>void;disabled?:boolean;disclosed?:boolean}){
 const es=lang==='es'
 const reduced=useReducedMotion()
 const rail=useRef<HTMLDivElement>(null)
 const [interval,setInterval]=useState<MembershipInterval>('monthly')
 const [active,setActive]=useState(1)
 const activeIndex=useRef(1)
 const [hovered,setHovered]=useState<MembershipId|null>(null)
 const [expanded,setExpanded]=useState<MembershipId|null>(null)
 const center=useCallback((index:number,smooth=false)=>{
  const container=rail.current
  const card=container?.children[index] as HTMLElement|undefined
  if(!container||!card||container.scrollWidth<=container.clientWidth)return
  container.scrollTo({left:card.offsetLeft-(container.clientWidth-card.offsetWidth)/2,behavior:smooth&&!reduced?'smooth':'instant'})
 },[reduced])
 useLayoutEffect(()=>{if(disclosed)center(activeIndex.current)},[disclosed,center])
 const changeInterval=(next:MembershipInterval)=>{
  if(next===interval)return
  setInterval(next)
  onIntervalChange?.()
 }
 const navigate=(index:number)=>{
  if(index<0||index>=membershipIds.length)return
  activeIndex.current=index
  setActive(index);center(index,true)
 }
 const track=()=>{
  const container=rail.current
  if(!container||container.scrollWidth<=container.clientWidth)return
  const midpoint=container.scrollLeft+container.clientWidth/2
  const distances=Array.from(container.children,node=>Math.abs((node as HTMLElement).offsetLeft+(node as HTMLElement).offsetWidth/2-midpoint))
  activeIndex.current=distances.indexOf(Math.min(...distances))
  setActive(activeIndex.current)
 }
 return <div className="wf-memberships">
  {!onSelect&&<header><h2>{es?'Planes desde $30 al mes':'Plans from $30 per month'}</h2><p>{es?`${membershipTrialDays} días de Premium gratis. Al terminar, elige tu plan mensual o anual.`:`${membershipTrialDays} days of Premium free. Choose your monthly or annual plan when the trial ends.`}</p></header>}
  <div className="membership-interval" role="group" aria-label={es?'Periodo de facturación':'Billing interval'}>
   <button type="button" aria-pressed={interval==='monthly'} onClick={()=>changeInterval('monthly')}>{es?'Mensual':'Monthly'}</button>
   <button type="button" aria-pressed={interval==='annual'} onClick={()=>changeInterval('annual')}>{es?'Anual':'Annual'} <small>{es?'Ahorra 2 meses':'Save 2 months'}</small></button>
  </div>
  <div className="pricing-wrapper" ref={rail} onScroll={track} role="region" aria-label={es?'Comparar planes':'Compare plans'}>
   {membershipIds.map(tier=>{
    const plan=membershipPlans[tier], name=es?plan.name:plan.nameEn
    const [description,...features]=descriptions[lang][tier]
    const raised=!reduced&&hovered===tier
    return <article className="card-slot" key={tier} onMouseEnter={()=>setHovered(tier)} onMouseLeave={()=>setHovered(null)}>
     <motion.div className="pricing-card-wrapper" initial={false} animate={{y:raised?-20:0,paddingTop:raised?34:2.5,paddingLeft:raised?4.5:2.5,paddingRight:raised?4.5:2.5,paddingBottom:raised?4.5:2.5}} transition={{type:'spring',stiffness:380,damping:28}}>
      <div className="card-top-banner" aria-hidden="true"><span className="top-banner-text">{name}</span></div>
      <div className="pricing-card">
       <div className="card-header"><TeamLogoIcon/>{tier==='standard'&&<span className="popular-badge">{es?'Recomendado':'Recommended'}</span>}</div>
       <div className="card-title-group"><h3 className="card-plan-name">{name}</h3><p className="card-plan-desc">{description}</p></div>
       <div className="card-pricing-group"><strong className="card-price">${plan[interval]}</strong><span className="card-billing-period">USD / {interval==='monthly'?(es?'mes':'month'):(es?'año':'year')}</span></div>
       <button type="button" className="card-cta-button" disabled={disabled} aria-expanded={onSelect?undefined:expanded===tier} onClick={()=>onSelect?onSelect({tier,interval}):setExpanded(expanded===tier?null:tier)}>
        {onSelect?(es?`Elegir ${name}`:`Choose ${name}`):expanded===tier?(es?'Ocultar detalles':'Hide details'):(es?'Ver detalles':'View details')}
       </button>
       <ul className="card-features-list">{features.map(feature=><li className="feature-item" key={feature}><span className="feature-icon-wrapper"><GreenCheckIcon/></span><span className="feature-text">{feature}</span></li>)}</ul>
       {expanded===tier&&!onSelect&&<p className="membership-detail">{es?'Elige este plan cuando termine tu prueba de Premium.':'Choose this plan when your Premium trial ends.'}</p>}
      </div>
     </motion.div>
    </article>
   })}
  </div>
  <div className="membership-nav" role="group" aria-label={es?'Navegar planes':'Browse plans'}>
   <button type="button" disabled={active===0} onClick={()=>navigate(active-1)} aria-label={es?'Plan anterior':'Previous plan'}>‹</button>
   {membershipIds.map((tier,index)=><button type="button" key={tier} aria-label={es?membershipPlans[tier].name:membershipPlans[tier].nameEn} aria-current={active===index?'true':undefined} onClick={()=>navigate(index)}><i/></button>)}
   <button type="button" disabled={active===2} onClick={()=>navigate(active+1)} aria-label={es?'Plan siguiente':'Next plan'}>›</button>
  </div>
 </div>
}
