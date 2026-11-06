import {type BookingView} from './KioskBookingPanel'
import {useEffect,useRef,useState,type FormEvent} from 'react'
import {posCapabilities,posOperations,type PosProfile} from '../netlify/lib/pos-capabilities.mjs'
import {posProfileCopy} from './pos-profile'
import {estimatePosTotals,posItemName,posQuantityLimit,type PosItem,type PosLine,type PosTax} from './pos-domain'
import {useKioskRequest} from './kiosk-api'
import {type KioskAppearance} from '../netlify/lib/kiosk-skins.mjs'
type Language='es'|'en'
type Sale={checkoutMode?:'screen'|'qr';confirmationEmailStatus?:'sent'|'pending'|'action_required';bookingReference?:{code:string;pin:string};kind?:'order'|'booking';status:'review'|'pending'|'paid'|'due'|'cancelled';saleId:string;canResume?:boolean;canReset:boolean;checkoutUrl?:string;transactionId?:string;total?:number;subtotal?:number;tax?:number;taxIncluded?:boolean;queueNumber?:string;receipt?:{id:string;createdAt:string}|null;items?:Array<{name:string;quantity:number;unitAmount:number}>}
type View=BookingView & {business:{siteId:string;nameEn:string;nameEs:string;logoAssetKey:string;primary:string;secondary:string;locationName:string;bookingUrl:string};presentation?:{touchKeyboard?:boolean;profile:PosProfile;appearance?:KioskAppearance};saleId:string;catalog:PosItem[];providers:string[];hasAppointments:boolean;taxConfig:PosTax;sale:Sale|null}
const emptyCustomer={name:'',email:'',phone:''}
export function useKioskCore({lang,setLang,pairing}:{lang:Language;setLang:(lang:Language)=>void;pairing:string}) {
 const kioskRequest=useKioskRequest()
 const t=(a:string,b:string)=>lang==='es'?a:b, token=useRef(pairing), [ready,setReady]=useState(!pairing),[view,setView]=useState<View|null>(null),[cart,setCart]=useState<PosLine[]>([]),[search,setSearch]=useState(''),[category,setCategory]=useState('all'),[customer,setCustomer]=useState(emptyCustomer),[provider,setProvider]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[offline,setOffline]=useState(false),[submitted,setSubmitted]=useState(false),[bookingMode,setBookingMode]=useState<'new'|'existing'|null>(null),lastActivity=useRef(Date.now()),loading=useRef(false),busyRef=useRef(false),currentSale=useRef(''),orderPanel=useRef<HTMLElement|null>(null),[orderVisible,setOrderVisible]=useState(false)
 busyRef.current=busy
 const chooseLanguage=(next:Language)=>{try{localStorage.setItem('wf-kiosk-language',next)}catch{}setLang(next)}
 useEffect(()=>{try{const saved=localStorage.getItem('wf-kiosk-language');if(saved==='es'||saved==='en')setLang(saved)}catch{}},[setLang])
 const touch=()=>{lastActivity.current=Date.now()}
 const receive=(next:View)=>{if(currentSale.current&&currentSale.current!==next.saleId){setCart([]);setCustomer(emptyCustomer);setSearch('');setCategory('all');setSubmitted(false);setBookingMode(null);setProvider(next.providers[0]||'');lastActivity.current=Date.now()}currentSale.current=next.saleId;setView(next);setOffline(false);if(next.sale){setSubmitted(true);setCustomer(emptyCustomer)}else if(!busyRef.current)setSubmitted(false);setProvider(current=>next.providers.includes(current)?current:next.providers[0]||'')}
 useEffect(()=>{document.title=t('Kiosco de autoservicio','Self-service kiosk')},[lang])
 useEffect(()=>{if(!ready)return;let stopped=false;const load=async()=>{if(loading.current||stopped)return;loading.current=true;try{const next=await kioskRequest();if(!stopped){receive(next);setError('')}}catch(e){if(!stopped){setOffline(true);setView(null);setCustomer(emptyCustomer);setError(e instanceof Error?e.message:'Error')}}finally{loading.current=false}};void load();const timer=setInterval(()=>void load(),5000);return()=>{stopped=true;clearInterval(timer)}},[ready])
 useEffect(()=>{const timer=setInterval(()=>{if(!submitted&&!busyRef.current&&Date.now()-lastActivity.current>60000){setCart([]);setCustomer(emptyCustomer);setSearch('');setError('')}},1000);return()=>clearInterval(timer)},[submitted])
 const pair=async()=>{if(busy)return;setBusy(true);setError('');try{const [id,secret]=token.current.split('.');const data=await kioskRequest({action:'pair',id,token:secret});token.current='';receive(data);setReady(true)}catch(e){setError(e instanceof Error?e.message:'Error')}finally{setBusy(false)}}
 useEffect(()=>{const element=orderPanel.current;if(!element||view?.sale){setOrderVisible(false);return}const observer=new IntersectionObserver(entries=>setOrderVisible(entries[0].isIntersecting&&entries[0].intersectionRatio>=.05),{rootMargin:'0px 0px -72px 0px',threshold:.05});observer.observe(element);return()=>observer.disconnect()},[view?.saleId,Boolean(view?.sale)])
 const total=estimatePosTotals(view?.catalog||[],cart,0,0,view?.taxConfig||{}),locked=busy||submitted||offline
 const change=(item:PosItem,delta:number)=>{if(locked)return;touch();setCart(current=>{const qty=(current.find(x=>x.id===item.id)?.quantity||0)+delta;if(delta>0&&qty>posQuantityLimit(item)||qty>0&&!current.some(x=>x.id===item.id)&&current.length>=20)return current;return qty<=0?current.filter(x=>x.id!==item.id):current.some(x=>x.id===item.id)?current.map(x=>x.id===item.id?{...x,quantity:qty}:x):[...current,{id:item.id,quantity:qty}]})}
 const submit=async(event:FormEvent)=>{event.preventDefault();if(!view||locked||total.invalid||!cart.length)return;setBusy(true);setSubmitted(true);setError('');try{const data=await kioskRequest({action:'checkout',saleId:view.saleId,items:cart,customer,paymentProvider:provider,lang});receive(data);setCustomer(emptyCustomer)}catch(e){setCustomer(emptyCustomer);setError(e instanceof Error?e.message:'Error')}finally{setBusy(false)}}
 const resume=async()=>{if(!view||busy||offline)return;setBusy(true);setError('');try{receive(await kioskRequest({action:'resume',saleId:view.saleId}))}catch(e){setError(e instanceof Error?e.message:'Error')}finally{setBusy(false)}}
 const cancelCheckout=async()=>{if(!view||busy||offline||!confirm(t('¿Cancelar la transacción pendiente?','Cancel the pending transaction?')))return;setBusy(true);setError('');try{const next=await kioskRequest({action:'cancel_checkout',saleId:view.saleId});setView(next)}catch(e){setError(e instanceof Error?e.message:'Error')}finally{setBusy(false)}}
 const reset=async()=>{if(!view||busy||offline||!view.sale?.canReset)return;setBusy(true);setError('');try{const next=await kioskRequest({action:'reset',saleId:view.saleId});setCart([]);setCustomer(emptyCustomer);setSubmitted(false);receive(next);touch()}catch(e){setError(e instanceof Error?e.message:'Error')}finally{setBusy(false)}}
 useEffect(()=>{if(!view?.sale?.canReset)return;const timer=setTimeout(()=>void reset(),45000);return()=>clearTimeout(timer)},[view?.saleId,view?.sale?.canReset,offline])
 const primary=/^#[a-f0-9]{6}$/i.test(view?.business.primary||'')?view!.business.primary:'#0b1529'
 const visible=(view?.catalog||[]).filter(item=>(category==='all'||item.type===category)&&posItemName(item,lang).toLocaleLowerCase().includes(search.toLocaleLowerCase()))
 const capabilities=posCapabilities({catalog:view?.catalog||[]},{...posOperations(),profile:view?.presentation?.profile||'general'}),profileCopy=posProfileCopy(capabilities,lang)
 const categories=[{id:'all',label:t('Todo','All')},...(capabilities.serviceFirst?[{id:'service',label:profileCopy.services},{id:'product',label:profileCopy.products}]:[{id:'product',label:profileCopy.products},{id:'service',label:profileCopy.services}])].filter(group=>group.id==='all'||view?.catalog.some(item=>item.type===group.id))
 const sale=view?.sale
 const backFromBooking=()=>{setBookingMode(null);void kioskRequest({action:'clear_booking'}).then(receive).catch(()=>{})}
 return {cancelCheckout,t,touch,profileCopy,chooseLanguage,ready,view,cart,search,setSearch,category,setCategory,customer,setCustomer,provider,setProvider,busy,error,offline,bookingMode,setBookingMode,orderPanel,orderVisible,total,locked,change,submit,resume,reset,visible,categories,sale,primary,pair,receive,backFromBooking}
}

