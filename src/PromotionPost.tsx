// Publication layout adapted from FallenDeity/InstagramClone (MIT, see licenses/).
import {useEffect,useRef,useState} from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import {MediaController,MediaControlBar,MediaPlayButton,MediaMuteButton,MediaTimeRange} from 'media-chrome/react'
import {Bookmark,Share2,ChevronLeft,ChevronRight} from 'lucide-react'
import './promotion-post.css'
export type PostMedia={url:string;type:string;coverTime?:number}
export type PromotionPostData={id:string;brand:string;title:string;body:string;media:PostMedia[];href?:string;cta?:string;sponsored?:boolean;ends?:number}
function Clip({src,active}:{src:string;active:boolean}){
 const ref=useRef<HTMLVideoElement>(null)
 useEffect(()=>{
  const video=ref.current;if(!video)return
  let visible=false
  const update=()=>{if(!active||!visible||document.hidden)video.pause();else if(!matchMedia('(prefers-reduced-motion: reduce)').matches)void video.play().catch(()=>{})}
  const observer=new IntersectionObserver(([e])=>{visible=e.intersectionRatio>=.6;update()},{threshold:[0,.6,1]})
  observer.observe(video);document.addEventListener('visibilitychange',update)
  return ()=>{observer.disconnect();document.removeEventListener('visibilitychange',update);video.pause()}
 },[src,active])
 return <MediaController><video ref={ref} slot="media" src={src} playsInline muted preload="metadata"/><MediaControlBar><MediaPlayButton/><MediaTimeRange/><MediaMuteButton/></MediaControlBar></MediaController>
}
export function PostGallery({files,es}:{files:PostMedia[];es:boolean}){
 const [ref,api]=useEmblaCarousel({loop:false}),[slide,setSlide]=useState(0)
 useEffect(()=>{if(!api)return;const sync=()=>setSlide(api.selectedScrollSnap());sync();api.on('select',sync).on('reInit',sync);return()=>{api.off('select',sync).off('reInit',sync)}},[api])
 if(!files.length)return null
 return <div className="mp-gallery"><div ref={ref} className="mp-window"><div className="mp-track">{files.map((f,i)=><div key={f.url} className="mp-slide">{f.type.startsWith('video/')?<Clip src={f.coverTime?f.url+'#t='+f.coverTime:f.url} active={i===slide}/>:<img src={f.url} alt={es?'Imagen de la promoción':'Promotion image'} loading="lazy"/>}</div>)}</div></div>{files.length>1&&<div className="mp-carousel-tools"><button type="button" aria-label={es?'Anterior':'Previous'} disabled={!slide} onClick={()=>api?.scrollPrev()}><ChevronLeft/></button><span>{slide+1} / {files.length}</span><button type="button" aria-label={es?'Siguiente':'Next'} disabled={slide===files.length-1} onClick={()=>api?.scrollNext()}><ChevronRight/></button></div>}</div>
}
export function PromotionPost({post,es,saved,onSave,preview=false}:{post:PromotionPostData;es:boolean;saved?:boolean;onSave?:()=>void;preview?:boolean}){
 const [notice,setNotice]=useState('')
 const share=async()=>{const url=new URL('/',location.origin);url.searchParams.set('promo',post.id);url.hash='promociones'
  try{if(navigator.share)await navigator.share({title:post.title,url:url.href});else{await navigator.clipboard.writeText(url.href);setNotice(es?'Enlace copiado.':'Link copied.')}}catch(e){if(!(e instanceof Error&&e.name==='AbortError'))setNotice(url.href)}}
 return <article className="mp-post"><header><strong>{post.brand}</strong>{post.sponsored&&<small>{es?'Patrocinado':'Sponsored'}</small>}</header><PostGallery files={post.media} es={es}/><div className="mp-copy"><h3>{post.title}</h3><p>{post.body}</p>{post.ends&&<small>{es?'Hasta el ':'Until '}{new Date(post.ends).toLocaleDateString(es?'es-PR':'en-US',{timeZone:'America/Puerto_Rico'})}</small>}</div><footer>{post.href&&(preview?<span>{post.cta}</span>:<a href={post.href} rel="noopener noreferrer sponsored">{post.cta}</a>)}{!preview&&<><button type="button" aria-pressed={saved} onClick={onSave}><Bookmark size={17} fill={saved?'currentColor':'none'}/>{saved?(es?'Guardada':'Saved'):(es?'Guardar':'Save')}</button><button type="button" onClick={()=>void share()}><Share2 size={17}/>{es?'Compartir':'Share'}</button></>}</footer>{notice&&<p role="status">{notice}</p>}</article>
}
