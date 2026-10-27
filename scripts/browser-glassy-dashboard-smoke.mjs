import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {preview} from 'vite'
import sharp from 'sharp'
import {chromium,webkit} from 'playwright'
import {createDashboardAppearanceHandler} from '../netlify/functions/dashboard-appearance.mjs'
import {siteRoleCapabilities} from '../netlify/lib/client-auth.mjs'
import {selectPortalSection} from './qa-workspace-navigation.mjs'
const port=Number(process.env.QA_PORT||5335),origin=process.env.QA_ORIGIN||`http://127.0.0.1:${port}`
const server=await preview({preview:{host:'127.0.0.1',port,strictPort:true}})
const isWebKit=process.env.QA_ENGINE==='webkit';const browser=await (isWebKit?webkit:chromium).launch(isWebKit?(process.env.QA_WEBKIT_PATH?{executablePath:process.env.QA_WEBKIT_PATH}:{}):{...(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']})
const output='/tmp/glassy-dashboard-qa';await mkdir(output,{recursive:true})
const user={id:'glassy-user',email:'glassy@example.invalid',user_metadata:{},app_metadata:{roles:['admin']},mfa:{required:false}}
const site={siteId:'glassy-site',slug:'glassy-site',status:'published',revision:1,business:{name:'Glassy fixture · QA',category:'Barber',email:'fixture@example.invalid'},design:{primary:'#0B1529',secondary:'#3C86F6',style:'Modern'},catalog:[],employees:[],hours:{},members:[],settings:{locale:'en',timezone:'America/Puerto_Rico',currency:'USD'},paymentRules:{},googleCalendar:{},features:{},servicePlan:{code:'complimentary',billingModel:'complimentary'}}
const admin={generatedAt:new Date().toISOString(),administrator:{name:'Isolated admin QA',email:user.email},summary:{clients:0,publishedSites:0,connectedStripe:0,blockers:0},capacity:{level:'healthy',safeClientCapacity:20,activeClients:0,estimatedOpenings:20,utilizationPercent:0,model:'Isolated fixture'},integrations:{configured:0,total:0,configuration:[]},operations:{transactionStatuses:{},pendingTransactions:[],stripeWebhookEvents:0,clientWebhookEvents:0},clients:[],subscriptionBilling:{missing:[],ready:false},resources:{netlify:{plan:'QA',utilizationPercent:null,dashboardUrl:'/',source:'Fixture'},storage:{},runtime:{}}}
let role='owner';const records=new Map(),versions=new Map();const storage={get:async k=>structuredClone(records.get(k)||null),getMetadata:async k=>records.has(k)?{etag:String(versions.get(k))}:null,setJSON:async(k,v,o)=>{if(o.onlyIfNew&&records.has(k)||o.onlyIfMatch&&o.onlyIfMatch!==String(versions.get(k)))return {modified:false};records.set(k,structuredClone(v));versions.set(k,(versions.get(k)||0)+1);return {modified:true}}}
const appearance=createDashboardAppearanceHandler({store:()=>storage,siteAccess:async()=>({user}),platformAccess:async()=>user})
async function intercept(page){await page.route('**/.netlify/functions/**',async route=>{const req=route.request(),url=new URL(req.url()),name=url.pathname.split('/').at(-1)
 if(name==='dashboard-appearance'){
  const response=await appearance(new Request(req.url(),{method:req.method(),headers:await req.allHeaders(),...(!['GET','HEAD'].includes(req.method())?{body:req.postDataBuffer()}: {})}));return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())})
 }
 if(req.method()!=='GET'&&name!=='portal-session')throw Error('Unexpected operational mutation '+name)
 let data={ok:true,records:[],customers:[],receipts:[],movements:[],adjustments:[],analytics:{},offers:[],campaigns:[],claims:[],cases:[],reviews:[]}
 if(name==='portal-session')data={ok:true,user}
 if(name==='client-admin')data=url.searchParams.has('siteId')?{ok:true,site,membership:{role,capabilities:siteRoleCapabilities(role)},posOperations:{cashierEnabled:true,displayEnabled:true,profile:'auto',revision:0}}:{ok:true,sites:[{siteId:site.siteId,slug:site.slug,businessName:site.business.name,status:'published'}]}
 if(name==='client-commerce-admin')data={ok:true,orders:[{transactionId:'qa-paid',kind:'order',amountTotal:5500,paymentStatus:'paid',status:'confirmed',createdAt:new Date().toISOString(),customer:{name:'Isolated fixture'}}],bookings:[]}
 if(name==='webfactory-admin-overview')data={ok:true,...admin}
 if(name==='webfactory-admin-revenue')data={ok:true,revenue:{available:false,reason:'temporarily_unavailable'}}
 if(name==='client-inventory-health')data={ok:true,checkedAt:new Date().toISOString(),heldCount:0,reviewCount:0,hiddenReviewCount:0,reservations:[],journal:{operationCount:0,reservationCount:0,bytes:0,nearCapacity:false,atCapacity:false},pos:{pointerCount:0,cleanupEligibleCount:0,reviewCount:0,hiddenCount:0,rows:[]}}
 return route.fulfill({json:data})
})}
const noOverflow=async(page)=>{const info=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1&&e.getBoundingClientRect().width>0).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width}))}));if(info.scroll>info.width+1){console.error('OVERFLOW',JSON.stringify(info));await page.screenshot({path:output+'/overflow.png',fullPage:true})}assert(info.scroll<=info.width+1,'No page overflow')}
try{
 for(const width of (process.env.QA_WIDTHS||'320,375,390,430,768,1024,1440').split(',').map(Number))for(const theme of ['light','dark'])for(const lang of ['es','en']){
  role='owner';const context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.error('BROWSER',m.text())});await page.addInitScript(t=>localStorage.setItem('webfactory-theme-v2',t),theme);await intercept(page)
  for(const path of ['/client-admin','/webfactory-admin']){
   await page.goto(origin+path);try{await page.locator('.gd-content').waitFor({timeout:12000})}catch(error){console.error('BOOTSTRAP',path,errors,await page.locator('body').innerText());await page.screenshot({path:output+'/failed.png',fullPage:true});throw error};await page.locator('.portal-language').getByRole('button',{name:lang.toUpperCase(),exact:true}).click();await noOverflow(page);assert.equal(await page.locator('.sidebar-primary-navigation,.wf-experience').count(),0)
   assert.equal(await page.locator('.gd-wallpaper').evaluate(e=>getComputedStyle(e).backgroundImage.includes('/dashboard/room.webp')),true)
   assert.equal((await page.request.get(origin+'/dashboard/room.webp')).status(),200)
   if(path==='/client-admin'){await page.locator('.bcc-metrics').waitFor();assert.match(await page.locator('.bcc-metrics').innerText(),/55[.,]00/)}
   const customize=lang==='es'?'Personalizar dashboard':'Customize dashboard';await page.locator('.gd-dock').getByRole('button',{name:customize,exact:true}).click();await page.locator('.gd-wallpaper-choice').first().waitFor();await page.locator('.gd-appearance fieldset').waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('.gd-appearance fieldset').disabled)
   await noOverflow(page);assert.equal(await page.locator('.gd-wallpaper-choice').count(),3)
   if(width===1440&&theme==='dark'){await page.screenshot({path:`${output}/${path.slice(1)}-appearance-${lang}.png`,fullPage:true})}
   await page.locator('.gd-wallpaper-choice').nth(1).click();await page.getByRole('button',{name:lang==='es'?'Aplicar y guardar':'Apply and save',exact:true}).click();await page.getByRole('status').filter({hasText:lang==='es'?'Apariencia guardada.':'Appearance saved.'}).waitFor();await page.reload();await page.locator('.gd-content').waitFor();await page.waitForFunction(()=>getComputedStyle(document.querySelector('.gd-wallpaper')).backgroundImage.includes('portal-violet'))
   await page.locator('.gd-dock').getByRole('button',{name:customize,exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.gd-appearance fieldset').disabled);await page.getByRole('button',{name:lang==='es'?'Restaurar predeterminado y borrar mi imagen':'Restore default and delete my image',exact:true}).click();await page.getByRole('status').filter({hasText:lang==='es'?'Apariencia guardada.':'Appearance saved.'}).waitFor()
   await selectPortalSection(page,lang==='es'?'Resumen':'Overview');await noOverflow(page)
   if([390,1440].includes(width)&&lang==='es')await page.screenshot({path:`${output}/${path.slice(1)}-${width}-${theme}.png`,fullPage:true})
  }
  assert.deepEqual(errors,[]);await context.close();console.log(`PASS glass dashboard + private preference persistence both portals ${width} ${theme} ${lang}`)
 }
 // Exercise the actual private image encoder/handler through the UI, then a stale tab.
 role='owner';const customContext=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),customPage=await customContext.newPage();await intercept(customPage);await customPage.goto(origin+'/client-admin');await customPage.locator('.gd-content').waitFor();await customPage.locator('.gd-dock button').last().click();await customPage.waitForFunction(()=>!document.querySelector('.gd-appearance fieldset').disabled);
 const image=await sharp({create:{width:80,height:60,channels:3,background:'#5985a1'}}).png().toBuffer();await customPage.locator('input[type=file]').setInputFiles({name:'fixture.png',mimeType:'image/png',buffer:image});await customPage.locator('.gd-wallpaper-choice').nth(3).waitFor();assert.equal(await customPage.locator('.gd-wallpaper-choice').nth(3).getAttribute('aria-pressed'),'true');
 const stalePage=await customContext.newPage();await intercept(stalePage);await stalePage.goto(origin+'/client-admin');await stalePage.locator('.gd-content').waitFor();await stalePage.locator('.gd-dock button').last().click();await stalePage.waitForFunction(()=>!document.querySelector('.gd-appearance fieldset').disabled);
 await customPage.locator('.gd-wallpaper-choice').first().click();await customPage.getByRole('button',{name:/^(Apply and save|Aplicar y guardar)$/}).click();await customPage.getByRole('status').filter({hasText:/Appearance saved|Apariencia guardada/}).waitFor();
 await stalePage.locator('.gd-wallpaper-choice').nth(1).click();await stalePage.getByRole('button',{name:/^(Apply and save|Aplicar y guardar)$/}).click();await stalePage.getByRole('alert').filter({hasText:/another device|otro dispositivo/}).waitFor();await stalePage.getByRole('button',{name:/Reload settings|Recargar configuración/}).click();await stalePage.waitForFunction(()=>!document.querySelector('.gd-appearance fieldset').disabled);await stalePage.getByRole('button',{name:/Restore default and delete my image|Restaurar predeterminado y borrar mi imagen/}).click();await stalePage.locator('.gd-wallpaper-choice').nth(3).waitFor({state:'detached'});await customContext.close();console.log('PASS upload, optimized private image, stale-tab conflict, reload and deletion');
 // Employee keeps personal appearance while owner destinations remain absent.
 role='employee';const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage();await intercept(page);await page.goto(origin+'/client-admin');await page.locator('.gd-content').waitFor();await page.locator('.gd-menu-toggle').click();assert.equal(await page.locator('.gd-navigation').getByRole('button',{name:'Business settings',exact:true}).count(),0);await page.keyboard.press('Escape');await context.close();
 console.log('PASS employee role-aware navigation')
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve))}
