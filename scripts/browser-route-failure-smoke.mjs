import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {preview} from 'vite'
import {chromium,webkit} from 'playwright'
const port=Number(process.env.QA_PORT||5394),server=await preview({preview:{host:'127.0.0.1',port,strictPort:true}})
const origin=process.env.QA_ORIGIN||`http://127.0.0.1:${port}`,out='/tmp/webfactory-route-failure';await mkdir(out,{recursive:true})
let checked=0
try{
 for(const name of process.env.QA_ENGINE?[process.env.QA_ENGINE]:['chromium','webkit']){
  const executablePath=name==='webkit'?process.env.QA_WEBKIT_PATH:process.env.QA_CHROMIUM_PATH
  const browser=await(name==='webkit'?webkit:chromium).launch({...(executablePath?{executablePath}:{}),...(name==='chromium'?{args:['--no-sandbox']}:{}),...(process.env.QA_ORIGIN&&process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})})
  try{for(const [path,chunk,extension,ready] of [['/client-admin','ClientAdminPage','css','input[type=password]'],['/webfactory-admin','WebFactoryAdminPage','css','input[type=password]'],['/kiosk','Kiosk','js','.kiosk-connect']].filter(([path])=>!process.env.QA_PATH||path===process.env.QA_PATH))for(const width of (process.env.QA_WIDTHS||'390,768,1440').split(',').map(Number))for(const lang of process.env.QA_LANG?[process.env.QA_LANG]:['en','es']){
   const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<=768,reducedMotion:'reduce',serviceWorkers:'block'})
   await context.addInitScript(lang=>localStorage.setItem('webfactory-language',lang),lang)
   let failAsset=true,failures=0;let initialResources=[];const authWrites=[],diagnostics=[],assetRequests=[],exceptions=[];let navigations=0
   await context.route('**/.netlify/functions/**',route=>{
    const req=route.request(),endpoint=new URL(req.url()).pathname.split('/').at(-1)
    if(endpoint==='portal-session'&&(req.method()==='GET'||req.method()==='POST'&&req.postDataJSON()?.action==='refresh'))return route.fulfill({json:{ok:true,user:null}})
    if(endpoint==='client-kiosk'&&req.method()==='GET')return route.fulfill({status:401,json:{ok:false,message:'Isolated unpaired fixture'}})
    authWrites.push(req.method()+' '+endpoint);return route.abort('blockedbyclient')
   })
   await context.route(`**/assets/${chunk}-*.${extension}`,route=>{
    assetRequests.push({path:new URL(route.request().url()).pathname,failing:failAsset});if(failAsset){failures++;return route.fulfill({status:500,contentType:extension==='css'?'text/css':'text/javascript',headers:{'Cache-Control':'no-store'},body:'Isolated asset failure'})}
    return route.continue()
   })
   const page=await context.newPage();page.setDefaultTimeout(10000);page.on('console',m=>{if(m.type()==='error')diagnostics.push(m.text())});page.on('pageerror',e=>exceptions.push(e.message));page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations++})
   try{
    await page.goto(origin+path+(path!=='/kiosk'?'?qa_preserved=fixture#qa-anchor':''),{waitUntil:'networkidle'});const originalURL=page.url();
    const retry=page.getByRole('button',{name:lang==='es'?'Reintentar cargar':'Retry loading',exact:true});await retry.waitFor()
    assert(failures>0,'The actual route asset was deliberately failed')
    assert.equal(await page.locator(ready).count(),0,'A failed private route never reveals authenticated content')
    assert.equal(await page.locator('main.public-route-loading[role=alert]').count(),1,'Show an explicit recoverable error instead of a blank route')
    assert(diagnostics.length>0,'Keep error diagnostics; do not silently swallow the failure')
    const initialFailures=failures;await page.waitForTimeout(200);assert.equal(failures,initialFailures,'No automatic retry before a user action')
    if(width===390&&lang==='en'){
     await page.screenshot({path:`${out}/${name}-${chunk}-error.png`})
     const before=navigations;const stillFailing=page.waitForResponse(r=>r.url().includes(`/assets/${chunk}-`)&&r.status()===500)
     await retry.click();await stillFailing;await page.waitForFunction(()=>document.querySelector('main.public-route-loading button:not(:disabled)'))
     assert.equal(navigations,before,'A persistent failed read must not reload or loop')
     assert.equal(failures,initialFailures+1,'One deliberate refresh of the failed asset')
    }

    initialResources=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.includes('/assets/')).map(r=>({name:r.name,type:r.initiatorType,transfer:r.transferSize,encoded:r.encodedBodySize,decoded:r.decodedBodySize,status:r.responseStatus})));failAsset=false;await retry.click();await page.locator(ready).waitFor();assert.equal(await page.locator('main.public-route-loading[role=alert]').count(),0)
    assert.deepEqual(authWrites,[],'Reload never resubmits passwords, payments or other writes');assert.deepEqual(exceptions,[],'Route errors are caught and logged');assert.equal(page.url(),originalURL,'Keep existing route, query and fragment on recovery')
    checked++;console.log('PASS failed asset -> visible error -> explicit reload -> restored route',name,path,width,lang)
   }catch(error){console.error('Asset recovery diagnostic',JSON.stringify({name,path,width,lang,failures,assetRequests,initialResources,diagnostics,url:page.url(),navigation:await page.evaluate(()=>performance.getEntriesByType('navigation').map(n=>({name:n.name,type:n.type}))),resources:await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.includes('/assets/')).map(r=>({name:r.name,transfer:r.transferSize,status:r.responseStatus})))}));await page.screenshot({path:`${out}/failure-${name}-${chunk}.png`});throw error}finally{await context.close()}
  }}finally{await browser.close()}
 }
 console.log(`PASS ${checked} isolated asset-failure recovery cases`)
}finally{await server.close()}
