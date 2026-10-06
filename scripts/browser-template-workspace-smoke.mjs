import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
const server=await createServer({server:{host:'127.0.0.1',port:5188,strictPort:true}})
await server.listen()
const origin='http://127.0.0.1:5188'
const {templateConfigs,templateVisualStyle}=await server.ssrLoadModule('/src/templateData.ts')
const {localizeTemplate}=await server.ssrLoadModule('/src/templateI18n.ts')
const representatives=[...new Map(templateConfigs.map(t=>[templateVisualStyle(t.category),t])).values()]
const launch=()=>chromium.launch(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH,args:['--single-process']}:undefined)
async function geometry(page,selector){return page.locator(selector).evaluateAll(elements=>elements.filter(e=>e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent,width:r.width,height:r.height}}))}
async function noOverflow(page,label){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${label}: horizontal overflow`)}
let checked=0
try{
 for(const width of [320,390,767,768,1024,1440]){
  const browser=await launch()
  try{
   const page=await browser.newPage({viewport:{width,height:900}})
   const errors=[];page.on('pageerror',e=>errors.push(e.message))
   await page.goto(origin+'/templates');await page.locator('.template-card').first().waitFor()
   for(const theme of ['light','dark']){
    const current=await page.locator('html').getAttribute('data-wf-theme')
    if(current!==theme)await page.getByRole('button',{name:`Switch to ${theme} mode`,exact:true}).click()
    for(const lang of ['en','es']){
    await page.locator('.header .langs button').filter({hasText:lang.toUpperCase()}).click()
    await noOverflow(page,`library ${width}/${lang}`)
    for(const box of await geometry(page,'.header .langs button,.template-group-list button,.templates-page .template-card-actions a'))assert.ok(box.width>=43.5&&box.height>=43.5,`library target ${width}: ${JSON.stringify(box)}`)
    if(width<768)assert.equal(await page.locator('.template-card-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),1)
    await page.locator('.template-group-list button').last().click()
    assert.equal(await page.locator('.template-group-list [aria-pressed="true"]').count(),1)
    const card=page.locator('.template-card').first()
    const href=await card.locator('a.primary').getAttribute('href');const config=templateConfigs.find(t=>href.endsWith(t.slug))
    assert.equal(await card.locator('p').textContent(),localizeTemplate(config,lang).description)
    checked++
   }
   }
   await page.evaluate(()=>scrollTo(0,0))
   if(process.env.QA_SCREENSHOTS&&[390,1440].includes(width))await page.screenshot({path:`/tmp/templates-library-${width}.png`,fullPage:true})
   assert.deepEqual(errors,[])
  }finally{await browser.close()}
 }
 for(const baseConfig of representatives)for(const width of [320,390,1280]){
  const config=localizeTemplate(baseConfig,'en')
  const browser=await launch()
  try{
   const page=await browser.newPage({viewport:{width,height:900}})
   await page.goto(origin+'/templates/'+config.slug);await page.locator('.template-hero h1').waitFor()
   await page.locator('.template-languages button').filter({hasText:'EN'}).click()
   await noOverflow(page,`demo ${config.slug}/${width}`)
   for(const box of await geometry(page,'.template-languages button,.template-menu-button,.template-cart-button'))assert.ok(box.width>=43.5&&box.height>=43.5,`demo target ${config.slug}/${width}: ${JSON.stringify(box)}`)
   if(width<768){await page.locator('.template-menu-button').click();assert.equal(await page.locator('.template-menu-button').getAttribute('aria-expanded'),'true');await page.locator('#template-main-nav a').first().click();assert.equal(await page.locator('.template-menu-button').getAttribute('aria-expanded'),'false')}
   assert.equal(await page.locator('.template-catalog-preview article').count(),Math.min(3,config.items.length))
   if(process.env.QA_SCREENSHOTS&&width===390)await page.screenshot({path:`/tmp/template-hero-${templateVisualStyle(config.category)}.png`})
   if(config.items.length){
    await page.locator('.template-hero-actions .template-glass').click()
    await page.locator('.template-catalog-modal').waitFor()
    const buyable=config.items.find(item=>!item.appointment&&item.purchasable!==false)
    if(config.cartEnabled&&buyable){
     const card=page.locator('.template-catalog-modal .template-catalog-card').filter({has:page.getByRole('heading',{name:buyable.name,exact:true})})
     await card.locator('.template-solid').click()
     await page.locator('.template-cart-drawer').waitFor()
     assert.ok((await page.locator('.template-cart-drawer').textContent()).includes(buyable.name))
     await page.locator('.template-cart-drawer').getByRole('button',{name:'×',exact:true}).click()
     await page.locator('.template-catalog-modal').waitFor({state:'visible'})
     await page.locator('.catalog-close').click()
    }else await page.locator('.template-catalog-modal .catalog-close').click()
    if(config.bookingEnabled){await page.locator('.template-hero-actions .template-solid').click();await page.locator('.template-booking-modal').waitFor();await page.locator('.template-booking-modal .template-modal-close').click()}
    if(process.env.QA_SCREENSHOTS&&width===390){await page.locator('#services').scrollIntoViewIfNeeded();await page.screenshot({path:`/tmp/template-catalog-${templateVisualStyle(config.category)}.png`})}
   }
   const selectors=['.template-hero','.template-hero>img','.template-hero-content','.template-hero-content h1','.template-catalog-preview']
   const readStyle=e=>{const c=getComputedStyle(e);return {display:c.display,columns:c.gridTemplateColumns,fontSize:c.fontSize,position:c.position,borderRadius:c.borderRadius}}
   const demoStyles=[]
   if(width!==320)for(const selector of selectors)demoStyles.push(await page.locator(selector).evaluate(readStyle))
   await page.evaluate(config=>localStorage.setItem('webfactory-v3-builder-draft',JSON.stringify({business:{name:config.shortName,category:config.category,description:config.description,headline:config.headline,kicker:config.kicker,hero:config.heroImage,gallery:config.gallery,address:'123 Main St, Arecibo',mapsUrl:'https://www.google.com/maps?q=Arecibo'},features:{products:true,services:true,cart:config.cartEnabled,bookings:config.bookingEnabled,maps:true},catalog:config.items.map(item=>({...item,type:item.type==='product'?'product':'service',requiresAppointment:Boolean(item.appointment),duration:item.duration||30}))})),config)
   assert.equal(await page.locator('.wf-template-notice a').last().getAttribute('href'),'/builder?template='+config.slug)
   await page.goto(origin+'/builder?template='+config.slug);await page.frameLocator('iframe').locator('.template-hero').waitFor()
   const expected=width<768?'mobile':width<1024?'tablet':'desktop'
   assert.equal(await page.locator('.wf-device-switcher [aria-pressed="true"]').getAttribute('class'),'selected')
   assert.ok(await page.locator('.wf-template-preview-shell').evaluate((e,expected)=>e.classList.contains(expected),expected))
   const frame=page.frames().find(f=>f.parentFrame())
   assert.equal(await frame.evaluate(()=>innerWidth),expected==='mobile'?390:expected==='tablet'?768:1280)
   assert.ok(await frame.locator('.template-site').evaluate((e,style)=>e.classList.contains('visual-'+style),templateVisualStyle(config.category)))
   assert.equal(await frame.locator('.template-site').evaluate(e=>e.style.getPropertyValue('--template-accent')),config.accent)
   await noOverflow(page,`builder ${config.slug}/${width}`)
   assert.ok(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'iframe overflow')
   assert.equal(await frame.locator('.template-catalog-preview article').count(),Math.min(3,config.items.length))
   assert.equal(await frame.locator('.template-location-map iframe').count(),1,'Builder displays configured map')
   for(const selector of ['.template-feature-strip','.template-catalog-gateway','.template-booking-showcase'])assert.equal(await frame.locator(selector).count(),0)
   const purchasable=config.items.find(item=>!item.appointment&&item.purchasable!==false)
   if(config.cartEnabled&&purchasable){
    await frame.locator('.template-hero-actions .template-glass').click()
    const add=frame.locator('.template-catalog-card').filter({has:frame.getByRole('heading',{name:purchasable.name,exact:true})}).locator('.template-solid')
    await add.scrollIntoViewIfNeeded()
    const catalogPosition=await frame.locator('.template-catalog-modal').evaluate(el=>el.scrollTop)
    await add.click()
    await frame.locator('.cs-checkout').waitFor()
    await frame.locator('.cs-checkout > header > button').click()
    await frame.locator('.template-catalog-modal').waitFor({state:'visible'})
    assert.equal(await frame.locator('.template-catalog-modal').evaluate(el=>el.scrollTop),catalogPosition,'Builder cart returns to same catalog position')
    assert.ok((await frame.locator('.template-cart-button').textContent()).includes('1'),'Builder cart keeps the item')
    await frame.locator('.catalog-close').click()
   }
   if(width!==320){for(let i=0;i<selectors.length;i++)assert.deepEqual(await frame.locator(selectors[i]).evaluate(readStyle),demoStyles[i],`${config.slug}/${width}: demo and Builder style parity for ${selectors[i]}`)}
   if(process.env.QA_SCREENSHOTS&&width===390)await page.screenshot({path:`/tmp/templates-builder-${templateVisualStyle(config.category)}.png`})
   await page.locator('.wf-device-switcher button').first().click()
   assert.equal(await frame.evaluate(()=>innerWidth),1280)
   checked++
  }finally{await browser.close()}
 }
 console.log(`Template workspace browser checks: ${checked} library and demo/Builder cases passed`)
}finally{await server.close()}
