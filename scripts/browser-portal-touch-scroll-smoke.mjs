import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {createServer,preview} from 'vite'
const {chromium,webkit}=await import(process.env.QA_PLAYWRIGHT_MODULE||'playwright')
import {DEFAULT_APPEARANCE} from '../shared/dashboard-appearance.mjs'
import {siteRoleCapabilities} from '../netlify/lib/client-auth.mjs'
import {selectPortalSection} from './qa-workspace-navigation.mjs'

const port=Number(process.env.QA_PORT||5349),origin=`http://127.0.0.1:${port}`
const server=process.env.QA_DEV==='1'?await createServer({server:{host:'127.0.0.1',port,strictPort:true}}):await preview({preview:{host:'127.0.0.1',port,strictPort:true}})
if(process.env.QA_DEV==='1')await server.listen()
const engine=process.env.QA_ENGINE==='webkit'?webkit:chromium
const browser=await engine.launch({executablePath:process.env[engine===webkit?'QA_WEBKIT_PATH':'QA_CHROMIUM_PATH'],...(engine===chromium?{args:['--no-sandbox','--disable-dev-shm-usage']}: {})})
const output='/tmp/portal-touch-scroll-qa';await mkdir(output,{recursive:true})
const user={id:'touch-qa',email:'touch@example.invalid',app_metadata:{roles:['admin']},user_metadata:{},mfa:{required:false}}
const site={siteId:'touch-qa-site',slug:'touch-qa',status:'published',revision:1,business:{name:'Isolated touch QA',category:'Barber'},design:{primary:'#0B1529',secondary:'#3C86F6',style:'Modern'},catalog:[],employees:[],hours:{},members:[],settings:{locale:'en',timezone:'America/Puerto_Rico',currency:'USD'},features:{},servicePlan:{code:'complimentary',billingModel:'complimentary'}}
const summary={generatedAt:new Date().toISOString(),administrator:{name:'Isolated QA',email:user.email},summary:{clients:0,publishedSites:0,connectedStripe:0,blockers:0},capacity:{level:'healthy',activeClients:0},integrations:{configuration:[]},operations:{transactionStatuses:{},pendingTransactions:[]},clients:[],subscriptionBilling:{missing:[],ready:false},resources:{netlify:{},storage:{},runtime:{}}}
const measurements=[]
const luminance=rgb=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0)
const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05)
const rgba=s=>{if(Array.isArray(s))return s;const c=s.match(/[\d.]+/g).map(Number);return [...c.slice(0,3),c[3]??1]}
const blend=(a,b)=>a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3]))
const readColors=(page,selector)=>page.locator(selector).first().evaluate(el=>{
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const c=canvas.getContext('2d')
 const rgba=color=>{c.clearRect(0,0,1,1);c.fillStyle=color;c.fillRect(0,0,1,1);const p=[...c.getImageData(0,0,1,1).data];return [...p.slice(0,3),p[3]/255]}
 return {fill:rgba(getComputedStyle(el,'::before').backgroundColor),ink:rgba(getComputedStyle(el).color),secondary:rgba(getComputedStyle(el.querySelector('p')||el).color)}
})
function checkReadingContrast(surface){for(const background of [[0,0,0],[255,255,255]]){const bg=blend(rgba(surface.fill),background);for(const color of [surface.ink,surface.secondary])assert(contrast(blend(rgba(color),bg),bg)>=4.5,`Reading contrast ${JSON.stringify(surface)}`)}}
async function swipe(page,from,to){
 const cdp=await page.context().newCDPSession(page)
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from.x,y:from.y}]})
 for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+(to.x-from.x)*i/12,y:from.y+(to.y-from.y)*i/12}]});await page.waitForTimeout(16)}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();await page.waitForTimeout(180)
}
try{
 for(const width of (process.env.QA_WIDTHS||'320,375,390,430,768,1024,1440').split(',').map(Number))for(const theme of ['light','dark'])for(const lang of ['es','en']){
  const context=await browser.newContext({viewport:{width,height:width<=430?844:950},hasTouch:true,isMobile:true,serviceWorkers:'block',reducedMotion:'reduce'})
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.addInitScript(t=>localStorage.setItem('webfactory-theme-v2',t),theme)
  let prefs={...DEFAULT_APPEARANCE,backgroundNatural:true,glassStyle:'liquid',alpha:.20,blur:0},saved=structuredClone(prefs)
  await page.route('**/.netlify/functions/**',async route=>{
   const req=route.request(),url=new URL(req.url()),name=url.pathname.split('/').at(-1)
   let data={ok:true,records:[],orders:[],bookings:[],customers:[],receipts:[],analytics:{},reviews:[],offers:[],campaigns:[]}
   if(name==='dashboard-appearance'){
    assert(['GET','PUT','DELETE'].includes(req.method()))
    if(req.method()==='PUT')saved=req.postDataJSON()
    if(req.method()==='DELETE')saved={...DEFAULT_APPEARANCE}
    data={ok:true,prefs:saved,hasCustom:false,revision:1,version:'isolated-touch-qa'}
   }else if(name==='portal-session')data={ok:true,user}
   else if(name==='portal-profile')data={ok:true,profile:{name:'',phone:'',language:null,theme:null},hasPhoto:false,version:'qa'}
   else if(name==='client-admin')data=url.searchParams.has('siteId')?{ok:true,site,membership:{role:'owner',capabilities:siteRoleCapabilities('owner')},posOperations:{cashierEnabled:true,displayEnabled:true,profile:'auto',revision:0}}:{ok:true,sites:[{siteId:site.siteId,slug:site.slug,businessName:site.business.name,status:'published'}]}
   else if(name==='webfactory-admin-overview')data={ok:true,...summary}
   else if(name==='webfactory-admin-revenue')data={ok:true,revenue:{available:false}}
   else if(name==='client-customer-display')data={ok:true,paired:false}
   else assert.equal(req.method(),'GET','No operational writes in touch QA')
   if(process.env.QA_DEBUG)console.log('FIXTURE',name,req.method(),JSON.stringify(data).slice(0,350))
   await route.fulfill({json:data})
  })
  for(const path of ['/client-admin','/webfactory-admin']){
   await page.goto(origin+path);try{await page.locator('.gd-content').waitFor()}catch(error){console.error('BOOTSTRAP',errors,await page.locator('body').innerText());throw error}
   await page.locator('.portal-language').getByRole('button',{name:lang.toUpperCase(),exact:true}).click()
   await page.waitForFunction(()=>document.querySelector('.gd-root')?.dataset.glassStyle==='liquid')
   const metrics=await page.evaluate(()=>({innerWidth,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,viewport:{width:visualViewport.width,height:visualViewport.height,scale:visualViewport.scale},header:document.querySelector('.gd-topbar').getBoundingClientRect().height,scrollport:document.querySelector('.gd-content').getBoundingClientRect().height,meta:document.querySelector('meta[name=viewport]').content}))
   measurements.push({width,theme,lang,path,...metrics})
   assert.equal(metrics.innerWidth,width);assert.equal(metrics.clientWidth,width);assert.equal(metrics.viewport.scale,1);assert(metrics.scrollWidth<=width+1)
   if(width<=430&&!process.env.QA_BASELINE)assert(metrics.header<=165,`Compact mobile header ${path} ${theme} ${lang}: ${JSON.stringify(metrics)}`)
   if(process.env.QA_BASELINE){await page.screenshot({path:`${output}/before-${theme}-${path.slice(1)}.png`});continue}
   assert.equal(await page.locator('.gd-root').getAttribute('data-readable-glass'),'true')
   await page.locator('.wf-licensed-liquid-glass').first().waitFor({state:'attached'})
   const optics=await page.locator('.wf-licensed-liquid-glass').evaluateAll(els=>els.map(el=>({strategy:el.dataset.glassStrategy,reason:el.dataset.glassReason})))
   assert(optics.every(o=>o.strategy!=='webgl'),'Touch surfaces avoid moving WebGL refraction')
   const surface=await readColors(page,'.wf-portal-panel')
   // Bound arbitrary wallpaper brightness by testing both black and white backdrops.
   for(const background of [[0,0,0],[255,255,255]]){
    const bg=blend(rgba(surface.fill),background)
    assert(contrast(blend(rgba(surface.ink),bg),bg)>=4.5,`Primary text contrast ${JSON.stringify(surface)}`)
    assert(contrast(blend(rgba(surface.secondary),bg),bg)>=4.5,`Secondary text contrast ${JSON.stringify(surface)}`)
   }
   await page.locator('.gd-dock button').last().click();await page.locator('.gd-adjustments').waitFor()
   const range=page.locator('.gd-adjustments input[type=range]').nth(1)
   await range.evaluate(el=>el.scrollIntoView({block:'center'}))
   const box=await range.boundingBox(),content=page.locator('.gd-content')
   if(engine===chromium){
    const before=await content.evaluate(el=>el.scrollTop),value=await range.inputValue()
    await swipe(page,{x:box.x+box.width*.45,y:box.y+box.height/2},{x:box.x+box.width*.45,y:box.y-120})
    assert((await content.evaluate(el=>el.scrollTop))>before+35,'Vertical touch on a slider scrolls the page')
    assert.equal(await range.inputValue(),value,'Vertical scroll does not change the slider')
    await range.evaluate(el=>el.scrollIntoView({block:'center'}));const b=await range.boundingBox()
    await swipe(page,{x:b.x+12,y:b.y+b.height/2},{x:b.x+b.width*.65,y:b.y+b.height/2})
    assert(Number(await range.inputValue())>.4,'Horizontal touch still adjusts opacity')
   }
   await range.focus();const prior=Number(await range.inputValue());await page.keyboard.press('ArrowRight');assert(Number(await range.inputValue())>prior,'Keyboard adjusts range')
   if(width===390&&lang==='es'){await range.press('Home');for(const card of await page.locator('.gd-palette-choice').all()){await card.click();checkReadingContrast(await readColors(page,'.gd-appearance'))}}
   await page.getByRole('button',{name:lang==='es'?'Paleta Ocean Blue':'Palette Ocean Blue',exact:true}).click()
   const tint=page.getByRole('checkbox',{name:lang==='es'?'Aplicar paleta a los cristales':'Apply palette to glass',exact:true})
   await tint.check()
   const wallpaper=await page.locator('.gd-wallpaper').evaluate(el=>getComputedStyle(el).backgroundImage)
   const tinted=await page.locator('.gd-appearance').evaluate(el=>getComputedStyle(el,'::before').backgroundColor)
   await tint.uncheck()
   const neutral=await page.locator('.gd-appearance').evaluate(el=>getComputedStyle(el,'::before').backgroundColor)
   assert.notEqual(tinted,neutral,'Glass palette switch changes the panel tint')
   assert.equal(await page.locator('.gd-wallpaper').evaluate(el=>getComputedStyle(el).backgroundImage),wallpaper,'Glass tint does not modify the image')
   const save=page.getByRole('button',{name:lang==='es'?'Aplicar y guardar':'Apply and save',exact:true});await save.scrollIntoViewIfNeeded()
   const b=await save.boundingBox();assert(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.closest('button')?.textContent.includes(p.label),{x:b.x+b.width/2,y:b.y+b.height/2,label:await save.innerText()}),'Save is not covered by the dock')
   await save.click();await page.getByRole('status').filter({hasText:lang==='es'?'Apariencia guardada.':'Appearance saved.'}).waitFor()
   assert.equal(saved.glassPalette,false);assert.equal(saved.paletteId,'ocean-blue-premium')
   await page.reload();await page.locator('.gd-content').waitFor();await page.waitForFunction(()=>document.querySelector('.gd-root')?.dataset.glassPalette==='false'&&document.querySelector('.gd-root')?.dataset.paletteActive==='true')
   await selectPortalSection(page,lang==='es'?'Resumen':'Overview')
   const expand=page.getByRole('button',{name:lang==='es'?'Ampliar tarjeta':'Expand card'}).first();await expand.click();await page.locator('.wf-panel-expanded').waitFor();await page.keyboard.press('Escape');await page.locator('.wf-panel-expanded').waitFor({state:'detached'})
   await page.screenshot({path:`${output}/after-${width}-${theme}-${lang}-${path.slice(1)}.png`})
   if(engine===chromium&&width===390&&theme==='dark'&&lang==='es'&&path==='/client-admin'){
    const cdp=await context.newCDPSession(page)
    await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'}]})
    await page.waitForFunction(()=>matchMedia('(prefers-reduced-transparency: reduce)').matches)
    await page.locator('.wf-licensed-liquid-glass').first().waitFor({state:'detached'})
    const opaque=await readColors(page,'.wf-portal-panel');assert.equal(opaque.fill[3],1);checkReadingContrast(opaque)
    await cdp.send('Emulation.setEmulatedMedia',{features:[]});await cdp.detach()
    await page.emulateMedia({forcedColors:'active'});checkReadingContrast(await readColors(page,'.wf-portal-panel'));await page.emulateMedia({forcedColors:'none'})
   }
   assert.deepEqual(errors,[])
  }
  await context.close();console.log('PASS touch/contrast',width,theme,lang)
 }
 await writeFile(output+'/measurements.json',JSON.stringify(measurements,null,2))
}finally{await browser.close();if(process.env.QA_DEV==='1')await server.close();else await new Promise(resolve=>server.httpServer.close(resolve))}
