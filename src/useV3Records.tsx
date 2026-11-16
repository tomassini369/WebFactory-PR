import {useCallback,useEffect,useRef,useState} from 'react'
import {useWorkspaceApi} from './training/workspace-services'

type Collection='customers'|'payment-links'|'receipts'
export function useV3Records<T>(siteId:string,collection:Collection){
 const api=useWorkspaceApi(),scope=siteId+':'+collection
 const alive=useRef(true),current=useRef(scope),pending=useRef<AbortController|null>(null)
 current.current=scope
 const [loadedScope,setLoadedScope]=useState(scope),[rows,setRows]=useState<T[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[cursor,setCursor]=useState<string|null>(null)
 const read=useCallback(async(after='')=>{
  if(!alive.current||scope!==current.current)return
  pending.current?.abort();const controller=new AbortController();pending.current=controller
  setLoading(true);setError('')
  try{
   const query=new URLSearchParams({siteId,collection,...(after?{cursor:after}:{})})
   const result=await api('/.netlify/functions/client-v3-admin?'+query,{signal:controller.signal})
   if(controller.signal.aborted||scope!==current.current)return
   const idField={customers:'customerId','payment-links':'paymentLinkId',receipts:'receiptId'}[collection]
   if(!Array.isArray(result.records)||result.records.some((row:Record<string,unknown>|null)=>!row||typeof row!=='object'||typeof row[idField]!=='string'))throw Error('No se pudo validar el historial. / History could not be validated.')
   setRows(previous=>after?[...previous,...result.records]:result.records)
   setCursor(typeof result.nextCursor==='string'&&result.nextCursor?result.nextCursor:null)
  }catch(e){if(!controller.signal.aborted&&scope===current.current)setError(e instanceof Error?e.message:'History unavailable.')}
  finally{if(!controller.signal.aborted&&scope===current.current)setLoading(false)}
 },[siteId,collection,api,scope])
 useEffect(()=>{alive.current=true;setRows([]);setLoadedScope(scope);setCursor(null);void read();return()=>{alive.current=false;pending.current?.abort()}},[read,scope])
 return {rows:loadedScope===scope?rows:[],loading:loadedScope!==scope||loading,error:loadedScope===scope?error:'',hasMore:loadedScope===scope&&cursor!==null,reload:()=>read(),loadMore:()=>cursor?read(cursor):Promise.resolve()}
}
export function V3RecordsControls({error,loading,hasMore,onReload,onMore,lang}:{error:string;loading:boolean;hasMore:boolean;onReload:()=>Promise<void>;onMore:()=>Promise<void>;lang:'es'|'en'}){
 return <>{error&&<div className="ca-error" role="alert"><p>{error}</p><button type="button" className="ca-primary-link" disabled={loading} onClick={()=>void onReload()}>{lang==='es'?'Reintentar historial':'Retry history'}</button></div>}{hasMore&&!error&&<button type="button" className="ca-primary-link" disabled={loading} onClick={()=>void onMore()}>{lang==='es'?'Cargar más':'Load more'}</button>}</>
}
