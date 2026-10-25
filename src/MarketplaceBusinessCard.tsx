import {ArrowRight,Bookmark,ImageOff} from 'lucide-react'
import {businessName,type DirectoryBusiness} from './marketplace-api'
import {useState} from 'react'
export default function MarketplaceBusinessCard({business,lang}:{business:DirectoryBusiness;lang:'es'|'en'}){
 const es=lang==='es',name=businessName(business,lang),[failed,setFailed]=useState(false)
 const image=business.heroUrl||business.services.find(i=>i.imageUrl)?.imageUrl||business.logoUrl
 return <article className="mk-business-card">
  <div className="mk-business-image">{image&&!failed?<img src={image} alt="" loading="lazy" width={560} height={350} onError={()=>setFailed(true)}/>:<div className="mk-image-empty"><ImageOff size={28}/><span>{es?'Sin fotografía publicada':'No published photo'}</span></div>}</div>
  <a className="mk-save-business" href={'/cuenta?negocio='+encodeURIComponent(business.slug)} aria-label={(es?'Guardar ':'Save ')+name}><Bookmark size={20}/></a>
  <div className="mk-business-info"><h3><a href={'/negocios/'+business.slug}>{name}</a></h3><p>{business.categoryLabel}{business.municipalities.length>0&&' · '+business.municipalities.join(', ')}</p><a className="mk-view-business" href={'/negocios/'+business.slug}>{es?'Ver servicios':'View services'}<ArrowRight size={16}/></a></div>
 </article>
}
