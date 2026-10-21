import {posCapabilities} from '../../netlify/lib/pos-capabilities.mjs'
import {validatePublicSiteSlug} from '../../netlify/lib/client-site-slug.mjs'
import {accountingReport} from '../../netlify/lib/business-accounting.mjs'
// This adapter has no network fallback, credentials, tenant records or SDKs.
// It services only a finite set of practice actions against its own fixture.
const copy = value => structuredClone(value)
const json = (value, status = 200) => new Response(JSON.stringify(value), {status, headers: {'Content-Type': 'application/json'}})
const fail = (message, status = 400) => Object.assign(new Error(message), {status})
const text = value => typeof value === 'string' ? value.trim().slice(0, 300) : ''
const adminRoles = new Set(['owner', 'admin'])
const accountingRoles = new Set(['owner', 'admin'])
const safeColor = (color, fallback) => /^#[a-f\d]{6}$/i.test(color || '') ? color : fallback
const sampleProduct = {id:'practice-product',type:'product',name:'Practice product',nameEn:'Practice product',nameEs:'Producto de práctica',description:'Sample only',descriptionEn:'Sample only',descriptionEs:'Solo ejemplo',price:12,active:true,inventory:20,trackInventory:true,requiresAppointment:false,duration:30,bufferMinutes:0}
const sampleService = {...sampleProduct,id:'practice-service',type:'service',name:'Practice service',nameEn:'Practice service',nameEs:'Servicio de práctica',price:25,inventory:null,trackInventory:false,requiresAppointment:true}

