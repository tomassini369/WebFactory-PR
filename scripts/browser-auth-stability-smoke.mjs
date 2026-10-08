import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
const server=process.env.PREVIEW_URL?null:await createServer({server:{host:'127.0.0.1',port:5199,strictPort:true}})
await server?.listen()
const origin=process.env.PREVIEW_URL||'http://127.0.0.1:5199'
let browser
try{
 for(const width of [320,390,430])for(const theme of ['light','dark']){
  browser=await chromium.launch(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH,args:['--no-sandbox','--single-process']}:undefined)
  const page=await browser.newPage({viewport:{width,height:844}})
  const errors=[];page.on('pageerror',e=>errors.push(e.message));let signedIn=false
  await page.addInitScript(theme=>{
   localStorage.setItem('webfactory-theme-v2',theme)
   // Synthetic viewport isolates keyboard/toolbar changes without resizing the layout viewport.
   const viewport=new EventTarget();Object.assign(viewport,{height:844,offsetTop:0,scale:1})
   Object.defineProperty(window,'visualViewport',{value:viewport,configurable:true})
   window.__setViewport=(height,top=0)=>{Object.assign(viewport,{height,offsetTop:top});viewport.dispatchEvent(new Event('resize'))}
  },theme)
  await page.route('**/.netlify/functions/**',async route=>{
   const req=route.request(),name=new URL(req.url()).pathname.split('/').at(-1)
   if(name==='portal-login'){assert.equal(req.postDataJSON().email,'stability@example.invalid');signedIn=true}
   else if(req.method()!=='GET'){
    assert.equal(name,'portal-session');const action=req.postDataJSON().action
    assert(['refresh','logout'].includes(action));if(action==='logout')signedIn=false
   }
   await new Promise(r=>setTimeout(r,800))
   const user=signedIn?{id:'isolated-stability',email:'stability@example.invalid',user_metadata:{},app_metadata:{},mfa:{required:true,verified:false,enrolled:false,policyRequired:true,authenticatorAvailable:true}}:null
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(name==='client-admin'?{ok:true,sites:[]}:{ok:true,user})})
  })
  await page.goto(origin+'/client-admin')
  const loading=await (await page.waitForFunction(()=>{const el=document.querySelector('.portal-loading-card');return el&&el.getBoundingClientRect().width>0?el.getBoundingClientRect().toJSON():false})).jsonValue()
  await page.locator('input[type=email]').waitFor();const login=await page.locator('.ca-login').boundingBox()
  for(const key of ['x','y','width','height'])assert(Math.abs(loading[key]-login[key])<2,`Loading/login ${key} must stay stable`)
  await page.evaluate(()=>window.__setViewport(790));await page.waitForTimeout(60)
  assert.equal(await page.locator('.ca-login').evaluate(el=>el.getBoundingClientRect().y),login.y,'Toolbar motion must not recenter the card')
  await page.locator('input[type=email]').fill('stability@example.invalid')
  await page.evaluate(()=>window.__setViewport(400,20));await page.waitForFunction(()=>document.documentElement.hasAttribute('data-pg-keyboard'))
  assert(await page.locator('h1').isVisible());assert(await page.locator('.wf-adaptive-logo-slot').isVisible())
  assert.equal(await page.locator('h1').evaluate(el=>getComputedStyle(el).position),'static','Keyboard must not visually hide the heading')
  for(const control of ['input[type=email]','input[autocomplete=current-password]','form>button','.ca-link']){
   const target=page.locator(control);await target.scrollIntoViewIfNeeded()
   assert(await target.evaluate(el=>{const r=el.getBoundingClientRect(),b=el.closest('.ca-login').getBoundingClientRect();return r.top>=b.top&&r.bottom<=b.bottom}),`${control} remains reachable inside the keyboard-sized card`)
  }
  await page.locator('input[autocomplete=current-password]').fill('isolated-fixture-only')
  await page.evaluate(()=>{document.activeElement?.blur();window.__setViewport(844)})
  await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-pg-keyboard'))
  await page.locator('.portal-language').getByRole('button',{name:'ES',exact:true}).click()
  await page.locator('form>button').click();await page.locator('.mfa-login-card').waitFor()
  await page.getByRole('heading',{name:'Seguridad de la cuenta',exact:true}).waitFor()
  assert.equal(await page.locator('html').getAttribute('lang'),'es','MFA must preserve the login language')
  const mfa=await page.locator('.ca-login').boundingBox()
  for(const key of ['x','y','width','height'])assert(Math.abs(login[key]-mfa[key])<2,`MFA/login ${key} must stay stable`)
  assert(await page.getByRole('button',{name:'Configurar Authenticator',exact:true}).isVisible())
  await page.locator('.portal-language').getByRole('button',{name:'EN',exact:true}).click()
  await page.getByRole('heading',{name:'Account security',exact:true}).waitFor()
  assert.equal(await page.locator('html').getAttribute('lang'),'en','MFA locale updates the document')
  await page.locator('.portal-language').getByRole('button',{name:'ES',exact:true}).click()
  await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();await page.locator('input[type=email]').waitFor()
  assert.equal(await page.locator('.portal-language .active').innerText(),'ES','Logout must preserve the selected language')
  await page.locator('.portal-return-home').click();await page.locator('.wf-h-login').waitFor()
  const scrim=await page.locator('.wf-hero-scrim').evaluate(el=>getComputedStyle(el).backgroundImage)
  assert(scrim.includes('0.94')&&scrim.includes('0.91'),'Mobile video must not compete with foreground text')
  assert(await page.locator('.wf-hero-media video,.wf-hero-media img').count(),'Keep the original hero media')
  assert.deepEqual(errors,[]);console.log('PASS stable loading/login/MFA/logout, toolbar, keyboard and hero:',width,theme)
  await browser.close()
 }
}finally{await browser?.close();await server?.close()}
