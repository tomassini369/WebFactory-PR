import {CONSUMER_POLICY_VERSION} from '../netlify/lib/consumer-policy.mjs'
import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {preview} from 'vite'
import {chromium,webkit} from 'playwright'
const engine=process.env.QA_ENGINE||'chromium',widths=(process.env.QA_WIDTHS||'320,375,390,430,768,1024,1440').split(',').map(Number)
const server=process.env.QA_ORIGIN?null:await preview({preview:{host:'127.0.0.1',port:5342,strictPort:true}}),origin=process.env.QA_ORIGIN||'http://127.0.0.1:5342'
const browser=await(engine==='webkit'?webkit:chromium).launch(engine==='webkit'?{}:process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH,args:['--no-sandbox']}:{}),artifact='/tmp/webfactory-marketplace-consumer';await mkdir(artifact,{recursive:true})
const fixture={slug:'qa-fixture',name:'QA fixture business',nameEn:'QA fixture business',nameEs:'Negocio de prueba QA',category:'barberias',categoryLabel:'Barbería',description:'Isolated test fixture',descriptionEs:'Datos aislados de prueba',descriptionEn:'Isolated test fixture',municipalities:['Arecibo'],locations:[{name:'QA location',address:'Arecibo, PR',mapsUrl:'https://maps.google.com/?q=Arecibo'}],heroUrl:'/marketplace/old-san-juan-960.webp',logoUrl:'',galleryUrls:['/marketplace/old-san-juan-960.webp'],services:[{id:'test-service',name:'QA service',nameEn:'QA service',nameEs:'Servicio de prueba',price:20,type:'service',imageUrl:'/marketplace/old-san-juan-960.webp',requiresAppointment:true}]}
const overflow=async p=>{const ok=await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);if(!ok){console.error(await p.evaluate(()=>({path:location.pathname,width:innerWidth,overflow:[...document.querySelectorAll('.mk-root *')].filter(n=>{const r=n.getBoundingClientRect();return r.right>innerWidth+1&&getComputedStyle(n).position!=='absolute'}).slice(0,12).map(n=>({tag:n.tagName,class:n.className,width:n.getBoundingClientRect().width}))})));await p.screenshot({path:artifact+'/overflow.png',fullPage:true})}assert(ok,'No horizontal overflow')}
try{
 for(const width of widths)for(const theme of ['light','dark'])for(const lang of ['es','en']){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block',...(engine==='webkit'?{hasTouch:true}:{})})
  await context.addInitScript(({lang,theme})=>{if(window.top===window){localStorage.setItem('webfactory-language',lang);localStorage.setItem('webfactory-theme-v2',theme)}},{lang,theme})
  const page=await context.newPage(),errors=[],writes=[];let signedIn=false,profile={name:'QA consumer',municipality:'',favorites:[],following:[],revision:0,needsAcceptance:true,restricted:false}
  page.on('pageerror',e=>errors.push(e.message))
  await page.route('**/.netlify/identity/settings',r=>r.fulfill({json:{disable_signup:false,autoconfirm:false,external:{email:true}}}))
  await page.route('**/.netlify/functions/**',async r=>{
   const path=new URL(r.request().url()).pathname.split('/').at(-1),p=r.request().method()==='POST'?r.request().postDataJSON():null
   if(path==='portal-login'){signedIn=true;return r.fulfill({json:{ok:true}})}
   if(path==='portal-session'){if(p?.action==='logout')signedIn=false;return r.fulfill({json:{ok:true,user:signedIn?{id:'qa-consumer',email:'consumer@example.invalid',name:'QA consumer',confirmedAt:'2026-10-23',roles:[],mfa:{required:false,verified:false}}:null}})}
   if(path==='marketplace-ads'&&r.request().method()==='GET'&&new URL(r.request().url()).search==='?scope=public')return r.fulfill({json:{ok:true,ads:[]}})
   if(path==='marketplace-directory')return r.fulfill({json:{ok:true,entries:[fixture],truncated:false}})
   if(path==='marketplace-business')return r.fulfill({json:{ok:true,business:fixture}})
   if(path==='marketplace-register'){writes.push(p);return r.fulfill({status:202,json:{ok:true,confirmationRequired:true}})}
   if(path==='marketplace-profile'){
    if(!signedIn)return r.fulfill({status:401,json:{ok:false}})
    if(p){assert.equal(p.revision,profile.revision);writes.push(p);profile=p.action==='accept_policy'?{...profile,needsAcceptance:false,revision:profile.revision+1}:p.action==='delete_profile'?{name:'',municipality:'',favorites:[],following:[],revision:profile.revision+1,needsAcceptance:true,restricted:false}:p.action==='minor_review'?{name:'',municipality:'',favorites:[],following:[],revision:profile.revision+1,needsAcceptance:true,restricted:true}:p.action==='profile'?{...profile,name:p.name,municipality:p.municipality,revision:profile.revision+1}:{...profile,favorites:p.saved?[fixture.slug]:[],revision:profile.revision+1}}
    return r.fulfill({json:{ok:true,profile}})
   }
   return r.fulfill({status:500,json:{ok:false,message:'Unexpected private request'}})
  })
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});await page.locator('.mk-business-card').waitFor();await overflow(page)
  assert.equal(await page.locator('.mk-business-info h3').innerText(),lang==='es'?fixture.nameEs:fixture.nameEn)
  await page.locator('.mk-view-business').click();await page.locator('.mk-profile-intro').waitFor();assert.equal(new URL(page.url()).pathname,'/negocios/qa-fixture');await overflow(page)
  await page.locator('.mk-gallery-open').click();assert(await page.locator('dialog').evaluate(n=>n.open));await page.keyboard.press('Escape');assert(!await page.locator('dialog').evaluate(n=>n.open))
  assert.equal(await page.locator('.mk-service-grid a').getAttribute('href'),'/sites/qa-fixture');assert(!await page.locator('#servicios').innerText().then(t=>/142|4\.9/.test(t)))
  await page.locator('.mk-profile-actions a').first().click();await page.locator('.mk-auth-card').waitFor();assert.equal(new URL(page.url()).pathname,'/cuenta');await overflow(page)
  await page.locator('.mk-auth-links button').first().click();await page.locator('input[name="name"]').fill('QA consumer');await page.locator('input[name="email"]').fill('consumer@example.invalid');await page.locator('input[name="password"]').fill('QA fixture password only');await page.locator('input[type="checkbox"]').nth(0).check();await page.locator('input[type="checkbox"]').nth(1).check();await page.locator('.mk-auth-form button').click();await page.locator('[role="status"]').filter({hasText:lang==='es'?'Revisa':'Check'}).waitFor();assert.equal(writes[0].acceptedTerms,true);assert.equal(writes[0].adult,true);assert.equal(writes[0].policyVersion,CONSUMER_POLICY_VERSION)
  await page.locator('.mk-auth-links button').first().click();await page.locator('input[name="password"]').fill('QA fixture password only');await page.locator('.mk-auth-form button').click();const eligibility=page.locator('.mk-account-content form').first();await eligibility.waitFor();assert.equal(await page.locator('#perfil').count(),0);await eligibility.locator('input[type=checkbox]').nth(0).check();await eligibility.locator('input[type=checkbox]').nth(1).check();await eligibility.locator('button').click();await page.locator('#perfil').waitFor();await overflow(page)
  await page.locator('#perfil input').fill('Updated QA consumer');await page.locator('#perfil select').selectOption('Arecibo');await page.locator('#perfil button').click();await page.waitForFunction(()=>document.querySelector('[role="status"]')?.textContent?.match(/guardado|saved/));assert.equal(profile.name,'Updated QA consumer')
  await page.goto(origin+'/cuenta?negocio=qa-fixture',{waitUntil:'domcontentloaded'});await page.locator('.mk-account-target .mk-account-button').first().click();await page.locator('#favoritos .mk-business-card').waitFor();assert.deepEqual(profile.favorites,['qa-fixture']);await page.locator('#favoritos .mk-account-button').click();await page.waitForFunction(()=>!document.querySelector('#favoritos .mk-business-card'));assert.deepEqual(profile.favorites,[])
  if(width<=767){await page.locator('.mk-menu-toggle').click();assert.equal(await page.locator('.mk-menu-toggle').getAttribute('aria-expanded'),'true');await page.keyboard.press('Escape');assert.equal(await page.locator('.mk-menu-toggle').getAttribute('aria-expanded'),'false')}
  page.on('dialog',d=>d.accept());await page.getByRole('button',{name:lang==='es'?'Reportar perfil de menor':'Report underage profile',exact:true}).click();await page.locator('[role=alert]').filter({hasText:lang==='es'?'restringido':'restricted'}).waitFor();assert.equal(await page.locator('#perfil').count(),0);assert.deepEqual(profile.favorites,[]);await overflow(page);await page.locator('.mk-account-aside button').click();await page.locator('.mk-auth-card').waitFor();assert.equal(signedIn,false)
  if([390,1440].includes(width))await page.screenshot({path:artifact+'/consumer-'+width+'-'+theme+'-'+lang+'-'+engine+'.png',fullPage:true})
  assert.deepEqual(errors,[]);assert(writes.every(p=>!p.role&&!p.siteId&&!p.userId));await context.close();console.log('PASS consumer signup/login/profile/favorites/logout and business gallery/catalog',width,theme,lang,engine)
 }
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage()
 await page.route('**/.netlify/functions/portal-session',r=>r.fulfill({json:{ok:true,user:null}}));await page.route('**/.netlify/identity/settings',r=>r.fulfill({json:{disable_signup:true,external:{}}}));await page.goto(origin+'/cuenta?modo=crear');await page.locator('.mk-auth-card [role="alert"]').waitFor();assert(!await page.locator('.mk-auth-form button').isEnabled());await context.close()
 console.log('PASS unavailable registration fails closed without changing Identity settings')
}finally{await browser.close();if(server)await new Promise(resolve=>server.httpServer.close(resolve))}
