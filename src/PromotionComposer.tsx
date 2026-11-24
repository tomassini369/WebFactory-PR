import {useEffect,useRef,useState,type FormEvent} from 'react'
import {uploadPromotionFile} from './promotion-file-upload'
import Cropper,{type Area} from 'react-easy-crop'
import {PromotionPost,type PostMedia} from './PromotionPost'
import {marketplaceRequest,catalogItemUrl,type DirectoryBusiness} from './marketplace-api'
type Draft={file:File;url:string;slot:number;coverTime?:number;uploaded?:{id:string;at:number}}
type Offer={slug:string;itemId:string;name:string;title:string}
type Props={es:boolean;external:boolean;siteId:string;slug:string;busy:boolean;terms:string;price:string;onSubmit:(data:Record<string,unknown>)=>Promise<boolean>}
export default function PromotionComposer({es,external,siteId,slug,busy,terms,price,onSubmit}:Props){
 const [files,setFiles]=useState<Draft[]>([]),[title,setTitle]=useState(''),[body,setBody]=useState(''),[brand,setBrand]=useState(''),[destination,setDestination]=useState(''),[promotion,setPromotion]=useState(''),[offers,setOffers]=useState<Offer[]>([]),[accepted,setAccepted]=useState(false)
 const [cropFile,setCropFile]=useState<Draft|null>(null),[crop,setCrop]=useState({x:0,y:0}),[zoom,setZoom]=useState(1),[area,setArea]=useState<Area|null>(null),[working,setWorking]=useState(false),[progress,setProgress]=useState(0),[error,setError]=useState('')
 const [directory,setDirectory]=useState<DirectoryBusiness>(),[item,setItem]=useState('')
 useEffect(()=>{if(external)return;const controller=new AbortController();marketplaceRequest('directory',undefined,controller.signal).then(r=>setDirectory(r.entries.find((b:DirectoryBusiness)=>b.slug===slug))).catch(()=>{});return()=>controller.abort()},[external,slug])
 const urls=useRef(new Set<string>()),upload=useRef<AbortController|null>(null),gate=useRef(false)
 const objectUrl=(file:File)=>{const url=URL.createObjectURL(file);urls.current.add(url);return url}
 const release=(url:string)=>{URL.revokeObjectURL(url);urls.current.delete(url)}
 useEffect(()=>()=>{upload.current?.abort();for(const url of urls.current)URL.revokeObjectURL(url)},[])
 useEffect(()=>{if(external)return;const controller=new AbortController();marketplaceRequest('promotions',undefined,controller.signal).then(r=>setOffers(r.offers.filter((o:Offer)=>o.slug===slug))).catch(()=>{});return()=>controller.abort()},[external,slug])
 const [status,setStatus]=useState('')
 async function add(file?:File){
  if(!file||gate.current)return
  const video=['video/mp4','video/quicktime','video/x-m4v'].includes(file.type)||/\.(mp4|mov|m4v)$/i.test(file.name)
  if(files.length>=4||!video&&(!['image/jpeg','image/webp','image/png'].includes(file.type)||file.size>4*1024*1024)){
   setError(es?'Selecciona JPG, PNG o WebP de hasta 4 MB, o un video MP4 o MOV.':'Choose JPG, PNG or WebP up to 4 MB, or an MP4 or MOV video.');return
  }
  const slot=[0,1,2,3].find(i=>!files.some(f=>f.slot===i))!
  setError('');setStatus('')
  if(!video){setArea(null);setZoom(1);setCrop({x:0,y:0});setCropFile({file,url:objectUrl(file),slot});return}
  gate.current=true;setWorking(true);setProgress(0)
  const controller=new AbortController();upload.current=controller
  let prepared=false
  try{
   setStatus(es?'Preparando video…':'Preparing video…')
   const {preparePromotionVideo}=await import('./prepare-promotion-video')
   const clip=await preparePromotionVideo(file,es,controller.signal,setProgress)
   controller.signal.throwIfAborted();prepared=true
   setStatus(es?'Subiendo video…':'Uploading video…');setProgress(0)
   const id=await uploadPromotionFile(clip,slot,external?'':siteId,setProgress,controller.signal)
   controller.signal.throwIfAborted()
   setFiles(list=>[...list,{file:clip,url:objectUrl(clip),slot,uploaded:{id,at:Date.now()}}])
   setStatus(es?'Video cargado. Puedes completar el anuncio.':'Video uploaded. You can finish the advertisement.')
  }catch(e){if(!controller.signal.aborted){setStatus('');setError(prepared?(es?'No se pudo subir el video. Comprueba la sesión y vuelve a seleccionarlo.':'Video upload failed. Check your session and select it again.'):e instanceof Error&&/^(Selecciona|El |Este |Choose |The |This )/.test(e.message)?e.message:(es?'No se pudo preparar este archivo. Selecciona un MP4 H.264 o un MOV compatible.':'Could not prepare this file. Choose an H.264 MP4 or a supported MOV.'))}}
  finally{gate.current=false;upload.current=null;if(!controller.signal.aborted)setWorking(false)}
 }
 async function finishCrop(){
  if(!area||!cropFile)return
  setWorking(true)
  try{
   const img=new Image();img.src=cropFile.url;await img.decode()
   const canvas=document.createElement('canvas');canvas.width=Math.min(1200,area.width);canvas.height=Math.round(canvas.width*area.height/area.width)
   const ctx=canvas.getContext('2d');if(!ctx)throw Error()
   ctx.drawImage(img,area.x,area.y,area.width,area.height,0,0,canvas.width,canvas.height)
   const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error()),'image/jpeg',.88))
   const file=new File([blob],cropFile.slot+'-promotion.jpg',{type:blob.type});setFiles(list=>[...list,{file,url:objectUrl(file),slot:cropFile.slot}]);release(cropFile.url);setCropFile(null)
  }catch{setError(es?'No se pudo preparar la imagen.':'Could not prepare image.')}finally{setWorking(false)}
 }
 async function submit(e:FormEvent){
  e.preventDefault();if(gate.current||!files.length||!accepted||cropFile)return;gate.current=true;setWorking(true);setError('');setProgress(0)
  const controller=new AbortController();upload.current=controller
  try{
   const uploaded=[]
   for(const draft of files){
    const cached=draft.uploaded
    let id=cached?.id
    if(!cached||Date.now()-cached.at>=23*3600000){
     id=await uploadPromotionFile(draft.file,draft.slot,external?'':siteId,setProgress,controller.signal)
     const record={id,at:Date.now()};setFiles(list=>list.map(d=>d===draft?{...d,uploaded:record}:d))
    }
    uploaded.push({id,slot:draft.slot,coverTime:draft.coverTime})
   }
   if(await onSubmit({action:'apply',brand,title,body,destination:promotion||item?'':destination,promotion,itemId:promotion?'':item,files:uploaded,accepted})){
    files.forEach(f=>release(f.url));setFiles([]);setStatus('');setTitle('');setBody('');setAccepted(false);setDestination('');setPromotion('');setItem('')
   }
  }catch(e){setError(e instanceof Error?e.message:'Error')}finally{upload.current=null;gate.current=false;setWorking(false)}
 }
 const media:PostMedia[]=files.map(f=>({type:f.file.type,url:f.url,coverTime:f.coverTime}))
 return <form onSubmit={submit} className="mp-composer"><fieldset disabled={busy||working}><legend>{es?'Crear anuncio':'Create advertisement'}</legend>
 {external&&<label>{es?'Marca':'Brand'}<input value={brand} onChange={e=>setBrand(e.target.value)} minLength={2} maxLength={80} required/></label>}
 <label>{es?'Foto o video':'Photo or video'}<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,.mp4,.mov,.m4v" disabled={!!cropFile||files.length>=4} onChange={e=>{add(e.target.files?.[0]);e.target.value=''}}/></label><small>{es?'Hasta 4 archivos. Fotos de hasta 4 MB. Los videos MP4 o MOV de hasta 60 segundos se preparan y suben al seleccionarlos.':'Up to 4 files. Photos up to 4 MB. MP4 or MOV videos up to 60 seconds are prepared and uploaded when selected.'}</small>
 {cropFile&&<section><div className="mp-crop"><Cropper image={cropFile.url} crop={crop} zoom={zoom} aspect={4/5} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_,pixels)=>setArea(pixels)}/></div><label>Zoom<input type="range" min="1" max="3" step=".05" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label><button type="button" disabled={!area} onClick={()=>void finishCrop()}>{es?'Aplicar encuadre':'Apply crop'}</button><button type="button" onClick={()=>{setFiles(list=>[...list,cropFile]);setCropFile(null)}}>{es?'Usar original':'Use original'}</button><button type="button" onClick={()=>{release(cropFile.url);setCropFile(null)}}>{es?'Cancelar':'Cancel'}</button></section>}
 {files.map((f,i)=><div key={f.slot}>{f.file.type==='video/mp4'&&<label>{es?'Escoge el fotograma inicial y pulsa Usar fotograma':'Choose the starting frame and press Use frame'}<video src={f.url} controls playsInline preload="metadata" style={{maxWidth:'100%',maxHeight:240}}/><button type="button" onClick={e=>{const video=e.currentTarget.parentElement?.querySelector('video');if(video){video.pause();setFiles(list=>list.map(d=>d.slot===f.slot?{...d,coverTime:video.currentTime}:d))}}}>{es?'Usar fotograma':'Use frame'} · {(f.coverTime||0).toFixed(1)} s</button></label>}<button type="button" onClick={()=>{release(f.url);setFiles(list=>list.filter(v=>v!==f))}}>{es?'Quitar archivo':'Remove file'} {i+1}</button></div>)}
 <label>{es?'Título':'Title'}<input value={title} onChange={e=>setTitle(e.target.value)} required minLength={5} maxLength={80}/></label><label>{es?'Descripción':'Description'}<textarea value={body} onChange={e=>setBody(e.target.value)} required minLength={10} maxLength={350}/></label>
 {offers.length>0&&<label>{es?'Impulsar una promoción activa':'Boost an active promotion'}<select value={promotion} onChange={e=>setPromotion(e.target.value)}><option value="">{es?'Anuncio independiente':'Standalone ad'}</option>{offers.map(o=><option value={o.itemId} key={o.itemId}>{o.title}</option>)}</select></label>}
 {!promotion&&directory&&<label>{es?'Destino en el catálogo':'Catalog destination'}<select value={item} onChange={e=>setItem(e.target.value)}><option value="">{es?'Página del negocio o enlace':'Business page or link'}</option>{directory.services.map(i=><option key={i.id} value={i.id}>{(es?i.nameEs:i.nameEn)||i.name}</option>)}</select></label>}
 {!promotion&&!item&&<label>{es?'Enlace de destino HTTPS':'HTTPS destination link'}<input type="url" pattern="https://.+" value={destination} onChange={e=>setDestination(e.target.value)} required={external}/></label>}
 <h3>{es?'Vista previa':'Preview'}</h3><PromotionPost es={es} preview post={{id:'preview',brand:brand||directory?.name||slug,title,body,media,sponsored:true,href:promotion||item?catalogItemUrl(slug,promotion||item):destination||(!external?'/negocios/'+slug:undefined),cta:es?'Ver oferta':'View offer'}}/>
 <p>{price}</p><p>{terms}</p><label><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} required/>{es?'Acepto el precio y las condiciones. Tengo derechos sobre el contenido.':'I accept the price and terms and hold the rights to this content.'}</label>
 <button disabled={!accepted||!files.length||!!cropFile}>{es?'Enviar para revisión':'Submit for review'}</button></fieldset>
 {status&&<p role="status">{status}</p>}{working&&<progress aria-label={es?'Progreso':'Progress'} value={progress} max={100}/>} {error&&<p role="alert">{error}</p>}</form>
}
