import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
const server=await createServer({server:{host:'127.0.0.1',port:5191,strictPort:true}})
await server.listen()
const {templateConfigs}=await server.ssrLoadModule('/src/templateData.ts')
const {localizeTemplate}=await server.ssrLoadModule('/src/templateI18n.ts')
const launch=()=>chromium.launch(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH,args:['--single-process']}:undefined)
let checked=0
try{
 for(const base of templateConfigs)for(const lang of ['en','es']){
  const config=localizeTemplate(base,lang)
  const browser=await launch()
  const page=await browser.newPage({viewport:{width:lang==='en'?390:1280,height:900}})
  try{
   await page.goto('http://127.0.0.1:5191/templates/'+config.slug)
   await page.locator('.template-hero h1').waitFor()
   await page.locator('.template-languages button').filter({hasText:lang.toUpperCase()}).click()
   assert.equal(await page.locator('.template-location-map iframe').count(),1,'Demo includes sample map')
   assert.equal(await page.locator('.template-header-actions .template-cart-button').count(),config.cartEnabled?1:0)
   assert.equal(await page.locator('.template-hero-actions .template-solid').count(),config.bookingEnabled?1:0)
   for(const selector of ['.template-function-showcase','.template-feature-strip','.template-catalog-gateway','.template-booking-showcase'])assert.equal(await page.locator(selector).count(),0,'No repeated feature blocks')
   assert.equal(await page.getByRole('button',{name:config.bookingLabel,exact:true}).count(),Number(config.bookingEnabled),'One primary reservation action')
   assert.equal(await page.locator('.template-catalog-preview button').count(),0,'Highlights do not repeat catalog actions')
   await page.locator('.template-hero-actions .template-glass').click()
   await page.locator('.template-catalog-modal').waitFor()
   for(const item of config.items){
    const card=page.locator('.template-catalog-card').filter({has:page.getByRole('heading',{name:item.name,exact:true})})
    assert.equal(await card.locator('.template-solid').count(),item.appointment?Number(config.bookingEnabled):Number(config.cartEnabled&&item.purchasable!==false),`${config.slug}/${lang}: action for ${item.id}`)
   }
   await page.locator('.catalog-close').click()
   for(const employee of config.employees){
    const matching=config.items.find(item=>item.appointment&&item.employees?.some(name=>employee.name.startsWith(name)))
    const team=page.locator('.template-team-grid article').filter({has:page.getByRole('heading',{name:employee.name,exact:true})})
    if(!matching)assert.equal(await team.getByRole('button').isEnabled(),false)
    else{
     await team.getByRole('button').click()
     await page.locator('.template-booking-modal').waitFor()
     const selected=page.locator('.template-choice-grid .selected')
     assert.ok((await selected.textContent()).startsWith(employee.name),`${config.slug}/${lang}: team preselection`)
     assert.equal(await page.locator('.template-booking-modal h2').textContent(),matching.name)
     await page.locator('.template-booking-modal .template-modal-close').click()
    }
   }
   if(config.bookingEnabled){
    await page.locator('.template-hero-actions .template-solid').click()
    const choices=page.locator('.template-choice-grid button')
    if(await choices.count())await choices.first().click()
    await page.locator('.wf-month-day.has-availability').first().click()
    await page.locator('.template-time-grid button:not(:disabled)').first().click()
    await page.locator('.template-confirm-booking').click()
    const service=config.items.find(item=>item.appointment)
    assert.equal(await page.locator('.template-payment-step').count(),(service.deposit??service.price)>0?1:0,'Free reservations do not ask for payment')
    if((service.deposit??service.price)>0)await page.locator('.template-booking-actions .template-solid').click()
    await page.locator('.template-booking-verified .template-solid').click()
    await page.locator('.template-booking-confirmed').waitFor()
    await page.locator('.template-booking-modal .template-modal-close').click()
   }
   const product=config.items.find(item=>!item.appointment&&item.purchasable!==false)
   if(config.cartEnabled&&product){
    await page.locator('.template-hero-actions .template-glass').click()
    const add=page.locator('.template-catalog-card').filter({has:page.getByRole('heading',{name:product.name,exact:true})}).locator('.template-solid')
    await add.scrollIntoViewIfNeeded()
    const catalogPosition=await page.locator('.template-catalog-modal').evaluate(el=>el.scrollTop)
    await add.click()
    await page.locator('.template-cart-drawer > header').getByRole('button').click()
    await page.locator('.template-catalog-modal').waitFor({state:'visible'})
    assert.equal(await page.locator('.template-catalog-modal').evaluate(el=>el.scrollTop),catalogPosition,'Cart returns to the same catalog position')
    assert.ok((await page.locator('.template-header .template-cart-button').textContent()).includes('1'),'Cart keeps the item')
    await page.locator('.catalog-close').click()
    await page.locator('.template-header .template-cart-button').click()
    await page.locator('.template-cart-drawer .template-payment-options').getByRole('button',{name:'ATH Móvil',exact:true}).click()
    assert.equal(await page.locator('.template-cart-drawer .template-payment-options button.selected').textContent(),'ATH Móvil')
    await page.locator('.template-cart-drawer > .template-solid').click()
    await page.locator('.template-success').waitFor()
    await page.locator('.template-cart-drawer > header').getByRole('button').click()
   }
   assert.equal(await page.locator('.template-demo-contact').count(),0)
   await page.goto('http://127.0.0.1:5191/builder?template='+config.slug)
   await page.locator('iframe').waitFor()
   await page.waitForFunction(slug=>JSON.parse(localStorage.getItem('webfactory-v3-builder-draft')||'{}').design?.templateSlug===slug,config.slug)
   const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('webfactory-v3-builder-draft')))
   assert.equal(state.business.category,base.category)
   assert.equal(state.features.products,base.items.some(item=>item.type==='product'))
   assert.equal(state.features.services,base.items.some(item=>item.type!=='product'))
   assert.equal(state.features.bookings,base.bookingEnabled)
   assert.equal(state.features.cart,base.cartEnabled)
   assert.equal(state.features.form,false)
   assert.deepEqual(state.catalog,[]);assert.deepEqual(state.team,[])
   checked++
   if(checked%10===0)console.log(`Completed ${checked}/46 functional cases`)
  }finally{await browser.close()}
 }
 const preservedBrowser=await launch()
 try{
  const page=await preservedBrowser.newPage()
  await page.goto('http://127.0.0.1:5191/builder')
  await page.evaluate(()=>localStorage.setItem('webfactory-v3-builder-draft',JSON.stringify({business:{name:'Existing business',category:'Barber'},features:{products:false,services:true,cart:false,bookings:false,calendar:false,form:true},catalog:[{id:'own-service',type:'service',name:'Own service',price:20,requiresAppointment:false,duration:30}],team:[{id:'own-team',name:'Own team',role:'Professional',serviceIds:['own-service']}]})))
  await page.goto('http://127.0.0.1:5191/builder?template=luna-market')
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('webfactory-v3-builder-draft')||'{}').design?.templateSlug==='luna-market')
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('webfactory-v3-builder-draft')))
  assert.equal(saved.business.category,'Barber');assert.equal(saved.features.cart,false);assert.equal(saved.features.products,false);assert.equal(saved.features.bookings,false);assert.equal(saved.features.form,true)
  assert.equal(saved.catalog[0].id,'own-service');assert.equal(saved.team[0].id,'own-team')
 }finally{await preservedBrowser.close()}
 console.log(`Template functions: ${checked} template/language cases passed; commerce actions, employee preselection and fresh Builder defaults verified`)
}finally{await server.close()}
