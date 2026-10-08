import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {createServer} from 'vite'
import {chromium} from 'playwright'

const server=await createServer({server:{host:'127.0.0.1',port:5203,strictPort:true}})
await server.listen()
const origin='http://127.0.0.1:5203'
const shotDir=process.env.QA_SCREENSHOT_DIR
if(shotDir)await mkdir(shotDir,{recursive:true})
const user={id:'isolated-style-fixture',email:'style@example.invalid',mfa:{required:false}}
const site={siteId:'style-fixture',slug:'style',status:'published',revision:1,business:{name:'WebFactory QA',category:'Retail'},design:{primary:'#0B1529',secondary:'#3C86F6',style:'Modern'},catalog:[],employees:[],hours:{},members:[],settings:{locale:'en',timezone:'America/Puerto_Rico',currency:'USD'},paymentRules:{},googleCalendar:{},features:{},servicePlan:{code:'complimentary',billingModel:'complimentary'}}
const receipt={receiptId:'rcpt-style-fixture',transactionId:'style-transaction',total:2541,paymentStatus:'paid',createdAt:'2026-10-08T16:00:00Z',customer:{name:'Cliente de ejemplo',email:'customer@example.invalid'},items:[{name:'Producto de ejemplo',quantity:2,unitAmount:1100,amount:2200}],subtotal:2200,discounts:100,tax:241,tip:200,paymentMethod:'card'}
let browser
try{
 for(const width of [390,1280])for(const theme of ['light','dark']){
  browser=await chromium.launch(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH,args:['--single-process','--no-sandbox']}:undefined)
  const page=await browser.newPage({viewport:{width,height:844}})
  const errors=[];page.on('pageerror',error=>errors.push(error.message))
  await page.addInitScript(theme=>{try{localStorage.setItem('webfactory-theme-v2',theme)}catch{}},theme)
  let signedIn=false;const writes=[]
  await page.route('**/.netlify/functions/**',async route=>{
   const request=route.request(),url=new URL(request.url()),name=url.pathname.split('/').at(-1)
   let payload={ok:true,records:[]}
   if(request.method()!=='GET'&&name!=='portal-session'){
    assert.equal(name,'client-v3-admin');const body=request.postDataJSON()
    assert.deepEqual(body,{siteId:site.siteId,action:'resend_receipt',receiptId:receipt.receiptId});writes.push(body)
   }
   if(name==='portal-session')payload={ok:true,user:signedIn?user:null}
   else if(name==='public-client-site')payload={ok:true,site:{...site,slug:'style-fixture',features:{products:true,cart:true},design:{...site.design,mode:'template_base',templateSlug:'brisa-cocina'},catalog:[{id:'style-product',type:'product',name:'Style product',description:'Fixture',price:11,inventory:5,requiresAppointment:false,duration:0,imageUrl:'/portal-gold-waves.webp'}]}}
   else if(name==='client-admin')payload=url.searchParams.has('siteId')?{ok:true,site,membership:{role:'owner'}}:{ok:true,sites:[{siteId:site.siteId,slug:site.slug,businessName:site.business.name,status:'published'}]}
   else if(name==='client-commerce-admin')payload={ok:true,orders:[],bookings:[]}
   else if(name==='client-v3-admin'&&url.searchParams.get('collection')==='receipts')payload={ok:true,records:[receipt,{...receipt,receiptId:'rcpt-other-fixture',total:4321,paymentStatus:'refunded'}]}
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)})
  })
  await page.goto(origin+'/client-admin');await page.locator('input[type=email]').waitFor()
  if(shotDir){await page.waitForTimeout(450);await page.screenshot({path:`${shotDir}/login-${width}-${theme}.png`,fullPage:true})}
  signedIn=true;await page.reload();await page.locator('.ca-dashboard').waitFor()
  const nav=page.locator('.ca-sidebar nav')
  if(width===390)await page.locator('.ca-mobile-menu-toggle').click()
  const payments=nav.getByRole('button',{name:'Payments',exact:true,includeHidden:true})
  await payments.evaluate(button=>button.closest('details')?.setAttribute('open',''))
  await payments.click()
  const paper=page.locator('.wf-receipt-paper');await paper.waitFor()
  assert.match(await paper.innerText(),/\$25\.41/)
  assert.match(await paper.innerText(),/2 × \$11\.00/)
  assert.match(await paper.innerText(),/-\$1\.00/)
  assert.match(await paper.innerText(),/12:00:00 PM/,'Receipt date uses business timezone')
  const panel=page.locator('.ca-receipts-panel')
  assert((await panel.getByRole('link',{name:'Open PDF'}).first().getAttribute('href')).includes('siteId=style-fixture&receiptId=rcpt-style-fixture'))
  await paper.scrollIntoViewIfNeeded();await page.waitForTimeout(900)
  if(shotDir)await panel.screenshot({path:`${shotDir}/receipt-${width}-${theme}.png`})
  await panel.getByRole('button',{name:'View receipt',exact:true}).nth(1).click()
  assert.match(await paper.innerText(),/\$43\.21/,'Use authoritative total, never recompute in the visual receipt')
  assert.match(await paper.innerText(),/Refunded/)
  await panel.getByRole('button',{name:'Resend',exact:true}).first().click()
  await page.waitForFunction(()=>!Array.from(document.querySelectorAll('.ca-receipts-panel button')).some(button=>button.disabled))
  assert.equal(writes.length,1)
  await page.locator('.portal-language button').getByText('ES',{exact:true}).click()
  assert.match(await paper.innerText(),/Reembolsado/)
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))

  await page.goto(origin+'/templates/brisa-cocina')
  await page.locator('.template-hero-actions .template-glass').click()
  const card=page.locator('.template-catalog-card').filter({has:page.locator('.template-solid')}).first()
  await card.locator('img').evaluate(img=>img.decode())
  await card.locator('.template-solid').click()
  await page.locator('.template-cart-lines article').waitFor()
  assert.match(await page.locator('.template-cart-lines article').first().innerText(),/(Qty|Cant\.?|Cantidad)\s*1/i)
  await page.locator('.wf-cart-flight').waitFor({state:'attached'})
  assert.equal(await page.locator('.wf-cart-flight').evaluate(img=>getComputedStyle(img).pointerEvents),'none')
  await page.locator('.wf-cart-flight').waitFor({state:'detached'})
  await page.locator('.template-cart-drawer header button').click()
  await page.emulateMedia({reducedMotion:'reduce'})
  await card.locator('.template-solid').click();await page.locator('.template-cart-lines article').waitFor()
  assert.match(await page.locator('.template-cart-lines article').first().innerText(),/(Qty|Cant\.?|Cantidad)\s*2/i)
  assert.equal(await page.locator('.wf-cart-flight').count(),0)
  await page.emulateMedia({reducedMotion:'no-preference'})
  await page.goto(origin+'/sites/style-fixture')
  await page.locator('.template-hero-actions .template-glass').click()
  const liveCard=page.locator('.template-catalog-card').first()
  await liveCard.locator('img').evaluate(img=>img.decode())
  await liveCard.locator('.template-solid').click();await page.locator('.cs-cart-line').waitFor()
  assert.match(await page.locator('.cs-cart-line').innerText(),/× 1/)
  await page.locator('.wf-cart-flight').waitFor({state:'attached'})
  await page.locator('.wf-cart-flight').waitFor({state:'detached'})
  await page.locator('.cs-checkout > header > button').click()
  await page.emulateMedia({reducedMotion:'reduce'})
  await liveCard.locator('.template-solid').click();await page.locator('.cs-cart-line').waitFor()
  assert.match(await page.locator('.cs-cart-line').innerText(),/× 2/)
  assert.match(await page.locator('.cs-cart-line').innerText(),/\$22\.00/)
  assert.equal(await page.locator('.wf-cart-flight').count(),0)
  assert.equal(writes.length,1,'Cart presentation must not create orders or payments')
  assert.deepEqual(errors,[])
  console.log('PASS receipt totals/status/timezone/PDF/resend and cart flight/reduced motion:',width,theme)
  await browser.close();browser=null
 }
}finally{await browser?.close();await server.close()}
