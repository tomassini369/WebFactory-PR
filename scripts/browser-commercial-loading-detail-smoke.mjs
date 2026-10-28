import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {createServer,preview} from 'vite'
import {chromium,webkit} from 'playwright'
const port=Number(process.env.QA_PORT||5367),origin=`http://127.0.0.1:${port}`
const server=process.env.QA_DEV?await createServer({server:{host:'127.0.0.1',port,strictPort:true}}):await preview({preview:{host:'127.0.0.1',port,strictPort:true}});if(process.env.QA_DEV)await server.listen()
const engine=process.env.QA_ENGINE==='webkit'?webkit:chromium,browser=await engine.launch(engine===chromium&&process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH,args:['--no-sandbox']}:undefined),output='/tmp/login-detail-qa';await mkdir(output,{recursive:true})
async function positions(page,loading){return page.locator('.ca-login:visible,.wfa-login:visible').evaluate((card,loading)=>{
 const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}},q=s=>box(card.querySelector(s));
 return {card:box(card),toolbar:q('.portal-language'),home:q('.portal-return-home'),en:q('.portal-language button:nth-of-type(1)'),es:q('.portal-language button:nth-of-type(2)'),theme:q('.wf-theme-toggle'),logo:q('.wf-adaptive-logo-slot'),title:q('h1'),email:q(loading?'[data-loading-email]':'input[type=email]'),password:q('.portal-password-field'),remember:q('.portal-remember'),submit:q(loading?'.portal-loading-submit':'form>button'),recovery:q(loading?'.portal-loading-recovery':'.ca-link,.wfa-text-button')}
},loading)}
const bounded=(promise,label)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(Error('Timed out: '+label)),15000).unref())])
function same(a,b,label){for(const part of Object.keys(a))for(const key of ['x','y','width','height'])assert(Math.abs(a[part][key]-b[part][key])<2,`${label} ${part}.${key}: ${a[part][key]} -> ${b[part][key]}`)}
try{
for(const width of (process.env.QA_WIDTHS||'320,375,390,430,768,980,1024,1440').split(',').map(Number))for(const theme of ['light','dark'])for(const lang of ['es','en'])for(const route of ['client-admin','webfactory-admin']){
 let releaseSession,releaseModule,sessionStarted,moduleStarted;const sessionGate=new Promise(r=>releaseSession=r),moduleGate=new Promise(r=>releaseModule=r),sessionSeen=new Promise(r=>sessionStarted=r),moduleSeen=new Promise(r=>moduleStarted=r),context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',reducedMotion:'no-preference',...(engine===webkit&&width<=820?{isMobile:true,hasTouch:true}:{})}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await context.addInitScript(({theme,lang})=>{localStorage.setItem('webfactory-theme-v2',theme);localStorage.setItem('webfactory-language',lang)},{theme,lang})
 await page.route(/\/(?:src\/(?:ClientAdminPage|WebFactoryAdminPage)\.tsx|assets\/(?:ClientAdminPage|WebFactoryAdminPage)-[^/]+\.js)(?:\?|$)/,async r=>{moduleStarted();await moduleGate;await r.continue()})
 await page.route('**/.netlify/functions/**',async r=>{assert.equal(new URL(r.request().url()).pathname,'/.netlify/functions/portal-session');sessionStarted();await sessionGate;await r.fulfill({json:{ok:true,user:null}})})
 try{
  await page.goto(origin+'/'+route,{waitUntil:'domcontentloaded'});await page.locator('.portal-loading-card').waitFor();await page.getByRole('img',{name:'WebFactory PR',exact:true}).waitFor();await bounded(sessionSeen,'session');const cold=await positions(page,true);releaseSession();await bounded(moduleSeen,'role module');same(cold,await positions(page,true),'session -> chunk');if(width===390&&theme==='light'&&lang==='es'&&route==='client-admin')await page.screenshot({path:output+'/loading.png'})
  releaseModule();await page.locator('input[type=email]').waitFor();same(cold,await positions(page,false),`${route} ${width} ${theme} ${lang}`);const password=page.locator('.portal-password-field input');await password.fill('isolated-layout-fixture');await password.focus();
  const style=await password.evaluate(e=>{const s=getComputedStyle(e);return {shadow:s.boxShadow,border:s.borderTopWidth,bg:s.backgroundColor,appearance:s.getPropertyValue('-webkit-appearance')}});assert.equal(style.shadow,'none');assert.equal(style.border,'0px');assert.equal(style.bg,'rgba(0, 0, 0, 0)');assert.equal(style.appearance,'none');await page.locator('.portal-password-field button').click();assert.equal(await password.getAttribute('type'),'text');assert.equal(await password.inputValue(),'isolated-layout-fixture');assert.equal(await password.evaluate(e=>getComputedStyle(e).boxShadow),'none');
  if(width===390&&theme==='light'&&lang==='es'&&route==='client-admin'){await page.evaluate(()=>document.activeElement?.blur());await page.mouse.move(0,0);await page.screenshot({path:output+'/ready.png'})}assert.deepEqual(errors,[]);console.log('PASS inner loading/form geometry and single password field',route,width,theme,lang)
 }finally{releaseSession();releaseModule();await context.close()}
}
}finally{await browser.close();await server.close()}
