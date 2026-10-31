import {useEffect,useState} from 'react'
import {marketplaceRequest,businessName,type DirectoryBusiness} from './marketplace-api'
type Placement={id:string;title:string;body:string;endsAt:number;business:DirectoryBusiness;sponsored:true}
export default function MarketplaceSponsored({lang}:{lang:'es'|'en'}){
 const [ads,setAds]=useState<Placement[]>([]),es=lang==='es'
 useEffect(()=>{let active=true;const load=()=>void marketplaceRequest('ads?scope=public').then(r=>{if(active)setAds(Array.isArray(r.ads)?r.ads.filter((ad:any)=>ad&&ad.business&&typeof ad.business.slug==='string'):[])}).catch(()=>{if(active)setAds([])});load();const timer=setInterval(load,60000);return()=>{active=false;clearInterval(timer)}},[])
 if(!ads.length)return null
 return <section className="mk-featured" aria-label={es?'Publicidad patrocinada':'Sponsored advertising'}><div className="mk-section-heading"><h2>{es?'Espacios patrocinados':'Sponsored placements'}</h2></div><p>{es?'Publicidad pagada en rotación. No modifica el orden de los resultados orgánicos.':'Paid advertising in rotation. It does not change organic result order.'}</p><div className="mk-business-rail">{ads.map(ad=><article className="mk-business-card" key={ad.id}><div className="mk-business-image">{ad.business.heroUrl?<img src={ad.business.heroUrl} alt="" loading="lazy"/>:<div className="mk-image-empty">{businessName(ad.business,lang)}</div>}</div><div className="mk-business-info"><strong>{es?'Patrocinado · Publicidad':'Sponsored · Advertisement'}</strong><h3>{ad.title}</h3><p>{ad.body}</p><p>{businessName(ad.business,lang)}</p><p>{es?'Hasta ':'Until '}{new Date(ad.endsAt).toLocaleDateString(es?'es-PR':'en-US')}</p><a className="mk-view-business" href={'/negocios/'+ad.business.slug}>{es?'Ver negocio':'View business'}</a></div></article>)}</div></section>
}

