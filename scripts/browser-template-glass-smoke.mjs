import assert from 'node:assert/strict'
import {createServer,preview} from 'vite'
import {chromium} from 'playwright'
const server=await createServer({server:{host:'127.0.0.1',port:5194,strictPort:true}})
const production=await preview({preview:{host:'127.0.0.1',port:5194,strictPort:true}})
const {templateConfigs,templateVisualStyle}=await server.ssrLoadModule('/src/templateData.ts')
const representatives=[...new Map(templateConfigs.map(t=>[templateVisualStyle(t.category),t])).values()]
let checked=0
try {
  for(const width of [390,1440])for(const config of representatives)for(const language of ['en','es']){
   const browser=await chromium.launch(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH,args:['--single-process']}:undefined)
   try {
   const page=await browser.newPage({viewport:{width,height:900}})
   const errors=[];page.on('pageerror',e=>errors.push(e.message))
   await page.goto('http://127.0.0.1:5194/templates/'+config.slug)
   await page.locator('.template-languages button').filter({hasText:language.toUpperCase()}).click()
   await page.locator('.template-hero h1').waitFor()
   assert.equal(await page.locator('.template-demo-contact').count(),0)
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
   const composition=await page.locator('.template-hero').evaluate(hero=>{
    const image=hero.querySelector(':scope>img'),copy=hero.querySelector('.template-hero-content'),meta=hero.querySelector('.template-hero-meta');
    const a=image.getBoundingClientRect(),b=copy.getBoundingClientRect(),c=meta.getBoundingClientRect();
    return {full:a.width>=hero.clientWidth-1,overlap:a.top<=b.top+1&&a.bottom>=b.bottom-1,below:c.top>=b.bottom-1,ink:getComputedStyle(copy).color,blur:getComputedStyle(meta).backdropFilter}
   })
   assert.ok(composition.full&&composition.overlap&&composition.below,JSON.stringify(composition))
   assert.equal(composition.ink,'rgb(255, 255, 255)');assert.ok(composition.blur.includes('blur'))
   const rail=page.locator('.template-catalog-preview')
   assert.equal(await rail.locator('article').count(),Math.min(3,config.items.length))
   if(config.items.length>1){
    const next=page.getByRole('button',{name:language==='es'?'Siguiente destacado':'Next highlight',exact:true})
    if(await next.isEnabled()){
     await next.click()
     await page.waitForFunction(()=>document.querySelector('.template-catalog-preview').scrollLeft>10)
     assert.ok(await page.getByRole('button',{name:language==='es'?'Destacado anterior':'Previous highlight',exact:true}).isEnabled())
     await rail.press('ArrowLeft')
     await page.waitForFunction(()=>document.querySelector('.template-catalog-preview').scrollLeft<2)
    }
   }
   if(width===390){
    await page.locator('.template-menu-button').click()
    await page.locator('#template-main-nav').waitFor({state:'visible'})
    await page.locator('.template-menu-button').click()
    await page.locator('#template-main-nav').waitFor({state:'hidden'})
   }
   await page.locator('.template-hero-actions .template-glass').click()
   assert.equal(await page.locator('.template-catalog-modal').evaluate(e=>getComputedStyle(e).animationDuration),'0.2s')
   // Exit keeps only an inert, inaccessible snapshot until the animation finishes.
   const exit=await page.locator('.catalog-close').evaluate(button=>{button.click();return new Promise(resolve=>requestAnimationFrame(()=>{const wrapper=button.closest('.template-overlay-presence');resolve({state:wrapper?.dataset.state,inert:wrapper?.inert})}))})
   assert.equal(exit.state,'closing');assert.equal(exit.inert,true)
   await page.locator('.template-catalog-modal').waitFor({state:'detached'})
   await page.emulateMedia({reducedMotion:'reduce'})
   await page.locator('.template-hero-actions .template-glass').click()
   assert.equal(await page.locator('.template-catalog-modal').evaluate(e=>getComputedStyle(e).animationName),'none')
   await page.locator('.catalog-close').click()
   await page.locator('.template-catalog-modal').waitFor({state:'detached'})
   assert.deepEqual(errors,[])
   checked++
   }finally{await browser.close()}
  }
 console.log(`Glass template QA: ${checked} style/viewport/language cases passed; carousel, menu, exits and reduced motion verified`)
}finally{await server.close();await new Promise(resolve=>production.httpServer.close(resolve))}
