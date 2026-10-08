import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'

const server=await createServer({server:{host:'127.0.0.1',port:5200,strictPort:true}})
await server.listen()
let browser
try{
 browser=await chromium.launch()
 const page=await browser.newPage()
 const origin='http://127.0.0.1:5200',errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 let recoveryFail=true,sessionFail=false,recoveryRequests=0
 await page.route('**/.netlify/functions/**',route=>{
  const name=new URL(route.request().url()).pathname.split('/').at(-1)
  assert.notEqual(name,'portal-login','Usability checks must not submit credentials')
  if(name==='portal-recovery')recoveryRequests++
  const failed=sessionFail||(name==='portal-recovery'&&recoveryFail)
  return route.fulfill({status:failed?503:200,contentType:'application/json',body:JSON.stringify(failed?{ok:false}:{ok:true,user:null})})
 })
 for(const path of ['/client-admin','/webfactory-admin']){
  for(const viewport of [{width:320,height:650},{width:390,height:650},{width:430,height:650},{width:390,height:844}]){
   await page.setViewportSize(viewport);await page.goto(origin+path)
   await page.locator('input[type=email]').waitFor()
   for(const lang of ['en','es'])for(const theme of ['light','dark']){
    await page.locator('.portal-language').getByRole('button',{name:lang.toUpperCase(),exact:true}).click()
    if(await page.locator('html').getAttribute('data-wf-theme')!==theme)await page.locator('.wf-theme-toggle').click()
    const layout=await page.locator('.ca-login,.wfa-login').evaluate(card=>{
     card.scrollTop=0
     const submit=card.querySelector('form>button'),r=submit.getBoundingClientRect(),c=card.getBoundingClientRect()
     return {visible:r.top>=c.top&&r.bottom<=Math.min(c.bottom,innerHeight),hit:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('button')===submit,overflow:document.documentElement.scrollWidth>innerWidth+1,cardBottom:c.bottom,submitBottom:r.bottom,contentHeight:card.scrollHeight}
    })
    assert(layout.visible&&layout.hit,`Initial submit visible without scroll: ${path} ${viewport.width}x${viewport.height} ${lang} ${theme} ${JSON.stringify(layout)}`)
    assert(!layout.overflow)
    console.log('PASS initial submit without scroll:',path,viewport.width,viewport.height,lang,theme)
   }
  }
  await page.locator('.portal-language').getByRole('button',{name:'ES',exact:true}).click()
  await page.locator('input[type=email]').fill('usability@example.invalid')
  const recover=page.locator(path==='/client-admin'?'.ca-link':'.wfa-text-button')
  recoveryFail=true;await recover.click();await page.getByRole('alert').waitFor()
  assert.match(await page.getByRole('alert').innerText(),/No se pudo solicitar el enlace/)
  assert.equal(await page.locator('.ca-success,.wfa-alert.success').count(),0,'No successful reset notice after a failed request')
  recoveryFail=false;await recover.click();await page.getByRole('status').waitFor()
  assert.equal(await page.getByRole('alert').count(),0)
  recoveryFail=true;await recover.click();await page.getByRole('alert').waitFor()
  assert.equal(await page.locator('.ca-success,.wfa-alert.success').count(),0,'Clear stale success before retries')
  await page.locator('.portal-return-home').click();await page.locator('.wf-h-login').waitFor()
  assert.equal(await page.locator('html').getAttribute('lang'),'es','Portal locale follows back to Home')
  assert.match(await page.locator('.wf-hero h1').innerText(),/Todo tu negocio/)
  sessionFail=true;await page.locator('.wf-h-login').click();await page.getByRole('alert').waitFor()
  assert.equal(await page.getByRole('alert').innerText(),'No se pudo comprobar tu sesión.')
  assert(await page.getByRole('button',{name:'Intentar de nuevo',exact:true}).isVisible())
  sessionFail=false
 }
 assert.equal(recoveryRequests,6,'Only explicit recovery clicks send requests')
 await page.goto(origin+'/builder');await page.locator('.builder-price').waitFor()
 await page.getByRole('button',{name:'EN',exact:true}).click()
 assert.match(await page.locator('.builder-price').innerText(),/7 days/)
 await page.getByRole('button',{name:'ES',exact:true}).click()
 assert.match(await page.locator('.builder-price').innerText(),/7 días/)
 assert.deepEqual(errors,[])
 console.log('PASS language handoff, localized session failure, reset failure/retry and Builder price')
}finally{await browser?.close();await server.close()}
