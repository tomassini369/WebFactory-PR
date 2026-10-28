import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {createServer,preview} from 'vite'
import {chromium,webkit} from 'playwright'
const port=Number(process.env.QA_PORT||5361),origin=`http://127.0.0.1:${port}`
const server=process.env.QA_DEV?await createServer({server:{host:'127.0.0.1',port,strictPort:true}}):await preview({preview:{host:'127.0.0.1',port,strictPort:true}})
if(process.env.QA_DEV)await server.listen()
const engine=process.env.QA_ENGINE==='webkit'?webkit:chromium,browser=await engine.launch(engine===chromium&&process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH,args:['--no-sandbox']}:undefined)
const output='/tmp/login-loading-qa';await mkdir(output,{recursive:true})
const bounds=async page=>({header:await page.locator('.mk-header').boundingBox(),card:await page.locator('.mk-auth-card').boundingBox()})
const same=(a,b,label)=>{for(const part of ['header','card'])for(const key of ['x','y','width','height'])assert(Math.abs(a[part][key]-b[part][key])<2,`${label} ${part} ${key}: ${a[part][key]} -> ${b[part][key]}`)}
try {
 for(const width of (process.env.QA_WIDTHS||'320,375,390,430,768,1024,1440').split(',').map(Number))for(const theme of ['light','dark'])for(const lang of ['es','en'])for(const signup of [false,true]){
  let releaseModule,releaseSession,sessionStarted;const moduleGate=new Promise(r=>releaseModule=r),sessionGate=new Promise(r=>releaseSession=r),sessionSeen=new Promise(r=>sessionStarted=r)
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',reducedMotion:'no-preference'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await context.addInitScript(({theme,lang})=>{localStorage.setItem('webfactory-theme-v2',theme);localStorage.setItem('webfactory-language',lang)},{theme,lang})
  await page.route(/\/(?:src\/ConsumerPage\.tsx|assets\/ConsumerPage-[^/]+\.js)(?:\?|$)/,async route=>{await moduleGate;await route.continue()})
  await page.route('**/.netlify/identity/**',route=>route.fulfill({json:{disableSignup:false}}))
  await page.route('**/.netlify/functions/**',async route=>{assert.equal(new URL(route.request().url()).pathname,'/.netlify/functions/portal-session','Loading never submits credentials or modifies business data');sessionStarted();await sessionGate;await route.fulfill({json:{ok:true,user:null}})})
  try {
   await page.goto(origin+'/cuenta'+(signup?'?modo=crear':''),{waitUntil:'domcontentloaded'});await page.locator('.consumer-access-loading').waitFor();assert.equal(await page.locator('.portal-loading-card').count(),0);await page.locator('.mk-brand').getByRole('img',{name:'WebFactory PR',exact:true}).waitFor();const cold=await bounds(page);assert.equal(await page.locator('input[type=email]').count(),0)
   releaseModule();await Promise.race([sessionSeen,new Promise((_,reject)=>setTimeout(()=>reject(Error('Session request never started')),15000).unref())]);same(cold,await bounds(page),'chunk -> session');
   if(width===390&&theme==='dark'&&lang==='es'&&!signup)await page.screenshot({path:output+'/consumer-loading.png'})
   releaseSession();await page.locator('.mk-auth-form input[type=email]').waitFor();await page.waitForFunction(()=>!document.querySelector('.consumer-access-loading'));same(cold,await bounds(page),'loading -> form');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if(width===390&&theme==='dark'&&lang==='es'&&!signup)await page.screenshot({path:output+'/consumer-ready.png'})
   assert.deepEqual(errors,[]);console.log('PASS consumer cold chunk/session/form geometry',width,theme,lang,signup?'signup':'login')
  } finally {releaseModule();releaseSession();await context.close()}
 }
} finally {await browser.close();await server.close()}
