import type {TemplateLanguage} from './templateI18n'

/** Embed only Google Maps URLs; shortened links remain links when no address is available. */
export function googleMapsEmbedUrl(value:string,location=''){
  try{
    const url=new URL(value)
    const googleHost=url.hostname==='google.com'||url.hostname.endsWith('.google.com')
    if(url.protocol==='https:'&&googleHost){
      if(url.pathname.startsWith('/maps/embed')){url.hostname='www.google.com';return url.toString()}
      const marker=url.href.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
      const coords=marker||url.href.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
      const place=url.pathname.match(/\/maps\/place\/([^/]+)/)
      const query=coords?`${coords[1]},${coords[2]}`:url.searchParams.get('query')||url.searchParams.get('q')||(place?decodeURIComponent(place[1]).replace(/\+/g,' '):'')
      if(query)return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`
    }
  }catch{/* A configured street address also supports an embedded map. */}
  return location.trim()?`https://www.google.com/maps?q=${encodeURIComponent(location.trim())}&output=embed`:null
}

export default function TemplateMap({location,mapsUrl='',language,sample=false}:{location:string;mapsUrl?:string;language:TemplateLanguage;sample?:boolean}){
  const embed=googleMapsEmbedUrl(mapsUrl,location)
  const title=language==='es'?'Ubicación en Google Maps':'Location on Google Maps'
  return <section className="template-location-map" aria-label={title}>
    <header><div><small>{sample?(language==='es'?'UBICACIÓN DE MUESTRA':'SAMPLE LOCATION'):title}</small>{location&&<p>{location}</p>}</div>{mapsUrl&&<a href={mapsUrl} target="_blank" rel="noreferrer">{language==='es'?'Abrir en Google Maps':'Open in Google Maps'} ↗</a>}</header>
    {embed?<iframe src={embed} title={title} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/>:<p>{language==='es'?'Abre Google Maps para consultar la ubicación.':'Open Google Maps to view the location.'}</p>}
  </section>
}
