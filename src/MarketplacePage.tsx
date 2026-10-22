import {useEffect,useRef,useState,type FormEvent} from 'react'
import {ArrowUpRight,BriefcaseBusiness,CarFront,Flower2,HeartPulse,Map,MapPin,Newspaper,PawPrint,Search,Scissors,UtensilsCrossed,Store,Tag,UserRound,X} from 'lucide-react'
import {AdaptiveLogo,ThemeToggle} from './theme'
import {FeedbackPreferences} from './feedback/FeedbackPreferences'
import {emptyMarketplaceFilters,marketplaceCategories,marketplaceQuery,municipalities,normalizeMarketplaceFilters,readMarketplaceFilters,type MarketplaceFilters} from './marketplace-model'
import './marketplace.css'

type Language='es'|'en'
const categoryIcons=[Scissors,Flower2,UtensilsCrossed,Store,HeartPulse,BriefcaseBusiness,CarFront,PawPrint]
const copy={
 es:{
  skip:'Ir al contenido',create:'Crear mi página',login:'Portal del negocio',nav:'Navegación de Marketplace',explore:'Explorar',news:'Novedades',offers:'Promociones',
  kicker:'Puerto Rico, de cerca.',title:'Descubre negocios',accent:'cerca de ti.',intro:'Servicios, tiendas y lugares para tu día a día. Empieza por lo que buscas y el municipio que quieres explorar.',
  searchLabel:'Buscar negocios y servicios',query:'¿Qué estás buscando?',placeholder:'Una barbería, un café, un servicio…',municipality:'Municipio',allMunicipalities:'Todo Puerto Rico',search:'Explorar',searchNote:'El directorio está en preparación. Todavía no hay negocios publicados para explorar.',
  categories:'Explora por categoría',all:'Todas',selected:'Selección actual',clear:'Limpiar filtros',featured:'Negocios destacados',featuredIntro:'Un espacio para descubrir lo que se hace cerca de ti.',emptyTitle:'Este espacio espera a los negocios de aquí.',emptyText:'Aún no hay negocios disponibles en el directorio. Cuando estén publicados, podrás encontrarlos aquí.',filteredTitle:'Tu selección está lista.',filteredText:'El directorio todavía está en preparación. Aún no hay negocios que mostrar con estos filtros.',
  localTitle:'Tu municipio, tu comunidad.',localText:'Elige un municipio para enfocar lo que quieres descubrir.',mapNote:'El mapa interactivo estará disponible en una próxima fase.',
  feedTitle:'Lo nuevo en tu comunidad',feedIntro:'Novedades de los negocios, en un solo lugar.',feedEmpty:'Todavía no hay publicaciones.',feedText:'Aquí aparecerán las novedades cuando los negocios comiencen a compartirlas.',
  offersTitle:'Promociones locales',offersIntro:'Propuestas para aprovechar cerca de ti.',offersEmpty:'Aún no hay promociones publicadas.',offersText:'Las promociones aparecerán con sus condiciones y vigencia cuando estén disponibles.',
  ownerKicker:'¿Tienes un negocio?',ownerTitle:'De tu idea a tu propia página.',ownerText:'Conoce WebFactory: tu website, catálogo, citas y ventas, conectados en una sola plataforma.',ownerLink:'Conocer WebFactory',footer:'Conecta con lo que se hace aquí.',legal:'Información y enlaces',privacy:'Privacidad',terms:'Términos',refunds:'Reembolsos',photoAlt:'La Fortaleza y el Paseo de la Princesa en el Viejo San Juan, Puerto Rico',photoCredit:'Foto de Pedro Colon en Pexels',photoError:'No se pudo cargar la fotografía. Puedes seguir explorando.',searchSummary:'Filtros seleccionados',
 },
 en:{
  skip:'Skip to content',create:'Create my website',login:'Business portal',nav:'Marketplace navigation',explore:'Explore',news:'Updates',offers:'Promotions',
  kicker:'A closer look at Puerto Rico.',title:'Discover businesses',accent:'near you.',intro:'Services, shops and places for your everyday life. Start with what you need and the municipality you want to explore.',
  searchLabel:'Search businesses and services',query:'What are you looking for?',placeholder:'A barbershop, a café, a service…',municipality:'Municipality',allMunicipalities:'All Puerto Rico',search:'Explore',searchNote:'The directory is being prepared. There are no published businesses to explore yet.',
  categories:'Explore by category',all:'All',selected:'Current selection',clear:'Clear filters',featured:'Featured businesses',featuredIntro:'A place to discover what is happening close to you.',emptyTitle:'A space for the businesses around you.',emptyText:'There are no businesses in the directory yet. You will find them here when they are published.',filteredTitle:'Your selection is ready.',filteredText:'The directory is still being prepared. There are no businesses to display with these filters yet.',
  localTitle:'Your town. Your community.',localText:'Choose a municipality to focus on what you want to discover.',mapNote:'An interactive map will be available in a future phase.',
  feedTitle:'New in your community',feedIntro:'Updates from local businesses, in one place.',feedEmpty:'No posts yet.',feedText:'Updates will appear here when businesses start sharing them.',
  offersTitle:'Local promotions',offersIntro:'Things to look forward to close to home.',offersEmpty:'No promotions published yet.',offersText:'Promotions will show their terms and dates when they become available.',
  ownerKicker:'Have a business?',ownerTitle:'From your idea to your own website.',ownerText:'Meet WebFactory: your website, catalog, bookings and sales, connected in one platform.',ownerLink:'Meet WebFactory',footer:'Connect with what is made here.',legal:'Information and links',privacy:'Privacy',terms:'Terms',refunds:'Refunds',photoAlt:'La Fortaleza and Paseo de la Princesa in Old San Juan, Puerto Rico',photoCredit:'Photo by Pedro Colon on Pexels',photoError:'The photograph could not load. You can keep exploring.',searchSummary:'Selected filters',
 },
}
export default function MarketplacePage({lang,setLang}:{lang:Language;setLang:(lang:Language)=>void}){
 const t=copy[lang]
 const [filters,setFilters]=useState(()=>readMarketplaceFilters(window.location.search))
 const [draft,setDraft]=useState(filters)
 const [photoFailed,setPhotoFailed]=useState(false)
 const results=useRef<HTMLHeadingElement>(null)
 const queryInput=useRef<HTMLInputElement>(null)
 const filtered=Boolean(filters.q||filters.municipio||filters.categoria)
 const selectedCategory=marketplaceCategories.find(item=>item.id===filters.categoria)
 useEffect(()=>{
  const restore=()=>{const value=readMarketplaceFilters(window.location.search);setFilters(value);setDraft(value)}
  window.addEventListener('popstate',restore)
  return()=>window.removeEventListener('popstate',restore)
 },[])
 function apply(value:MarketplaceFilters,scroll=true){
  const next=normalizeMarketplaceFilters(value)
  setFilters(next);setDraft(next)
  window.history.replaceState(window.history.state,'','/'+marketplaceQuery(next)+(scroll?'#descubrir':''))
  if(scroll)requestAnimationFrame(()=>{results.current?.focus({preventScroll:true});results.current?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})})
 }
 const submit=(event:FormEvent)=>{event.preventDefault();apply(draft)}
 return <div className="mk-root">
  <a className="mk-skip" href="#marketplace-content">{t.skip}</a>
  <header className="mk-header"><div className="mk-shell mk-header-inner">
   <a className="mk-brand" href="/" aria-label="WebFactory PR Marketplace"><AdaptiveLogo alt="WebFactory PR"/></a>
   <a className="mk-create-link" href="/crear">{t.create}<ArrowUpRight aria-hidden="true" size={17}/></a>
   <nav className="mk-navigation" aria-label={t.nav}><a href="#descubrir">{t.explore}</a><a className="mk-desktop-nav" href="#comunidad">{t.news}</a><a className="mk-desktop-nav" href="#promociones">{t.offers}</a><a className="mk-login" href="/client-admin" aria-label={t.login}><UserRound aria-hidden="true" size={19}/><span>{t.login}</span></a></nav>
   <div className="mk-tools"><div className="mk-languages" role="group" aria-label="Idioma / Language"><button type="button" aria-pressed={lang==='es'} onClick={()=>setLang('es')}>ES</button><button type="button" aria-pressed={lang==='en'} onClick={()=>setLang('en')}>EN</button></div><ThemeToggle lang={lang}/></div>
  </div></header>
  <main id="marketplace-content" tabIndex={-1}>
   <section className="mk-hero" aria-labelledby="mk-title"><figure className="mk-hero-photo">{!photoFailed&&<img src="/marketplace/old-san-juan-1800.webp" srcSet="/marketplace/old-san-juan-960.webp 960w, /marketplace/old-san-juan-1800.webp 1800w" sizes="100vw" width={1800} height={1349} alt={t.photoAlt} decoding="async" fetchPriority="high" onError={()=>setPhotoFailed(true)}/>}</figure><div className="mk-shell">
    <div className="mk-hero-copy"><p className="mk-kicker">{t.kicker}</p><h1 id="mk-title">{t.title}<span>{t.accent}</span></h1><p className="mk-lead">{t.intro}</p></div>
    {photoFailed&&<p className="mk-photo-error" role="note">{t.photoError}</p>}
   <section className="mk-discovery" aria-label={t.searchLabel}><form className="mk-search" role="search" aria-label={t.searchLabel} onSubmit={submit}>
    <label className="mk-query-field"><span>{t.query}</span><div><Search aria-hidden="true" size={21}/><input type="search" ref={queryInput} name="q" maxLength={120} autoComplete="off" placeholder={t.placeholder} value={draft.q} onChange={event=>setDraft({...draft,q:event.target.value})}/></div></label>
    <label className="mk-municipality"><span>{t.municipality}</span><div><MapPin aria-hidden="true" size={20}/><select name="municipio" value={draft.municipio} onChange={event=>setDraft({...draft,municipio:event.target.value})}><option value="">{t.allMunicipalities}</option>{municipalities.map(municipio=><option key={municipio}>{municipio}</option>)}</select></div></label>
    <button className="mk-search-button" type="submit" aria-label={t.search}><Search size={19} aria-hidden="true"/><span>{t.search}</span></button>
   </form><p className="mk-directory-note">{t.searchNote}</p></section>
   <section className="mk-categories" aria-labelledby="mk-categories-title"><h2 id="mk-categories-title">{t.categories}</h2><div className="mk-category-list" role="group" aria-label={t.categories}>
    <button type="button" aria-pressed={!filters.categoria} onClick={()=>apply({...draft,categoria:''},false)}>{t.all}</button>
    {marketplaceCategories.map((category,index)=>{const Icon=categoryIcons[index];return <button type="button" key={category.id} aria-pressed={filters.categoria===category.id} onClick={()=>apply({...draft,categoria:filters.categoria===category.id?'':category.id},false)}><Icon size={18} aria-hidden="true"/>{category[lang]}</button>})}
   </div></section>
   </div></section><div className="mk-shell mk-main-content">
   <section className="mk-featured" aria-labelledby="descubrir"><div className="mk-section-heading"><div><h2 ref={results} id="descubrir" tabIndex={-1}>{t.featured}</h2><p>{t.featuredIntro}</p></div></div>
    {filtered&&<div className="mk-applied"><div aria-label={t.selected}>{filters.q&&<span>“{filters.q}”</span>}{filters.municipio&&<span><MapPin size={16} aria-hidden="true"/>{filters.municipio}</span>}{selectedCategory&&<span>{selectedCategory[lang]}</span>}</div><button type="button" onClick={()=>{apply(emptyMarketplaceFilters,false);requestAnimationFrame(()=>queryInput.current?.focus())}}><X size={17} aria-hidden="true"/>{t.clear}</button></div>}
    <div className="mk-discovery-grid"><div className="mk-empty mk-business-empty"><Store aria-hidden="true" size={36}/><h3>{filtered?t.filteredTitle:t.emptyTitle}</h3><p role="status" aria-live="polite">{filtered?t.filteredText:t.emptyText}</p></div>
     <aside className="mk-local-context" aria-labelledby="mk-local-title"><Map size={28} aria-hidden="true"/><h3 id="mk-local-title">{t.localTitle}</h3><p className="mk-selected-town"><MapPin size={17} aria-hidden="true"/>{filters.municipio||t.allMunicipalities}</p><p>{t.localText}</p><small>{t.mapNote}</small></aside>
    </div>
   </section>
   <div className="mk-community-grid"><section id="comunidad" className="mk-community" aria-labelledby="mk-community-title"><div className="mk-section-heading"><div><h2 id="mk-community-title">{t.feedTitle}</h2><p>{t.feedIntro}</p></div><Newspaper aria-hidden="true" size={25}/></div><div className="mk-quiet-empty"><h3>{t.feedEmpty}</h3><p>{t.feedText}</p></div></section>
    <section id="promociones" className="mk-promotions" aria-labelledby="mk-promotions-title"><div className="mk-section-heading"><div><h2 id="mk-promotions-title">{t.offersTitle}</h2><p>{t.offersIntro}</p></div><Tag aria-hidden="true" size={25}/></div><div className="mk-quiet-empty"><h3>{t.offersEmpty}</h3><p>{t.offersText}</p></div></section>
   </div>
   <section className="mk-business-cta" aria-labelledby="mk-business-title"><div><p className="mk-kicker">{t.ownerKicker}</p><h2 id="mk-business-title">{t.ownerTitle}</h2><p>{t.ownerText}</p></div><a href="/crear">{t.ownerLink}<ArrowUpRight aria-hidden="true" size={19}/></a></section>
   </div>
  </main>
  <footer className="mk-shell mk-footer"><div><a href="/" className="mk-footer-logo"><AdaptiveLogo alt="WebFactory PR"/></a><p>{t.footer}</p><small>© 2026 WebFactory PR</small></div><nav aria-label={t.legal}><a href="/crear">{t.create}</a><a href="/privacy">{t.privacy}</a><a href="/terms">{t.terms}</a><a href="/refund-policy">{t.refunds}</a><a href="mailto:info@webfactorypr.com">info@webfactorypr.com</a><a href="https://www.pexels.com/photo/la-fortaleza-walls-of-old-san-juan-and-paseo-de-la-princesa-in-san-juan-in-puerto-rico-14724087/" target="_blank" rel="noopener noreferrer">{t.photoCredit}</a><FeedbackPreferences lang={lang}/></nav></footer>
 </div>
}
