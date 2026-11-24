import {useEffect,useState,type FormEvent} from 'react'
import {marketplaceRequest} from './marketplace-api'
import {PortalPanel} from './PortalPanel'

type Saved={title:string;terms:string;start:number;end:number;revision:number;withdrawn?:boolean}
type Item={id:string;name:string;nameEs?:string;nameEn?:string;active?:boolean;price:number}
const localDate=(value:number)=>new Date(value-new Date(value).getTimezoneOffset()*60000).toISOString().slice(0,16)

export {default as PromotionFeed} from './PromotionStream'

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
