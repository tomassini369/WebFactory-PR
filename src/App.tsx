import PortalLoadingCard from './PortalLoadingCard'
import './public-route-loading.css'
import PortalReturnHome from './PortalReturnHome'
import {usePortalNavigation} from './portal-navigation'
import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react'
import { AdaptiveLogo, ThemeToggle } from './theme'
import HomePage from './HomePage'
const MfaGate = lazy(() => import('./MfaAccess').then(module => ({default:module.MfaGate})))
import { useFeedbackExperience } from './feedback/FeedbackExperience'

const TemplatePreview = lazy(() => import('./TemplatePreview'))
const TemplatesPage = lazy(() => import('./TemplatesPage'))
const WebFactoryBuilder = lazy(() => import('./WebFactoryBuilder'))
const ChatgptControlPage = lazy(() => import('./ChatgptControlPage'))
const ClientAdminPage = lazy(() => import('./ClientAdminPage'))
const ClientStorefront = lazy(() => import('./ClientStorefront'))
const WebFactoryAdminPage = lazy(() => import('./WebFactoryAdminPage'))
const PasswordRecoveryPage = lazy(() => import('./PasswordRecoveryPage'))
const LegalPage = lazy(() => import('./LegalPage'))
const PaymentLinkPage = lazy(() => import('./PaymentLinkPage'))
const OrderTrackingPage = lazy(() => import('./OrderTrackingPage'))
const SiteRedesignBuilder = lazy(() => import('./SiteRedesignBuilder'))
// Preview-only visual comparison. Compiled out of production builds (see vite.config.ts).
const PreviewReviewPage = typeof __WF_PREVIEW_REVIEW__ !== 'undefined' && __WF_PREVIEW_REVIEW__ ? lazy(() => import('./PreviewReviewPage')) : null

const ShadcnPreview = __WF_PREVIEW_REVIEW__ ? lazy(() => import('./ShadcnPreview')) : null

const TemplateParityReview = __WF_PREVIEW_REVIEW__ ? lazy(() => import('./TemplateParityReview')) : null

function RouteView({children,portal=false}:{children:ReactNode;portal?:boolean}){
  const es=document.documentElement.lang==='es'
  const fallback=portal?<PortalLoadingCard lang={es?'es':'en'}/>:<div className="public-route-loading" aria-busy="true"><div aria-hidden="true"><span/><span/></div><p role="status">{es?'Cargando página…':'Loading page…'}</p></div>
  return <Suspense fallback={fallback}>{children}</Suspense>
}

type Language = 'es' | 'en'

const content = {
  es: {builder:['WEBFACTORY BUILDER + AI','Avanzado por dentro. Fácil por fuera.','Configura tu negocio paso a paso o pídele a Factory AI que proponga estructura, contenido bilingüe, catálogo y equipo dentro del mismo Builder.']},
  en: {builder:['WEBFACTORY BUILDER + AI','Powerful underneath. Simple on the surface.','Configure your business step by step or ask Factory AI to propose structure, bilingual content, catalog and team inside the same Builder.']},
}

function Heading({data,invert=false}:{data:string[],invert?:boolean}) {
  return <div className={'heading '+(invert?'invert':'')}><p>{data[0]}</p><h2>{data[1]}</h2>{data[2]&&<span>{data[2]}</span>}</div>
}

