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

const TemplateParityReview = __WF_PREVIEW_REVIEW__ ? lazy(() => import('./TemplateParityReview')) : null

function RouteLoading(){
  return <main className="route-loading" role="status" aria-live="polite"><span/><b>Loading WebFactory…</b></main>
}

function RouteView({children}:{children:ReactNode}){
  return <Suspense fallback={<RouteLoading/>}>{children}</Suspense>
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
  const [lang,setLang]=useState<Language>('en')
  const t=content[lang]
  useEffect(()=>{
    if (!/^\/templates\//.test(window.location.pathname)) document.documentElement.lang=lang
  },[lang])

  const templateMatch = window.location.pathname.match(/^\/templates\/([^/]+)\/?$/)
    const templatesRoute = /^\/templates\/?$/.test(window.location.pathname)
    const clientAdminRoute = /^\/client-admin\/?$/.test(window.location.pathname)
  const webFactoryAdminRoute = /^\/webfactory-admin\/?$/.test(window.location.pathname)
  const identityInviteRoute = /^#invite_token=/.test(window.location.hash)
  const identityRecoveryRoute = /^#recovery_token=/.test(window.location.hash) || /^\/password-recovery\/?$/.test(window.location.pathname)
  const clientSiteMatch = window.location.pathname.match(/^\/sites\/([^/]+)\/?$/)
  const paymentLinkMatch = window.location.pathname.match(/^\/pay\/([^/]+)\/([^/]+)\/?$/)
  const trackingMatch = window.location.pathname.match(/^\/track\/([^/]+)\/?$/)
  const builderRoute = /^\/builder\/?$/.test(window.location.pathname)
  const builderEditSiteId = builderRoute ? new URLSearchParams(window.location.search).get('edit') || '' : ''
  const privacyRoute = /^\/privacy\/?$/.test(window.location.pathname)
  const termsRoute = /^\/terms\/?$/.test(window.location.pathname)
  const refundRoute = /^\/refund-policy\/?$/.test(window.location.pathname)

  if (TemplateParityReview && /^\/template-parity-preview\/?$/.test(window.location.pathname)) return <RouteView><TemplateParityReview/></RouteView>
  if (PreviewReviewPage && /^\/preview-review\/?$/.test(window.location.pathname)) return <RouteView><PreviewReviewPage lang={lang} setLang={setLang} /></RouteView>
  if (/^\/chatgpt\/?$/.test(window.location.pathname)) return <RouteView><MfaGate><ChatgptControlPage lang={lang} setLang={setLang} /></MfaGate></RouteView>
  if (identityRecoveryRoute) return <RouteView><PasswordRecoveryPage /></RouteView>
  if (privacyRoute) return <RouteView><LegalPage kind="privacy" /></RouteView>
  if (termsRoute) return <RouteView><LegalPage kind="terms" /></RouteView>
  if (refundRoute) return <RouteView><LegalPage kind="refund" /></RouteView>
  if (webFactoryAdminRoute || identityInviteRoute) return <RouteView><MfaGate><WebFactoryAdminPage /></MfaGate></RouteView>
  if (clientAdminRoute) return <RouteView><MfaGate><ClientAdminPage /></MfaGate></RouteView>
  if (clientSiteMatch) return <RouteView><ClientStorefront slug={decodeURIComponent(clientSiteMatch[1])} /></RouteView>
  if (paymentLinkMatch) return <RouteView><PaymentLinkPage slug={decodeURIComponent(paymentLinkMatch[1])} token={decodeURIComponent(paymentLinkMatch[2])} /></RouteView>
  if (trackingMatch) return <RouteView><OrderTrackingPage token={decodeURIComponent(trackingMatch[1])} /></RouteView>
  if (templateMatch) return <RouteView><TemplatePreview slug={templateMatch[1]} /></RouteView>
  if (templatesRoute) return <><header className="header"><a href="/" className="logo"><AdaptiveLogo alt="WebFactory PR"/></a><div className="header-actions"><a className="btn secondary desktop-cta" href="/client-admin">Log In</a><a className="btn secondary desktop-cta" href="/">{lang==='es'?'Volver al inicio':'Back to home'}</a><div className="langs"><button className={lang==='en'?'active':''} onClick={()=>setLang('en')}>EN</button><button className={lang==='es'?'active':''} onClick={()=>setLang('es')}>ES</button><ThemeToggle/></div></div></header><RouteView><TemplatesPage lang={lang}/></RouteView></>
  if (builderRoute) return <><header className="header"><a href="/" className="logo"><AdaptiveLogo alt="WebFactory PR"/></a><div className="header-actions"><a className="btn secondary desktop-cta" href="/client-admin">Log In</a><a className="btn secondary desktop-cta" href="/">{lang==='es'?'Volver al inicio':'Back to home'}</a><div className="langs"><button className={lang==='en'?'active':''} onClick={()=>setLang('en')}>EN</button><button className={lang==='es'?'active':''} onClick={()=>setLang('es')}>ES</button><ThemeToggle/></div></div></header><main className="standalone-builder"><section className="section white builder"><div className="shell">{builderEditSiteId?<RouteView><SiteRedesignBuilder lang={lang} siteId={builderEditSiteId}/></RouteView>:<><div className="builder-head"><Heading data={t.builder}/><div className="builder-price"><strong>7 días</strong><span>{lang==='es'?'gratis · sin tarjeta':'free · no card'}</span></div></div><RouteView><WebFactoryBuilder lang={lang}/></RouteView></>}</div></section></main></>

  if(window.location.pathname!=='/')return <main className="cs-state"><h1>404 · {lang==='es'?'Página no encontrada':'Page not found'}</h1><p>{lang==='es'?'El enlace no existe o cambió.':'This link does not exist or has changed.'}</p><a className="btn" href="/">{lang==='es'?'Volver a WebFactory PR':'Return to WebFactory PR'}</a></main>
  return <HomePage lang={lang} setLang={setLang}/>
}

export default App
