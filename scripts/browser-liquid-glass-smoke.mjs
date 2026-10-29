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
 if(name==='portal-session')data={ok:true,user}
 if(name==='client-admin')data=url.searchParams.has('siteId')?{ok:true,site,membership:{role,capabilities:siteRoleCapabilities(role)},posOperations:{cashierEnabled:true,displayEnabled:true,profile:'auto',revision:0}}:{ok:true,sites:[{siteId:site.siteId,slug:site.slug,businessName:site.business.name,status:'published'}]}
 if(name==='client-commerce-admin')data={ok:true,orders:[{transactionId:'qa-paid',kind:'order',amountTotal:5500,paymentStatus:'paid',status:'confirmed',createdAt:new Date().toISOString(),customer:{name:'Isolated fixture'}}],bookings:[]}
 if(name==='webfactory-admin-overview')data={ok:true,...admin}
 if(name==='webfactory-admin-revenue')data={ok:true,revenue:{available:false,reason:'temporarily_unavailable'}}
 if(name==='client-inventory-health')data={ok:true,checkedAt:new Date().toISOString(),heldCount:0,reviewCount:0,hiddenReviewCount:0,reservations:[],journal:{operationCount:0,reservationCount:0,bytes:0,nearCapacity:false,atCapacity:false},pos:{pointerCount:0,cleanupEligibleCount:0,reviewCount:0,hiddenCount:0,rows:[]}}
 return route.fulfill({json:data})
})}
const active='.gd-liquid-surface[data-active=true]'
const dimensions=page=>page.locator('.gd-topbar,.gd-dock,.wf-portal-panel').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return [r.width,r.height]}))
const errors=[]
async function checkMaterialContrast(page){
 const colors=await page.locator('.gd-content '+active).evaluateAll(nodes=>nodes.map(el=>({tint:getComputedStyle(el.querySelector('.gd-liquid-tint')).backgroundColor,shade:getComputedStyle(el.querySelector('.gd-liquid-backdrop'),'::before').backgroundColor,inks:[...el.parentElement.querySelectorAll('h2,p')].filter(e=>!e.closest('.gd-liquid-surface')).slice(0,2).map(e=>getComputedStyle(e).color)})))
 const rgba=s=>{const a=s.match(/[\d.]+/g).map(Number);return [...a.slice(0,3),a[3]??1]},blend=(a,b)=>a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3])),lum=rgb=>rgb.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0)
 for(const c of colors)for(const value of [0,255])for(const ink of c.inks){const bg=blend(rgba(c.tint),blend(rgba(c.shade),[value,value,value])),fg=blend(rgba(ink),bg),ratio=(Math.max(lum(fg),lum(bg))+.05)/(Math.min(lum(fg),lum(bg))+.05);assert(ratio>=4.5,`Material text contrast over extreme wallpaper ${ratio.toFixed(2)}`)}
}
try{
 for(const width of (process.env.QA_WIDTHS||'320,375,390,430,768,1024,1440').split(',').map(Number))for(const theme of (process.env.QA_THEMES||'light,dark').split(','))for(const lang of (process.env.QA_LANGS||'es,en').split(',')){
  records.clear();versions.clear();role='owner'
  const context=await browser.newContext({viewport:{width,height:950},hasTouch:width<=430,isMobile:width<=430,serviceWorkers:'block'}),page=await context.newPage()
  page.on('pageerror',error=>errors.push(error.message))
  await page.addInitScript(t=>localStorage.setItem('webfactory-theme-v2',t),theme);await intercept(page)
  for(const path of ['/client-admin','/webfactory-admin']){
   console.log('CHECK liquid glass',width,theme,lang,path)
   await page.goto(origin+path);await page.locator('.gd-content').waitFor();await page.locator('.portal-language').getByRole('button',{name:lang.toUpperCase(),exact:true}).click()
   await page.waitForFunction(()=>document.querySelectorAll('.gd-liquid-surface[data-active=true] [data-vaso]').length>=2)
   await page.waitForFunction(()=>[...document.querySelectorAll('.gd-liquid-surface[data-active=true]')].some(el=>el.querySelector('feImage')))
   if(!await page.locator('.gd-content '+active).count())await page.locator('.wf-portal-panel').first().scrollIntoViewIfNeeded();await page.locator('.gd-content '+active).first().waitFor()
   assert.equal(await page.locator('.gd-liquid-surface :is(input,button,select,textarea,a,iframe)').count(),0,'Decorative copies never contain operational controls')
   await checkMaterialContrast(page)
   assert(await page.locator('.gd-liquid-surface').evaluateAll(nodes=>nodes.every(node=>node.inert&&node.getAttribute('aria-hidden')==='true'&&getComputedStyle(node).pointerEvents==='none')))
   await page.waitForTimeout(850);const bounds=await dimensions(page)
   await page.locator('.gd-content '+active).first().evaluate(el=>el.parentElement.setAttribute('data-liquid-qa',''));const host=page.locator('[data-liquid-qa]'),target=host.locator(':scope>.gd-liquid-surface');await host.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('[data-liquid-qa]>.gd-liquid-surface')?.dataset.active==='true')
   await page.waitForFunction(()=>Boolean(document.querySelector('[data-liquid-qa] feImage')?.getAttribute('href')))
   const before=await target.evaluate(el=>el.querySelector('feImage')?.getAttribute('href'))
   const point=await host.evaluate(el=>{const r=el.getBoundingClientRect();for(const y of [24,40,60,100])for(const x of [24,40,r.width/2]){const p={x:r.x+x,y:r.y+y},hit=document.elementFromPoint(p.x,p.y);if(hit&&el.contains(hit)&&!hit.closest('input,select,textarea,button,a,summary'))return p}return null})
   assert(point,'A non-interactive surface is available for the visual press');await page.mouse.move(point.x,point.y);await page.mouse.down();await page.waitForFunction(previous=>document.querySelector('[data-liquid-qa] feImage')?.getAttribute('href')!==previous,before,{timeout:3000})
   const during=await target.evaluate(el=>el.querySelector('feImage')?.getAttribute('href'))
   await page.mouse.up();assert(before&&during&&before!==during,'Press changes the actual Vaso displacement map '+JSON.stringify({width,theme,lang,path,before:before?.length,during:during?.length,active:await target.getAttribute('data-active'),point,hit:await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.outerHTML.slice(0,200),point)}))
   if(width===390||width===1440)await page.screenshot({path:`${output}/${isWebKit?'webkit':'chromium'}-${path.slice(1)}-${width}-${theme}-${lang}.png`})
   if(path==='/client-admin'&&width===390){await page.locator('.gd-content').evaluate(el=>el.scrollTop=el.scrollHeight);await page.waitForFunction(()=>document.querySelector('[data-liquid-qa]>.gd-liquid-surface')?.dataset.active==='false');await host.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('[data-liquid-qa]>.gd-liquid-surface')?.dataset.active==='true')}
   if(path==='/client-admin'){
    const panel=page.locator('.gd-revenue');await panel.scrollIntoViewIfNeeded();await panel.locator('select').selectOption('booking');await panel.getByRole('button',{name:lang==='es'?'Ampliar tarjeta':'Expand card',exact:true}).click();await panel.getByRole('button',{name:lang==='es'?'Cerrar tarjeta ampliada':'Close expanded card',exact:true}).waitFor()
    await page.waitForFunction(()=>document.querySelectorAll('.gd-liquid-surface[data-active=true]').length===0)
    assert.equal(await page.locator('.wf-portal-panel:visible').count(),1);await page.keyboard.press('Escape');assert.equal(await panel.locator('select').inputValue(),'booking');await page.locator(active).first().waitFor()
   }
   await selectPortalSection(page,lang==='es'?'Personalizar dashboard':'Customize dashboard');const toggle=page.getByLabel(lang==='es'?'Cristal líquido con respuesta al tocar':'Liquid glass with touch response',{exact:true});await toggle.uncheck()
   await page.waitForFunction(()=>document.querySelectorAll('.gd-liquid-surface[data-active=true]').length===0)
   await page.getByRole('button',{name:lang==='es'?'Aplicar y guardar':'Apply and save',exact:true}).click();await page.getByRole('status').filter({hasText:lang==='es'?'Apariencia guardada.':'Appearance saved.'}).waitFor();await page.reload();await page.locator('.gd-content').waitFor();await selectPortalSection(page,lang==='es'?'Personalizar dashboard':'Customize dashboard');assert.equal(await toggle.isChecked(),false,'Toggle persists per portal');assert.equal(await page.locator(active).count(),0)
   await toggle.check();await page.locator(active).first().waitFor();const motion=page.getByRole('slider',{name:/Animaciones|Animations/});await motion.focus();await page.keyboard.press('Home');await page.waitForFunction(()=>document.querySelectorAll('.gd-liquid-surface[data-active=true]').length===0);await page.keyboard.press('End');await page.locator(active).first().waitFor();await page.getByRole('button',{name:lang==='es'?'Aplicar y guardar':'Apply and save',exact:true}).click();await page.getByRole('status').filter({hasText:lang==='es'?'Apariencia guardada.':'Appearance saved.'}).waitFor();await selectPortalSection(page,lang==='es'?'Resumen':'Overview')
   await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelectorAll('.gd-liquid-surface[data-active=true]').length===0)
   await page.emulateMedia({reducedMotion:'no-preference'});await page.locator(active).first().waitFor()
   await page.emulateMedia({forcedColors:'active'});await page.waitForFunction(()=>document.querySelectorAll('.gd-liquid-surface[data-active=true]').length===0);await page.emulateMedia({forcedColors:'none'});await page.locator(active).first().waitFor()
   await page.locator('.gd-content').evaluate(el=>el.scrollTop=0);await page.waitForTimeout(850);const after=await dimensions(page);assert.equal(bounds.length,after.length);bounds.forEach((r,i)=>r.forEach((v,j)=>assert(Math.abs(v-after[i][j])<2,`Liquid on/off preserves geometry ${i}:${j}`)))
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow')
  }
  await context.close();console.log('PASS liquid glass reaction, persistence, isolation, accessibility and geometry',width,theme,lang)
 }
 assert.deepEqual(errors,[])
}finally{await browser.close();if(process.env.QA_DEV==='1')await server.close();else await new Promise(resolve=>server.httpServer.close(resolve))}
