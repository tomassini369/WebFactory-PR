import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {preview,createServer} from 'vite'
import sharp from 'sharp'
import {chromium,webkit} from 'playwright'
import {createDashboardAppearanceHandler} from '../netlify/functions/dashboard-appearance.mjs'
import {siteRoleCapabilities} from '../netlify/lib/client-auth.mjs'
import {selectPortalSection} from './qa-workspace-navigation.mjs'
const port=Number(process.env.QA_PORT||5338),origin=process.env.QA_ORIGIN||`http://127.0.0.1:${port}`
const server=process.env.QA_DEV==='1'?await createServer({server:{host:'127.0.0.1',port,strictPort:true}}):await preview({preview:{host:'127.0.0.1',port,strictPort:true}});if(process.env.QA_DEV==='1')await server.listen()
const isWebKit=process.env.QA_ENGINE==='webkit';const browser=await (isWebKit?webkit:chromium).launch(isWebKit?(process.env.QA_WEBKIT_PATH?{executablePath:process.env.QA_WEBKIT_PATH}:{}):{...(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']})
const output='/tmp/liquid-glass-qa';await mkdir(output,{recursive:true})
const user={id:'glassy-user',email:'glassy@example.invalid',user_metadata:{},app_metadata:{roles:['admin']},mfa:{required:false}}
const site={siteId:'glassy-site',slug:'glassy-site',status:'published',revision:1,business:{name:'Glassy fixture · QA',category:'Barber',email:'fixture@example.invalid'},design:{primary:'#0B1529',secondary:'#3C86F6',style:'Modern'},catalog:[],employees:[],hours:{},members:[],settings:{locale:'en',timezone:'America/Puerto_Rico',currency:'USD'},paymentRules:{},googleCalendar:{},features:{},servicePlan:{code:'complimentary',billingModel:'complimentary'}}
const admin={generatedAt:new Date().toISOString(),administrator:{name:'Isolated admin QA',email:user.email},summary:{clients:0,publishedSites:0,connectedStripe:0,blockers:0},capacity:{level:'healthy',safeClientCapacity:20,activeClients:0,estimatedOpenings:20,utilizationPercent:0,model:'Isolated fixture'},integrations:{configured:0,total:0,configuration:[]},operations:{transactionStatuses:{},pendingTransactions:[],stripeWebhookEvents:0,clientWebhookEvents:0},clients:[],subscriptionBilling:{missing:[],ready:false},resources:{netlify:{plan:'QA',utilizationPercent:null,dashboardUrl:'/',source:'Fixture'},storage:{},runtime:{}}}
let role='owner';const records=new Map(),versions=new Map();const storage={get:async k=>structuredClone(records.get(k)||null),getWithMetadata:async k=>records.has(k)?{data:structuredClone(records.get(k)),etag:String(versions.get(k))}:null,getMetadata:async k=>records.has(k)?{etag:String(versions.get(k))}:null,setJSON:async(k,v,o)=>{if(o.onlyIfNew&&records.has(k)||o.onlyIfMatch&&o.onlyIfMatch!==String(versions.get(k)))return {modified:false};records.set(k,structuredClone(v));versions.set(k,(versions.get(k)||0)+1);return {modified:true}}}
const appearance=createDashboardAppearanceHandler({store:()=>storage,siteAccess:async()=>({user}),platformAccess:async()=>user})
async function intercept(page){await page.route('**/.netlify/functions/**',async route=>{const req=route.request(),url=new URL(req.url()),name=url.pathname.split('/').at(-1)
 if(name==='dashboard-appearance'){
  const response=await appearance(new Request(req.url(),{method:req.method(),headers:await req.allHeaders(),...(!['GET','HEAD'].includes(req.method())?{body:req.postDataBuffer()}: {})}));return route.fulfill({status:response.status,headers:{...Object.fromEntries(response.headers),etag:'W/"cdn-rewritten-validator"'},body:Buffer.from(await response.arrayBuffer())})
 }
 if(name==='client-customer-display')return route.fulfill({json:{ok:true,paired:false,sequence:0}});
 if(req.method()!=='GET'&&name!=='portal-session')throw Error('Unexpected operational mutation '+name)
 let data={ok:true,records:[],customers:[],receipts:[],movements:[],adjustments:[],analytics:{},offers:[],campaigns:[],claims:[],cases:[],reviews:[]}
 if(name==='subscription-readiness')data={ok:true,entitlement:{trialEndsAt:''},readiness:{ready:false},plans:[]};
 if(name==='portal-session')data={ok:true,user}
 if(name==='client-admin')data=url.searchParams.has('siteId')?{ok:true,site,membership:{role,capabilities:siteRoleCapabilities(role)},posOperations:{cashierEnabled:true,displayEnabled:true,profile:'auto',revision:0}}:{ok:true,sites:[{siteId:site.siteId,slug:site.slug,businessName:site.business.name,status:'published'}]}
 if(name==='client-commerce-admin')data={ok:true,orders:[{transactionId:'qa-paid',kind:'order',amountTotal:5500,paymentStatus:'paid',status:'confirmed',createdAt:new Date().toISOString(),customer:{name:'Isolated fixture'}}],bookings:[]}
 if(name==='webfactory-admin-overview')data={ok:true,...admin}
 if(name==='webfactory-admin-revenue')data={ok:true,revenue:{available:false,reason:'temporarily_unavailable'}}
 if(name==='client-inventory-health')data={ok:true,checkedAt:new Date().toISOString(),heldCount:0,reviewCount:0,hiddenReviewCount:0,reservations:[],journal:{operationCount:0,reservationCount:0,bytes:0,nearCapacity:false,atCapacity:false},pos:{pointerCount:0,cleanupEligibleCount:0,reviewCount:0,hiddenCount:0,rows:[]}}
 return route.fulfill({json:data})
})}
const cardSelector='article,.wf-portal-panel,.ca-panel,.wfa-card,.wfa-stat,.ca-help-card,.gd-appearance,.mfa-panel,.business-qr,.ca-detail-grid>div,.ca-mini-stats>div,.ca-service-plan>div'
async function coverage(page){
 await page.waitForFunction(()=>document.querySelector('[data-liquid-kind]'))
 const result=await page.locator('.gd-root').evaluate((root,selector)=>({missing:[...root.querySelectorAll('button,summary,a.btn,a.ca-primary-link,'+selector)].filter(e=>!e.closest('.gd-liquid-surface,svg,canvas')&&!e.hasAttribute('data-liquid-kind')).map(e=>e.className||e.tagName),duplicates:[...root.querySelectorAll('[data-liquid-kind]')].filter(e=>e.querySelectorAll(':scope>.gd-liquid-surface').length!==1).map(e=>e.className),privateNodes:[...root.querySelectorAll('.gd-liquid-surface')].reduce((sum,e)=>sum+(e.shadowRoot?.querySelectorAll('input,button,select,textarea,a').length||0),0)} ),cardSelector)
 assert.deepEqual(result,{missing:[],duplicates:[],privateNodes:0});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
}
async function press(page,host){
 await host.scrollIntoViewIfNeeded();const box=await host.boundingBox();await page.mouse.move(box.x+12,box.y+12);await page.waitForTimeout(100)
 // Dispatch on the original host without invoking a destructive business action.
 await host.dispatchEvent('pointerdown',{clientX:box.x+box.width/2,clientY:box.y+Math.min(box.height/2,100),pointerId:1,pointerType:'touch',bubbles:true})
 await host.locator(':scope>.gd-liquid-surface[data-active=true] [data-vaso]').waitFor({state:'attached'})
 assert.equal(await host.getAttribute('data-liquid-pressed'),'')
 await page.waitForTimeout(80)
 assert(await host.locator(':scope>.gd-liquid-surface feImage').count()>0,'Original host drives a real Vaso lens')
 await host.dispatchEvent('pointerup',{bubbles:true});assert.equal(await host.getAttribute('data-liquid-pressed'),null)
}
try{
 for(const width of (process.env.QA_WIDTHS||'320,375,390,430,768,1024,1440').split(',').map(Number))for(const theme of (process.env.QA_THEMES||'light,dark').split(','))for(const lang of (process.env.QA_LANGS||'es,en').split(',')){
 records.clear();versions.clear();role='owner';const context=await browser.newContext({viewport:{width,height:950},hasTouch:width<=430,isMobile:width<=430,serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(t=>localStorage.setItem('webfactory-theme-v2',t),theme);await intercept(page)
 for(const path of ['/client-admin','/webfactory-admin']){
  await page.goto(origin+path);await page.locator('.gd-content').waitFor();await page.locator('.portal-language').getByRole('button',{name:lang.toUpperCase(),exact:true}).click();await coverage(page)
  const card=page.locator('.gd-content [data-liquid-kind=card]').first();await press(page,card)
  const button=page.locator('.gd-content button:enabled').filter({hasNot:page.locator('input')}).first();await press(page,button);if([390,1440].includes(width))await page.screenshot({path:`${output}/complete-overview-${isWebKit?'webkit':'chromium'}-${path.slice(1)}-${width}-${theme}-${lang}.png`})
  if(path==='/client-admin'){
   const expanded=page.locator('.gd-revenue');await expanded.getByRole('button',{name:lang==='es'?'Ampliar tarjeta':'Expand card',exact:true}).click();await page.getByRole('dialog',{name:lang==='es'?'Panel ampliado':'Expanded panel'}).waitFor();await coverage(page);await press(page,expanded);await expanded.evaluate(e=>e.scrollTop=e.scrollHeight);await press(page,expanded.getByRole('button',{name:lang==='es'?'Cerrar tarjeta ampliada':'Close expanded card',exact:true}));await page.keyboard.press('Escape');await page.locator('.gd-dock').waitFor()
  }
  await selectPortalSection(page,lang==='es'?'Personalizar dashboard':'Customize dashboard');await coverage(page)
  const toggle=page.getByLabel(lang==='es'?'Cristal líquido con respuesta al tocar':'Liquid glass with touch response',{exact:true});await toggle.uncheck();await page.waitForFunction(()=>document.querySelectorAll('[data-liquid-kind]').length===0);await toggle.check();await coverage(page)
  await page.getByRole('button',{name:lang==='es'?'Aplicar y guardar':'Apply and save',exact:true}).click();await page.getByRole('status').filter({hasText:lang==='es'?'Apariencia guardada.':'Appearance saved.'}).waitFor()
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>matchMedia('(prefers-reduced-motion:reduce)').matches);await page.waitForFunction(()=>document.querySelectorAll('.gd-liquid-surface[data-active=true]').length===0);await pressStatic(page);await page.emulateMedia({reducedMotion:'no-preference'});await page.emulateMedia({forcedColors:'active'});await page.waitForFunction(()=>document.querySelectorAll('.gd-liquid-surface[data-active=true]').length===0);await page.emulateMedia({forcedColors:'none'})
  if([390,1440].includes(width))await page.screenshot({path:`${output}/complete-${isWebKit?'webkit':'chromium'}-${path.slice(1)}-${width}-${theme}-${lang}.png`})
 }
 assert.deepEqual(errors,[]);await context.close();console.log('PASS complete cards, independent buttons, expanded lens, settings and accessibility',width,theme,lang)
 }
}finally{await browser.close();if(process.env.QA_DEV==='1')await server.close();else await new Promise(resolve=>server.httpServer.close(resolve))}
async function pressStatic(page){const button=page.locator('.gd-dock button').first();await button.dispatchEvent('pointerdown',{bubbles:true});assert.equal(await page.locator('.gd-liquid-surface[data-active=true]').count(),0);await button.dispatchEvent('pointerup',{bubbles:true})}
