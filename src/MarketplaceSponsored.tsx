import {useEffect,useState} from 'react'
import {marketplaceRequest,businessName,type DirectoryBusiness} from './marketplace-api'
import {startVisiblePolling} from './visible-polling'
type Placement={id:string;title:string;body:string;endsAt:number;brand?:string;business?:DirectoryBusiness;sponsored:true}
export default function MarketplaceSponsored({lang}:{lang:'es'|'en'}){
 const [ads,setAds]=useState<Placement[]>([]),es=lang==='es'
 useEffect(()=>{let active=true;const polling=startVisiblePolling(signal=>marketplaceRequest('ads?scope=public',undefined,signal).then(r=>{if(active)setAds(Array.isArray(r.ads)?r.ads.filter((ad:any)=>ad&&(typeof ad.brand==='string'||typeof ad.business?.slug==='string')):[])}).catch(()=>{if(active)setAds([])}),60000,{timeoutMs:15000,wakeIntervalMs:60000});return()=>{active=false;polling.stop()}},[])
 if(!ads.length)return null
 return <section className="mk-featured" aria-label={es?'Publicidad patrocinada':'Sponsored advertising'}><div className="mk-section-heading"><h2>{es?'Espacios patrocinados':'Sponsored placements'}</h2></div><p>{es?'Publicidad pagada en rotación. No modifica el orden de los resultados orgánicos.':'Paid advertising in rotation. It does not change organic result order.'}</p><div className="mk-business-rail">{ads.map(ad=><article className="mk-business-card" key={ad.id}><div className="mk-business-image">{ad.business?.heroUrl?<img src={ad.business.heroUrl} alt="" loading="lazy"/>:<div className="mk-image-empty">{ad.business?businessName(ad.business,lang):ad.brand}</div>}</div><div className="mk-business-info"><strong>{es?'Patrocinado · Publicidad':'Sponsored · Advertisement'}</strong><h3>{ad.title}</h3><p>{ad.body}</p><p>{ad.business?businessName(ad.business,lang):ad.brand}</p><p>{es?'Hasta ':'Until '}{new Date(ad.endsAt).toLocaleDateString(es?'es-PR':'en-US')}</p>{ad.business&&<a className="mk-view-business" href={'/negocios/'+ad.business.slug}>{es?'Ver negocio':'View business'}</a>}</div></article>)}</div></section>
}

