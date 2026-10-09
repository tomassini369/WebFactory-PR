import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {createServer} from 'vite'
import {chromium} from 'playwright'

const hosted=process.env.PREVIEW_URL
const server=hosted?null:await createServer({server:{host:'127.0.0.1',port:5226,strictPort:true}})
await server?.listen()
const origin=hosted||'http://127.0.0.1:5226'
const shots=process.env.QA_SCREENSHOT_DIR
if(shots)await mkdir(shots,{recursive:true})
let browser
try{
 for(const width of [390,1280])for(const theme of ['light','dark']){
  browser=await chromium.launch({...(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH,args:['--single-process','--no-sandbox']}:{}),...(hosted&&process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})})
  const page=await browser.newPage({viewport:{width,height:900},ignoreHTTPSErrors:true})
  const errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.addInitScript(theme=>{try{localStorage.setItem('webfactory-theme-v2',theme)}catch{}},theme)
  await page.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url())
   if(url.pathname.startsWith('/.netlify/functions/')){
    assert.ok(request.method()==='GET'||url.pathname.endsWith('/portal-session'),'Visual preview must not mutate external state')
    await route.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"user":null}'});return
   }
   if(!['data:','blob:'].includes(url.protocol)&&url.origin!==origin){await route.abort();return}
   await route.continue()
  })
  await page.goto(origin+'/templates/brisa-cocina')
  const carousel=page.locator('.template-highlights'),active=()=>carousel.locator('article[data-active=true]')
  await carousel.waitFor();await carousel.scrollIntoViewIfNeeded();await page.waitForTimeout(800)
  assert.equal(await carousel.locator('article').count(),3)
  if(shots)await carousel.screenshot({path:`${shots}/carousel-${width}-${theme}.png`})
  await carousel.locator('.template-spatial-dock .dock-ctrl-circle-btn').last().click()
  assert.equal(await active().getAttribute('data-index'),'1');await page.waitForTimeout(750)
  const title=await active().locator('h3').textContent()
  await active().locator('.card-expand-btn').click()
  assert.equal(await page.getByRole('dialog').locator('h2').textContent(),title)
  await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'})
  await page.goto(origin+'/preview-review#styles');await page.locator('.pr-style-review .template-highlights').waitFor()
  const salesImages=page.locator('.pr-style-review img[src*="/sales-"]');assert.equal(await salesImages.count(),3)
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('.pr-style-review img[src*="/sales-"]')).every(img=>img.complete&&img.naturalWidth>0))
  assert.ok(await page.locator('.pr-style-review .template-highlights .bottom-pill').isVisible())
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
  assert.deepEqual(errors,[])
  console.log('PASS restored template carousel and review:',width,theme)
  await browser.close();browser=null
 }
}finally{await browser?.close();await server?.close()}
