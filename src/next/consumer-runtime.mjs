const examples=[['studio','Estudio de ejemplo','Sample studio','Belleza y bienestar','Arecibo','/next/business/corte-clasico.webp'],['local','Tienda de ejemplo','Sample shop','Productos locales','San Juan','/template-images/6996139.jpg'],['service','Servicios de ejemplo','Sample services','Servicios profesionales','Arecibo','/template-images/7433865.jpg']]
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})}
const readList=key=>{try{const value=JSON.parse(localStorage.getItem('wf-next:'+key)||'[]');return Array.isArray(value)?value.filter(id=>examples.some(b=>b[0]===id)):[]}catch{return []}}
export function consumerDirectory(runtime){return examples.map(([slug,nameEs,nameEn,categoryLabel,town,heroUrl])=>({slug,name:nameEs,nameEs,nameEn,category:'sample',categoryLabel,municipalities:[town],description:'Negocio ficticio para explorar Next. Sin clientes ni reseñas reales.',descriptionEs:'Negocio ficticio para explorar Next. Sin clientes ni reseñas reales.',descriptionEn:'A fictional business for exploring Next. No real customers or reviews.',locations:[],heroUrl,logoUrl:'',galleryUrls:[],services:runtime.site.catalog.map(i=>({id:i.id,name:i.nameEs||i.name,nameEs:i.nameEs||i.name,nameEn:i.nameEn||i.name,price:i.price,type:i.type,imageUrl:'',requiresAppointment:i.type==='service'}))}))}
export function consumerOperation({name,url,body,writing,state,runtime,store}){
 const directory=consumerDirectory(runtime),known=slug=>directory.some(b=>b.slug===slug)
 const profile=()=>state.consumer?{...state.consumer.profile,favorites:readList('favorites'),following:readList('following')}:null
 const user=()=>state.consumer?.signedIn?{id:'next-consumer',email:state.consumer.email,userMetadata:{full_name:state.consumer.profile.name}}:null
 const required=()=>{if(!user())fail('Abre primero tu perfil de ejemplo.',401);return state.consumer}
 if(name==='next-consumer-session')return {ok:true,user:user(),simulated:true}
 if(name==='marketplace-directory')return {ok:true,entries:directory,truncated:false}
 if(name==='marketplace-business'){const business=directory.find(b=>b.slug===url.searchParams.get('slug'));if(!business)fail('Ejemplo no disponible.',404);return {ok:true,business}}
 if(name==='marketplace-register'){
  if(!writing)fail('Método no permitido.',405)
  if(body.action==='logout'){if(state.consumer)state.consumer.signedIn=false;store(state);runtime.emit('consumer.session.changed',null);return {ok:true}}
  if(body.action==='login'){
   if(!state.consumer||state.consumer.email!==String(body.email||'').trim().toLowerCase())fail('Crea primero tu perfil de ejemplo con ese email.',401)
   state.consumer.signedIn=true
  }else{
   const email=String(body.email||'').trim().toLowerCase(),name=String(body.name||'').trim()
   if(!name||name.length>100||!email.endsWith('@example.invalid')||!email.split('@')[0]||!body.adult||!body.acceptedTerms)fail('Usa un nombre ficticio, email @example.invalid y confirma que es una simulación.')
   if(state.consumer)fail('Ya existe un perfil de ejemplo en este navegador. Entra con su email.',409)
   state.consumer={email,signedIn:true,profile:{name,municipality:'',revision:1,needsAcceptance:false,restricted:false}}
  }
  store(state);runtime.emit('consumer.session.changed',user());return {ok:true,user:user(),profile:profile(),simulated:true}
 }
 if(name==='marketplace-profile'){
  const consumer=required()
  if(writing){
   if(body.revision!==consumer.profile.revision)fail('El perfil cambió. Recarga antes de guardar.',409)
   if(body.action==='profile'){
    const name=String(body.name||'').trim();if(!name||name.length>100)fail('Escribe un nombre ficticio de hasta 100 caracteres.')
    consumer.profile={...consumer.profile,name,municipality:String(body.municipality||'').slice(0,80)}
   }else if(['favorite','follow'].includes(body.action)){
    if(!known(body.slug))fail('Negocio de ejemplo no disponible.',404)
    const key=body.action==='favorite'?'favorites':'following',list=readList(key),next=body.saved?[...new Set([...list,body.slug])]:list.filter(id=>id!==body.slug)
    localStorage.setItem('wf-next:'+key,JSON.stringify(next))
   }else if(['delete_profile','minor_review'].includes(body.action)){
    consumer.profile={name:'',municipality:'',revision:consumer.profile.revision,needsAcceptance:true,restricted:body.action==='minor_review'}
    localStorage.setItem('wf-next:favorites','[]');localStorage.setItem('wf-next:following','[]')
   }else if(body.action==='accept_policy'){
    if(consumer.profile.restricted||!body.adult||!body.acceptedTerms)fail('Confirma el perfil de ejemplo.')
    consumer.profile.needsAcceptance=false
   }else fail('Acción de ejemplo no disponible.')
   consumer.profile.revision++;store(state)
  }
  return {ok:true,profile:profile(),simulated:true}
 }
 if(name==='marketplace-reviews'){
  state.reviews||=[]
  const slug=body.slug||url.searchParams.get('slug');if(!known(slug))fail('Negocio de ejemplo no disponible.',404)
  const scope=url.searchParams.get('scope');if(scope==='admin'&&runtime.membership?.role!=='owner')fail('Solo administración de ejemplo.',403);const mine=state.reviews.find(r=>r.slug===slug&&r.author==='next-consumer')
  if(!writing){
   if(scope==='mine')return {ok:true,review:user()?mine||null:null}
   const rows=state.reviews.filter(r=>r.slug===slug&&(scope==='admin'||r.status==='published'))
   return {ok:true,reviews:rows.map(({author,...r})=>r),average:rows.length?(rows.reduce((sum,r)=>sum+r.rating,0)/rows.length).toFixed(1):null,nextOffset:null}
  }
  if(body.action==='submit'){
   const consumer=required();if(consumer.profile.needsAcceptance||consumer.profile.restricted)fail('Perfil de ejemplo pendiente.',403)
   if(body.revision!==(mine?.revision||0))fail('La reseña cambió. Recarga antes de guardar.',409)
   const alias=String(body.alias||'').trim(),text=String(body.text||'').trim(),rating=Number(body.rating)
   if(alias.length<2||alias.length>40||alias.includes('@')||text.length<20||text.length>2000||!Number.isInteger(rating)||rating<1||rating>5||!body.experienced||!body.independent)fail('Revisa el texto ficticio, puntuación y confirmación de simulación.')
   const row={id:mine?.id||crypto.randomUUID(),slug,author:'next-consumer',alias,rating,text,status:'pending',revision:(mine?.revision||0)+1,updatedAt:Date.now(),reports:0,reason:'',simulated:true}
   if(mine)Object.assign(mine,row);else state.reviews.push(row)
  }else if(body.action==='withdraw'){
   required();if(!mine||mine.revision!==body.revision)fail('Recarga la reseña antes de retirarla.',409);mine.status='withdrawn';mine.revision++
  }else{
   const row=state.reviews.find(r=>r.id===body.id&&r.slug===slug);if(!row||row.revision!==body.revision)fail('La reseña cambió. Recarga antes de continuar.',409)
   if(body.action==='moderate'){
    if(runtime.membership?.role!=='owner'||!body.reviewed||!['publish','reject'].includes(body.decision)||row.status==='withdrawn')fail('Revisión de ejemplo no válida.',403)
    row.status=body.decision==='publish'?'published':'rejected';row.reason=row.status==='rejected'?String(body.reason||'').slice(0,100):'';row.revision++
   }else if(body.action==='report'){required();row.reports++;row.revision++}
   else fail('Acción de ejemplo no disponible.')
  }
  store(state);return {ok:true,simulated:true}
 }
 return null
}
