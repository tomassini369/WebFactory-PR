export async function prepareKioskBackground(file:File){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024)throw new Error('Usa JPG, PNG o WebP hasta 12 MB / Use JPG, PNG or WebP up to 12 MB.')
 const url=URL.createObjectURL(file)
 try{
  const image=new Image();image.src=url;await image.decode()
  for(const edge of [1920,1600,1280]){
   const ratio=Math.min(1,edge/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');ctx.drawImage(image,0,0,canvas.width,canvas.height)
   const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Image unavailable')),'image/webp',.82))
   if(blob.size<=1024*1024)return new File([blob],file.name.replace(/\.[^.]*$/,'')+(blob.type==='image/webp'?'.webp':'.jpg'),{type:blob.type})
  }
  throw Error('Escoge una imagen más sencilla / Choose a simpler image.')
 }finally{URL.revokeObjectURL(url)}
}
