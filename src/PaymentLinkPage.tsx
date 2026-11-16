import {useEffect,useState,type FormEvent} from 'react'
import {requestJson,HttpError} from '../shared/http-client.mjs'

type PaymentLinkData={paymentMethods:{stripe:boolean;ath_movil:boolean};locale:'es'|'en';business:{name:string;logo:string};link:{title:string;description:string;amount:number;currency:string;allowQuantity:boolean}}
type Verification='none'|'checking'|'pending'|'paid'|'failed'|'refunded'|'partial'|'unverified'
const money=(cents:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100)
const attemptKey=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('')
export default function PaymentLinkPage({slug,token}:{slug:string;token:string}){
 const [data,setData]=useState<PaymentLinkData|null>(null),[lang,setLang]=useState<'es'|'en'>(()=>document.documentElement.lang==='es'?'es':'en'),[name,setName]=useState(''),[email,setEmail]=useState(''),[phone,setPhone]=useState(''),[quantity,setQuantity]=useState(1),[busy,setBusy]=useState(false),[error,setError]=useState(''),[checkoutAttemptId,setCheckoutAttemptId]=useState(''),[paymentProvider,setPaymentProvider]=useState<'stripe'|'ath_movil'>('stripe'),[reload,setReload]=useState(0),[retryReceipt,setRetryReceipt]=useState(0),[uncertain,setUncertain]=useState(false)
 const [receiptToken]=useState(()=>new URLSearchParams(location.search).get('receipt')||'')
 const [returned]=useState(()=>Boolean(receiptToken||new URLSearchParams(location.search).has('checkout')))
 const [verification,setVerification]=useState<Verification>(returned?'checking':'none')
 const es=lang==='es'
 useEffect(()=>{if(!uncertain)setCheckoutAttemptId('')},[name,email,phone,quantity,paymentProvider])
 useEffect(()=>{
  const controller=new AbortController();setData(null);setError('')
  void requestJson(`/.netlify/functions/public-payment-link?slug=${encodeURIComponent(slug)}&token=${encodeURIComponent(token)}`,{signal:controller.signal},{requireOk:true}).then(body=>{
   if(!body.business||typeof body.business.name!=='string'||!body.link||typeof body.link.title!=='string'||!Number.isSafeInteger(body.link.amount)||body.link.amount<=0||!body.paymentMethods||typeof body.paymentMethods.stripe!=='boolean'||typeof body.paymentMethods.ath_movil!=='boolean')throw Error('No se pudo validar el enlace de pago. / The payment link could not be validated.')
   if(controller.signal.aborted)return
   setData(body);setPaymentProvider(body.paymentMethods.stripe?'stripe':'ath_movil');setLang(body.locale==='es'?'es':'en')
  }).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Payment link unavailable.')})
  return()=>controller.abort()
 },[slug,token,reload])
 useEffect(()=>{
  if(!returned)return
  const url=new URL(location.href);url.searchParams.delete('receipt');url.searchParams.delete('session_id');history.replaceState(history.state,'',url.pathname+url.search+url.hash)
  if(!/^[A-Za-z0-9_-]{32}$/.test(receiptToken)){setVerification('unverified');return}
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>,attempts=0
  const poll=async()=>{
   setVerification('checking')
   try{
    const result=await requestJson('/.netlify/functions/public-buyer-receipt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:receiptToken,slug}),signal:controller.signal},{requireOk:true})
    if(controller.signal.aborted)return
    if(result.status==='ready'&&result.receipt){const state=result.receipt.paymentStatus;setVerification(state==='refunded'?'refunded':state==='partially_refunded'?'partial':['paid','paid_in_person'].includes(state)?'paid':'unverified');return}
    if(result.status==='failed'){setVerification('failed');return}
    if(result.status!=='pending'){setVerification('unverified');return}
    setVerification('pending');if(++attempts<15)timer=setTimeout(()=>void poll(),2000)
   }catch{if(!controller.signal.aborted)setVerification('unverified')}
  }
  void poll();return()=>{controller.abort();clearTimeout(timer)}
 },[slug,receiptToken,returned,retryReceipt])
 const submit=async(event:FormEvent)=>{
  event.preventDefault();if(busy)return;setBusy(true);setError('')
  const id=checkoutAttemptId||attemptKey();setCheckoutAttemptId(id)
  try{
   const body=await requestJson('/.netlify/functions/create-payment-link-checkout',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':id},body:JSON.stringify({slug,token,quantity,paymentProvider,lang,checkoutAttemptId:id,customer:{name,email,phone}})},{requireOk:true})
   if(typeof body.checkoutUrl!=='string'||!body.checkoutUrl)throw Error(es?'No se pudo confirmar el checkout. Consulta al negocio antes de repetir el pago.':'Checkout could not be confirmed. Contact the business before repeating payment.')
   location.assign(body.checkoutUrl)
  }catch(e){if(e instanceof HttpError&&(e.status===0||e.status>=500))setUncertain(true);setError(e instanceof Error?e.message:'Checkout unavailable.');setBusy(false)}
 }
 const title=verification==='paid'?(es?'Pago recibido':'Payment received'):verification==='refunded'?(es?'Pago reembolsado':'Payment refunded'):verification==='partial'?(es?'Pago con reembolso parcial':'Payment partially refunded'):verification==='failed'?(es?'Pago no confirmado':'Payment not confirmed'):verification==='unverified'?(es?'Estado del pago sin verificar':'Payment status unverified'):(es?'Verificando pago…':'Verifying payment…')
 return <main className="wf-pay-page"><section className="wf-pay-card">
  <div className="portal-language"><button disabled={busy||uncertain} className={lang==='en'?'active':''} onClick={()=>setLang('en')}>EN</button><button disabled={busy||uncertain} className={lang==='es'?'active':''} onClick={()=>setLang('es')}>ES</button></div>
  <img src={data?.business.logo||'/webfactory-pr-logo.png'} alt={data?.business.name||'WebFactory PR'}/><small>{es?'PAGO SEGURO · WEBFACTORY':'SECURE PAYMENT · WEBFACTORY'}</small>
  {returned?<><h1>{title}</h1><p role="status">{verification==='paid'?(es?'El servidor confirmó el pago de esta transacción.':'The server confirmed payment for this transaction.'):(es?'Consulta tu recibo o contacta al negocio antes de repetir un pago. El regreso del checkout no confirma por sí solo un cargo.':'Check your receipt or contact the business before repeating payment. Returning from checkout alone does not confirm a charge.')}</p>{receiptToken&&['pending','unverified','failed'].includes(verification)&&<button type="button" onClick={()=>setRetryReceipt(value=>value+1)}>{es?'Verificar de nuevo':'Verify again'}</button>}<a href={'/sites/'+encodeURIComponent(slug)}>{es?'Volver al negocio':'Back to business'}</a></>:!data&&!error?<p role="status">{es?'Cargando pago…':'Loading payment…'}</p>:data?<>
   <h1>{data.link.title}</h1>{data.link.description&&<p>{data.link.description}</p>}<div className="wf-pay-amount">{money(data.link.amount*quantity)}</div>
   <form onSubmit={event=>void submit(event)}><label>{es?'Método de pago':'Payment method'}<select disabled={busy||uncertain} value={paymentProvider} onChange={event=>setPaymentProvider(event.target.value as 'stripe'|'ath_movil')}>{data.paymentMethods.stripe&&<option value="stripe">{es?'Tarjeta · Stripe':'Card · Stripe'}</option>}{data.paymentMethods.ath_movil&&<option value="ath_movil">ATH Móvil</option>}</select></label>
    <label>{es?'Nombre':'Name'}<input disabled={busy||uncertain} value={name} maxLength={180} onChange={event=>setName(event.target.value)} required/></label><label>Email<input disabled={busy||uncertain} type="email" value={email} maxLength={320} onChange={event=>setEmail(event.target.value)} required/></label><label>{es?'Teléfono':'Phone'}<input disabled={busy||uncertain} value={phone} maxLength={80} onChange={event=>setPhone(event.target.value)}/></label>
    {data.link.allowQuantity&&<label>{es?'Cantidad':'Quantity'}<input disabled={busy||uncertain} type="number" min="1" max="20" value={quantity} onChange={event=>setQuantity(Math.max(1,Math.min(20,Math.floor(Number(event.target.value)||1))))}/></label>}
    <button disabled={busy||(!data.paymentMethods.stripe&&!data.paymentMethods.ath_movil)}>{busy?(es?'Abriendo checkout seguro…':'Opening secure checkout…'):uncertain?(es?'Consultar el mismo intento':'Check the same attempt'):`${es?'Pagar':'Pay'} ${money(data.link.amount*quantity)}`}</button>
   </form>{uncertain&&<p role="alert">{es?'El resultado del intento es incierto. No cambies de método ni repitas el pago; consulta al negocio si no se puede recuperar este intento.':'The attempt outcome is uncertain. Do not switch methods or repeat payment; contact the business if this attempt cannot be recovered.'}{' '}<a href={'/sites/'+encodeURIComponent(slug)}>{es?'Volver al negocio':'Back to business'}</a></p>}
   {!data.paymentMethods.stripe&&!data.paymentMethods.ath_movil&&<p>{es?'Este negocio debe conectar un método de pago.':'This business must connect a payment method.'}</p>}
   <p className="wf-pay-note">{es?`El pago se procesa mediante la cuenta ${paymentProvider==='ath_movil'?'ATH Business':'Stripe'} de ${data.business.name}.`:`Payment is processed through ${data.business.name}’s ${paymentProvider==='ath_movil'?'ATH Business':'Stripe'} account.`}</p>
  </>:null}
  {error&&<div className="ca-error" role="alert"><p>{error}</p>{!data&&<button type="button" onClick={()=>setReload(value=>value+1)}>{es?'Reintentar':'Retry'}</button>}</div>}
 </section></main>
}
