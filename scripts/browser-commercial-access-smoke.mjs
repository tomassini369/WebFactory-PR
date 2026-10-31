import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {preview} from 'vite'
import {chromium,webkit} from 'playwright'
import {selectPortalSection} from './qa-workspace-navigation.mjs'
import {commercialCapabilities,employeeSiteView,employeeCommerceRecord,canAccessCommerce} from '../netlify/lib/commercial-access.mjs'
import {changeCommercialMember} from '../netlify/lib/commercial-members.mjs'
const port=Number(process.env.QA_PORT||5320),engine=process.env.QA_ENGINE||'chromium',out='/tmp/webfactory-commercial-access'
await mkdir(out,{recursive:true})
const server=process.env.QA_ORIGIN?null:await preview({preview:{host:'127.0.0.1',port,strictPort:true}})
const browser=await(engine==='webkit'?webkit:chromium).launch(engine==='webkit'?(process.env.QA_WEBKIT_PATH?{executablePath:process.env.QA_WEBKIT_PATH}:{}):(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH,args:['--no-sandbox']}:{}))
let activePage
const root=process.env.QA_ORIGIN||`http://127.0.0.1:${port}`
try{
 for(const width of (process.env.QA_WIDTHS||'320,375,390,430,768,1024,1440').split(',').map(Number))for(const theme of ['light','dark'])for(const lang of ['es','en'])for(const role of ['owner','employee']){
  const context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce'}),page=await context.newPage(),errors=[]
  activePage=page;page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept())
  const user={id:role+'-qa',email:role+'@example.invalid',mfa:{required:false}},member={email:user.email,role,userId:user.id,employeeId:role==='employee'?'p1':'',permissions:{},locationIds:role==='employee'?['one']:[]}
  let site={siteId:'commercial-qa',slug:'commercial-qa',status:'active',revision:1,business:{name:'Isolated commercial QA',category:'Barbershop',locations:[{id:'one',name:'One',active:true}]},design:{primary:'#0b1529',secondary:'#285fa6'},employees:[{id:'p1',name:'Professional QA',role:'Barber',serviceIds:['s1'],locationIds:['one'],active:true,dailyLimit:8,schedule:{},timeOff:[],calendarId:''}],catalog:[{id:'s1',name:'Service QA',type:'service',price:25,active:true,requiresAppointment:true,duration:30}],members:[member,...(role==='owner'?[{email:'legacy@example.invalid',role:'manager'}]:[])],membershipAudit:[],hours:{Monday:{enabled:true,open:'09:00',close:'17:00'}},settings:{timezone:'America/Puerto_Rico',locale:lang},paymentRules:{},googleCalendar:{},features:{},servicePlan:{subscriptionStatus:'complimentary',billingModel:'complimentary'}}
  const record={siteId:site.siteId,transactionId:'booking-qa',kind:'booking',employeeId:'p1',locationId:'one',status:'confirmed',paymentStatus:'due',start:'2028-02-01T14:00:00Z',end:'2028-02-01T14:30:00Z',customer:{name:'Assigned customer',email:'customer@example.invalid',phone:''},items:[{name:'Service QA',quantity:1,unitAmount:2500}],amountTotal:2500,calendarToken:'PRIVATE-DO-NOT-SEND'}
  let writes=0,retiredCalls=0
  await page.addInitScript(theme=>{if(window!==window.top)return;localStorage.setItem('webfactory-theme-v2',theme)},theme)
  await page.route('**/.netlify/functions/**',async route=>{
   const request=route.request(),url=new URL(request.url()),name=url.pathname.split('/').at(-1);let body={ok:true},status=200
   if(name==='dashboard-appearance')body={ok:true,prefs:{},hasCustom:false};
   else if(name==='portal-profile'){assert(['GET','PUT'].includes(request.method()));const preferences=request.method()==='PUT'?request.postDataJSON():{};body={ok:true,profile:{name:'',phone:'',language:preferences.language||null,theme:preferences.theme||null},hasPhoto:false,revision:0,version:'isolated-profile-fixture'}}
   else if(name==='portal-session')body={ok:true,user}
   else if(name==='client-admin'){
    if(request.method()==='PATCH')throw Error('Unexpected general settings mutation')
    body=url.searchParams.has('siteId')?{ok:true,site:employeeSiteView(site,member),membership:{...member,capabilities:commercialCapabilities(member)},posOperations:{cashierEnabled:true,displayEnabled:false,profile:'auto',revision:0}}:{ok:true,sites:[{siteId:site.siteId,slug:site.slug,businessName:site.business.name}]}
   }else if(name==='client-commerce-admin')body={ok:true,orders:[],bookings:canAccessCommerce(site,member,record)?[employeeCommerceRecord(record,member)]:[]}
   else if(name==='client-member-access'){
    assert.equal(role,'owner');const input=request.postDataJSON();site=changeCommercialMember(site,input,{membership:member,user},{id:'legacy-id',email:input.email});writes++;body={ok:true,site,invitationSent:true}
   }else if(name==='client-workforce'){retiredCalls++;throw Error('Retired workforce must never be loaded by the portal')}
   else if(name==='client-professional')body={ok:true,requests:[]}
   else throw Error('Unexpected endpoint '+name)
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)})
  })
  await page.goto(root+'/client-admin');await page.locator('.gd-client-dashboard').waitFor().catch(async error=>{console.error('Portal failure',role,width,errors,await page.locator('body').innerText());throw error});await page.locator('.portal-language').getByRole('button',{name:lang.toUpperCase(),exact:true}).click()
  assert.equal(await page.locator('.wf-workforce,.wf-accounting').count(),0)
  if(role==='owner'){
   await selectPortalSection(page,lang==='es'?'Empleados':'Employees')
   const work=page.locator('.gd-client-work');await work.getByRole('heading',{name:lang==='es'?'Profesionales y disponibilidad':'Professionals and availability',exact:true}).waitFor()
   assert.equal(await work.locator('select option[value="manager"],select option[value="cashier"],select option[value="staff"]').count(),0)
   assert.equal(await work.getByText(lang==='es'?'Acceso heredado · pendiente de revisión':'Legacy access · review required',{exact:true}).count(),1)
   await work.getByRole('button',{name:lang==='es'?'Confirmar conversión a Empleado':'Confirm conversion to Employee',exact:true}).click()
   await work.locator('.ca-success').waitFor();assert.equal(site.members.find(member=>member.email==='legacy@example.invalid').role,'employee');assert.equal(writes,1)
   assert.equal(await work.getByRole('button',{name:lang==='es'?'Revertir conversión':'Reverse conversion',exact:true}).count(),1)
   const custom=work.getByText(lang==='es'?'Horario individual y descansos de agenda':'Individual hours and appointment breaks',{exact:true});await custom.click();assert.equal(await work.getByText(lang==='es'?'Horario propio':'Custom hours',{exact:true}).count(),7)
  }else{
   await page.getByRole('heading',{name:lang==='es'?'Mi agenda':'My appointments',exact:true}).waitFor()
   assert.equal(await page.getByText('Assigned customer',{exact:true}).count(),1)
   assert.equal(await page.getByText(lang==='es'?'Confirmada · Pago pendiente':'Confirmed · Payment due',{exact:true}).count(),1)
   assert.equal(await page.getByRole('button',{name:lang==='es'?'Registrar pago recibido':'Record received payment',exact:true}).count(),0)
   assert.equal(await page.locator('.gd-client-work').getByText(/PRIVATE-DO-NOT-SEND/).count(),0)
   assert.equal(await page.locator('.ca-commercial-access').count(),0)
   assert.equal(await page.locator('.sidebar-nav-item').filter({hasText:/^(Employees|Empleados|Business settings|Ajustes del negocio|Payments|Pagos)$/}).count(),0)
  }
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`No horizontal overflow ${width}/${theme}/${lang}/${role}`)
  for(const input of await page.locator('.gd-client-work input:not([type=checkbox]),.gd-client-work select').all())if(await input.isVisible())assert(Number.parseFloat(await input.evaluate(element=>getComputedStyle(element).fontSize))>=16)
  await page.evaluate(()=>{const frame=document.createElement('iframe');frame.hidden=true;frame.title='Isolated preview review';frame.setAttribute('sandbox','allow-scripts');frame.srcdoc='<!doctype html><html><body></body></html>';document.body.appendChild(frame)});await page.waitForTimeout(60)
  assert.equal(retiredCalls,0);assert.deepEqual(errors,[])
  if([390,1440].includes(width))await page.screenshot({path:`${out}/${engine}-${width}-${theme}-${lang}-${role}.png`})
  console.log('PASS commercial access',engine,width,theme,lang,role)
  await context.close()
 }
}catch(error){
 const detail=String(error?.stack||error).replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A');console.error('::error title=Commercial portal QA::'+detail);
 if(activePage&&!activePage.isClosed())await activePage.screenshot({path:out+'/failure-'+engine+'.png'}).catch(()=>{});
 throw error;
}finally{await browser.close();if(server)await new Promise(resolve=>server.httpServer.close(resolve))}
