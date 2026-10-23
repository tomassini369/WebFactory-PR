import {useEffect,useRef,useState} from 'react'
import {Menu,Search,UserRound,X} from 'lucide-react'
import {AdaptiveLogo,ThemeToggle} from './theme'
export default function MarketplaceHeader({lang,setLang}:{lang:'es'|'en';setLang:(lang:'es'|'en')=>void}){
 const es=lang==='es',[open,setOpen]=useState(false),toggle=useRef<HTMLButtonElement>(null)
 useEffect(()=>{if(!open)return;const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);toggle.current?.focus()}};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key)},[open])
 return <header className="mk-header"><div className="mk-shell mk-header-inner">
  <a className="mk-brand" href="/" aria-label="WebFactory PR Marketplace"><AdaptiveLogo alt="WebFactory PR"/></a>
  <nav className={'mk-navigation'+(open?' is-open':'')} id="mk-navigation" aria-label={es?'Navegación de Marketplace':'Marketplace navigation'} onClick={()=>setOpen(false)}><a href="/">Marketplace</a><a href="/#descubrir">{es?'Negocios':'Businesses'}</a><a href="/#promociones">{es?'Promociones':'Promotions'}</a><a href="/#mk-categories-title">{es?'Categorías':'Categories'}</a><a href="/crear">{es?'Crear mi página':'Create my website'}</a><a className="mk-mobile-account" href="/cuenta">{es?'Iniciar sesión':'Sign in'}</a><a className="mk-mobile-account" href="/cuenta?modo=crear">{es?'Crear cuenta':'Create account'}</a></nav>
  <div className="mk-header-account"><a className="mk-header-search" href="/#buscar" aria-label={es?'Buscar negocios':'Search businesses'}><Search size={19}/></a><a className="mk-login" href="/cuenta">{es?'Iniciar sesión':'Sign in'}</a><a className="mk-signup" href="/cuenta?modo=crear">{es?'Crear cuenta':'Create account'}</a></div>
  <div className="mk-tools"><div className="mk-languages" role="group" aria-label="Idioma / Language"><button type="button" aria-pressed={lang==='es'} onClick={()=>setLang('es')}>ES</button><button type="button" aria-pressed={lang==='en'} onClick={()=>setLang('en')}>EN</button></div><ThemeToggle lang={lang}/></div>
  <a className="mk-phone-account" href="/cuenta" aria-label={es?'Cuenta del consumidor':'Consumer account'}><UserRound size={21}/></a>
  <button ref={toggle} className="mk-menu-toggle" type="button" aria-label={es?'Menú':'Menu'} aria-expanded={open} aria-controls="mk-navigation" onClick={()=>setOpen(!open)}>{open?<X size={22}/>:<Menu size={22}/>}</button>
 </div></header>
}
