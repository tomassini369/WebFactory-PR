import Uppy from '@uppy/core'
import Tus from '@uppy/tus'

export async function uploadPromotionFile(file:File,slot:number,siteId:string,onProgress:(percent:number)=>void,signal:AbortSignal){
 const params=new URLSearchParams({slot:String(slot)})
 if(siteId)params.set('siteId',siteId)
 const endpoint=new URL('/.netlify/functions/marketplace-ad-upload',window.location.origin)
 endpoint.search=params.toString()
 const client=new Uppy().use(Tus,{endpoint:endpoint.href,chunkSize:512*1024,withCredentials:true,retryDelays:[0,1000,3000],allowedMetaFields:false,removeFingerprintOnSuccess:true})
 const cancel=()=>client.cancelAll()
 signal.addEventListener('abort',cancel,{once:true})
 try{
  signal.throwIfAborted()
  client.addFile({name:file.name,type:file.type,data:file})
  client.on('progress',onProgress)
  const result=await client.upload()
  signal.throwIfAborted()
  const url=result?.successful?.[0]?.uploadURL
  const id=url&&new URL(url,endpoint).searchParams.get('upload')
  if(!id)throw Error('upload')
  return id
 }finally{signal.removeEventListener('abort',cancel);client.destroy()}
}