export function createPracticeRuntime(options) {
 const clock = options.now || Date.now
 const siteId = 'wf-practice-' + crypto.randomUUID()
 const role = ['owner','admin','employee'].includes(options.role) ? options.role : 'employee'
 const capabilities = [...new Set((options.capabilities || []).filter(value => typeof value === 'string'))]
 const listeners = new Set()
 const admin = adminRoles.has(role)
 const timestamp = () => new Date(clock()).toISOString()
 const user = {id:'practice-user',email:'practice@example.invalid',userMetadata:{full_name:'Practice / Práctica'},mfa:{required:false}}
 const site = {siteId,slug:'practice-business',status:'draft',revision:1,business:{name:'Practice business',nameEn:'Practice business',nameEs:'Negocio de práctica',category:text(options.category)||'Retail',email:'practice@example.invalid',phone:'',locations:[{id:'practice-location',name:'Practice / Práctica',active:true,address:'Sample / Ejemplo',hours:{}}],policies:{privacy:'',terms:'',refund:''}},design:{primary:safeColor(options.design?.primary,'#0b1529'),secondary:safeColor(options.design?.secondary,'#285fa6'),style:'Modern'},catalog:[copy(sampleProduct),copy(sampleService)],employees:[{id:'practice-employee',name:'Practice employee / Empleado de práctica',role:'Professional',roleEn:'Professional',roleEs:'Profesional',active:true,serviceIds:['practice-service'],locationIds:['practice-location'],calendarId:'',dailyLimit:8,schedule:{},timeOff:[]}],members:[],hours:{},paymentRules:{methods:{inPerson:true,stripe:false,ath:false},allowTips:true,productPayment:'in_person',bookingPayment:'in_person'},googleCalendar:{connected:false},settings:{locale:'es',timezone:'America/Puerto_Rico',currency:'USD'},taxConfig:{enabled:true,stateRate:10.5,municipalRate:1,defaultTaxable:true,pricesIncludeTax:false},features:{},servicePlan:{code:'complimentary',name:'Training',billingModel:'complimentary',subscriptionStatus:'complimentary'}}
 const sampleTransaction = {transactionId:'practice-order',kind:'order',customer:{name:'Sample / Ejemplo',email:'sample@example.invalid',phone:''},items:[{id:'practice-product',name:'Practice product / Producto de práctica',quantity:1,unitAmount:1200}],amountTotal:1338,paymentStatus:'paid_in_person',status:'confirmed',createdAt:timestamp(),paidAt:timestamp(),queueNumber:'DEMO-01',kitchenStatus:'received',locationId:'practice-location',locationName:'Practice / Práctica'}
 const state = {site,orders:[sampleTransaction],bookings:[{...copy(sampleTransaction),transactionId:'practice-booking',kind:'booking',queueNumber:'',start:timestamp(),employeeId:'practice-employee',bookingCode:'DEMO-BOOKING',checkedInAt:null}],receipts:[],links:[],movements:[],expenses:[],shifts:[],events:[],requests:[],confirmedOperationIds:[],kiosk:{enabled:false,bookingModes:{newBookings:false,existingBookings:false},devices:[],sale:null},display:{id:'practice-display',paired:false,totals:null,payment:'draft',receipt:null},operations:{revision:1,cashierEnabled:options.operations?.cashierEnabled !== false,displayEnabled:options.operations?.displayEnabled === true,profile:options.operations?.profile || 'auto'},ui:{},surface:'portal'}
 const restored = options.snapshot
 // Restore only fixture state, never authority, providers, identities or URLs.
 if (restored && restored.version === 1) {
  for (const key of ['orders','bookings','receipts','links','movements','expenses','shifts','events','requests','confirmedOperationIds']) if (Array.isArray(restored[key]) && restored[key].length < 250) state[key] = copy(restored[key])
  if (restored.site && typeof restored.site === 'object') {
   if(Array.isArray(restored.site.catalog)&&restored.site.catalog.length<=100&&restored.site.catalog.every(item=>item&&typeof item.id==='string'&&typeof item.name==='string'&&Number.isFinite(item.price)&&item.price>=0))site.catalog=copy(restored.site.catalog)
   if(Array.isArray(restored.site.employees)&&restored.site.employees.length<=100&&restored.site.employees.every(item=>item&&typeof item.id==='string'&&typeof item.name==='string'&&Array.isArray(item.serviceIds)))site.employees=copy(restored.site.employees)
   if(restored.site.hours&&typeof restored.site.hours==='object'&&!Array.isArray(restored.site.hours))site.hours=copy(restored.site.hours)
   if (restored.site.business) site.business = {...site.business,...copy(restored.site.business),logoAssetKey:'',email:'practice@example.invalid'}
   try{site.slug=validatePublicSiteSlug(restored.site.slug)}catch{}
  }
  if (restored.ui && typeof restored.ui === 'object' && !Array.isArray(restored.ui)) state.ui = copy(restored.ui)
  if(restored.kiosk&&typeof restored.kiosk==='object')state.kiosk=copy(restored.kiosk)
  if(restored.display&&typeof restored.display==='object')state.display={...state.display,...copy(restored.display),id:'practice-display'}
  if(restored.operations&&typeof restored.operations==='object')state.operations={...state.operations,cashierEnabled:!!restored.operations.cashierEnabled,displayEnabled:!!restored.operations.displayEnabled}
 }
 // Images are not necessary for these fixture exercises; never request tenant assets.
 if(!Array.isArray(site.business.locations))site.business.locations=[]
 for (const item of site.catalog) { delete item.imageAssetKey; delete item.image; delete item.imageUrl }
 for (const employee of site.employees) {employee.calendarId='';employee.id=text(employee.id)||'practice-employee'}
 const emit = (name, detail) => {for (const listener of listeners) listener({name,detail:copy(detail ?? null)})}
 const requireCapability = capability => {if (!capabilities.includes(capability)) throw fail('This practice is not available for your role. / Práctica no disponible para tu rol.',403)}
 const requireAdmin = () => {if (!admin) throw fail('Administrator permission required. / Requiere permisos administrativos.',403)}
 const totals = (items, discount=0, tip=0) => {
  if (!Array.isArray(items) || !items.length || items.length > 50) throw fail('Add practice items first. / Añade artículos de práctica.')
  const lines=items.map(line=>{const item=site.catalog.find(item=>item.id===line.id);if(!item||!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>20)throw fail('Invalid practice items. / Artículos de práctica inválidos.');return {id:item.id,name:item.nameEn||item.name,nameEn:item.nameEn||item.name,nameEs:item.nameEs||item.name,quantity:line.quantity,unitAmount:Math.round(item.price*100)}})
  const subtotal=lines.reduce((sum,line)=>sum+line.unitAmount*line.quantity,0)
  if (![discount,tip].every(value=>Number.isInteger(value)&&value>=0) || discount>subtotal) throw fail('Invalid practice amount. / Importe de práctica inválido.')
  if (!admin && discount>0) throw fail('Discounts require permission. / Descuentos requieren permiso.',403)
  const tax=Math.round((subtotal-discount)*.115)
  return {items:lines,subtotal,discount,tax,tip,total:subtotal-discount+tax+tip,taxIncluded:false}
 }
 const workforceView = () => ({ok:true,enabled:true,paidBreaks:false,revision:1,serverNow:timestamp(),confirmedOperationIds:state.confirmedOperationIds,admin,employeeId:'practice-employee',employees:admin?site.employees:site.employees.filter(employee=>employee.id==='practice-employee'),locations:site.business.locations,bindings:[{email:user.email,employeeId:'practice-employee',locationId:'practice-location'}],shifts:admin?state.shifts:state.shifts.filter(shift=>shift.employeeId==='practice-employee'),requests:admin?state.requests:state.requests.filter(request=>request.employeeId==='practice-employee'),events:admin?state.events:state.events.filter(event=>event.employeeId==='practice-employee'),totals:{todayMinutes:state.shifts.reduce((sum,shift)=>sum+(shift.workedMinutes||0),0),weekMinutes:state.shifts.reduce((sum,shift)=>sum+(shift.workedMinutes||0),0)}})
 const accounting = (query) => ({ok:true,revision:1,report:accountingReport({entries:state.expenses,revision:1},[],site,query?.get('from')||'2000-01-01',query?.get('to')||'2100-01-01',query?.get('employeeId')||'')})
 const displayView = () => ({ok:true,business:{siteId,nameEn:site.business.nameEn,nameEs:site.business.nameEs,logoAssetKey:'',accent:site.design.secondary},stale:false,payment:state.display.payment,totals:state.display.totals,receipt:state.display.receipt})
 const kioskView = () => ({ok:true,business:{siteId,nameEn:site.business.nameEn,nameEs:site.business.nameEs,logoAssetKey:'',primary:site.design.primary,secondary:site.design.secondary,locationName:'Practice / Práctica',bookingUrl:'#'},presentation:{profile:posCapabilities(site,state.operations).profile},saleId:'practice-kiosk-sale',catalog:site.catalog.filter(item=>item.type==='product'),providers:['in_person'],hasAppointments:false,taxConfig:site.taxConfig,bookingModes:{newBookings:false,existingBookings:false},sale:state.kiosk.sale})
 const snapshot = () => ({version:1,...copy(Object.fromEntries(['orders','bookings','receipts','links','movements','expenses','shifts','events','requests','confirmedOperationIds','ui','kiosk','display','operations'].map(key=>[key,state[key]]))),site:copy(site)})
 const process = (name, method, query, body) => {
  const writing = method !== 'GET'
  if (name==='client-admin') {
   if (!writing) return query.has('siteId') ? {ok:true,site:copy(site),membership:{role,capabilities,employeeId:'practice-employee',permissions:{pos:capabilities.includes('pos'),collect:capabilities.includes('collect')},locationIds:['practice-location']},posOperations:state.operations} : {ok:true,sites:[{siteId,slug:site.slug,businessName:site.business.name,status:'draft'}]}
   const map={business:'overview',catalog:'catalog',employees:'employees',hours:'website',slug:'website',settings:'settings',paymentRules:'payments',reviewSettings:'marketing'}
   if (!map[body.section]) throw fail('This action is not available in practice. / Acción no disponible en práctica.',403)
   requireCapability(map[body.section]);requireAdmin()
   if (body.section==='catalog') {
    if (!Array.isArray(body.value) || body.value.length>100 || body.value.some(item=>!text(item.nameEn||item.name)||!Number.isFinite(item.price)||item.price<=0))throw fail('Give each practice item a name and price. / Escribe nombre y precio en cada artículo.')
    site.catalog=copy(body.value);for(const item of site.catalog)delete item.imageAssetKey
   } else if (body.section==='employees') {
    if (!Array.isArray(body.value)||body.value.some(employee=>!text(employee.name)))throw fail('Enter the practice employee name. / Escribe el nombre del empleado de práctica.')
    site.employees=copy(body.value)
   } else if (body.section==='slug') {site.slug=validatePublicSiteSlug(body.value)}
   else if (body.section==='business') site.business={...copy(body.value),logoAssetKey:'',email:'practice@example.invalid'}
   else if (body.section==='paymentRules') site.paymentRules={...copy(body.value),methods:{inPerson:true,stripe:false,ath:false}}
   else site[body.section]=copy(body.value)
   site.revision++;emit('saved.'+body.section,{site});return {ok:true,site:copy(site)}
  }
  if(name==='client-professional'&&!writing){if(!admin&&!capabilities.includes('availabilityRequests'))throw fail('Not authorized.',403);return {ok:true,requests:[]}}
  if (name==='client-commerce-admin') {
   if (!writing) return {ok:true,orders:state.orders,bookings:state.bookings}
   requireCapability(body.action==='kitchen_status'?'kitchen':body.kind==='booking'?'bookings':'orders')
   const row=(body.kind==='booking'?state.bookings:state.orders).find(row=>row.transactionId===body.transactionId)
   if(!row)throw fail('Practice record missing. / Registro de práctica no encontrado.',404)
   if(body.action==='kitchen_status'){row.kitchenStatus=body.kitchenStatus;emit('order.prepared',row)}
   else if(['complete','cancel','check_in','confirm'].includes(body.action)){row.status=body.action==='complete'?'completed':body.action==='cancel'?'cancelled':'confirmed';if(body.action==='check_in')row.checkedInAt=timestamp();emit(body.kind==='booking'?'booking.updated':'order.updated',row)}
   else throw fail('This operation is excluded from practice. / Operación excluida de práctica.',403)
   return {ok:true}
  }
  if (name==='client-pos-sale-idempotent') {
   requireCapability('pos');if(!state.operations.cashierEnabled)throw fail('Practice POS is disabled. / POS de práctica deshabilitado.',403)
   if(!writing||body.paymentMethod!=='cash')throw fail('Use sample cash for this exercise. / Usa efectivo de ejemplo en este ejercicio.',403)
   if(typeof body.saleAttemptId!=='string'||!/^[a-zA-Z0-9_-]{8,120}$/.test(body.saleAttemptId))throw fail('Invalid practice attempt.')
   const existing=state.receipts.find(row=>row.saleAttemptId===body.saleAttemptId)
   if(existing)return {ok:true,receiptId:existing.receiptId}
   const total=totals(body.items,body.discountCents||0,body.tipCents||0)
   const receiptId='DEMO-'+(state.receipts.length+1),transactionId='practice-sale-'+receiptId
   const receipt={...total,items:total.items.map(line=>({...line,amount:line.quantity*line.unitAmount})),businessName:site.business.name,demo:true,discounts:total.discount,paymentMethod:'cash',receiptId,transactionId,saleAttemptId:body.saleAttemptId,createdAt:timestamp(),paymentStatus:'paid_in_person',paymentProvider:'in_person',currency:'usd',customer:{name:'Sample / Ejemplo',email:'',phone:''},business:{name:site.business.name},source:'pos',discountCents:total.discount,taxCents:total.tax,tipCents:total.tip}
   state.receipts.push(receipt);state.orders.push({...sampleTransaction,transactionId,items:total.items,amountTotal:total.total,receiptId,queueNumber:'',source:'pos'})
   emit('pos.completed',{receiptId,total:total.total});return {ok:true,receiptId,transactionId}
  }
  if (name==='client-pos-settings') {
   requireCapability('settings');if(writing){requireAdmin();state.operations={...state.operations,cashierEnabled:!!body.cashierEnabled,displayEnabled:!!body.displayEnabled,profile:body.profile||'auto',revision:state.operations.revision+1};emit('settings.pos',state.operations)}
   return {ok:true,operations:state.operations,canManage:admin}
  }
  if (name==='client-workforce') {
   if(writing){
    if(typeof body.operationId!=='string'||!/^[a-zA-Z0-9_-]{8,120}$/.test(body.operationId))throw fail('Invalid practice operation.')
    if(body.employeeId&&body.employeeId!=='practice-employee')throw fail('Only your practice shift is allowed. / Solo tu jornada de práctica.',403)
    if(state.confirmedOperationIds.includes(body.operationId))return workforceView()
    const active=state.shifts.find(shift=>!shift.end)
    if(body.action==='clock_in'){if(active)throw fail('A practice shift is already open. / Ya tienes una jornada de práctica abierta.',409);state.shifts.push({id:'practice-shift-'+(state.shifts.length+1),employeeId:'practice-employee',locationId:'practice-location',start:timestamp(),end:null,breaks:[],workedMinutes:0,breakMinutes:0})}
    else if(body.action==='start_break'){if(!active||active.breaks.some(b=>!b.end))throw fail('Start a shift first. / Inicia una jornada primero.',409);active.breaks.push({start:timestamp(),end:null})}
    else if(body.action==='end_break'){const pause=active?.breaks.find(b=>!b.end);if(!pause)throw fail('No break is open. / No hay descanso abierto.',409);pause.end=timestamp()}
    else if(body.action==='clock_out'){if(!active||active.breaks.some(b=>!b.end))throw fail('End your break before clocking out. / Termina el descanso antes de salir.',409);active.end=timestamp();active.workedMinutes=Math.max(0,Math.floor((clock()-Date.parse(active.start))/60000))}
    else if(body.action==='request_correction'){if(!text(body.reason))throw fail('Explain the practice correction. / Explica la corrección de práctica.');state.requests.push({id:crypto.randomUUID(),...copy(body),employeeId:'practice-employee',status:'pending'})}
    else throw fail('Administrative attendance changes are excluded from practice. / Cambios administrativos de asistencia excluidos.',403)
    state.confirmedOperationIds.push(body.operationId);state.events.push({id:crypto.randomUUID(),action:body.action,at:timestamp(),employeeId:'practice-employee'});emit('workforce.'+body.action)
   }
   return workforceView()
  }
  if(name==='client-business-accounting'){
   if(!accountingRoles.has(role))throw fail('Accounting permission required. / Requiere permiso de contabilidad.',403)
   if(query.get('format')==='csv')return new Response('type,amount\npractice,0\n',{headers:{'Content-Type':'text/csv'}})
   if(writing){if(body.type!=='expense'||!text(body.description)||!Number.isInteger(body.amountCents)||body.amountCents<=0)throw fail('Only a valid sample expense is allowed. / Solo se permite un gasto de ejemplo válido.');state.expenses.push({id:body.id,type:'expense',description:text(body.description),date:body.date,amountCents:body.amountCents,category:body.category});emit('accounting.expense')}
   return accounting(query)
  }
  if(name==='client-v3-admin'){
   const collection=query.get('collection')
   const permissions={customers:'customers',receipts:'payments','payment-links':'payments','inventory-movements':'catalog',payouts:'payments',inventory:'catalog'}
   if(!writing&&permissions[collection])requireCapability(permissions[collection])
   const map={'customers':[],'receipts':state.receipts,'payment-links':state.links,'inventory-movements':state.movements,'payouts':[]}
   if(writing&&body.action==='adjust_inventory'){
    requireCapability('catalog');requireAdmin()
    const item=site.catalog.find(item=>item.id===body.itemId&&item.type==='product'&&item.trackInventory)
    if(state.movements.some(row=>row.adjustmentId===body.adjustmentId))return {ok:true,site:copy(site)}
    if(!item||!Number.isInteger(body.quantityDelta)||body.quantityDelta===0||!Number.isInteger(item.inventory)||item.inventory+body.quantityDelta<0||!text(body.adjustmentId))throw fail('Enter a valid practice stock adjustment. / Escribe un ajuste de práctica válido.')
    if(!state.movements.some(row=>row.adjustmentId===body.adjustmentId)){item.inventory+=body.quantityDelta;state.movements.push({id:body.adjustmentId,adjustmentId:body.adjustmentId,itemId:item.id,quantityDelta:body.quantityDelta,reason:body.reason,createdAt:timestamp()});site.revision++;emit('inventory.adjusted',{inventory:item.inventory})}
    return {ok:true,site:copy(site)}
   }
   if(writing){if(body.action!=='create_payment_link')throw fail('This action is excluded from practice. / Acción excluida de práctica.',403);requireCapability('payments');if(!text(body.value?.title)||!Number.isInteger(body.value?.amount)||body.value.amount<=0)throw fail('Enter a title and amount. / Escribe título e importe.');state.links.push({...body.value,paymentLinkId:crypto.randomUUID(),token:'practice-only',active:true,createdAt:timestamp()});emit('payments.link')}
   return {ok:true,records:map[collection]||[],customers:[],payouts:[],movements:[]}
  }
  if(name==='client-customer-display'){
   requireCapability('pos')
   if(!writing)return displayView()
   if(body.action==='create'){state.display.paired=false;if(state.ui.pos?.cart?.length)state.display.totals=totals(state.ui.pos.cart);emit('display.created');return {id:state.display.id,pairUrl:'#practice-display'}}
   if(body.action==='sync'){state.display.totals=body.items?.length?totals(body.items,body.discountCents||0,body.tipCents||0):{items:[],subtotal:0,discount:0,tax:0,tip:0,total:0,taxIncluded:false};return {ok:true,paired:state.display.paired}}
   if(body.action==='pair'){state.display.paired=true;state.ui.displayPaired=true;emit('display.paired');return displayView()}
   if(body.action==='revoke'){state.display.paired=false;emit('display.revoked');return {ok:true}}
   throw fail('Unsupported practice display action.',403)
  }
  if(name==='client-kiosk'){
   const action=body.action||query.get('action')
   if(action==='admin'){requireCapability('settings');return {ok:true,...state.kiosk}}
   if(action==='configure'){requireCapability('settings');requireAdmin();if(body.bookingModes)throw fail('This practice covers kiosk orders. Use the bookings activity for appointments. / Esta práctica cubre órdenes del kiosco. Usa Reservaciones para las citas.',403);state.kiosk.enabled=!!body.enabled;emit('kiosk.configured');return {ok:true,...state.kiosk}}
   if(action==='create'){requireCapability('settings');requireAdmin();emit('kiosk.created');return {ok:true,id:'practice-kiosk',pairUrl:'#practice-kiosk'}}
   if(action==='pair'){state.ui.kioskPaired=true;emit('kiosk.paired');return kioskView()}
   if(action==='checkout'){if(body.paymentProvider!=='in_person')throw fail('Use practice in-person payment. / Usa pago presencial de práctica.',403);const total=totals(body.items);state.kiosk.sale={...total,status:'due',saleId:'practice-kiosk-sale',canReset:true,transactionId:'DEMO-KIOSK',queueNumber:'DEMO-02',items:total.items};emit('kiosk.ordered');return kioskView()}
   if(action==='reset'){state.kiosk.sale=null;return kioskView()}
   if(!action)return kioskView()
   throw fail('Unsupported practice kiosk action.',403)
  }
  if(name==='client-inventory-health')return {ok:true,checkedAt:timestamp(),heldCount:0,reviewCount:0,hiddenReviewCount:0,reservations:[],journal:{operationCount:0,reservationCount:0,bytes:0,nearCapacity:false,atCapacity:false},pos:{pointerCount:0,cleanupEligibleCount:0,reviewCount:0,hiddenCount:0,rows:[]}}
  if(name==='client-accounting-export'&&!writing)return new Response('source,amount\npractice,0\n',{headers:{'Content-Type':'text/csv'}})
  if(name==='client-stripe-payouts'&&!writing)return {ok:true,connected:false,payouts:[],records:[]}
  if(['google-calendar-status','stripe-connect-status','ath-connect-status','client-stripe-status','client-ath-status'].includes(name)&&!writing)return {ok:true,connected:false,configured:false,calendars:[],readiness:{},status:{}}
  throw fail('This action is not enabled in Training. No request was sent. / Esta acción no está habilitada en Training. No se envió ninguna solicitud.',403)
 }
 const runtime={siteId,user,membership:{role,capabilities,employeeId:'practice-employee',permissions:{pos:capabilities.includes('pos'),collect:capabilities.includes('collect')},locationIds:['practice-location']},get operations(){return state.operations},site,ui:state.ui,surface:['portal','display','kiosk'].includes(state.ui.trainingSurface)?state.ui.trainingSurface:'portal',subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener)},emit,draft(value){if(value?.siteId!==siteId)return;Object.assign(site,copy(value));site.siteId=siteId;emit('draft.updated',site)},setUi(key,value){state.ui[key]=copy(value);emit('ui.'+key,value)},setSurface(surface){runtime.surface=surface;state.ui.trainingSurface=surface;emit('surface.changed',surface)},snapshot,
  async fetch(input,init){try{
   if(init?.signal?.aborted)throw new DOMException('Aborted','AbortError')
   const raw=input instanceof Request?input.url:String(input)
   const url=new URL(raw,'https://practice.invalid')
   if(url.origin!=='https://practice.invalid')throw fail('External requests are blocked in practice. / Solicitudes externas bloqueadas en práctica.',403)
   if(!/^\/\.netlify\/functions\/[a-z0-9-]+$/.test(url.pathname))throw fail('Unsupported practice endpoint.',403)
   const method=String(init?.method||'GET').toUpperCase()
   if(!['GET','POST','PATCH'].includes(method))throw fail('Unsupported practice method.',403)
   if(init?.body&&typeof init.body!=='string')throw fail('File uploads are disabled in Training. / Los archivos no se suben durante Training.',403)
   let body={}
   try{body=init?.body?JSON.parse(init.body):{}}catch{throw fail('Invalid practice request. / Solicitud de práctica inválida.')}
   if(!body||typeof body!=='object'||Array.isArray(body))throw fail('Invalid practice request.')
   for(const target of [url.searchParams.get('siteId'),body.siteId])if(target&&target!==siteId)throw fail('Cross-business requests are blocked. / Solicitud de otro negocio bloqueada.',403)
   const value=process(url.pathname.split('/').at(-1),method,url.searchParams,body)
   return value instanceof Response?value:json(copy(value))
  }catch(error){if(error.name==='AbortError')throw error;return json({ok:false,message:error.message||'Practice request failed.',code:typeof error.code==='string'?error.code:'practice_only'},error.status||400)}}
 }
 return runtime
}
