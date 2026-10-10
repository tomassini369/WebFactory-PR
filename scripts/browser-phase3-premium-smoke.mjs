import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'vite'
import { chromium, webkit } from 'playwright'

const engine = process.env.QA_ENGINE === 'webkit' ? webkit : chromium
const port = Number(process.env.QA_PORT || 5213)
const origin = `http://127.0.0.1:${port}`
const widths = process.env.QA_WIDTHS ? process.env.QA_WIDTHS.split(',').map(Number) : [320,375,390,430,768,1024,1440]
const server = await createServer({server:{host:'127.0.0.1',port,strictPort:true}})
await server.listen()
const browser = await engine.launch(engine === chromium ? {executablePath:process.env.QA_CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']} : process.env.QA_WEBKIT_PATH ? {executablePath:process.env.QA_WEBKIT_PATH} : {})
const output = process.env.QA_SCREENSHOT_DIR || '/tmp/webfactory-phase3'
await mkdir(output,{recursive:true})
const user={id:'phase3-fixture',email:'phase3@example.invalid',app_metadata:{roles:['admin']},user_metadata:{},mfa:{required:false}}
const site={siteId:'phase3-fixture',slug:'phase3-fixture',status:'published',revision:1,business:{name:'Presentation QA fixture',category:'Barber'},design:{primary:'#0B1529',secondary:'#3C86F6',style:'Modern'},catalog:[],employees:[],hours:{},members:[],settings:{locale:'en',timezone:'America/Puerto_Rico',currency:'USD'},paymentRules:{},googleCalendar:{},features:{},servicePlan:{code:'complimentary',billingModel:'complimentary'}}
const admin={generatedAt:new Date().toISOString(),administrator:{name:'Presentation QA fixture',email:user.email},summary:{clients:0,publishedSites:0,connectedStripe:0,blockers:0},capacity:{level:'healthy',safeClientCapacity:0,activeClients:0,estimatedOpenings:0,utilizationPercent:0,model:'Isolated fixture'},integrations:{configured:0,total:0,configuration:[]},operations:{transactionStatuses:{},pendingTransactions:[],stripeWebhookEvents:0,clientWebhookEvents:0},clients:[],subscriptionBilling:{missing:[],ready:false},resources:{netlify:{plan:'QA',utilizationPercent:null,dashboardUrl:'/',source:'Fixture'},storage:{},runtime:{}}}
const now=new Date().toISOString()
const records=[{transactionId:'qa-order',kind:'order',customer:{name:'Isolated fixture',email:'customer@example.invalid'},amountTotal:1234567,refundedAmount:10000,paymentStatus:'partially_refunded',status:'confirmed',createdAt:now},{transactionId:'qa-booking',kind:'booking',customer:{name:'Isolated fixture',email:'customer@example.invalid'},amountTotal:20000,paymentStatus:'paid',status:'confirmed',createdAt:now,start:new Date(Date.now()+86400000).toISOString()}]
const revenue={available:true,complete:true,mode:'test',netCents:1244567,capturedCents:1254567,refundedCents:10000,paymentCount:2,last7DaysCents:1244567,days:Array.from({length:7},(_,i)=>({date:`2026-10-0${i+1}`,netCents:i===6?1244567:0}))}
const page=await browser.newPage({hasTouch:engine===webkit,isMobile:engine===webkit})
const errors=[]
page.on('pageerror',error=>errors.push(error.message))
await page.route('**/.netlify/functions/**',async route=>{
  const request=route.request(),url=new URL(request.url()),name=url.pathname.split('/').at(-1)
  if(request.method()!=='GET') {
    assert.equal(name,'portal-session','Presentation QA must never change business data: '+name)
    assert.equal(request.postDataJSON()?.action,'refresh','Only isolated session refresh is allowed')
  }
  let payload={ok:true,orders:[],bookings:[],customers:[],entries:[],movements:[],policies:{},report:{}}
  if(name==='portal-session')payload={ok:true,user}
  if(name==='client-admin')payload=url.searchParams.has('siteId')?{ok:true,site,membership:{role:'owner'}}:{ok:true,sites:[{siteId:site.siteId,slug:site.slug,businessName:site.business.name,status:'published'}]}
  if(name==='client-commerce-admin')payload={ok:true,orders:[records[0]],bookings:[records[1]]}
  if(name==='webfactory-admin-overview')payload={ok:true,...admin}
  if(name==='webfactory-admin-revenue')payload={ok:true,revenue}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)})
})
const noOverflow=async label=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' horizontal overflow')
try {
  for(const width of widths)for(const theme of ['light','dark'])for(const lang of ['en','es']) {
    await page.setViewportSize({width,height:844})
    await page.addInitScript(({theme,lang})=>{localStorage.setItem('webfactory-theme-v2',theme);localStorage.setItem('webfactory-language',lang);sessionStorage.clear()},{theme,lang})
    for(const path of ['client-admin','webfactory-admin']) {
      await page.goto(`${origin}/${path}`)
      await page.locator(path==='client-admin'?'.bcc':'.wfa-sales').waitFor()
      await page.locator('.portal-language button').filter({hasText:new RegExp('^'+lang.toUpperCase()+'$')}).click()
      if(await page.locator('html').getAttribute('data-wf-theme')!==theme)await page.locator('.wf-theme-toggle').click()
      const chart=page.locator('.wf-data-chart')
      await chart.locator('button').last().click()
      assert.equal(await chart.locator('button[aria-pressed=true]').count(),1)
      assert.match(await chart.locator('.wf-data-chart-detail strong').innerText(),/12,445.67/)
      await chart.locator('button').last().press('ArrowLeft')
      assert.equal(await chart.locator('button').nth(5).getAttribute('aria-pressed'),'true')
      await chart.locator('button').nth(5).press('End')
      assert.equal(await chart.locator('button').last().getAttribute('aria-pressed'),'true')
      if(path==='client-admin') {
        const filter=page.locator('.bcc-chart-filter select')
        await filter.selectOption('booking')
        assert.equal(await chart.locator('.wf-data-chart-detail strong').innerText(),'$200.00')
        await filter.selectOption('order')
        assert.equal(await chart.locator('.wf-data-chart-detail strong').innerText(),'$12,245.67')
        await filter.selectOption('all')
        assert.equal(await page.locator('.bcc-metrics strong').first().innerText(),'$12,445.67','Chart filtering must not change account totals')
        assert.equal(await page.locator('.bcc-bookings article span').first().innerText(),lang==='es'?'Confirmada':'Confirmed')
      }
      await noOverflow(`${path}/${width}/${theme}/${lang}`)
      if(width<=820){
        const menu=page.locator(path==='client-admin'?'.ca-mobile-menu-toggle':'.wfa-menu-toggle')
        await menu.click()
        const current=page.locator('.sidebar-nav-item[aria-current=page]')
        assert((await current.boundingBox()).height>=44,'Mobile sidebar touch target')
        await page.keyboard.press('Tab')
        await current.focus()
        assert.notEqual(await current.evaluate(el=>getComputedStyle(el).outlineStyle),'none','Visible sidebar keyboard focus')
        await menu.click()
      }
      for(const box of await chart.locator('button').evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect().toJSON())))assert(box.height>=44&&box.width>=44,'Chart touch targets must be at least 44px in both dimensions')
      assert.equal(await chart.locator('.wf-data-chart-track i').last().evaluate(el=>getComputedStyle(el).backgroundImage),'none','No decorative gradients on data bars')
      const metric=page.locator(path==='client-admin'?'.bcc-metrics article':'.wfa-sales-metrics article').first()
      assert.equal(await metric.evaluate(el=>getComputedStyle(el).backdropFilter),'none','Metric strips must not repeat expensive backdrop blur')
      assert.equal(await metric.evaluate(el=>getComputedStyle(el).boxShadow),'none','Metric strips must not repeat nested shadows')
      if([390,1440].includes(width)&&lang==='en'){
        await page.locator(path==='client-admin'?'.ca-work':'.wfa-work').evaluate(el=>el.scrollTop=0)
        await page.screenshot({path:`${output}/${path}-${width}-${theme}-${process.env.QA_ENGINE||'chromium'}.png`})
        await chart.scrollIntoViewIfNeeded()
        await page.screenshot({path:`${output}/${path}-chart-${width}-${theme}-${process.env.QA_ENGINE||'chromium'}.png`})
      }
    }
    await page.goto(origin+'/builder?template=brisa-cocina')
    await page.frameLocator('iframe.wf-template-preview-frame').locator('.template-hero').waitFor()
    await page.locator('.header .langs button').filter({hasText:new RegExp('^'+lang.toUpperCase()+'$')}).click()
    if(await page.locator('html').getAttribute('data-wf-theme')!==theme)await page.locator('.wf-theme-toggle').click()
    const steps=page.locator('.wf-builder-nav button')
    await steps.nth(1).click();assert.equal(await steps.nth(1).getAttribute('aria-current'),'step')
    await steps.first().click()
    const input=page.locator('.wf-builder-panel input').first()
    assert.equal(await input.evaluate(el=>getComputedStyle(el).fontSize),'16px','Prevent iPhone input zoom')
    for(const device of ['mobile','desktop']) {
      await page.locator('.wf-device-switcher button').nth(device==='mobile'?2:0).click()
      assert.match(await page.locator('.wf-preview-context').innerText(),device==='mobile'?/390 px/:/1280 px/)
      const frame=page.frames().find(frame=>frame.parentFrame())
      assert.equal(await frame.evaluate(()=>innerWidth),device==='mobile'?390:1280)
      assert(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Preview overflow')
    }
    await noOverflow(`builder/${width}/${theme}/${lang}`)
    if([390,1440].includes(width)&&lang==='en')await page.locator('.wf-builder-app').screenshot({path:`${output}/builder-${width}-${theme}-${process.env.QA_ENGINE||'chromium'}.png`})
    console.log('PASS phase3',process.env.QA_ENGINE||'chromium',width,theme,lang,'charts, exact values, keyboard, filters, Builder steps and viewport')
  }
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.goto(origin+'/client-admin')
  await page.locator('.wf-data-chart').waitFor()
  assert.equal(await page.locator('.wf-data-chart button').first().evaluate(el=>getComputedStyle(el).transitionDuration),'0s')
  assert.deepEqual(errors,[])
  console.log('PASS reduced motion and no JavaScript exceptions')
} finally {await browser.close();await server.close()}
