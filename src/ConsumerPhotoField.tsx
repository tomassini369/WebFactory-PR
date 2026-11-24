import {useEffect,useState} from 'react'

export async function prepareConsumerPhoto(file:File){
 const source=URL.createObjectURL(file)
 try{
  const image=new Image()
  image.src=source
  await image.decode()
  const side=Math.min(image.naturalWidth,image.naturalHeight)
  const canvas=document.createElement('canvas')
  canvas.width=canvas.height=Math.min(512,side)
  const context=canvas.getContext('2d')
  if(!context||!side)throw new Error('Unreadable image')
  context.fillStyle='#fff'
  context.fillRect(0,0,canvas.width,canvas.height)
  context.drawImage(image,(image.naturalWidth-side)/2,(image.naturalHeight-side)/2,side,side,0,0,canvas.width,canvas.height)
  return canvas.toDataURL('image/jpeg',.85)
 }finally{URL.revokeObjectURL(source)}
}

type Props={lang:'es'|'en';saved?:string;draft?:File|null;disabled:boolean;onChange:(value:File|null|undefined)=>void}
export default function ConsumerPhotoField({lang,saved,draft,disabled,onChange}:Props){
 const es=lang==='es',[url,setUrl]=useState(''),[invalid,setInvalid]=useState(false)
 useEffect(()=>{
  const source=draft?URL.createObjectURL(draft):''
  setUrl(source)
  return ()=>{if(source)URL.revokeObjectURL(source)}
 },[draft])
 const preview=draft===undefined?saved:draft?url:''
 return <fieldset className="cs-photo-field" disabled={disabled}><legend>{es?'Foto de perfil':'Profile photo'}</legend>
  {preview&&<img className="cs-photo-preview" src={preview} alt={es?'Vista previa de la foto':'Profile photo preview'}/>}
  <label>{es?'Elegir foto':'Choose photo'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>{
   const file=event.currentTarget.files?.[0]
   event.currentTarget.value=''
   if(!file)return
   const valid=['image/jpeg','image/png','image/webp'].includes(file.type)&&file.size>0&&file.size<=4*1024*1024
   setInvalid(!valid)
   if(valid)onChange(file)
  }}/></label><small>{es?'JPG, PNG o WebP de hasta 4 MB.':'JPG, PNG or WebP up to 4 MB.'}</small>
  {invalid&&<p role="alert">{es?'Selecciona una imagen en uno de los formatos y tamaños indicados.':'Choose an image within the listed formats and size.'}</p>}
  {preview&&<button type="button" onClick={()=>{onChange(null);setInvalid(false)}}>{es?'Quitar foto':'Remove photo'}</button>}
 </fieldset>
}
