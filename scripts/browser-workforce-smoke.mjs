import assert from 'node:assert/strict'
import {mkdir,readFile} from 'node:fs/promises'
import {createServer,preview} from 'vite'
import {chromium,webkit} from 'playwright'
const port=Number(process.env.QA_PORT||5220),engine=process.env.QA_ENGINE==='webkit'?webkit:chromium
const built=process.env.QA_BUILT==='1'
const instance=built?await preview({preview:{host:'127.0.0.1',port,strictPort:true}}):await createServer({server:{host:'127.0.0.1',port,strictPort:true}})
if(!built)await instance.listen()
const server=built?{close:()=>new Promise((resolve,reject)=>instance.httpServer.close(error=>error?reject(error):resolve()))}:instance
const browser=await engine.launch(process.env.QA_ENGINE==='webkit'?(process.env.QA_WEBKIT_PATH?{executablePath:process.env.QA_WEBKIT_PATH}:undefined):(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH,args:['--no-sandbox'],...(process.env.QA_ORIGIN&&process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})}:undefined))
import {emptyWorkforce,transitionWorkforce,workforceView} from '../netlify/lib/workforce.mjs'
const output='/tmp/webfactory-workforce';await mkdir(output,{recursive:true});
const user={id:'attendance-qa-user',email:'attendance@example.invalid',user_metadata:{full_name:'Isolated attendance fixture'},app_metadata:{},mfa:{required:false}}
const site={siteId:'workforce-qa',slug:'workforce-qa',status:'published',revision:1,business:{name:'Isolated Workforce QA fixture',category:'Retail',locations:[{id:'main',name:'Main QA'}]},design:{primary:'#0B1529',secondary:'#285fa6',style:'Modern'},catalog:[],employees:[{id:'employee-qa',name:'Employee QA',active:true,locationIds:['main']}],hours:{},members:[{email:user.email,role:'owner'}],settings:{locale:'en',timezone:'America/Puerto_Rico',currency:'USD'},taxConfig:{enabled:false},paymentRules:{methods:{}},googleCalendar:{},features:{},servicePlan:{code:'complimentary',billingModel:'complimentary'}}
let role='owner',state,now,seq=0,lost=false,writes=[]
const caps={owner:['overview','orders','payments','catalog','bookings','pos','settings','team'],employee:['overview','bookings']}
const reset=()=>{now=Date.parse('2026-10-10T16:00:00Z');state=emptyWorkforce(site.siteId);for(const [action,extra] of [['configure',{enabled:true,paidBreaks:false}],['bind',{email:user.email,employeeId:'employee-qa',locationId:'main'}]])state=transitionWorkforce(state,{action,operationId:`fixture-${++seq}`,...extra},site,user,{role:'owner'},now).state}
reset()
try{
 const context=await browser.newContext({reducedMotion:'reduce',...(process.env.QA_ENGINE==='webkit'?{hasTouch:true}:{})}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000)
 await page.route('**/.netlify/functions/**',async route=>{
 const req=route.request(),url=new URL(req.url()),name=url.pathname.split('/').at(-1);let data={ok:true},status=200
 if(name==='client-workforce'){
  if(req.method()==='POST'){const input=req.postDataJSON();writes.push(input);try{now+=600000;state=transitionWorkforce(state,input,site,user,{role},now).state}catch(e){return route.fulfill({status:e.status||500,contentType:'application/json',body:JSON.stringify({message:e.message})})}if(lost){lost=false;return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Isolated lost response'})})}}
  data={ok:true,...workforceView(state,site,user,{role},now)}
 }else if(name==='portal-session')data={ok:true,user}
 else if(req.method()!=='GET')throw Error('Unexpected write in attendance fixture: '+name)
 else if(name==='client-admin')data=url.searchParams.has('siteId')?{ok:true,site,membership:{role,capabilities:caps[role]}}:{ok:true,sites:[{siteId:site.siteId,slug:site.slug,businessName:site.business.name,status:'published'}]}
 else data={ok:true,orders:[],bookings:[],receipts:[],customers:[],entries:[],report:{},inventory:[]}
 await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)})
 })
 const root=process.env.QA_ORIGIN||`http://127.0.0.1:${port}`,open=async()=>{await page.goto(root+'/client-admin');await page.locator('.ca-dashboard').waitFor();await page.locator('.wf-workforce .wf-my-shift').waitFor()}
 for(const width of (process.env.QA_WIDTHS||'320,375,390,430,768,1024,1440').split(',').map(Number))for(const theme of ['light','dark'])for(const lang of ['es','en']){
  reset();await page.setViewportSize({width,height:900});await open();await page.getByRole('button',{name:lang.toUpperCase(),exact:true}).click();if(await page.locator('html').getAttribute('data-wf-theme')!==theme)await page.locator('.wf-theme-toggle').click()
  const panel=page.locator('.wf-workforce');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`No page overflow ${width}/${theme}/${lang}`)
  for(const input of await panel.locator('input,select').all())if(await input.isVisible())assert(parseFloat(await input.evaluate(el=>getComputedStyle(el).fontSize))>=16)
  for(const button of await panel.locator('button').all())if(await button.isVisible()){const box=await button.boundingBox();assert(box.height>=44-.1&&box.width>=44-.1,`44px target ${await button.innerText()}`)}
  await panel.getByRole('button',{name:lang==='es'?'Registrar entrada':'Clock in',exact:true}).click();await panel.getByRole('button',{name:lang==='es'?'Iniciar descanso':'Start break',exact:true}).waitFor();assert(await panel.getByRole('button',{name:lang==='es'?'Registrar entrada':'Clock in',exact:true}).isDisabled())
  await panel.getByRole('button',{name:lang==='es'?'Iniciar descanso':'Start break',exact:true}).click();await page.waitForTimeout(100);await panel.getByRole('button',{name:lang==='es'?'Terminar descanso':'End break',exact:true}).click();await page.waitForTimeout(100);await panel.getByRole('button',{name:lang==='es'?'Registrar salida':'Clock out',exact:true}).click();await panel.getByRole('button',{name:lang==='es'?'Aprobar horas':'Approve hours',exact:true}).waitFor();assert.equal(state.shifts.length,1);assert(state.shifts[0].end)
  const before=state.events.length;await panel.getByRole('button',{name:lang==='es'?'Aprobar horas':'Approve hours',exact:true}).click();await page.waitForTimeout(100);assert(state.shifts[0].approvedAt);assert.equal(state.events.length,before+1)
  await panel.locator('input[type=date]').first().focus();assert.notEqual(await panel.locator('input[type=date]').first().evaluate(el=>getComputedStyle(el).outlineStyle),'none')
  await page.locator('.ca-work').evaluate(el=>el.scrollTo({top:0,behavior:'instant'}));await panel.locator('.wf-workforce-table').evaluate(el=>el.scrollLeft=0);
  if(width===390||width===1440)await page.screenshot({path:`${output}/workforce-${width}-${theme}-${lang}-${process.env.QA_ENGINE||'chromium'}.png`})
  console.log('PASS attendance responsive and clock/break/approval',width,theme,lang)
 }
 reset();role='owner';await open();const panel=page.locator('.wf-workforce');await panel.getByRole('button',{name:/Clock in|Registrar entrada/,exact:true}).click();await page.waitForTimeout(100);await panel.getByRole('button',{name:/Clock out|Registrar salida/,exact:true}).click();await panel.getByRole('button',{name:/Request correction|Solicitar corrección/,exact:true}).click();await panel.locator('textarea').fill('Isolated correction review');await panel.getByRole('button',{name:/Submit request|Enviar solicitud/,exact:true}).click();await page.waitForTimeout(100);assert.equal(state.requests.length,1);await panel.getByRole('button',{name:/Accept|Aceptar/,exact:true}).click();await page.waitForTimeout(100);assert.equal(state.requests[0].status,'accepted');await panel.getByRole('button',{name:/Approve hours|Aprobar horas/,exact:true}).click();await page.waitForTimeout(100);assert(state.shifts[0].approvedAt);
 await page.locator('.ca-mobile-menu-toggle').click();await page.locator('.sidebar-container').getByRole('button',{name:/Business settings|Ajustes del negocio/,exact:true}).click();await page.locator('.wf-workforce-settings').waitFor();assert.equal(await page.locator('.wf-workforce-settings input[type=checkbox]').count(),2);assert.equal(await page.locator('.wf-workforce-filters select').count(),3);assert.equal(await page.locator('.wf-workforce').getByRole('button',{name:/Save link|Guardar vinculación/,exact:true}).isDisabled(),true);
 console.log('PASS correction review and existing-member settings controls');
 reset();role='employee';await open();assert.equal(await page.getByRole('button',{name:/Approve hours|Aprobar horas/,exact:true}).count(),0);lost=true;const before=writes.length;await page.locator('.wf-workforce').getByRole('button',{name:/Clock in|Registrar entrada/,exact:true}).click();await page.waitForTimeout(300);assert.equal(writes.length,before+1);assert.equal(state.shifts.length,1);assert.equal(await page.getByRole('button',{name:/Retry operation|Reintentar operación/,exact:true}).count(),0,'Server lookup resolves lost response without resending');assert.deepEqual(errors,[])
 console.log('PASS employee permissions, server recovery and zero real attendance/payment writes');await context.close()
}finally{await browser.close();await server.close()}
