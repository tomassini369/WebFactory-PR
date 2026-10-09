import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
const server=await createServer({server:{host:'127.0.0.1',port:5198,strictPort:true}});await server.listen()
const browser=await chromium.launch();const page=await browser.newPage();const origin='http://127.0.0.1:5198'
let documents=0;const errors=[];let signedIn=false
page.on('request',req=>{if(req.resourceType()==='document'&&req.frame()===page.mainFrame())documents++})
page.on('pageerror',e=>errors.push(e.message))
// Cold/slow public chunks must never display the authentication skeleton.
await page.route('**/src/TemplatesPage.tsx*',async route=>{await new Promise(r=>setTimeout(r,1200));await route.continue()})
// Delay real presentation reads; credentials and business writes never leave this fixture.
await page.route('**/.netlify/functions/**',async route=>{
 const request=route.request(),name=new URL(request.url()).pathname.split('/').at(-1)
 if(name==='portal-login'){assert.equal(request.postDataJSON().email,'transition@example.invalid');signedIn=true}
 else if(request.method()!=='GET'){assert.equal(name,'portal-session');assert.equal(request.postDataJSON().action,'refresh')}
 await new Promise(r=>setTimeout(r,name==='client-admin'?1200:650))
 const user=signedIn?{id:'transition-fixture',email:'transition@example.invalid',user_metadata:{},app_metadata:{},mfa:{required:false}}:null
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(name==='client-admin'?{ok:true,sites:[]}:{ok:true,user})})
})
try{
 for(const width of [320,390,1280])for(const theme of ['dark','light']){
  await page.setViewportSize({width,height:844});await page.addInitScript(theme=>{try{localStorage.setItem('webfactory-theme-v2',theme)}catch{}},theme)
  await page.goto(origin);const initialDocuments=documents
  // Sample rendered frames for invisible roots and the obsolete circle during navigation.
  await page.evaluate(()=>{window.__navigationFrames=[];window.__stopNavigationFrames=false;const sample=()=>{window.__navigationFrames.push({opacity:getComputedStyle(document.querySelector('#root')).opacity,circle:!!document.querySelector('.route-loading'),background:getComputedStyle(document.body).backgroundColor});if(!window.__stopNavigationFrames)requestAnimationFrame(sample)};requestAnimationFrame(sample)})
  await page.locator('.wf-h-login').click();await page.locator('.portal-loading-card').waitFor();await page.locator('input[type=email]').waitFor()
  assert.equal(documents,initialDocuments,'Login entry must keep the document and theme alive')
  assert.equal(await page.locator('#app-manifest').getAttribute('href'),'/manifest-client-admin.webmanifest')
  await page.locator('.portal-return-home').click();await page.locator('.wf-h-login').waitFor()
  assert.equal(documents,initialDocuments,'Return home must not reload or reveal an empty document')
  assert.equal(await page.title(),'WebFactory PR | Plataforma de comercio y reservas')
  assert.equal(await page.locator('#app-manifest').getAttribute('href'),'/manifest.webmanifest')
  await page.evaluate(()=>{window.__stopNavigationFrames=true});const frames=await page.evaluate(()=>window.__navigationFrames)
  assert(frames.length>0);assert(frames.every(frame=>Number(frame.opacity)>0&&!frame.circle),'No hidden root or circular loading interstitial')
  await page.goto(origin+'/templates');await page.locator('.public-route-loading').waitFor()
  assert.equal(await page.locator('.portal-loading-card').count(),0,'Templates initial load is not an authentication screen')
  assert.equal(await page.locator('.wf-adaptive-logo-slot').count(),1,'Only the public header has a platform logo')
  await page.locator('.templates-page').waitFor()
  const home=page.locator('.header .portal-return-home');assert(await home.isVisible());const box=await home.boundingBox();assert(box.width>=44&&box.height>=44&&box.x>=0&&box.x+box.width<=width)
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Template header fits narrow screens')
  await home.click();await page.locator('.wf-h-login').waitFor()
  await page.goBack();await page.locator('.templates-page').waitFor();await page.goForward();await page.locator('.wf-h-login').waitFor()
  await page.goto(origin+'/templates');await page.locator('.templates-page').waitFor()
  const templateDocuments=documents
  await page.evaluate(()=>{window.__templateFrames=[];window.__stopTemplateFrames=false;const sample=()=>{if(location.pathname.startsWith('/templates'))window.__templateFrames.push({portal:!!document.querySelector('.portal-loading-card'),logos:document.querySelectorAll('.wf-adaptive-logo-slot,img[alt="WebFactory PR"]').length,rootOpacity:Number(getComputedStyle(document.querySelector('#root')).opacity)});if(!window.__stopTemplateFrames)requestAnimationFrame(sample)};requestAnimationFrame(sample)})
  await page.locator('.template-card-actions a[href="/templates/brisa-cocina"]').click()
  const demoHome=page.locator('.wf-template-notice .portal-return-home');await demoHome.waitFor();assert(await demoHome.isVisible())
  await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-wf-platform-theme'))
  await page.locator('.wf-template-notice a[href="/templates"]').click();await page.locator('.templates-page').waitFor()
  await page.waitForFunction(()=>document.documentElement.getAttribute('data-wf-platform-theme')==='true')
  assert.equal(documents,templateDocuments,'Library/demo/return must not reload the document')
  await page.locator('.template-card-actions a[href="/templates/brisa-cocina"]').click();await demoHome.waitFor();await demoHome.click();await page.locator('.wf-h-login').waitFor()
  assert.equal(documents,templateDocuments,'Demo Home must navigate in-app')
  await page.evaluate(()=>{window.__stopTemplateFrames=true});const templateFrames=await page.evaluate(()=>window.__templateFrames)
  assert(templateFrames.every(frame=>!frame.portal&&frame.logos<=1&&frame.rootOpacity>0),'Public template transitions must not expose login loading, duplicate logos or an invisible root')
  console.log('PASS smooth portal entry/return, history and visible template Home:',width,theme)
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(origin+'/client-admin');await page.locator('input[type=email]').waitFor();assert.equal(await page.locator('.ca-login').evaluate(el=>getComputedStyle(el).animationName),'none')
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(origin+'/client-admin');await page.locator('input[type=email]').fill('transition@example.invalid');await page.locator('input[autocomplete=current-password]').fill('isolated-fixture-only');await page.locator('form>button').click()
 await page.locator('.portal-loading-card').waitFor();assert.equal(await page.getByText('No businesses are assigned.',{exact:true}).count(),0,'Do not display empty access while business lookup is pending')
 await page.getByText('No businesses are assigned.',{exact:true}).waitFor();console.log('PASS login handoff waits for business lookup before showing an empty account')
 assert.deepEqual(errors,[])
}finally{await browser.close();await server.close()}
