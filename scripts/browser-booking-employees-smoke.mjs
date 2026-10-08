import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
const server=await createServer({server:{host:'127.0.0.1',port:5193,strictPort:true}})
await server.listen()
const {templateConfigs}=await server.ssrLoadModule('/src/templateData.ts')
const {localizeTemplate}=await server.ssrLoadModule('/src/templateI18n.ts')
const browser=await chromium.launch(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH,args:['--no-sandbox','--single-process']}:undefined)
const page=await browser.newPage()
let services=0,employees=0
try{
 for(const base of templateConfigs)for(const lang of ['es','en']){
  const config=localizeTemplate(base,lang)
  await page.setViewportSize({width:lang==='es'?390:1280,height:844})
  await page.goto('http://127.0.0.1:5193/templates/'+base.slug)
  await page.locator('.template-hero h1').waitFor()
  await page.locator('.template-languages button').filter({hasText:lang.toUpperCase()}).click()
  if(!config.bookingEnabled){assert.equal(await page.locator('.template-hero-actions .template-solid').count(),0);continue}
  await page.locator('.template-hero-actions .template-solid').click()
  const modal=page.locator('.template-booking-modal')
  const selector=modal.locator('select')
  assert.equal(await selector.locator('option').count(),config.items.filter(x=>x.appointment).length)
  for(const item of config.items.filter(x=>x.appointment)){
   await selector.selectOption(item.id)
   const eligible=config.employees.filter(e=>!item.employees?.length||item.employees.some(n=>e.name.startsWith(n)))
   if(config.employees.length)assert.ok(eligible.length,`${base.slug}/${item.id} must have an eligible professional`)
   const choices=modal.locator('.template-choice-grid button')
   assert.equal(await choices.count(),eligible.length?eligible.length+1:0)
   for(const employee of eligible){
    await choices.filter({hasText:employee.name}).click()
    await modal.locator('.wf-month-day.has-availability').first().click()
    await modal.locator('.template-time-grid button:not(:disabled)').first().click()
    assert.equal(await modal.locator('.template-confirm-booking').isEnabled(),true)
    employees++
   }
   if(eligible.length){await choices.first().click();assert.equal(await modal.locator('.template-confirm-booking').isEnabled(),false,'Changing professional clears previous time')}
   services++
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No page overflow')

 }
 console.log(`PASS: 23 templates, ES/mobile + EN/desktop; ${services} service selections and ${employees} professional selections`)
}finally{await browser.close();await server.close()}
