import {useEffect,useState} from 'react'
import {Bookmark,Compass,MapPin,Megaphone,Pencil,Store,UserRoundPlus,Check,ArrowUpRight} from 'lucide-react'
import {businessName,catalogItemUrl,type ConsumerProfile,type DirectoryBusiness} from './marketplace-api'
import './consumer-social.css'

const views=['inicio','favoritos','siguiendo','perfil','publicidad'] as const
function currentView(){
  return views.find(view=>'#'+view===window.location.hash)||(new URLSearchParams(window.location.search).has('marketplaceAd')?'publicidad':'inicio')
}
export function useConsumerView(){
  const [view,setView]=useState(currentView)
  useEffect(()=>{
    const change=()=>setView(currentView())
    window.addEventListener('hashchange',change)
    return ()=>window.removeEventListener('hashchange',change)
  },[])
  return view
}
type Props={lang:'es'|'en';profile:ConsumerProfile}
export function ConsumerIdentity({lang,profile,view}:{view:ReturnType<typeof currentView>}&Props){
  const es=lang==='es'
  const name=profile.name.trim()||(es?'Mi perfil':'My profile')
  const initials=name.split(/\s+/).slice(0,2).map(word=>Array.from(word)[0]).join('').toLocaleUpperCase()
  const links=[
    {key:'inicio',label:es?'Para ti':'For you',Icon:Compass},
    {key:'favoritos',label:es?'Guardados':'Saved',Icon:Bookmark,count:profile.favorites.length},
    {key:'siguiendo',label:es?'Siguiendo':'Following',Icon:Store,count:profile.following.length},
    {key:'publicidad',label:es?'Publicidad':'Advertising',Icon:Megaphone},
  ]
  return <header className="cs-identity">
    <div className="cs-cover"/>
    <div className="cs-intro"><div className="cs-avatar" aria-hidden="true">{initials}</div>
      <div><h1>{name}</h1>{profile.municipality&&<p><MapPin size={16}/>{profile.municipality}, PR</p>}</div>
      <a className="cs-edit" href="#perfil" aria-current={view==='perfil'?'page':undefined}><Pencil size={16}/>{es?'Editar perfil':'Edit profile'}</a>
    </div>
    <nav className="cs-nav" aria-label={es?'Secciones del perfil':'Profile sections'}>{links.map(({key,label,Icon,count})=><a key={key} href={'#'+key} aria-current={view===key?'page':undefined}><Icon size={17}/>{label}{count!==undefined&&<small>{count}</small>}</a>)}</nav>
  </header>
}
export function ConsumerFeed({lang,profile,directory,busy,loading,onFollow,onSave}:Props&{
  directory:DirectoryBusiness[];busy:boolean;loading:boolean;onFollow:(slug:string,saved:boolean)=>void;onSave:(slug:string,saved:boolean)=>void
}){
  const es=lang==='es'
  const rank=(b:DirectoryBusiness)=>profile.following.includes(b.slug)?2:b.municipalities.includes(profile.municipality)?1:0
  const entries=[...directory].sort((a,b)=>rank(b)-rank(a)).slice(0,6)
  return <section><div className="cs-heading"><h2>{es?'Para ti':'For you'}</h2><a href="/#descubrir">{es?'Explorar todo':'Explore all'} ↗</a></div>
    {loading&&<p role="status">{es?'Cargando negocios…':'Loading businesses…'}</p>}
    {!loading&&!entries.length&&<p>{es?'Todavía no hay negocios para mostrar.':'There are no businesses to show yet.'}</p>}
    <div className="cs-feed">{entries.map(b=>{
      const name=businessName(b,lang),following=profile.following.includes(b.slug),saved=profile.favorites.includes(b.slug)
      const item=b.services.find(i=>i.imageUrl)||b.services[0]
      const photo=item?.imageUrl||b.heroUrl||b.logoUrl
      const url=item?catalogItemUrl(b.slug,item.id):'/negocios/'+encodeURIComponent(b.slug)
      return <article key={b.slug} className="cs-card"><header><a href={'/negocios/'+encodeURIComponent(b.slug)}><strong>{name}</strong></a><p>{[b.categoryLabel,b.municipalities[0]].filter(Boolean).join(' · ')}</p></header>
        <a href={url} className="cs-feature">{photo&&<img src={photo} alt="" loading="lazy"/>}<span>{item?((es?item.nameEs:item.nameEn)||item.name):(es?'Ver negocio':'View business')}<ArrowUpRight size={18}/></span></a>
        <footer><button disabled={busy} aria-pressed={following} onClick={()=>onFollow(b.slug,!following)}>{following?<Check size={17}/>:<UserRoundPlus size={17}/>} {following?(es?'Siguiendo':'Following'):(es?'Seguir':'Follow')}</button><button disabled={busy} aria-pressed={saved} onClick={()=>onSave(b.slug,!saved)}><Bookmark size={17} fill={saved?'currentColor':'none'}/>{saved?(es?'Guardado':'Saved'):(es?'Guardar':'Save')}</button></footer>
      </article>
    })}</div></section>
}
