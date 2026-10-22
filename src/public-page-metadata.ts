// Only the two WebFactory public entry points. Tenant metadata remains server-owned.
export function publicPageMetadata(pathname:string,lang:'es'|'en'){
 const creating=/^\/crear\/?$/.test(pathname)
 if(pathname!=='/'&&!creating)return null
 const es=lang==='es'
 const title=creating?'WebFactory PR | Plataforma de comercio y reservas':es?'WebFactory PR | Descubre negocios en Puerto Rico':'WebFactory PR | Discover local Puerto Rico'
 const description=creating?(es?'Crea y administra tu página de negocio con catálogo, ventas, pagos y reservaciones. Conoce el Builder y Factory AI.':'Create and manage your business website with a catalog, sales, payments and bookings. Meet the Builder and Factory AI.'):(es?'Descubre el nuevo Marketplace de WebFactory PR para negocios, servicios y promociones locales en Puerto Rico. Directorio en preparación.':'Discover the new WebFactory PR Marketplace for local businesses, services and promotions in Puerto Rico. Directory in preparation.')
 const url='https://webfactorypr.com'+(creating?'/crear':'/')
 return {title,description,url,locale:es?'es_PR':'en_US'}
}
export function updatePublicPageMetadata(pathname:string,lang:'es'|'en'){
 const metadata=publicPageMetadata(pathname,lang)
 if(!metadata)return
 const {title,description,url,locale}=metadata
 document.title=title
 const values:Record<string,string>={'meta[name="description"]':description,'meta[property="og:title"]':title,'meta[property="og:description"]':description,'meta[property="og:url"]':url,'meta[property="og:locale"]':locale,'meta[name="twitter:title"]':title,'meta[name="twitter:description"]':description}
 for(const [selector,value]of Object.entries(values))document.querySelector(selector)?.setAttribute('content',value)
 document.querySelector('link[rel="canonical"]')?.setAttribute('href',url)
}
