import assert from 'node:assert/strict'
import {createServer,preview} from 'vite'
import {chromium,webkit} from 'playwright'

const port=Number(process.env.QA_PORT||5310)
const server=process.env.PREVIEW_URL?null:process.env.QA_BUILT?await preview({preview:{host:'127.0.0.1',port,strictPort:true}}):await createServer({server:{host:'127.0.0.1',port,strictPort:true}})
if(server&&!process.env.QA_BUILT)await server.listen()
const origin=process.env.PREVIEW_URL||`http://127.0.0.1:${port}`
const engine=process.env.QA_ENGINE==='webkit'?webkit:chromium
const browser=await engine.launch(process.env.QA_CHROMIUM_PATH&&engine===chromium?{executablePath:process.env.QA_CHROMIUM_PATH,args:['--no-sandbox']}:undefined)
try{
 for(const path of ['/client-admin/','/webfactory-admin/'])for(const width of [320,375,390,430,768,1024,1440])for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'})
  await context.addInitScript(theme=>{localStorage.setItem('webfactory-theme-v2',theme);if(!sessionStorage.getItem('wf-lifecycle-seeded')){localStorage.setItem('webfactory-language','es');sessionStorage.setItem('wf-lifecycle-seeded','1')}},theme)
  const page=await context.newPage(),errors=[],requests=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.route('**/.netlify/functions/**',async route=>{
   const request=route.request(),name=new URL(request.url()).pathname.split('/').at(-1)
   assert.equal(name,'portal-session','Lifecycle checks never send credentials or business writes')
   requests.push(request.method())
   await new Promise(resolve=>setTimeout(resolve,150))
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,user:null})})
  })
  await page.goto(origin+path)
  await page.locator('.portal-loading-card').waitFor()
  assert.equal(await page.locator('html').getAttribute('lang'),'es','Cold skeleton uses saved locale')
  const loading=await page.locator('.portal-loading-card').boundingBox()
  await page.locator('input[type=email]').waitFor()
  const card=page.locator('.ca-login,.wfa-login'),login=await card.boundingBox()
  for(const key of ['x','y','width','height'])assert(Math.abs(loading[key]-login[key])<2,`${path} ${width} ${theme}: stable ${key}`)
  if(width>820)assert(await card.evaluate(el=>el.scrollHeight<=el.clientHeight+2),'Desktop card fits the full login, including submit and recovery')
  assert.deepEqual(requests,['POST','GET'],'MFA and portal share one server session check')
  await page.locator('input[type=email]').fill('lifecycle@example.invalid')
  await page.locator('input[autocomplete=current-password]').fill('disposable-local-fixture')
  await page.evaluate(()=>{window.__loginEmail=document.querySelector('input[type=email]')})
  for(const lang of ['en','es','en','es']){
   await page.locator('.portal-language').getByRole('button',{name:lang.toUpperCase(),exact:true}).click()
   assert.equal(await page.locator('html').getAttribute('lang'),lang)
   assert.equal(await page.locator('.portal-loading-card').count(),0,'Locale change does not restart auth')
   assert.equal(await page.locator('input[type=email]').inputValue(),'lifecycle@example.invalid')
   assert.equal(await page.locator('input[autocomplete=current-password]').inputValue(),'disposable-local-fixture')
   assert(await page.evaluate(()=>window.__loginEmail===document.querySelector('input[type=email]')),'Keep form mounted')
   const box=await card.boundingBox()
   for(const key of ['x','y','width','height'])assert(Math.abs(box[key]-login[key])<2,'Locale must not recenter the card')
  }
  assert.deepEqual(requests,['POST','GET'],'Locale switching makes no authentication requests')
  assert.equal(await card.getAttribute('translate'),'no','Native bilingual controls own login translation')
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow')
  await page.reload();await page.locator('input[type=email]').waitFor()
  assert.equal(await page.locator('.portal-language .active').innerText(),'ES','Reload preserves locale')
  assert.deepEqual(errors,[])
  console.log('PASS login lifecycle:',path,width,theme)
  await context.close()
 }
 // Unavailable preference storage must not break the locale fallback.
 const context=await browser.newContext({serviceWorkers:'block'})
 await context.addInitScript(()=>{const get=Storage.prototype.getItem,set=Storage.prototype.setItem;Storage.prototype.getItem=function(key){if(key==='webfactory-language')throw new Error('Storage unavailable');return get.call(this,key)};Storage.prototype.setItem=function(key,value){if(key==='webfactory-language')throw new Error('Storage unavailable');return set.call(this,key,value)}})
 const page=await context.newPage()
 await page.route('**/.netlify/functions/portal-session',route=>route.fulfill({json:{ok:true,user:null}}))
 await page.goto(origin+'/client-admin/');await page.locator('input[type=email]').waitFor()
 await page.getByRole('button',{name:'ES',exact:true}).click()
 assert.equal(await page.locator('html').getAttribute('lang'),'es')
 await context.close()
}finally{await browser.close();await server?.close()}
