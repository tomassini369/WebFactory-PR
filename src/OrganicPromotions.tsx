import {useEffect,useState,type FormEvent} from 'react'
import {catalogItemUrl,marketplaceRequest} from './marketplace-api'
import {startVisiblePolling} from './visible-polling'
import {PortalPanel} from './PortalPanel'

type Offer={slug:string;business:string;itemId:string;name:string;price:number;title:string;terms:string;end:number}
type Saved={title:string;terms:string;start:number;end:number;revision:number;withdrawn?:boolean}
type Item={id:string;name:string;nameEs?:string;nameEn?:string;active?:boolean;price:number}
const localDate=(value:number)=>new Date(value-new Date(value).getTimezoneOffset()*60000).toISOString().slice(0,16)

export function PromotionFeed({es}:{es:boolean}){
 const [offers,setOffers]=useState<Offer[]|null>(null),[error,setError]=useState(false)
 useEffect(()=>{
  const polling=startVisiblePolling(async signal=>{
   try{const result=await marketplaceRequest('promotions',undefined,signal);if(!signal.aborted){setOffers(result.offers);setError(false)}}
   catch{if(!signal.aborted)setError(true)}
  },30000,{timeoutMs:15000,wakeIntervalMs:30000})
  return ()=>polling.stop()
 },[])
 if(error)return <p role="status">{es?'No se pudieron actualizar las ofertas.':'Offers could not be refreshed.'}</p>
 if(!offers)return <p role="status">{es?'Cargando ofertas…':'Loading offers…'}</p>
 const current=offers.filter(offer=>offer.end>Date.now())
 if(!current.length)return <div className="mk-quiet-empty"><h3>{es?'Aún no hay promociones publicadas.':'No promotions published yet.'}</h3></div>
 return <ul>{current.map(offer=><li key={offer.slug+'/'+offer.itemId}><article>
  <h3>{offer.title}</h3><p>{offer.business} · {offer.name} · {new Intl.NumberFormat(es?'es-PR':'en-US',{style:'currency',currency:'USD'}).format(offer.price)}</p>
  <p>{offer.terms}</p><p>{es?'Vence':'Ends'} {new Date(offer.end).toLocaleString(es?'es-PR':'en-US',{timeZone:'America/Puerto_Rico'})} (PR)</p>
  <a href={catalogItemUrl(offer.slug,offer.itemId)}>{es?'Ver artículo':'View item'}</a>
 </article></li>)}</ul>
}

export function PromotionEditor({siteId,items,es}:{siteId:string;items:Item[];es:boolean}){
 const catalog=items.filter(item=>item.active!==false)
 const [itemId,select]=useState(''),[saved,setSaved]=useState<Saved|null>(null),[ready,setReady]=useState(false)
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[retry,setRetry]=useState(0)
 useEffect(()=>{
  let active=true;setReady(false);setSaved(null);setMessage('')
  if(itemId) marketplaceRequest('promotions',{action:'read',siteId,itemId}).then(r=>{if(active){setSaved(r.offer);setReady(true)}}).catch(()=>{if(active)setMessage(es?'No se pudo cargar la oferta.':'Could not load offer.')})
  return ()=>{active=false}
 },[siteId,itemId,retry,es])
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!ready||busy)return
  const data=new FormData(event.currentTarget),action=(event.nativeEvent as SubmitEvent).submitter?.getAttribute('value')||'publish'
  setBusy(true);setMessage('')
  try{
   const r=await marketplaceRequest('promotions',{action,siteId,itemId,revision:saved?.revision||0,title:data.get('title'),terms:data.get('terms'),start:new Date(String(data.get('start'))).getTime(),end:new Date(String(data.get('end'))).getTime()})
   setSaved(r.offer);setMessage(es?'Cambio guardado.':'Change saved.')
  }catch(e){setMessage(e instanceof Error?e.message:'Error')}
  finally{setBusy(false)}
 }
 return <PortalPanel className="content-claims-console ca-panel"><h2>{es?'Promociones del Marketplace':'Marketplace promotions'}</h2>
 <label>{es?'Producto o servicio':'Product or service'}<select disabled={busy} value={itemId} onChange={e=>select(e.target.value)}><option value="">{es?'Seleccionar':'Select'}</option>{catalog.map(item=><option key={item.id} value={item.id}>{(es?item.nameEs:item.nameEn)||item.name} · ${item.price}</option>)}</select></label>
 {ready&&<form key={itemId+'-'+saved?.revision} onSubmit={save}><fieldset disabled={busy}>
 <label>{es?'Título':'Title'}<input name="title" required maxLength={90} defaultValue={saved?.title}/></label>
 <label>{es?'Condiciones y elegibilidad':'Terms and eligibility'}<textarea name="terms" required maxLength={500} defaultValue={saved?.terms}/></label>
 <label>{es?'Inicio (hora del dispositivo)':'Starts (device time)'}<input type="datetime-local" name="start" required defaultValue={localDate(saved?.start||Date.now())}/></label>
 <label>{es?'Vencimiento (hora del dispositivo)':'Ends (device time)'}<input type="datetime-local" name="end" required defaultValue={saved?localDate(saved.end):undefined}/></label>
 <button value="publish">{es?'Publicar oferta':'Publish offer'}</button>
 {saved&&!saved.withdrawn&&<button value="withdraw" formNoValidate>{es?'Retirar oferta':'Withdraw offer'}</button>}
 </fieldset></form>}
 {message&&<p role="status">{message}</p>}{itemId&&<button disabled={busy} onClick={()=>setRetry(n=>n+1)}>{es?'Recargar oferta':'Reload offer'}</button>}</PortalPanel>
}
