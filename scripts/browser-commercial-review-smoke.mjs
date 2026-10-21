import assert from 'node:assert/strict'
import {preview} from 'vite'
import {chromium,webkit} from 'playwright'
const engine=process.env.QA_ENGINE||'chromium',port=Number(process.env.QA_PORT||5333)
const server=process.env.QA_ORIGIN?null:await preview({preview:{host:'127.0.0.1',port,strictPort:true}})
const browser=await(engine==='webkit'?webkit:chromium).launch(engine==='webkit'?(process.env.QA_WEBKIT_PATH?{executablePath:process.env.QA_WEBKIT_PATH}:{}):(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH,args:['--no-sandbox']}:{}))
try{
 for(const role of ['owner','employee']){
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',error=>errors.push(error.message))
  await page.goto((process.env.QA_ORIGIN||`http://127.0.0.1:${port}`)+'/design-preview/portal/preview.html?role='+role)
  await page.locator('.ca-dashboard').waitFor();await page.locator('.portal-language').getByRole('button',{name:'EN',exact:true}).click()
  assert.equal(await page.locator('.design-review-banner').count(),1)
  assert.equal(await page.locator('.wf-workforce').count(),0)
  if(role==='employee'){
   await page.getByRole('heading',{name:'My appointments',exact:true}).waitFor()
   assert.equal(await page.locator('.sidebar-container').getByRole('button',{name:'Business settings',exact:true}).count(),0)
   assert.equal(await page.locator('.ca-work').getByText('Sample business',{exact:true}).count(),1)
  }else await page.locator('.bcc').waitFor()
  const blocked=await page.evaluate(async()=>{try{await fetch('/.netlify/functions/client-admin',{method:'PATCH',body:'{}'});return ''}catch(error){return error.message}});assert.match(blocked,/disabled.*Training/);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[])
  console.log('PASS isolated phone review',engine,role)
  await page.close()
 }
}catch(error){console.error('::error title=Isolated commercial review::'+String(error?.stack||error).replace(/%/g,'%25').replace(/\n/g,'%0A'));throw error}finally{await browser.close();if(server)await new Promise(resolve=>server.httpServer.close(resolve))}
