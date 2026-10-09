import {useEffect,useRef,useState} from 'react'
import {motion} from 'framer-motion'
import {usePrefersReducedMotion} from './usePrefersReducedMotion'
import type {TemplateItem} from './templateData'
import type {TemplateLanguage} from './templateI18n'
import {GlassCarousel} from './carousel-original/GlassCarousel'
import {BottomControlDock} from './carousel-original/BottomControlDock'
import type {Highlight} from './carousel-original/GlassCard'
import './carousel-original/original.css'
import './template-spatial-carousel.css'

/** Supplied Glasssy V2 components, bound to business data instead of the movie demonstration. */
export default function TemplateHighlights({items,language}:{items:TemplateItem[];language:TemplateLanguage}) {
  const highlights=items.slice(0,3)
  const [selectedId,setSelectedId]=useState<string|null>(null)
  const [favorites,setFavorites]=useState<string[]>([])
  const [playing,setPlaying]=useState(false)
  const [expanded,setExpanded]=useState<Highlight|null>(null)
  const [menu,setMenu]=useState<Highlight|null>(null)
  const dialog=useRef<HTMLDialogElement>(null)
  const menuPanel=useRef<HTMLDivElement>(null)
  const container=useRef<HTMLDivElement>(null)
  const reduced=usePrefersReducedMotion()
  const es=language==='es',total=highlights.length
  const activeIndex=Math.max(0,highlights.findIndex(item=>item.id===selectedId))
  const movies:Highlight[]=highlights.map(item=>({id:item.id,title:item.name,image:item.image,description:item.description,
    location:item.displayPrice||new Intl.NumberFormat(es?'es-PR':'en-US',{style:'currency',currency:'USD'}).format(item.price),
    coordinates:item.badge||'',shortLocation:item.badge||'',subtitle:item.badge||'',es}))
  const move=(direction:number)=>{if(total>1)setSelectedId(highlights[(activeIndex+direction+total)%total].id)}
  const toggleFavorite=(id:string)=>setFavorites(current=>current.includes(id)?current.filter(v=>v!==id):[...current,id])
  useEffect(()=>{
    // Original 4500ms rotation is opt-in; pause inspection and hidden tabs.
    if(!playing||reduced||total<2||expanded||menu)return
    const timer=window.setInterval(()=>{if(!document.hidden)setSelectedId(current=>{
      const index=Math.max(0,highlights.findIndex(item=>item.id===current));return highlights[(index+1)%total].id
    })},4500)
    return()=>window.clearInterval(timer)
  },[playing,reduced,total,expanded,menu,items])
  useEffect(()=>{if(expanded&&!dialog.current?.open)dialog.current?.showModal()},[expanded])
  useEffect(()=>{if(menu)menuPanel.current?.querySelector<HTMLButtonElement>('button')?.focus()},[menu])
  const closeMenu=()=>{setMenu(null);container.current?.querySelector<HTMLButtonElement>('.is-active .card-more-btn')?.focus()}
  if(!total)return null
  const current=movies[activeIndex]
  return <div ref={container} className="template-highlights template-spatial-highlights">
    <GlassCarousel movies={movies} activeIndex={activeIndex} onChangeIndex={index=>setSelectedId(highlights[index].id)} onExpandMovie={setExpanded} onOpenMenu={setMenu}/>
    <BottomControlDock currentMovie={current} activeIndex={activeIndex} total={total} onPrev={()=>move(-1)} onNext={()=>move(1)}
      isPlaying={playing&&!reduced} onTogglePlay={()=>setPlaying(value=>!value)} isFavorite={favorites.includes(current.id)}
      onToggleFavorite={()=>toggleFavorite(current.id)} onSelectCurrent={()=>setExpanded(current)}/>
    <span className="wf-carousel-status" role="status" aria-live="polite" aria-atomic="true">{activeIndex+1} / {total}: {current.title}</span>
    {menu&&<div ref={menuPanel} className="wf-carousel-menu" role="group" aria-label={es?'Opciones del destacado':'Highlight options'} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();closeMenu()}}}>
      <button type="button" onClick={()=>{setExpanded(menu);setMenu(null)}}>{es?'Ampliar detalles':'Expand details'}</button>
      <button type="button" aria-pressed={favorites.includes(menu.id)} onClick={()=>toggleFavorite(menu.id)}>{favorites.includes(menu.id)?(es?'Quitar de favoritos':'Remove from favorites'):(es?'Añadir a favoritos':'Add to favorites')}</button>
      <button type="button" onClick={closeMenu}>{es?'Cerrar':'Close'}</button>
    </div>}
    <dialog ref={dialog} className="wf-carousel-dialog" aria-label={es?'Detalles del destacado':'Highlight details'} onClose={()=>setExpanded(null)} onClick={event=>{if(event.target===event.currentTarget)dialog.current?.close()}}>
      {expanded&&<motion.div className="glass-modal-window" initial={reduced?false:{opacity:0,scale:.88,y:30}} animate={{opacity:1,scale:1,y:0}} transition={reduced?{duration:0}:{type:'spring',damping:25,stiffness:280}}>
        <div className="glass-reflection-rim"/>
        <button className="modal-close-btn" type="button" autoFocus aria-label={es?'Cerrar detalles':'Close details'} onClick={()=>dialog.current?.close()}>×</button>
        <div className="modal-content-grid"><div className="modal-poster-col"><div className="modal-poster-frame"><img className="modal-poster-img" src={expanded.image} alt={expanded.title}/></div></div>
          <div className="modal-info-col"><h2 className="modal-title">{expanded.title}</h2><p className="modal-description">{expanded.description}</p><strong>{expanded.location}</strong>{expanded.coordinates&&<p>{expanded.coordinates}</p>}
            <div className="modal-actions-row"><button type="button" className="modal-action-primary" aria-pressed={favorites.includes(expanded.id)} onClick={()=>toggleFavorite(expanded.id)}>{favorites.includes(expanded.id)?(es?'Guardado':'Saved'):(es?'Guardar favorito':'Bookmark')}</button></div>
          </div>
        </div>
      </motion.div>}
    </dialog>
  </div>
}
