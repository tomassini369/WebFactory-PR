import {weeklyBookingStart} from './booking-time.mjs'
import {kioskAppearance} from '../../netlify/lib/kiosk-skins.mjs'
import {DEFAULT_APPEARANCE,normalizeAppearance} from '../../shared/dashboard-appearance.mjs'
const key='wf-next:explore:v2'
const response=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}})
const clone=value=>structuredClone(value)
const fresh=()=>({version:2,profile:{profile:{name:'Dueño · Next',phone:'',language:null,theme:null},hasPhoto:false,revision:0,version:'0'},appearance:{prefs:{...DEFAULT_APPEARANCE,cardDepth:'raised',buttonDepth:'soft'},hasCustom:false,revision:0,version:'0'},bookings:[],waitlist:[],kioskAppearance:kioskAppearance(),kioskPresets:[],integrations:{},notices:[],deleted:false})
const load=()=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v?.version===2?{...fresh(),...v}:fresh()}catch{return fresh()}}
// This entire transport stays in the experimental bundle. It never calls fetch.
export function attachExplorer(runtime){
 const base=runtime.fetch.bind(runtime)
 runtime.explore=true
 const store=state=>{localStorage.setItem(key,JSON.stringify(state));if(JSON.stringify(load())!==JSON.stringify(state))throw Error('No se pudo verificar el guardado local.');runtime.emit('explore.saved')}
 runtime.fetch=async(input,init={})=>{
  try{
   const raw=input instanceof Request?input.url:String(input),url=new URL(raw,'https://practice.invalid')
   if(url.origin!=='https://practice.invalid'||!/^\/\.netlify\/functions\/[a-z0-9-]+$/.test(url.pathname))return response({ok:false,message:'External requests are blocked.'},403)
   const target=url.searchParams.get('siteId');if(target&&target!==runtime.siteId)return response({ok:false,message:'Unknown experimental business.'},403)
   const name=url.pathname.split('/').at(-1),method=String(init.method||'GET').toUpperCase(),writing=method!=='GET'
   let body={};if(typeof init.body==='string')body=JSON.parse(init.body)
   if(body.siteId&&body.siteId!==runtime.siteId)return response({ok:false,message:'Unknown experimental business.'},403)
   const state=load()
   if(name==='client-kiosk'){
    const action=body.action||url.searchParams.get('action')
    if(action==='appearance'){state.kioskAppearance=kioskAppearance(body.appearance,runtime.siteId);store(state);return response({ok:true,appearance:state.kioskAppearance})}
    if(action==='appearance_presets'){state.kioskPresets=Array.isArray(body.presets)?body.presets.slice(0,20):[];store(state);return response({ok:true,presets:state.kioskPresets})}
    const res=await base(input,init);if(res.ok){const data=await res.json();return response({...data,appearance:state.kioskAppearance,presets:state.kioskPresets,backgroundAssets:[]})}return res
   }
   if(name==='client-customer-display'){
    if(!writing){const view=JSON.parse(localStorage.getItem('wf-next:display:v1')||'null');if(view)return response(view)}
    const res=await base(input,init);if(res.ok&&writing){const view=await(await base('/.netlify/functions/client-customer-display')).json();localStorage.setItem('wf-next:display:v1',JSON.stringify(view));return res}return res
   }
   if(name==='client-pos-sale-idempotent'){
    const res=await base(input,init);if(res.ok){const view=await(await base('/.netlify/functions/client-customer-display')).json();const receipt=runtime.snapshot().receipts.at(-1);if(receipt){view.totals=receipt;view.payment='paid';view.receipt={id:receipt.receiptId,createdAt:receipt.createdAt};localStorage.setItem('wf-next:display:v1',JSON.stringify(view))}}return res
   }
   if(!writing&&name==='client-v3-admin'&&url.searchParams.get('collection')==='customers'){
    const customers=state.bookings.map(b=>({id:b.transactionId,...b.customer,bookingCount:1,orderCount:0,totalSpent:0}));return response({ok:true,records:customers,customers})
   }
   if(!writing&&['tenant-backup-health','review-processing-health','booking-reminder-health'].includes(name))return response({ok:true,enabled:false,health:null})
   if(!writing&&name==='content-claims')return response({ok:true,claims:[]})
   if(!writing&&name==='admin-consumer-review')return response({ok:true,requests:[]})
   if(!writing&&name==='admin-security-audit')return response({ok:true,rows:[]})
   if(!writing&&name==='marketplace-reviews')return response({ok:true,reviews:[],nextOffset:null})
   if(name==='portal-session')return response({ok:true,user:runtime.user})
   if(name==='portal-logout'){runtime.emit('exit.requested');return response({ok:true})}
   if(['portal-profile','dashboard-appearance'].includes(name)){
    const profile=name==='portal-profile',record=profile?state.profile:state.appearance,versionHeader=profile?'X-Profile-Version':'X-Appearance-Version'
    runtime.ui.explorePhoto=state.photo||'';runtime.ui.exploreWallpaper=state.wallpaper||''
    if(writing){
     const expected=new Headers(init.headers).get(versionHeader);if(expected!==record.version)return response({ok:false,message:'La configuración cambió en otra pestaña.'},409)
     if(method==='PUT'){
      if(profile)record.profile={...record.profile,...Object.fromEntries(Object.entries(body).filter(([k])=>['name','phone','language','theme'].includes(k)))}
      else record.prefs=normalizeAppearance(body)
     }else if(method==='POST'){
      const blob=init.body instanceof Blob?init.body:new Blob([init.body],{type:new Headers(init.headers).get('Content-Type')||'image/png'})
      if(blob.size>4*1024*1024||!['image/png','image/jpeg','image/webp'].includes(blob.type))return response({ok:false,message:'Usa JPEG, PNG o WebP de hasta 4 MB.'},400)
      const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob)})
      if(profile){state.photo=data;record.hasPhoto=true;runtime.ui.explorePhoto=data}else{state.wallpaper=data;record.hasCustom=true;record.prefs.background='custom';runtime.ui.exploreWallpaper=data}
     }else if(method==='DELETE'){if(profile){state.photo='';record.hasPhoto=false;runtime.ui.explorePhoto=''}else{state.wallpaper='';record.hasCustom=false;record.prefs={...DEFAULT_APPEARANCE};runtime.ui.exploreWallpaper=''}}
     else return response({ok:false,message:'Unsupported local operation.'},405)
     record.revision++;record.version=crypto.randomUUID();store(state)
    }
    return response({ok:true,...record})
   }
   if(name==='next-booking'){
    if(!writing)return response({ok:true,bookings:state.bookings})
    const item=runtime.site.catalog.find(i=>i.id===body.serviceId&&i.type==='service'&&i.active!==false),person=runtime.site.employees.find(e=>e.id===body.employeeId&&e.active!==false)
    const count=body.count??1
    if(!item||!person||!String(body.name||'').trim()||!Number.isFinite(Date.parse(body.start))||!Number.isInteger(count)||count<1||count>12)return response({ok:false,message:'Completa servicio, profesional, nombre y fecha. Máximo 12 citas.'},400)
    if(person.serviceIds?.length&&!person.serviceIds.includes(item.id))return response({ok:false,message:'Ese profesional no ofrece el servicio seleccionado.'},400)
    const duration=Math.max(15,Number(person.serviceOverrides?.[item.id]?.duration??item.duration)||30),buffer=Math.max(0,Number(item.bufferMinutes)||0),existing=[...runtime.snapshot().bookings,...state.bookings],created=[]
    for(let i=0;i<count;i++){
     const start=Date.parse(weeklyBookingStart(body.start,i,runtime.site.settings?.timezone||'America/Puerto_Rico')),end=start+duration*60000
     const conflict=[...existing,...created].find(b=>b.employeeId===person.id&&!['cancelled','no_show'].includes(b.status)&&start<Date.parse(b.end||new Date(Date.parse(b.start)+duration*60000).toISOString())+buffer*60000&&end+buffer*60000>Date.parse(b.start))
     if(conflict)return response({ok:false,message:'Uno de los horarios está ocupado. No se guardó ninguna cita de esta solicitud.'},409)
     created.push({transactionId:'NEXT-'+crypto.randomUUID(),kind:'booking',status:'confirmed',start:new Date(start).toISOString(),end:new Date(end).toISOString(),employeeId:person.id,customer:{name:String(body.name).trim().slice(0,100),email:String(body.email||'').trim().toLowerCase().slice(0,320),phone:String(body.phone||'').slice(0,40)},items:[{id:item.id,name:item.nameEs||item.name,quantity:1,unitAmount:Math.round(item.price*100)}],amountTotal:Math.round(item.price*100),paymentStatus:'due',paymentProvider:'in_person',createdAt:new Date().toISOString(),locationId:'practice-location',locationName:'Next · Ejemplo',serviceId:item.id,bufferMinutes:buffer,bookingCode:'NEXT-'+String(state.bookings.length+i+1).padStart(4,'0')})
    }
    state.bookings.push(...created);store(state);runtime.emit('booking.updated',created[0]);return response({ok:true,booking:created[0],bookings:created})
   }
   if(name==='booking-waitlist'||name==='client-booking-waitlist'){
    state.waitlist||=[]
    if(!writing)return response({ok:true,requests:state.waitlist,nextCursor:null})
    if(body.action==='join'){
     if(!String(body.name||'').trim()||!String(body.email||'').endsWith('@example.invalid')||!/^\d{4}-\d{2}-\d{2}$/.test(body.from||'')||!/^\d{4}-\d{2}-\d{2}$/.test(body.until||'')||body.until<body.from)return response({ok:false,message:'Usa nombre de ejemplo, email @example.invalid y un rango de fechas válido.'},400)
     const row={id:crypto.randomUUID(),customer:{name:String(body.name).trim().slice(0,100),email:body.email},from:body.from,until:body.until,serviceId:body.serviceId,status:'waiting',createdAt:new Date().toISOString(),simulated:true}
     state.waitlist.push(row);store(state);return response({ok:true,token:row.id,simulated:true})
    }
    const row=state.waitlist.find(r=>r.id===body.id||r.id===body.token)
    if(!row)return response({ok:false,message:'Solicitud no encontrada.'},404)
    if(body.action!=='cancel')return response({ok:false,message:'Solo se pueden cancelar solicitudes de ejemplo.'},400)
    row.status='cancelled';store(state);return response({ok:true,simulated:true})
   }
   if(name==='client-booking-attendance'){
    const bookings=[...runtime.snapshot().bookings,...state.bookings].filter(b=>b.customer?.email?.toLowerCase()===String(body.email||'').trim().toLowerCase()).map(b=>({...b,id:b.transactionId}))
    const total=status=>bookings.filter(b=>b.status===status).length
    return response({ok:true,bookings,summary:{total:bookings.length,completed:total('completed'),noShow:total('no_show'),cancelled:total('cancelled'),lateCancellation:0},simulated:true})
   }
   if(name==='client-commerce-admin'){
    if(writing){const found=state.bookings.find(b=>b.transactionId===body.transactionId);if(found){
     if(!['cancel','complete','confirm','check_in','no_show','mark_paid','refund','reschedule'].includes(body.action))return response({ok:false,message:'Acción no disponible en este ejemplo.'},400)
     if(body.action==='refund'){
      const amount=Math.round(Number(body.amount)*100),remaining=found.amountTotal-(found.refundedAmount||0)
      if(!['paid','paid_in_person'].includes(found.paymentStatus)||!Number.isSafeInteger(amount)||amount<=0||amount>remaining)return response({ok:false,message:'El reembolso de ejemplo excede el pago disponible.'},409)
      found.refundedAmount=(found.refundedAmount||0)+amount
      if(found.refundedAmount===found.amountTotal)found.paymentStatus='refunded'
     }else{
      if(['cancelled','completed','no_show'].includes(found.status))return response({ok:false,message:'La cita está cerrada. Solo puedes gestionar su reembolso si tiene un pago.'},409)
      if(body.action==='mark_paid'){
       if(found.paymentStatus!=='due')return response({ok:false,message:'El pago de ejemplo ya se registró.'},409)
       found.paymentStatus='paid';found.paidAt=new Date().toISOString();found.paymentProvider='in_person'
      }else if(body.action==='reschedule'){
       const start=Date.parse(body.start),duration=Date.parse(found.end)-Date.parse(found.start),end=start+duration
       if(!Number.isFinite(start)||!Number.isFinite(end))return response({ok:false,message:'Fecha no válida.'},400)
       const conflict=[...runtime.snapshot().bookings,...state.bookings].some(b=>b.transactionId!==found.transactionId&&b.employeeId===found.employeeId&&!['cancelled','no_show'].includes(b.status)&&start<Date.parse(b.end||new Date(Date.parse(b.start)+duration).toISOString())+(b.bufferMinutes||0)*60000&&end+(found.bufferMinutes||0)*60000>Date.parse(b.start))
       if(conflict)return response({ok:false,message:'Ese horario está ocupado. La cita conserva su horario anterior.'},409)
       found.start=new Date(start).toISOString();found.end=new Date(end).toISOString()
      }else{
       if(body.action==='complete'&&!['paid','paid_in_person'].includes(found.paymentStatus))return response({ok:false,message:'No puedes completar una cita con pago pendiente.'},409)
       found.status=({cancel:'cancelled',complete:'completed',no_show:'no_show'})[body.action]||'confirmed'
       if(body.action==='check_in')found.checkedInAt=new Date().toISOString()
       if(body.action==='confirm')found.attendanceConfirmedAt=new Date().toISOString()
      }
     }
     store(state);runtime.emit('booking.updated',found);return response({ok:true,booking:found,simulated:true})
    }}
    const r=await base(input,init);if(!writing&&r.ok){const data=await r.json();return response({...data,bookings:[...(data.bookings||[]),...state.bookings]})}return r
   }
   if(name==='webfactory-admin-revenue')return response({ok:true,revenue:{available:false,reason:'not_configured',mode:'test'}})
   if(name==='webfactory-admin-overview'){
    const snap=runtime.snapshot(),s=runtime.site;return response({ok:true,generatedAt:new Date().toISOString(),administrator:{email:runtime.user.email,name:'Administración · Next'},summary:{totalClients:state.deleted?0:1,clients:state.deleted?0:1,blockers:0,publishedSites:0,setupPending:1,activeSubscriptions:0,pastDueSubscriptions:0,connectedStripe:0,commerceRecords:snap.orders.length,totalCatalogItems:s.catalog.length,totalEmployees:s.employees.length},capacity:{level:'healthy',safeClientCapacity:1,activeClients:1,estimatedOpenings:0,utilizationPercent:100,model:'Entorno local de exploración · datos de ejemplo'},resources:{netlify:{plan:'Experimental',monthlyCredits:null,creditsUsed:null,utilizationPercent:null,productionDeployCreditCost:0,productionDeploysThisMonth:null,estimatedDeployCredits:null,apiConnected:false,apiError:'',source:'Local example',dashboardUrl:'#admin'},storage:{clientAssets:0,trackedObjects:0,bytesKnown:false},runtime:{deployId:'local-explorer',deployContext:'experiment',published:false,siteName:'WebFactory PR Next',siteUrl:'#marketplace'}},integrations:{configured:0,total:4,configuration:['Stripe','Google Calendar','Gmail','WhatsApp'].map(name=>({name,configured:false}))},subscriptionBilling:{enabled:false,stripeSecretConfigured:false,priceConfigured:false,monthlyPriceConfigured:false,annualPriceConfigured:false,webhookConfigured:false,missing:[],ready:false},operations:{transactionStatuses:{confirmed:snap.orders.filter(r=>r.status==='confirmed').length},stripeWebhookEvents:0,clientWebhookEvents:0,pendingTransactions:[]},clients:state.deleted?[]:[{siteId:runtime.siteId,slug:s.slug,businessName:s.business.nameEs||s.business.name,ownerEmail:runtime.user.email,status:'draft',revision:s.revision,catalogItems:s.catalog.length,employees:s.employees.length,stripeStatus:'disconnected',calendarConnected:false,planName:'Next · Ejemplo',billingModel:'complimentary',billingStatus:'active',subscriptionStatus:'complimentary',templateMode:'custom',updatedAt:new Date().toISOString(),publicPath:'#storefront'}]})
   }
   if(name==='export-client-site-backup')return response({example:true,site:runtime.snapshot(),bookings:state.bookings})
   if(['create-trial-invite','create-complimentary-invite'].includes(name)){state.notices.push({id:crypto.randomUUID(),type:'invitation',email:String(body.email||''),at:new Date().toISOString()});store(state);return response({ok:true,email:body.email,expiresAt:new Date(Date.now()+7*86400000).toISOString(),simulated:true})}
   if(name==='admin-delete-client-site'){state.deleted=true;store(state);return response({ok:true,simulated:true})}
   if(name==='manage-complimentary-access')return response({ok:true,simulated:true})
   if(name==='next-integrations'){if(writing){if(!['Calendar','Gmail','WhatsApp','Stripe'].includes(body.provider))return response({ok:false,message:'Unknown provider'},400);state.integrations[body.provider]=!!body.enabled;store(state)}return response({ok:true,connections:state.integrations,events:state.notices})}
   return await base(input,init)
  }catch(e){return response({ok:false,message:e.message||'Local operation failed.'},400)}
 }
 const dispatch=runtime.fetch
 runtime.fetch=async(input,init={})=>{
  const result=await dispatch(input,init)
  if(result.ok&&String(init.method||'GET').toUpperCase()!=='GET'){
   try{const serialized=JSON.stringify(runtime.snapshot());localStorage.setItem('wf-next:fixture:v1',serialized);if(localStorage.getItem('wf-next:fixture:v1')!==serialized)throw Error('Readback failed')}
   catch{return response({ok:false,message:'No se pudo guardar en este navegador. Conserva la página abierta y vuelve a intentar.'},400)}
  }
  return result
 }
 return runtime
}