function App(){
  useFeedbackExperience()
  const pathname=usePortalNavigation()
  const [lang,setLang]=useState<Language>('en')
  const t=content[lang]
  useEffect(()=>{
    if (!/^\/templates\//.test(pathname)) document.documentElement.lang=lang
    if(pathname==='/'||/^\/templates\/?$/.test(pathname))document.title='WebFactory PR | Plataforma de comercio y reservas'
  },[lang,pathname])

  const templateMatch = pathname.match(/^\/templates\/([^/]+)\/?$/)
    const templatesRoute = /^\/templates\/?$/.test(pathname)
    const clientAdminRoute = /^\/client-admin\/?$/.test(pathname)
  const webFactoryAdminRoute = /^\/webfactory-admin\/?$/.test(pathname)
  const identityInviteRoute = /^#invite_token=/.test(window.location.hash)
  const identityRecoveryRoute = /^#recovery_token=/.test(window.location.hash) || /^\/password-recovery\/?$/.test(pathname)
  const clientSiteMatch = pathname.match(/^\/sites\/([^/]+)\/?$/)
  const paymentLinkMatch = pathname.match(/^\/pay\/([^/]+)\/([^/]+)\/?$/)
  const trackingMatch = pathname.match(/^\/track\/([^/]+)\/?$/)
  const builderRoute = /^\/builder\/?$/.test(pathname)
  const builderEditSiteId = builderRoute ? new URLSearchParams(window.location.search).get('edit') || '' : ''
  const privacyRoute = /^\/privacy\/?$/.test(pathname)
  const termsRoute = /^\/terms\/?$/.test(pathname)
  const refundRoute = /^\/refund-policy\/?$/.test(pathname)

  if (ShadcnPreview && /^\/shadcn-preview\/?$/.test(pathname)) return <RouteView><ShadcnPreview/></RouteView>
  if (TemplateParityReview && /^\/template-parity-preview\/?$/.test(pathname)) return <RouteView><TemplateParityReview/></RouteView>
  if (PreviewReviewPage && /^\/preview-review\/?$/.test(pathname)) return <RouteView><PreviewReviewPage lang={lang} setLang={setLang} /></RouteView>
  if (/^\/chatgpt\/?$/.test(pathname)) return <RouteView portal><MfaGate><ChatgptControlPage lang={lang} setLang={setLang} /></MfaGate></RouteView>
  if (identityRecoveryRoute) return <RouteView portal><PasswordRecoveryPage /></RouteView>
  if (privacyRoute) return <RouteView><LegalPage kind="privacy" /></RouteView>
  if (termsRoute) return <RouteView><LegalPage kind="terms" /></RouteView>
  if (refundRoute) return <RouteView><LegalPage kind="refund" /></RouteView>
  if (webFactoryAdminRoute || identityInviteRoute) return <RouteView portal><MfaGate><WebFactoryAdminPage /></MfaGate></RouteView>
  if (clientAdminRoute) return <RouteView portal><MfaGate><ClientAdminPage /></MfaGate></RouteView>
  if (clientSiteMatch) return <RouteView><ClientStorefront slug={decodeURIComponent(clientSiteMatch[1])} /></RouteView>
  if (paymentLinkMatch) return <RouteView><PaymentLinkPage slug={decodeURIComponent(paymentLinkMatch[1])} token={decodeURIComponent(paymentLinkMatch[2])} /></RouteView>
  if (trackingMatch) return <RouteView><OrderTrackingPage token={decodeURIComponent(trackingMatch[1])} /></RouteView>
  if (templateMatch) return <RouteView><TemplatePreview slug={templateMatch[1]} /></RouteView>
  if (templatesRoute) return <><header className="header"><a href="/" className="logo"><AdaptiveLogo alt="WebFactory PR"/></a><div className="header-actions"><a className="btn secondary desktop-cta" href="/client-admin">Log In</a><PortalReturnHome lang={lang}/><div className="langs"><button className={lang==='en'?'active':''} onClick={()=>setLang('en')}>EN</button><button className={lang==='es'?'active':''} onClick={()=>setLang('es')}>ES</button><ThemeToggle/></div></div></header><RouteView><TemplatesPage lang={lang}/></RouteView></>
  if (builderRoute) return <><header className="header wf-creation-header"><a href="/" className="logo"><AdaptiveLogo alt="WebFactory PR"/></a><div className="header-actions"><a className="btn secondary desktop-cta" href="/client-admin">Log In</a><a className="wf-creation-home" href="/" aria-label={lang==='es'?'Volver a WebFactory PR':'Return to WebFactory PR'} title={lang==='es'?'Volver a WebFactory PR':'Return to WebFactory PR'}><svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m3 10 9-7 9 7"/><path d="M5 9v11h5v-6h4v6h5V9"/></svg></a><div className="langs"><button className={lang==='en'?'active':''} onClick={()=>setLang('en')}>EN</button><button className={lang==='es'?'active':''} onClick={()=>setLang('es')}>ES</button><ThemeToggle/></div></div></header><main className="standalone-builder"><section className="section white builder"><div className="shell">{builderEditSiteId?<RouteView><SiteRedesignBuilder lang={lang} siteId={builderEditSiteId}/></RouteView>:<><div className="builder-head"><Heading data={t.builder}/><div className="builder-price"><strong>7 días</strong><span>{lang==='es'?'gratis · sin tarjeta':'free · no card'}</span></div></div><RouteView><WebFactoryBuilder lang={lang}/></RouteView></>}</div></section></main></>

  if(pathname!=='/')return <main className="cs-state"><h1>404 · {lang==='es'?'Página no encontrada':'Page not found'}</h1><p>{lang==='es'?'El enlace no existe o cambió.':'This link does not exist or has changed.'}</p><a className="btn" href="/">{lang==='es'?'Volver a WebFactory PR':'Return to WebFactory PR'}</a></main>
  return <HomePage lang={lang} setLang={setLang}/>
}

export default App
