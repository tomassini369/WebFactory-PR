import {Input,MP4,QTFF,WEBM,MATROSKA,MPEG_TS,OGG,BlobSource,Output,Mp4OutputFormat,BufferTarget,Conversion} from 'mediabunny'

const maxBytes=4*1024*1024
export async function preparePromotionVideo(file:File,es:boolean,signal:AbortSignal,onProgress:(percent:number)=>void){
 const input=new Input({source:new BlobSource(file),formats:[MP4,QTFF,WEBM,MATROSKA,MPEG_TS,OGG]})
 try{
  const track=await input.getPrimaryVideoTrack()
  if(!track)throw Error(es?'El archivo no contiene una pista de video.':'The file has no video track.')
  const duration=await input.computeDuration()
  if(!Number.isFinite(duration)||duration<=0||duration>60)throw Error(es?'Selecciona un video de hasta 60 segundos.':'Choose a video up to 60 seconds long.')
  signal.throwIfAborted()
  const codec=await track.getCodec()
  const small=file.size<=maxBytes
  const audio=await input.getPrimaryAudioTrack()
  if(small&&codec==='avc'&&(!audio||await audio.getCodec()==='aac')&&await input.getFormat()===MP4)return new File([file],file.name,{type:'video/mp4'})
  const output=new Output({format:new Mp4OutputFormat(),target:new BufferTarget()})
  const recode=!small||codec!=='avc'
  const width=await track.getDisplayWidth(),height=await track.getDisplayHeight()
  const scale=Math.min(1,960/Math.max(width,height))
  const conversion=await Conversion.init({
   input,output,tracks:'primary',
   video:{codec:'avc',...(recode?{forceTranscode:true,width:Math.max(2,2*Math.floor(width*scale/2)),height:Math.max(2,2*Math.floor(height*scale/2)),bitrate:Math.min(2300000,Math.floor(maxBytes*8*.82/duration)-96000)}:{})},
   audio:{codec:'aac',...(recode?{bitrate:96000}:{})},showWarnings:false
  })
  if(!conversion.isValid||conversion.discardedTracks.some(t=>t.track.type==='audio'||t.track.type==='video'))throw Error(es?'Este navegador no puede convertir el video con sus pistas originales. Exporta como MP4 H.264.':'This browser cannot convert the original tracks. Export as H.264 MP4.')
  const cancel=()=>{void conversion.cancel().catch(()=>{})}
  signal.throwIfAborted();signal.addEventListener('abort',cancel,{once:true})
  try{conversion.onProgress=n=>onProgress(Math.round(n*100));await conversion.execute()}finally{signal.removeEventListener('abort',cancel)}
  const bytes=output.target.buffer
  if(!bytes||bytes.byteLength>maxBytes)throw Error(es?'El video preparado supera 4 MB. Recorta el clip e intenta otra vez.':'The prepared video exceeds 4 MB. Shorten the clip and try again.')
  return new File([bytes],file.name.replace(/\.[^.]+$/,'')+'.mp4',{type:'video/mp4'})
 }finally{input.dispose()}
}
