import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
const server=await createServer({server:{host:'127.0.0.1',port:5196,strictPort:true}});await server.listen()
const browser=await chromium.launch(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH,args:['--single-process','--no-sandbox']}:undefined)
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message))
const user={id:'isolated-layout-fixture',email:'layout@example.invalid',user_metadata:{},app_metadata:{},mfa:{required:false}}
const site={siteId:'layout-fixture',slug:'layout',status:'published',revision:1,business:{name:'WebFactory QA',category:'Barber'},design:{primary:'#0B1529',secondary:'#3C86F6',style:'Modern'},catalog:[],employees:[],hours:{},members:[],settings:{locale:'en',timezone:'America/Puerto_Rico',currency:'USD'},paymentRules:{},googleCalendar:{},features:{},servicePlan:{code:'complimentary',billingModel:'complimentary'}}
const admin={generatedAt:new Date().toISOString(),administrator:{name:'Layout verification',email:user.email},summary:{clients:0,publishedSites:0,connectedStripe:0,blockers:0},capacity:{level:'healthy',safeClientCapacity:0,activeClients:0,estimatedOpenings:0,utilizationPercent:0,model:'Isolated fixture'},integrations:{configured:0,total:0,configuration:[]},operations:{transactionStatuses:{},pendingTransactions:[],stripeWebhookEvents:0,clientWebhookEvents:0},clients:[],subscriptionBilling:{missing:[],ready:false},resources:{netlify:{plan:'QA',utilizationPercent:null,dashboardUrl:'/',source:'Fixture'},storage:{},runtime:{}}}
let signedIn=false
let revenueScenario='ready'
const sampleRevenue={available:true,complete:true,mode:'live',capturedCents:100000,refundedCents:5000,netCents:95000,paymentCount:12,last7DaysCents:26000,periodStart:'2026-09-10',periodEnd:'2026-10-09',generatedAt:'2026-10-09T16:00:00Z',days:[0,2400,3600,0,8000,7000,5000].map((netCents,i)=>({date:`2026-10-0${i+3}`,netCents}))}
await page.route('**/.netlify/functions/**',async route=>{
 const req=route.request(),u=new URL(req.url()),name=u.pathname.split('/').at(-1)
 if(req.method()!=='GET'&&name!=='portal-session')throw Error('Presentation QA must not write or send credentials: '+name)
 let payload={ok:true}
 if(name==='portal-session')payload={ok:true,user:signedIn?user:null}
 else if(name==='client-admin')payload=u.searchParams.has('siteId')?{ok:true,site,membership:{role:'owner'}}:{ok:true,sites:[{siteId:site.siteId,slug:site.slug,businessName:site.business.name,status:'published'}]}
 else if(name==='client-commerce-admin')payload={ok:true,orders:[],bookings:[]}
 else if(name==='client-inventory-health')payload={ok:true,checkedAt:new Date().toISOString(),heldCount:0,reviewCount:0,hiddenReviewCount:0,reservations:[],journal:{operationCount:0,reservationCount:0,bytes:0,nearCapacity:false,atCapacity:false,archivedOperations:0,archivedReservations:0},pos:{pointerCount:0,cleanupEligibleCount:0,reviewCount:0,hiddenCount:0,rows:[]}}
 else if(name==='webfactory-admin-overview')payload={ok:true,...admin}
 else if(name==='webfactory-admin-revenue')payload={ok:true,revenue:revenueScenario==='unavailable'?{available:false,reason:'temporarily_unavailable'}:revenueScenario==='zero'?{...sampleRevenue,capturedCents:0,refundedCents:0,netCents:0,paymentCount:0,last7DaysCents:0,days:sampleRevenue.days.map(d=>({...d,netCents:0}))}:revenueScenario==='partial'?{...sampleRevenue,mode:'test',complete:false}:sampleRevenue}
 else payload={ok:true,orders:[],bookings:[],customers:[],entries:[],movements:[],adjustments:[],policies:{},analytics:{},configuration:[],inventory:[],report:{}}
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)})
})
try{
 // Homepage click and actual return button use real route navigation; no auth mutation.
 await page.goto('http://127.0.0.1:5196/')
 await page.locator('.wf-h-login').click()
 await page.waitForURL('**/client-admin')
 await page.locator('button.portal-return-home').click()
 await page.waitForURL('http://127.0.0.1:5196/')
 assert.equal(await page.locator('html').evaluate(el=>el.classList.contains('wf-portal-leaving')),false)
 signedIn=true
 for(const path of ['client-admin','webfactory-admin'])for(const width of [390,1280])for(const theme of ['light','dark']){
  await page.evaluate(()=>sessionStorage.removeItem('wf-section:layout-fixture'))
  await page.setViewportSize({width,height:844});await page.goto('http://127.0.0.1:5196/'+path)
  const root=page.locator(path==='client-admin'?'.ca-dashboard':'.wfa-dashboard');await root.waitFor()
  if(await page.locator('html').getAttribute('data-wf-theme')!==theme)await page.locator('.wf-theme-toggle').click()
  assert.equal(await root.evaluate(e=>getComputedStyle(e).getPropertyValue('--pg-accent').trim()),theme==='dark'?'#91bfff':'#2867b2','Original accents must use platform blue')
  assert.equal(await root.locator('.gd-dock-curve-svg stop').first().evaluate(e=>getComputedStyle(e).stopColor),theme==='dark'?'rgb(145, 191, 255)':'rgb(40, 103, 178)')
  for(const lang of ['ES','EN']){await page.locator('.portal-language button').getByText(lang,{exact:true}).click();assert.equal(await page.locator('html').getAttribute('lang'),lang.toLowerCase())}
  if(path==='webfactory-admin'){
   const sales=page.locator('.wfa-sales');await sales.locator('.wfa-sales-metrics strong').filter({hasText:'$950.00'}).waitFor()
   assert.equal(await sales.locator('.wfa-sales-metrics article').count(),4)
   assert.equal(await sales.locator('[role=img]').count(),2)
   assert.equal(await sales.locator('.wfa-revenue-track').count(),7)
   assert.deepEqual(await sales.locator('.wfa-sales-metrics strong').allTextContents(),['$950.00','$260.00','12','$50.00'])
   assert.deepEqual(await sales.locator('.wfa-sales-breakdown strong').allTextContents(),['$1,000.00','$50.00'])
   if(width===390&&theme==='light'){
    revenueScenario='unavailable';await sales.getByRole('button',{name:'Refresh sales',exact:true}).click();await sales.getByText('Revenue could not be loaded.',{exact:false}).waitFor();assert.deepEqual(await sales.locator('.wfa-sales-metrics strong').allTextContents(),['—','—','—','—']);assert.equal(await sales.locator('[role=img]').count(),0)
    revenueScenario='zero';await sales.getByRole('button',{name:'Refresh sales',exact:true}).click();await sales.getByText('No confirmed payments in this period.',{exact:true}).waitFor();assert.deepEqual(await sales.locator('.wfa-sales-metrics strong').allTextContents(),['$0.00','$0.00','0','$0.00'])
    revenueScenario='partial';await sales.getByRole('button',{name:'Refresh sales',exact:true}).click();await sales.getByText('TEST MODE',{exact:false}).waitFor();await sales.getByText('Partial history',{exact:false}).waitFor()
    revenueScenario='ready';await sales.getByRole('button',{name:'Refresh sales',exact:true}).click();await sales.locator('.wfa-sales-metrics strong').filter({hasText:'$950.00'}).waitFor()
   }
  }
  assert.equal(await page.locator('.wf-theme-toggle').count(),1)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Workspace must not overflow')
  if(process.env.QA_SCREENSHOT_DIR){await page.waitForTimeout(350);await page.screenshot({path:`${process.env.QA_SCREENSHOT_DIR}/${path}-overview-${width}-${theme}.png`,fullPage:path==='webfactory-admin'});if(path==='webfactory-admin'){const sales=page.locator('.wfa-sales');await sales.locator('.wfa-sales-metrics').screenshot({path:`${process.env.QA_SCREENSHOT_DIR}/sales-cards-${width}-${theme}.png`});for(const [i,name] of ['daily','refunds'].entries())await sales.locator('.wfa-sales-chart').nth(i).screenshot({path:`${process.env.QA_SCREENSHOT_DIR}/sales-${name}-${width}-${theme}.png`})}}
  if(width===390){await page.locator(path==='client-admin'?'.ca-mobile-menu-toggle':'.wfa-menu-toggle').click();assert.equal(await page.locator(path==='client-admin'?'.ca-mobile-menu-toggle':'.wfa-menu-toggle').getAttribute('aria-expanded'),'true')}
  const nav=page.locator(path==='client-admin'?'.ca-sidebar nav':'.wfa-sidebar nav')
  if(path==='client-admin'){const group=nav.locator('details').filter({has:page.getByText('Business',{exact:true})});if(await group.getAttribute('open')===null)await group.locator('summary').click()}
  await nav.getByRole('button',{name:path==='client-admin'?'Products and services':'Clients',exact:true}).click()
  if(width===390)assert.equal(await page.locator(path==='client-admin'?'.ca-mobile-menu-toggle':'.wfa-menu-toggle').getAttribute('aria-expanded'),'false')
  const panel=page.locator('.wf-portal-panel').first();await panel.waitFor()
  assert.notEqual(await panel.evaluate(el=>getComputedStyle(el).borderRadius),'0px')
  await panel.locator('.wf-panel-tools button').last().click();assert.equal(await page.getByRole('dialog',{name:'Expanded panel'}).count(),1)
  await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog',{name:'Expanded panel'}).count(),0)
  if(process.env.QA_SCREENSHOT_DIR)await page.screenshot({path:`${process.env.QA_SCREENSHOT_DIR}/${path}-${width}-${theme}.png`})
  console.log('PASS workspace',path,width,theme)
 }
 assert.deepEqual(errors,[])
 console.log('PASS: homepage/portal return, both workspaces, themes, languages, mobile menus and panel focus')
}finally{await browser.close();await server.close()}
