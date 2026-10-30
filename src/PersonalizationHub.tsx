import {useState} from 'react'
import {Palette, MonitorSmartphone, ScanLine, Globe2} from 'lucide-react'
import {PortalPanel} from './PortalPanel'
import {usePortalLanguage} from './portal-language'
import {useWebFactoryTheme} from './theme'
import {FeedbackPreferences} from './feedback/FeedbackPreferences'
import DashboardAppearance from './glassy-dashboard/Appearance'
import KioskAppearanceSettings,{type KioskAppearanceSite} from './kiosk-skins/KioskAppearanceSettings'
import './personalization-hub.css'

type Area='portal'|'kiosk'|'website'
type Props={site:KioskAppearanceSite;lang:'es'|'en';canManageKiosk:boolean;canEditWebsite:boolean;onOpenBuilder:()=>void}

/**
 * One discoverable entry point for visual preferences.
 * Individual settings keep their existing, separately authorized storage:
 * dashboard/POS appearance is personal; kiosk appearance is tenant-scoped.
 */
export default function PersonalizationHub({site,lang,canManageKiosk,canEditWebsite,onOpenBuilder}:Props){
 const es=lang==='es',t=(a:string,b:string)=>es?a:b
 const [area,setArea]=useState<Area>('portal')
 const [,setLang]=usePortalLanguage()
 const {theme,setTheme}=useWebFactoryTheme()
 const items:Array<{id:Area;title:string;hint:string;Icon:typeof Palette}>=[
  {id:'portal',title:t('Portal y POS','Portal and POS'),hint:t('Mi apariencia y preferencias','My appearance and preferences'),Icon:MonitorSmartphone},
  ...(canManageKiosk?[{id:'kiosk' as const,title:t('Kiosco','Kiosk'),hint:t('Apariencia del negocio','Business appearance'),Icon:ScanLine}]:[]),
  ...(canEditWebsite?[{id:'website' as const,title:t('Página web','Website'),hint:t('Diseño de tu página pública','Public website design'),Icon:Globe2}]:[])
 ]
 return <section className="wf-personalization" aria-labelledby="wf-personalization-title">
  <header className="wf-personalization-heading">
   <span className="wf-personalization-symbol" aria-hidden="true"><Palette size={21}/></span>
   <div><h1 id="wf-personalization-title">{t('Personalización','Personalization')}</h1><p>{t('Todos los controles de apariencia en un solo lugar. La vista previa no guarda cambios hasta que lo confirmes.','All appearance controls in one place. Previewing never saves changes until you confirm.')}</p></div>
  </header>
  <nav className="wf-personalization-areas" aria-label={t('Elegir área de personalización','Choose customization area')}>
   {items.map(({id,title,hint,Icon})=><button key={id} type="button" aria-current={area===id?'page':undefined} onClick={()=>setArea(id)}><Icon size={20} aria-hidden="true"/><span><strong>{title}</strong><small>{hint}</small></span></button>)}
  </nav>
  {area==='portal'&&<div className="wf-personalization-panel" role="region" aria-label={t('Portal y POS','Portal and POS')}>
   <PortalPanel className="ca-panel"><h2>{t('Preferencias personales','Personal preferences')}</h2><p>{t('Estos ajustes corresponden a tu cuenta y dispositivo; no cambian la apariencia pública del negocio.','These settings belong to your account and device; they do not change the public business appearance.')}</p>
    <div className="ca-grid"><label>{t('Idioma','Language')}<select value={lang} onChange={e=>setLang(e.target.value as 'es'|'en')}><option value="es">Español</option><option value="en">English</option></select></label><label>{t('Modo de apariencia','Appearance mode')}<select value={theme} onChange={e=>setTheme(e.target.value as 'dark'|'light')}><option value="dark">{t('Oscuro','Dark')}</option><option value="light">{t('Claro','Light')}</option></select></label></div>
    <h3>{t('Sonido y respuesta táctil de este dispositivo','Sound and touch feedback on this device')}</h3><FeedbackPreferences lang={lang}/>
   </PortalPanel>
   <DashboardAppearance lang={lang}/>
   <p className="wf-personalization-note">{t('El diseño y relieve del cajero reutilizan la apariencia del portal. No es necesario editarlo por separado desde el POS.','Cashier styling and depth reuse the portal appearance. You do not need to edit it separately in POS.')}</p>
  </div>}
  {area==='kiosk'&&canManageKiosk&&<div className="wf-personalization-panel" role="region" aria-label={t('Kiosco','Kiosk')}><KioskAppearanceSettings key={site.siteId} site={site} lang={lang}/></div>}
  {area==='website'&&canEditWebsite&&<PortalPanel className="ca-panel wf-personalization-panel"><h2>{t('Diseño de tu página pública','Public website design')}</h2><p>{t('La edición completa de la página utiliza el Builder existente. Puedes abrirlo desde aquí sin duplicar sus controles ni modificar tus preferencias personales.','Full website editing uses the existing Builder. Open it here without duplicating its controls or changing your personal preferences.')}</p><button type="button" onClick={onOpenBuilder}>{t('Abrir editor de página','Open website editor')}</button></PortalPanel>}
 </section>
}
