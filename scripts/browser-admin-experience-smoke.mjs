import assert from 'node:assert/strict'
import {preview} from 'vite'
import {chromium,webkit} from 'playwright'
import {selectPortalSection,openPanelTools} from './qa-workspace-navigation.mjs'
const port=Number(process.env.QA_PORT||5282),isWebKit=process.env.QA_ENGINE==='webkit'
const server=await preview({preview:{host:'127.0.0.1',port,strictPort:true}})
const origin=process.env.QA_ORIGIN||`http://127.0.0.1:${port}`
const browser=await (isWebKit?webkit:chromium).launch(isWebKit?(process.env.QA_WEBKIT_PATH?{executablePath:process.env.QA_WEBKIT_PATH}:{}):(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH,args:['--no-sandbox']}:{}))
const user={id:'admin-workspace-fixture',email:'admin-workspace@example.invalid',user_metadata:{},app_metadata:{roles:['admin']},mfa:{required:false}}
const admin={generatedAt:'2026-10-14T16:00:00Z',administrator:{name:'Isolated admin QA',email:user.email},summary:{clients:2,publishedSites:1,connectedStripe:1,blockers:0},capacity:{level:'healthy',safeClientCapacity:20,activeClients:2,estimatedOpenings:18,utilizationPercent:10,model:'Isolated fixture'},integrations:{configured:0,total:0,configuration:[]},operations:{transactionStatuses:{},pendingTransactions:[],stripeWebhookEvents:0,clientWebhookEvents:0},clients:[],subscriptionBilling:{missing:[],ready:false},resources:{netlify:{plan:'QA',utilizationPercent:null,dashboardUrl:'/',source:'Fixture'},storage:{},runtime:{}}}
const revenue={available:true,complete:true,mode:'live',capturedCents:100000,refundedCents:5000,netCents:95000,paymentCount:12,last7DaysCents:26000,periodStart:'2026-10-01',periodEnd:'2026-10-14',generatedAt:admin.generatedAt,days:[0,2400,3600,0,8000,7000,5000].map((netCents,i)=>({date:`2026-10-0${i+3}`,netCents}))}
const noOverflow=async page=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Admin has no document overflow')
try{
 for(const width of (process.env.QA_WIDTHS||'320,375,390,430,768,1024,1440').split(',').map(Number))for(const theme of (process.env.QA_THEMES||'light,dark').split(','))for(const lang of (process.env.QA_LANGS||'es,en').split(',')){
  const context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce',serviceWorkers:'block',...(isWebKit?{hasTouch:true}: {})}),page=await context.newPage();const errors=[];let writes=0
  page.on('pageerror',error=>errors.push(error.message))
  await page.addInitScript(theme=>localStorage.setItem('webfactory-theme-v2',theme),theme)
  await page.route('**/.netlify/functions/**',async route=>{
   const request=route.request(),name=new URL(request.url()).pathname.split('/').at(-1)
   if(request.method()!=='GET'&&name!=='portal-session'){writes++;throw Error('Admin visual QA cannot modify data: '+name)}
   const data=name==='portal-session'?{ok:true,user}:name==='webfactory-admin-overview'?{ok:true,...admin}:name==='webfactory-admin-revenue'?{ok:true,revenue}:{ok:true,records:[]}
   await route.fulfill({contentType:'application/json',body:JSON.stringify(data)})
  })
  await page.goto(origin+'/webfactory-admin');await page.locator('.wfa-dashboard').waitFor();await page.locator('.portal-language').getByRole('button',{name:lang.toUpperCase(),exact:true}).click()
  assert.equal(await page.locator('html').getAttribute('lang'),lang);assert.equal(await page.locator('html').getAttribute('data-wf-theme'),theme);assert.equal(await page.locator('.wfa-dashboard').evaluate(el=>getComputedStyle(el).backgroundImage),'none');assert.equal(await page.locator('.sidebar-primary-navigation button').count(),4)
  await page.locator('.wfa-sales-metrics strong').filter({hasText:'$950.00'}).waitFor()
  assert.deepEqual(await page.locator('.wfa-sales-metrics strong').allTextContents(),['$950.00','$260.00','12','$50.00'])
  const ratios=await page.locator('.wfa-sales-metrics').evaluate(el=>{
   const lum=color=>{const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0)}
   return [...el.querySelectorAll('article')].flatMap(article=>[...article.children].map(text=>{const a=lum(getComputedStyle(text).color),b=lum(getComputedStyle(article).backgroundColor);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05)}))
  });assert(ratios.every(r=>r>=4.5),'Admin metric contrast: '+JSON.stringify(ratios));await noOverflow(page)
  assert.equal(await page.locator('.wfa-sales [role=img]').count(),2,'Existing revenue and refund charts remain present')
  const chart=page.locator('.wfa-sales-chart').first();await openPanelTools(chart);await chart.getByRole('button',{name:lang==='es'?'Ampliar':'Expand',exact:true}).click();assert.equal(await chart.getAttribute('role'),'dialog');await page.keyboard.press('Escape');assert.equal(await chart.getAttribute('role'),null)
  for(const name of lang==='es'?['Clientes','Operaciones','Recursos','Resumen']:['Clients','Operations','Resources','Overview']){try{await selectPortalSection(page,name)}catch(error){console.error('Admin navigation fixture diagnostic',JSON.stringify({name,locale:await page.locator('html').getAttribute('lang'),url:page.url(),headings:await page.locator('.wfa-work h1').allTextContents(),navigation:await page.locator('.sidebar-container').allTextContents()}));throw error}await noOverflow(page)}
  assert.equal(writes,0);assert.deepEqual(errors,[]);console.log(`PASS admin hierarchy, verified fixture revenue, contrast, chart focus and destinations ${width} ${theme} ${lang}`);await context.close()
 }
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve))}
