import assert from 'node:assert/strict'
import {preview} from 'vite'
import {chromium,webkit} from 'playwright'
const engine=process.env.QA_ENGINE||'chromium',server=process.env.QA_ORIGIN?null:await preview({preview:{host:'127.0.0.1',port:5343,strictPort:true}}),origin=process.env.QA_ORIGIN||'http://127.0.0.1:5343'
const browser=await(engine==='webkit'?webkit:chromium).launch(engine==='webkit'?{}:process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH,args:['--no-sandbox']}:{});
try{for(const width of (process.env.QA_WIDTHS||'320,375,390,430,768,1024,1440').split(',').map(Number)){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block'});await context.addInitScript(()=>{if(window.top===window)localStorage.setItem('webfactory-language','es')});const page=await context.newPage();
 await page.route('**/.netlify/functions/**',r=>r.fulfill({json:{ok:true,user:null,entries:[],truncated:false}}));
 for(const path of ['/crear','/builder']){await page.goto(origin+path,{waitUntil:'domcontentloaded'});const icon=page.getByRole('link',{name:'Volver al Marketplace',exact:true});await icon.waitFor();assert(await icon.isVisible());assert.equal(await icon.getAttribute('href'),'/');const box=await icon.boundingBox();assert(box.width>=44&&box.height>=44);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No page overflow at '+width+' '+path);await icon.click();await page.locator('.mk-root').waitFor();assert.equal(new URL(page.url()).pathname,'/')}
 console.log('PASS explicit Marketplace header icon and navigation, original landing/Builder',width,engine);await context.close()
}}finally{await browser.close();if(server)await new Promise(resolve=>server.httpServer.close(resolve))}
