import {usePractice} from './training/practice-context'
import {useWorkspaceFetch,useWorkspacePaused} from './training/workspace-services'
import {useEffect,useRef,useState} from 'react'
import CopyButton from './CopyButton'
import type {PosLine} from './pos-domain'
const displayRequest=async(fetch:ReturnType<typeof useWorkspaceFetch>,input:unknown)=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);try{const r=await fetch('/.netlify/functions/client-customer-display',{method:'POST',signal:controller.signal,credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});const data=await r.json();if(!r.ok)throw Object.assign(new Error(data.message||'Display request failed.'),{status:r.status});return data}finally{clearTimeout(timer)}}
type Recovery={id:string;kind:'direct'|'card';transactionId:string;checkoutUrl?:string}
export default function PosCustomerDisplay({siteId,operatorId,lang,items,customer,discountCents,tipCents,attemptId,invalid,onRestoreAttempt,onRestoring}:{siteId:string;operatorId:string;lang:'es'|'en';items:PosLine[];customer:{name:string;email:string;phone:string};discountCents:number;tipCents:number;attemptId:string;invalid:boolean;onRestoreAttempt:(value:Recovery|null)=>void;onRestoring:(value:boolean)=>void}){
 const fetch=useWorkspaceFetch(),paused=useWorkspacePaused(),practice=usePractice()
 const request=(input:unknown)=>displayRequest(fetch,input)
 const storageKey=`wf-pos-display:${siteId}:${operatorId}`
 const readSaved=()=>{try{if(practice)return null;const v=JSON.parse(localStorage.getItem(storageKey)||'null');return /^[a-f0-9]{32}$/.test(v?.id||'')?{id:v.id,pairUrl:''}:null}catch{return null}}
 const [session,setSession]=useState<{id:string;pairUrl:string}|null>(readSaved),[paired,setPaired]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const restore=useRef(onRestoreAttempt);restore.current=onRestoreAttempt
 const restoring=useRef(Boolean(session)),sequence=useRef(0),draft=useRef({items,customer,discountCents,tipCents,attemptId,invalid}),queue=useRef(false)
 const t=(a:string,b:string)=>lang==='es'?a:b
 draft.current={items,customer,discountCents,tipCents,attemptId,invalid}
 const remember=()=>{if(practice||!session)return true;try{localStorage.setItem(storageKey,JSON.stringify({id:session.id}));return true}catch{setError(t('El navegador no permite recordar esta vinculación.','This browser cannot remember the pairing.'));return false}}
 const forget=()=>{try{localStorage.removeItem(storageKey)}catch{}}
 useEffect(()=>{
  if(!session||paused)return;let stopped=false
  const sync=async()=>{
   if(stopped||queue.current||!restoring.current&&draft.current.invalid)return
   queue.current=true
   try{
    if(restoring.current){
     onRestoring(true)
     const data=await request({siteId,action:'resume',id:session.id})
     if(stopped)return
     sequence.current=data.sequence;setPaired(data.paired);restore.current(data.activeAttempt||null);restoring.current=false;onRestoring(false);setError('');return
    }
    const data=await request({siteId,action:'sync',id:session.id,sequence:++sequence.current,...draft.current})
    if(!stopped){setPaired(data.paired);if(!data.paired||remember())setError('')}
   }catch(e){if(!stopped){setError(e instanceof Error?e.message:'Error');if(restoring.current&&[403,404,409].includes(Number((e as {status?:number}).status))){forget();restoring.current=false;onRestoring(false);setSession(null);setPaired(false)}}}
   finally{queue.current=false}
  }
  void sync();const timer=setInterval(sync,5000);window.addEventListener('focus',sync)
  return()=>{stopped=true;clearInterval(timer);window.removeEventListener('focus',sync);onRestoring(false)}
 },[session,siteId,paused])
 useEffect(()=>{if(!session||invalid||paused||restoring.current)return;const timer=setTimeout(()=>{if(!queue.current)void request({siteId,action:'sync',id:session.id,sequence:++sequence.current,...draft.current}).then(data=>{setPaired(data.paired);if(!data.paired||remember())setError('')}).catch(e=>setError(e.message))},350);return()=>clearTimeout(timer)},[session,items,customer,discountCents,tipCents,attemptId,invalid,siteId,paused])
 const connect=async()=>{setBusy(true);setError('');try{const data=await request({siteId,action:'create'});sequence.current=0;restoring.current=false;setPaired(false);setSession(data)}catch(e){setError(e instanceof Error?e.message:'Error')}finally{setBusy(false)}}
 const revoke=async()=>{if(!session)return;setBusy(true);try{await request({siteId,action:'revoke',id:session.id});forget();setSession(null);setPaired(false);setError('')}catch(e){setError(e instanceof Error?e.message:'Error')}finally{setBusy(false)}}
 return <details className="pos-customer-display"><summary>{t('Pantalla del cliente','Customer display')}</summary><p>{t('Vincula una segunda pantalla para mostrar únicamente esta venta. Sin acceso administrativo.','Pair a second screen to show only this sale. No administrative access.')}</p>{session?<><p role="status">{paired?t('Pantalla vinculada · sincronización activa','Screen paired · synchronization active'):t('Enlace listo · vence en diez minutos','Link ready · expires in ten minutes')}</p>{!paired&&session.pairUrl&&<><a href={session.pairUrl} target="_blank" rel="noopener noreferrer">{t('Abrir pantalla','Open screen')}</a><CopyButton value={session.pairUrl} lang={lang}/><p>{t('Abre el enlace en la segunda pantalla y confirma la vinculación. No lo compartas con otros dispositivos.','Open the link on the second screen and confirm pairing. Do not share it with other devices.')}</p></>}<button disabled={busy} onClick={revoke}>{t('Desconectar pantalla','Disconnect screen')}</button></>:<button disabled={busy} onClick={connect}>{t('Vincular pantalla','Pair screen')}</button>}{error&&<p role="alert">{error}</p>}{invalid&&session&&<p role="status">{t('Corrige la venta para sincronizarla.','Correct the sale to synchronize it.')}</p>}</details>
}
