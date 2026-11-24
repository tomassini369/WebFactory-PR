import {useEffect,useRef,useState} from 'react'
import {catalogItemUrl,marketplaceRequest,type ConsumerProfile} from './marketplace-api'
import {startVisiblePolling} from './visible-polling'
import {PromotionPost,type PromotionPostData,type PostMedia} from './PromotionPost'
type Offer={business:string;slug:string;itemId:string;title:string;name:string;price:number;terms:string;end:number;image?:string;book:boolean;buy:boolean}
type Ad={id:string;brand?:string;business?:{slug:string;name:string;heroUrl?:string};title:string;body:string;endsAt:number;cta?:string;destination?:string;promotion?:string;media:PostMedia[]}
const organicId=(slug:string,item:string)=>'p-'+encodeURIComponent(slug+'/'+item)
export default function PromotionStream({es,onlySaved=false}:{es:boolean;onlySaved?:boolean}){
 const [posts,setPosts]=useState<PromotionPostData[]|null>(null),[profile,setProfile]=useState<ConsumerProfile|null>(null),[error,setError]=useState(''),[attempt,retry]=useState(0),[focus,setFocus]=useState(()=>onlySaved?'':new URLSearchParams(location.search).get('promo')||'')
 const saving=useRef(false)
 useEffect(()=>{let alive=true;marketplaceRequest('profile').then(r=>{if(alive)setProfile(r.profile)}).catch(()=>{});return()=>{alive=false}},[attempt])
 useEffect(()=>{const poll=startVisiblePolling(async signal=>{
  try{
   const [organic,paid]=await Promise.all([marketplaceRequest('promotions',undefined,signal),marketplaceRequest('ads?scope=public&feed=1',undefined,signal)])
   const posts=new Map<string,PromotionPostData>()
   for(const o of organic.offers as Offer[]){const id=organicId(o.slug,o.itemId);posts.set(id,{id,brand:o.business,title:o.title,body:o.name+' · '+new Intl.NumberFormat(es?'es-PR':'en-US',{style:'currency',currency:'USD'}).format(o.price)+'\n'+o.terms,ends:o.end,href:catalogItemUrl(o.slug,o.itemId),cta:o.book?(es?'Reservar':'Book'):o.buy?(es?'Comprar':'Buy'):(es?'Ver oferta':'View offer'),media:o.image?[{type:'image',url:o.image}]:[]})}
   const promoted:PromotionPostData[]=[]
   for(const ad of paid.ads as Ad[]){const id=ad.promotion&&ad.business?organicId(ad.business.slug,ad.promotion):'p-'+ad.id,original=posts.get(id);if(ad.promotion&&!original)continue
    const fallback=ad.business?.heroUrl
    promoted.push({id,brand:ad.brand||ad.business?.name||'',title:ad.title,body:ad.body,media:ad.media?.length?ad.media:original?.media?.length?original.media:fallback?[{type:'image',url:fallback}]:[],sponsored:true,ends:Math.min(ad.endsAt,original?.ends||Infinity),href:original?.href||ad.destination||(ad.business?'/negocios/'+encodeURIComponent(ad.business.slug):undefined),cta:original?.cta||(ad.cta==='buy'?(es?'Comprar':'Buy'):ad.cta==='book'?(es?'Reservar':'Book'):(es?'Ver oferta':'View offer'))});posts.delete(id)}
   if(!signal.aborted){setPosts([...promoted,...posts.values()]);setError('')}
  }catch{if(!signal.aborted)setError(es?'No se pudieron actualizar las promociones.':'Could not refresh promotions.')}
 },30000,{timeoutMs:15000,wakeIntervalMs:30000});return()=>poll.stop()},[es,attempt])
 async function save(id:string){
  if(saving.current)return
  if(!profile||profile.needsAcceptance||profile.restricted){location.assign('/cuenta?promo='+encodeURIComponent(id)+'#favoritos');return}
  saving.current=true
  try{const r=await marketplaceRequest('profile',{action:'save_promotion',revision:profile.revision,post:id,saved:!profile.savedPromotions?.includes(id)});setProfile(r.profile)}catch{setError(es?'No se pudo guardar. Recarga e intenta de nuevo.':'Could not save. Reload and try again.')}finally{saving.current=false}
 }
 const visible=posts?.filter(p=>(!p.ends||p.ends>Date.now())&&(!focus||focus===p.id)&&(!onlySaved||profile?.savedPromotions?.includes(p.id)))
 const pending=onlySaved&&new URLSearchParams(location.search).get('promo')
 return <div className="mp-stream">{onlySaved&&<h3>{es?'Promociones guardadas':'Saved promotions'}</h3>}{pending&&posts?.some(p=>p.id===pending)&&<a href={'/?promo='+encodeURIComponent(pending)+'#promociones'}>{es?'Volver a la promoción para guardarla':'Return to the promotion to save it'}</a>}
 {error&&<p role="alert">{error} <button onClick={()=>retry(a=>a+1)}>{es?'Recargar':'Reload'}</button></p>}
 {focus&&<button onClick={()=>{setFocus('');const url=new URL(location.href);url.searchParams.delete('promo');history.replaceState(null,'',url)}}>{es?'Ver todas las promociones':'See all promotions'}</button>}
 {!posts&&!error&&<p role="status">{es?'Cargando promociones…':'Loading promotions…'}</p>}{visible&&!visible.length&&<p>{focus?(es?'Esta promoción ya no está disponible.':'This promotion is no longer available.'):onlySaved?(es?'Aún no tienes promociones activas guardadas.':'No active saved promotions yet.'):(es?'Aún no hay promociones activas.':'No active promotions yet.')}</p>}
 {visible?.map(post=><PromotionPost key={post.id} post={post} es={es} saved={profile?.savedPromotions?.includes(post.id)} onSave={()=>void save(post.id)}/>)}</div>
}
