import {useWorkspaceFetch} from './training/workspace-services'
import {usePractice} from './training/practice-context'
import { useEffect,useRef, useState, type CSSProperties } from 'react'
import { Search, ShoppingBag, Scissors, LayoutGrid, Plus, Minus, Trash2, CreditCard, Receipt, ArrowRight, ShieldCheck } from 'lucide-react'
import { Input } from './components/ui/input'
import { PortalPanel } from './PortalPanel'
import CopyButton from './CopyButton'
import KioskCheckoutQR from './KioskCheckoutQR'
import { estimatePosTotals, posBrandPair, posItemName, posQuantityLimit, type PosItem, type PosLine } from './pos-domain'
import './pos-workspace.css'
import './customer-display.css'
import PosCustomerDisplay from './PosCustomerDisplay'
import {posCapabilities,posOperations,type PosOperations} from '../netlify/lib/pos-capabilities.mjs'
import {posProfileCopy} from './pos-profile'

type Language='es'|'en'
type Destination='orders'|'payments'|'catalog'|'bookings'|'kitchen'|'team'|'settings'
type Attempt={id:string;kind:'direct'|'card';transactionId?:string}
type Remote={transactionId:string;checkoutUrl:string}
type Status={paymentStatus:string;status:string;receiptId:string;amountTotal:number}
type Props={site:any;lang:Language;operations?:PosOperations;operator:{id:string;email:string;name:string;role:string;permissions?:Record<string,boolean>};onSaleComplete?:()=>void;onNavigate?:(tab:Destination)=>void;canNavigate?:(tab:Destination)=>boolean}
class PosError extends Error { constructor(message:string,public status:number){super(message)} }
async function posRequest(fetch:ReturnType<typeof useWorkspaceFetch>,url:string,options?:RequestInit){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000)
 try{
 const response=await fetch(url,{credentials:'include',cache:'no-store',...options,signal:options?.signal||controller.signal})
 const result=await response.json()
 if(!response.ok||result.ok===false)throw new PosError(result.message||'Request failed.',response.status)
 return result
 }finally{clearTimeout(timer)}
}
const money=(cents:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100)
const cents=(value:string)=>value.trim()===''?0:/^\d+(?:\.\d{0,2})?$/.test(value)?Math.round(Number(value)*100):NaN
export default function PosWorkspace({site,lang,operator,operations=posOperations(),onSaleComplete,onNavigate,canNavigate}:Props){
 const workspaceFetch=useWorkspaceFetch(),practice=usePractice()
 const request=(url:string,options?:RequestInit)=>posRequest(workspaceFetch,url,options)
 const es=lang==='es',t=(a:string,b:string)=>es?a:b
 const available:PosItem[]=(site.catalog||[]).filter((item:PosItem)=>item.active!==false)
 const [cart,setCart]=useState<PosLine[]>(()=>practice?.ui.pos?.cart||[]),[search,setSearch]=useState(practice?.ui.pos?.search||''),[category,setCategory]=useState('all')
 const [customer,setCustomer]=useState({name:'',email:'',phone:''}),[discount,setDiscount]=useState('0'),[tip,setTip]=useState('0')
 const [method,setMethod]=useState('cash'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[receiptId,setReceiptId]=useState<string>(practice?.ui.pos?.receiptId||'')
 const [showQr,setShowQr]=useState(false)
 const [remote,setRemote]=useState<Remote|null>(null),[status,setStatus]=useState<Status|null>(null)
 const storageKey=`wf-pos-active:${site.siteId}:${operator.id}`
 const [attempt,setAttempt]=useState<Attempt|null>(()=>{try{const value=JSON.parse(sessionStorage.getItem(storageKey)||'null');return value&&/^[a-zA-Z0-9_-]{8,120}$/.test(value.id)&&['direct','card'].includes(value.kind)?value:null}catch{return null}})
 const [displayAttempt,setDisplayAttempt]=useState('')
 useEffect(()=>{practice?.setUi('pos',{cart,search,receiptId})},[practice,cart,search,receiptId])
 const gate=useRef(false),snapshot=useRef<Record<string,unknown>|null>(null),cartRef=useRef<HTMLElement>(null)
 const [locationId,setLocationId]=useState(site.business?.locations?.[0]?.id||'')
 const canCollect=['owner','admin'].includes(operator.role)||operator.permissions?.collect===true
 const canAdjust=['owner','admin'].includes(operator.role)
 const locked=busy||Boolean(attempt)||Boolean(remote)||!operations.cashierEnabled
 const capabilities=posCapabilities(site,operations),profileCopy=posProfileCopy(capabilities,lang)
 const totals=estimatePosTotals(available,cart,canAdjust?cents(discount):0,canAdjust?cents(tip):0,site.taxConfig)
 const itemName=(item:PosItem)=>posItemName(item,lang)
 const normalized=search.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 const filtered=available.filter(item=>(category==='all'||item.type===category)&&`${itemName(item)} ${es?item.descriptionEs||item.descriptionEn||item.description||'':item.descriptionEn||item.description||item.descriptionEs||''}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(normalized))
 const lines=cart.map(line=>({line,item:available.find(item=>item.id===line.id)}))
 const brand=posBrandPair(site.design?.secondary||'')
 const businessName=es?site.business?.nameEs||site.business?.nameEn||site.business?.name:site.business?.nameEn||site.business?.name||site.business?.nameEs
 const asset=(key:string)=>`/.netlify/functions/client-asset?siteId=${encodeURIComponent(site.siteId)}&key=${encodeURIComponent(key)}`
 const saveAttempt=(value:Attempt|null)=>{try{if(value)sessionStorage.setItem(storageKey,JSON.stringify(value));else sessionStorage.removeItem(storageKey)}catch{if(value)throw new Error(t('No se pudo proteger el intento de venta. Habilita almacenamiento de sesión antes de cobrar.','The sale attempt could not be protected. Enable session storage before charging.'))}setAttempt(value)}
 const change=(id:string,quantity:number)=>{if(locked)return;const item=available.find(x=>x.id===id);if(!item)return;setError('');setReceiptId('');setDisplayAttempt('');setCart(current=>quantity<=0?current.filter(x=>x.id!==id):current.map(x=>x.id===id?{...x,quantity:Math.min(posQuantityLimit(item),Math.max(1,Math.floor(quantity)))}:x))}
 const add=(item:PosItem)=>{if(locked||posQuantityLimit(item)===0)return;setError('');setReceiptId('');setDisplayAttempt('');setCart(current=>{const found=current.find(x=>x.id===item.id);return found?current.map(x=>x.id===item.id?{...x,quantity:Math.min(posQuantityLimit(item),x.quantity+1)}:x):current.length<50?[...current,{id:item.id,quantity:1}]:current})}
 const finish=(id:string)=>{saveAttempt(null);snapshot.current=null;setRemote(null);setStatus(null);setShowQr(false);setDisplayAttempt('');setCart([]);setCustomer({name:'',email:'',phone:''});setDiscount('0');setTip('0');setReceiptId(id);onSaleComplete?.()}
 const submit=async(kind:'direct'|'card')=>{
  if(!operations.cashierEnabled)return setError(t('El POS está deshabilitado. Verifica los pagos pendientes desde el historial.','POS is disabled. Review pending payments in History.'))
  if(gate.current||remote)return
  if(attempt&&(attempt.kind!==kind||!snapshot.current))return
  if(!attempt&&(!cart.length||totals.invalid))return setError(t('Revisa artículos, existencias y cantidades antes de cobrar.','Check items, stock and amounts before charging.'))
  if(kind==='card'&&!attempt&&(!customer.name.trim()||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)))return setError(t('Tarjeta requiere nombre y email válido del cliente.','Card payment requires the customer name and valid email.'))
  if(kind==='direct'&&!attempt&&!confirm(practice?t('¿Completar el cobro de ejemplo? No se recibe dinero ni se registra una venta real.','Complete the sample payment? No money is received and no real sale is recorded.'):t('¿Confirmas que recibiste el pago presencial? ATH Móvil manual no se verifica automáticamente.','Confirm you received the in-person payment. Manual ATH Móvil is not verified automatically.')))return
  gate.current=true;setBusy(true);setError('')
  try{
   const current=attempt||{id:crypto.randomUUID(),kind}
   setDisplayAttempt(current.id)
   if(kind==='direct'&&!canCollect){setError(t('El Dueño debe autorizar el cobro presencial.','The Owner must authorize in-person collection.'));return}
   if(!attempt){snapshot.current={siteId:site.siteId,locationId,items:cart,customer,discountCents:totals.discount,tipCents:totals.tip,...(kind==='direct'?{paymentMethod:method}:{}),saleAttemptId:current.id};saveAttempt(current)}
   const result=await request(kind==='card'?'/.netlify/functions/client-pos-checkout':'/.netlify/functions/client-pos-sale-idempotent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(snapshot.current)})
   if(kind==='card'){saveAttempt({...current,transactionId:result.transactionId});setRemote({transactionId:result.transactionId,checkoutUrl:result.checkoutUrl});setStatus(null)}else finish(result.receiptId||'')
  }catch(e){setError(e instanceof Error?e.message:t('No se pudo confirmar la venta.','The sale could not be confirmed.'));if(!attempt&&e instanceof PosError&&[400,401,403].includes(e.status)){saveAttempt(null);snapshot.current=null}}
  finally{gate.current=false;setBusy(false)}
 }
 const verify=async()=>{
  if(gate.current||!attempt)return
  gate.current=true;setBusy(true);setError('')
  try{
   if(attempt.kind==='direct'){
    const result=await request(`/.netlify/functions/client-pos-attempt-status?siteId=${encodeURIComponent(site.siteId)}&saleAttemptId=${encodeURIComponent(attempt.id)}`)
    if(result.status==='completed')finish(result.receiptId||'')
    else setError(t('El servidor todavía no confirma la venta. Reintenta el mismo intento o revisa Órdenes antes de iniciar otra.','The server has not confirmed this sale. Retry the same attempt or review Orders before starting another.'))
   }else{
    const transactionId=attempt.transactionId||`txn_pos_${attempt.id}`
    const result=await request(`/.netlify/functions/client-pos-status?siteId=${encodeURIComponent(site.siteId)}&transactionId=${encodeURIComponent(transactionId)}`)
    setStatus(result.transaction)
    if(result.transaction.paymentStatus==='paid')finish(result.transaction.receiptId||'')
    else if(['expired','cancelled','payment_failed'].includes(result.transaction.status)){saveAttempt(null);snapshot.current=null;setRemote(null)}
   }
  }catch(e){setError(e instanceof Error?e.message:t('No se pudo verificar el pago.','Payment could not be verified.'))}
  finally{gate.current=false;setBusy(false)}
 }
 useEffect(()=>{
  if(!attempt||attempt.kind!=='card')return
  let stopped=false,timer:ReturnType<typeof setTimeout>
  const poll=async()=>{if(stopped)return;await verify();if(!stopped)timer=setTimeout(poll,5000)}
  void poll()
  const resume=()=>{if(document.visibilityState==='visible')void verify()}
  window.addEventListener('focus',resume);document.addEventListener('visibilitychange',resume)
  return()=>{stopped=true;clearTimeout(timer);window.removeEventListener('focus',resume);document.removeEventListener('visibilitychange',resume)}
 },[attempt?.id,attempt?.transactionId])
 return <PortalPanel className="ca-panel pos-workspace" style={{'--pos-primary':/^#[a-f\d]{6}$/i.test(site.design?.primary||'')?site.design!.primary:'#0b1529','--pos-brand':brand.background,'--pos-brand-ink':brand.foreground} as CSSProperties}>
  <header className="pos-heading"><div className="pos-identity">{site.business?.logoAssetKey&&<img src={asset(site.business.logoAssetKey)} alt=""/>}<div><small>WEBFACTORY POS 2.0 · {profileCopy.name}</small><h2>{businessName||site.slug}</h2><p>{profileCopy.hint}</p></div></div><div className="pos-operator"><ShieldCheck aria-hidden="true"/><div><small>{t('Sesión activa','Active session')}</small><strong>{operator.name||operator.email}</strong><span>{practice?t('Identidad de práctica · sin sesión de empleado real','Practice identity · no real employee session'):t('Identidad del portal verificada en servidor','Portal identity verified on server')}</span></div></div></header>
  {!operations.cashierEnabled&&<div className="pos-pending" role="status"><strong>{t('POS del cajero deshabilitado','Cashier POS disabled')}</strong><p>{t('El historial y la verificación de pagos pendientes siguen disponibles. Un administrador puede habilitar nuevas ventas desde Ajustes del negocio.','History and pending-payment verification remain available. The Owner can enable new sales in Business settings.')}</p>{canNavigate?.('settings')&&onNavigate&&<button onClick={()=>onNavigate('settings')}>{t('Abrir ajustes del POS','Open POS settings')}</button>}</div>}
  {(capabilities.kitchen||capabilities.professionals)&&<nav className="pos-context-actions" aria-label={t('Operación del negocio','Business operations')}>{capabilities.kitchen&&canNavigate?.('kitchen')&&onNavigate&&<button onClick={()=>onNavigate('kitchen')}><Receipt aria-hidden="true"/>{t('Preparar órdenes en Cocina','Prepare orders in Kitchen')}</button>}{capabilities.professionals&&canNavigate?.('team')&&onNavigate&&<button onClick={()=>onNavigate('team')}><Scissors aria-hidden="true"/>{t('Ver profesionales','View professionals')}</button>}</nav>}
  <details className="pos-workspace-options"><summary>{t("Historial y herramientas","History and tools")}</summary><nav className="pos-shortcuts" aria-label={t('Operaciones del POS','POS operations')}>{(['orders','payments','catalog','bookings'] as Array<'orders'|'payments'|'catalog'|'bookings'>).filter(id=>onNavigate&&canNavigate?.(id)).map(id=><button key={id} onClick={()=>onNavigate?.(id)}><Receipt aria-hidden="true"/>{({orders:t('Historial','History'),payments:t('Recibos y pagos','Receipts and payments'),catalog:t('Editar catálogo','Edit catalog'),bookings:t('Reservaciones','Bookings')})[id]}<ArrowRight aria-hidden="true"/></button>)}</nav></details>
  {error&&<div className="ca-error" role="alert">{error}</div>}
  {receiptId&&<div className="ca-success" role="status">{practice?t('Práctica completada. Recibo de ejemplo: ','Practice completed. Sample receipt: '):t('Venta confirmada por el servidor. Recibo: ','Sale confirmed by the server. Receipt: ')}{receiptId}</div>}
  {attempt&&<div className="pos-pending" role="status"><strong>{t('Venta protegida · no inicies otro cobro','Protected sale · do not start another charge')}</strong><p>{t('Se conserva el mismo identificador durante reintentos y al regresar a esta pestaña. Verifica el resultado antes de cambiar la venta.','The same identifier is kept for retries and when returning to this tab. Verify the result before changing this sale.')}</p>{!remote&&<button disabled={busy} onClick={verify}>{t('Verificar resultado en servidor','Check server result')}</button>}{snapshot.current&&!remote&&<button disabled={busy} onClick={()=>submit(attempt.kind)}>{t('Reintentar el mismo intento','Retry same attempt')}</button>}</div>}
  <div className="pos-mobile-summary"><span>{cart.reduce((s,x)=>s+x.quantity,0)} {t('artículos','items')} · {money(totals.total)}</span><button onClick={()=>{cartRef.current?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});cartRef.current?.focus({preventScroll:true})}}>{t('Ver venta','View sale')}<ArrowRight aria-hidden="true"/></button></div>
  <div className="pos-sale-layout"><section className="pos-catalog"><div className="pos-catalog-heading"><h3>{profileCopy.catalog}</h3><span>{filtered.length} {t('disponibles','available')}</span></div><label className="pos-search"><Search aria-hidden="true"/><span className="pos-sr-only">{t('Buscar productos y servicios','Search products and services')}</span><Input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder={profileCopy.search}/></label><div className="pos-categories" role="group" aria-label={t('Filtrar catálogo','Filter catalog')}>{[{id:'all',name:t('Todo','All'),Icon:LayoutGrid},...(capabilities.serviceFirst?[{id:'service',name:profileCopy.services,Icon:Scissors},{id:'product',name:profileCopy.products,Icon:ShoppingBag}]:[{id:'product',name:profileCopy.products,Icon:ShoppingBag},{id:'service',name:profileCopy.services,Icon:Scissors}])].filter(group=>group.id==='all'||available.some(item=>item.type===group.id)).map(({id,name,Icon})=><button key={id} aria-pressed={category===id} onClick={()=>setCategory(id)}><Icon aria-hidden="true"/>{name}</button>)}</div>
   {filtered.length===0?<div className="pos-empty" role="status"><ShoppingBag aria-hidden="true"/><h3>{available.length?t('No hay coincidencias','No matches'):t('Tu catálogo está vacío','Your catalog is empty')}</h3><p>{available.length?t('Cambia la búsqueda o selecciona otra categoría.','Change the search or choose another category.'):t('Guarda productos o servicios activos desde Catálogo para vender aquí.','Save active products or services in Catalog to sell here.')}</p>{available.length>0&&<button onClick={()=>{setSearch('');setCategory('all')}}>{t('Limpiar filtros','Clear filters')}</button>}</div>:<div className="pos-product-grid">{filtered.map(item=>{const quantity=cart.find(x=>x.id===item.id)?.quantity||0;const limit=posQuantityLimit(item);return <button className="pos-product" key={item.id} disabled={locked||quantity>=limit||cart.length>=50&&!quantity} onClick={()=>add(item)} aria-label={`${t('Añadir','Add')} ${itemName(item)} · ${money(Math.round(item.price*100))}`}><div className="pos-product-photo">{item.imageAssetKey?<img src={asset(item.imageAssetKey)} alt="" loading="lazy" onError={e=>{e.currentTarget.style.visibility='hidden'}}/>:item.type==='service'?<Scissors aria-hidden="true"/>:<ShoppingBag aria-hidden="true"/>}{quantity>0&&<span className="pos-product-count">{quantity}</span>}</div><div className="pos-product-info"><small>{item.type==='service'?t('Servicio','Service'):t('Producto','Product')}</small><strong>{itemName(item)}</strong><div><b>{money(Math.round(item.price*100))}</b><Plus aria-hidden="true"/></div><span>{limit===0?t('Agotado','Sold out'):item.type==='product'&&item.trackInventory&&item.inventory!=null?`${item.inventory} ${t('en stock','in stock')}`:item.requiresAppointment?t('Citas en Reservaciones','Appointments in Bookings'):t('Añadir a la venta','Add to sale')}</span></div></button>})}</div>}
  </section><aside className="pos-order" ref={cartRef} tabIndex={-1} aria-label={t('Venta actual','Current sale')}><div className="pos-order-heading"><div><small>{t('CHECKOUT','CHECKOUT')}</small><h3>{t('Venta actual','Current sale')}</h3></div><ShoppingBag aria-hidden="true"/></div>{lines.length===0?<p className="pos-order-empty">{t('Selecciona productos o servicios del catálogo para empezar.','Select catalog products or services to begin.')}</p>:<div className="pos-order-lines">{lines.map(({line,item})=><article key={line.id}><div><strong>{item?itemName(item):t('Artículo no disponible','Unavailable item')}</strong><span>{item?money(Math.round(item.price*100)*line.quantity):'—'}</span></div><div className="pos-quantity" role="group" aria-label={item?itemName(item):line.id}><button disabled={locked} aria-label={t('Restar','Decrease')+' '+(item?itemName(item):line.id)} onClick={()=>change(line.id,line.quantity-1)}><Minus aria-hidden="true"/></button><output aria-label={t('Cantidad','Quantity')}>{line.quantity}</output><button disabled={locked||!item||line.quantity>=posQuantityLimit(item)} aria-label={t('Sumar','Increase')+' '+(item?itemName(item):line.id)} onClick={()=>change(line.id,line.quantity+1)}><Plus aria-hidden="true"/></button><button disabled={locked} aria-label={t('Quitar','Remove')+' '+(item?itemName(item):line.id)} onClick={()=>{if(!locked)setCart(current=>current.filter(x=>x.id!==line.id))}}><Trash2 aria-hidden="true"/></button></div></article>)}</div>}
   {site.business?.locations?.length>0&&<label>{t('Sucursal de venta','Sale branch')}<select value={locationId} disabled={locked} onChange={event=>setLocationId(event.target.value)}>{site.business.locations.map((location:any)=><option key={location.id} value={location.id}>{location.name}</option>)}</select></label>}<fieldset disabled={locked} className="pos-fields"><legend>{t('Detalles de la venta','Sale details')}</legend>{canAdjust?<div className="pos-adjustments"><label>{t('Descuento $','Discount $')}<Input type="text" inputMode="decimal" value={discount} onChange={e=>setDiscount(e.target.value)}/></label><label>{t('Propina $','Tip $')}<Input type="text" inputMode="decimal" value={tip} onChange={e=>setTip(e.target.value)}/></label></div>:<p className="pos-note">{t('Descuentos y propinas requieren el Dueño.','Discounts and tips require the Owner.')}</p>}<section className="pos-customer-info" aria-label={t('Información del cliente','Customer Info')}><h3>{t('Información del cliente','Customer Info')}</h3><label>{t('Nombre','Name')}<Input autoComplete="off" value={customer.name} onChange={e=>setCustomer({...customer,name:e.target.value})}/></label><label>Email<Input type="email" autoComplete="off" value={customer.email} onChange={e=>setCustomer({...customer,email:e.target.value})}/></label><label>{t('Teléfono','Phone')}<Input type="tel" autoComplete="off" value={customer.phone} onChange={e=>setCustomer({...customer,phone:e.target.value})}/></label></section><label>{t('Pago presencial recibido','In-person payment received')}<select value={method} onChange={e=>setMethod(e.target.value)}><option value="cash">{t('Efectivo','Cash')}</option><option value="manual_ath">ATH Móvil · {t('manual','manual')}</option><option value="other">{t('Otro método recibido','Other received method')}</option></select></label></fieldset>
   <dl className="pos-totals" aria-live="polite"><div><dt>Subtotal</dt><dd>{money(totals.subtotal)}</dd></div><div><dt>{t('Descuento','Discount')}</dt><dd>−{money(totals.discount)}</dd></div><div><dt>{site.taxConfig?.pricesIncludeTax?t('IVU incluido · estimado','Included tax · estimated'):t('IVU estimado','Estimated tax')}</dt><dd>{money(totals.tax)}</dd></div><div><dt>{t('Propina','Tip')}</dt><dd>{money(totals.tip)}</dd></div><div className="pos-grand-total"><dt>{t('Total estimado','Estimated total')}</dt><dd>{totals.invalid?'—':money(totals.total)}</dd></div></dl>
   {totals.invalid&&<p className="ca-error" role="alert">{t('Revisa las existencias y cantidades. Usa importes positivos con hasta dos decimales.','Check stock and quantities. Use positive amounts with up to two decimal places.')}</p>}
   {!canCollect&&<p className="pos-note" role="note">{t('El Dueño debe autorizar por separado el registro de cobros presenciales. Puedes preparar la venta.','The Owner must separately authorize recording in-person payments. You can prepare the sale.')}</p>}
   <div className="pos-checkout-actions"><button data-training="pos-pay" className="pos-primary" disabled={locked||!cart.length||totals.invalid||!canCollect} onClick={()=>submit('direct')}>{busy?t('Procesando…','Processing…'):practice?t('Completar cobro de práctica','Complete practice payment'):t('Registrar pago recibido','Record received payment')}<ArrowRight aria-hidden="true"/></button>{site.paymentRules?.methods?.stripe&&(site.paymentRules?.stripeConnectedAccountId||site.paymentRules?.stripeReady)?<button disabled={locked||!cart.length||totals.invalid} onClick={()=>submit('card')}><CreditCard aria-hidden="true"/>{t('Crear checkout Stripe','Create Stripe checkout')}</button>:<p className="pos-note">{t('Conecta Stripe en Pagos para crear un checkout de tarjeta.','Connect Stripe in Payments to create a card checkout.')}</p>}</div>
   {remote&&<div className="pos-remote"><p>{t('El QR aparece automáticamente en la pantalla vinculada. El cliente paga desde su celular; esta venta consulta la confirmación del servidor.','The QR appears automatically on the paired screen. The customer pays on their phone; this sale checks server confirmation.')}</p><button disabled={busy} onClick={verify}>{t('Verificar resultado en servidor','Check server result')}</button><strong>{status?.paymentStatus==='paid'?t('Pago confirmado','Payment confirmed'):t('Esperando verificación del servidor','Awaiting server verification')}</strong>{status&&<p>{status.paymentStatus==='paid'?t('Pagado','Paid'):t('Pendiente de verificación','Pending verification')} · {money(status.amountTotal)}</p>}{status?.paymentStatus!=='paid'&&<><a href={remote.checkoutUrl} target="_blank" rel="noopener noreferrer">{t('Abrir checkout','Open checkout')}</a><CopyButton value={remote.checkoutUrl} lang={lang}/><button onClick={()=>setShowQr(value=>!value)} aria-expanded={showQr}>{t('Mostrar QR','Show QR')}</button>{showQr&&<KioskCheckoutQR url={remote.checkoutUrl} lang={lang}/>}</>}{status?.paymentStatus==='paid'&&<button onClick={()=>{setRemote(null);setStatus(null);setReceiptId('');setShowQr(false)}}>{t('Nueva venta','New sale')}</button>}</div>}
   {operations.displayEnabled&&<PosCustomerDisplay siteId={site.siteId} lang={lang} items={cart} discountCents={totals.discount} tipCents={totals.tip} attemptId={attempt?.id||displayAttempt} invalid={totals.invalid}/>}
   <p className="pos-note">{t('IVU y total definitivo calculados en servidor. Solo el proveedor y el backend confirman pagos con tarjeta.','Final tax and total are calculated on the server. Card payments are confirmed only by the provider and backend.')}</p><details className="pos-device-note"><summary>Tap to Pay / Stripe Terminal</summary><p>{t('Safari no puede cobrar NFC. Tap to Pay requiere dispositivo, SDK y aplicación nativa compatibles; no está disponible en este POS web. ATH Móvil manual registra un pago que el cajero ya verificó, no consulta ATH Business.','Safari cannot collect NFC payments. Tap to Pay requires a supported device, SDK and native app; it is unavailable in this web POS. Manual ATH Móvil records a payment already verified by the cashier; it does not query ATH Business.')}</p></details>
  </aside></div>
 </PortalPanel>
}
