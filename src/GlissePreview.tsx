import {useLayoutEffect, useRef, useState} from 'react'
import {Button, Glass, Input, Menu, SearchField, SegmentedControl, Slider, Switch, TabBar} from 'glisse'
import {LayoutGrid, List, RotateCcw} from 'lucide-react'
import {AdaptiveLogo, ThemeToggle, useWebFactoryTheme} from './theme'
import {usePortalLanguage} from './portal-language'
import './glisse-preview.css'
import './glisse-integration.css'
import {DASHBOARD_WALLPAPERS} from '../shared/dashboard-appearance.mjs'

const components=['Button','Glass','Input','SearchField','Menu','SegmentedControl','Slider','Switch','TabBar']

/** Preview-only controls: no tenant, commerce or authentication requests. */
export default function GlissePreview(){
 const [lang,setLang]=usePortalLanguage()
 const {theme,setTheme}=useWebFactoryTheme()
 const t=(es:string,en:string)=>lang==='es'?es:en
 const [title,setTitle]=useState('WebFactory PR')
 const [search,setSearch]=useState('')
 const [radius,setRadius]=useState(16)
 const [layout,setLayout]=useState('cards')
 const [tab,setTab]=useState('controls')
 const [count,setCount]=useState(0)
 const [wallpaper,setWallpaper]=useState(DASHBOARD_WALLPAPERS[0].src)
 const root=useRef<HTMLElement>(null)
 const matches=components.filter(name=>name.toLowerCase().includes(search.trim().toLowerCase()))
 // Glisse 0.5.0 hardcodes its search clear label; localize only this instance.
 useLayoutEffect(()=>{
  root.current?.querySelector('.lg-input-clear')?.setAttribute('aria-label',t('Borrar búsqueda','Clear search'))
 },[search,lang])
 function reset(){setTitle('WebFactory PR');setSearch('');setRadius(16);setLayout('cards');setTab('controls');setCount(0);setWallpaper(DASHBOARD_WALLPAPERS[0].src)}
 return <main className="wf-glisse-preview wf-glisse-scope" data-theme={theme} ref={root}>
  <header className="wf-glisse-header">
   <a href="/" aria-label={t('Ir al Marketplace','Go to Marketplace')}><AdaptiveLogo alt="WebFactory PR"/></a>
   <div className="wf-glisse-actions"><button type="button" onClick={()=>setLang(lang==='es'?'en':'es')}>{lang==='es'?'English':'Español'}</button><ThemeToggle lang={lang}/><a href="/client-admin">{t('Mi negocio','My business')}</a></div>
  </header>
  <h1>{t('Prueba de controles Glisse','Glisse controls preview')}</h1>
  <p>{t('Glisse 0.5.0 · Solo preview. El tema usa tu preferencia real de este navegador. Los demás cambios son locales a esta prueba y se reinician al recargar.','Glisse 0.5.0 · Preview only. Theme uses your real preference in this browser. All other changes are local to this test and reset on reload.')}</p>
  <div className="wf-glisse-grid">
   <section aria-labelledby="glisse-glass" className="wf-glisse-visual"><h2 id="glisse-glass">Glass</h2><p>{t('Cristal real sobre los fondos existentes de WebFactory. En Personalización los controles ya editan los ajustes del portal y los diseños del kiosco.','Real glass over existing WebFactory wallpapers. In Personalization, controls now edit portal settings and kiosk designs.')}</p><label htmlFor="glisse-wallpaper">{t('Fondo para visualizar el cristal','Wallpaper for viewing glass')}</label><select id="glisse-wallpaper" value={wallpaper} onChange={event=>setWallpaper(event.target.value)}>{DASHBOARD_WALLPAPERS.map(item=><option key={item.id} value={item.src}>{lang==='es'?item.nameEs:item.nameEn}</option>)}</select><div className="wf-glisse-live-scene"><div className="wf-glisse-live-backdrop" data-glisse-backdrop aria-hidden="true" style={{backgroundImage:`url(${JSON.stringify(wallpaper)})`}}/><Glass className="wf-glisse-result wf-glisse-live-card" style={{borderRadius:radius}} data-layout={layout} data-testid="glass-result"><strong>{title||t('Sin título','Untitled')}</strong><p>{tab==='controls'?t('Los controles actualizan esta muestra.','Controls update this sample.'):t('Este es el resultado local de la prueba.','This is the local test result.')}</p><Button variant="filled" onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{t('Cambiar tema en cristal','Change theme on glass')}</Button></Glass></div></section>
   <section aria-labelledby="glisse-switch"><h2 id="glisse-switch">Switch</h2><div className="wf-glisse-row"><span id="glisse-theme-label">{t('Modo oscuro','Dark mode')}</span><Switch checked={theme==='dark'} onCheckedChange={checked=>setTheme(checked?'dark':'light')} aria-labelledby="glisse-theme-label"/></div><p>{t('Sincronizado con el control de tema de la cabecera.','Synchronized with the header theme control.')}</p><Switch disabled checked={false} aria-label={t('Interruptor deshabilitado','Disabled switch')}/></section>
   <section aria-labelledby="glisse-input"><h2 id="glisse-input">Input + Button</h2><form onSubmit={event=>{event.preventDefault();setCount(value=>value+1)}}><label htmlFor="glisse-title">{t('Título de la tarjeta de prueba','Test card title')}</label><Input id="glisse-title" value={title} onValueChange={setTitle} required maxLength={80}/><div className="wf-glisse-actions"><Button type="submit" variant="filled">{t('Aplicar a la muestra','Apply to sample')}</Button><Button disabled>{t('Deshabilitado','Disabled')}</Button></div></form><p role="status">{t('Aplicaciones locales','Local applications')}: <output data-testid="apply-count">{count}</output></p></section>
   <section aria-labelledby="glisse-search"><h2 id="glisse-search">SearchField</h2><label htmlFor="glisse-query">{t('Buscar un componente de esta biblioteca','Find a component in this library')}</label><SearchField id="glisse-query" value={search} onValueChange={setSearch} placeholder={t('Buscar componentes','Search components')}/><p role="status" data-testid="search-count">{matches.length} / {components.length}</p><ul data-testid="search-results">{matches.map(name=><li key={name}>{name}</li>)}</ul>{!matches.length&&<p>{t('No hay coincidencias.','No matches.')}</p>}</section>
   <section aria-labelledby="glisse-slider"><h2 id="glisse-slider">Slider</h2><label htmlFor="glisse-radius">{t('Radio de la tarjeta de muestra','Sample card radius')}: <output data-testid="radius-value">{radius} px</output></label><Slider id="glisse-radius" min={0} max={32} step={1} value={radius} onValueChange={setRadius}/><Slider disabled value={16} aria-label={t('Slider deshabilitado','Disabled slider')}/></section>
   <section aria-labelledby="glisse-segments"><h2 id="glisse-segments">SegmentedControl</h2><SegmentedControl aria-label={t('Distribución de la muestra','Sample layout')} value={layout} onValueChange={setLayout} items={[{value:'cards',label:t('Tarjetas','Cards')},{value:'list',label:t('Lista','List')}]}/><p data-testid="layout-value">{layout==='cards'?t('Vista de tarjetas','Card view'):t('Vista de lista','List view')}</p></section>
   <section aria-labelledby="glisse-tabs"><h2 id="glisse-tabs">TabBar</h2><TabBar aria-label={t('Panel de muestra','Sample panel')} value={tab} onValueChange={setTab} items={[{value:'controls',label:t('Controles','Controls'),icon:<LayoutGrid size={20} aria-hidden="true"/>},{value:'result',label:t('Resultado','Result'),icon:<List size={20} aria-hidden="true"/>}]}/><p data-testid="tab-value">{tab==='controls'?t('Panel de controles seleccionado','Controls panel selected'):t('Panel de resultado seleccionado','Result panel selected')}</p></section>
   <section aria-labelledby="glisse-menu"><h2 id="glisse-menu">Menu</h2><div className="wf-glisse-row"><span>{t('Restablece únicamente los datos de esta muestra.','Reset only this sample data.')}</span><Menu aria-label={t('Acciones de la muestra','Sample actions')} items={[{label:t('Restablecer muestra','Reset sample'),icon:<RotateCcw size={18} aria-hidden="true"/>,onSelect:reset},'separator',{label:t('Acción deshabilitada','Disabled action'),disabled:true}]}/></div></section>

  </div>
 </main>
}
