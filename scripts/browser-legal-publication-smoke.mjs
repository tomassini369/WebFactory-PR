import assert from 'node:assert/strict';
import {preview} from 'vite';
import {chromium,webkit} from 'playwright';
const engine=process.env.QA_ENGINE==='webkit'?'webkit':'chromium',port=Number(process.env.QA_PORT||5461),expectPreview=process.env.QA_EXPECT_PREVIEW==='1';
const server=process.env.QA_ORIGIN?null:await preview({preview:{host:'127.0.0.1',port,strictPort:true}}),origin=process.env.QA_ORIGIN||`http://127.0.0.1:${port}`;
const browser=await(engine==='webkit'?webkit:chromium).launch({...engine==='webkit'?(process.env.QA_WEBKIT_PATH?{executablePath:process.env.QA_WEBKIT_PATH}:{}):{...(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH}:{}),args:['--no-sandbox']},...(process.env.QA_ORIGIN&&process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
try{
 for(const width of (process.env.QA_WIDTHS||'390,1440').split(',').map(Number))for(const theme of ['light','dark'])for(const lang of ['es','en']){
  const context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(({theme,lang})=>{localStorage.setItem('webfactory-theme-v2',theme);localStorage.setItem('webfactory-language',lang)},{theme,lang});
  await page.route('**/.netlify/functions/**',async route=>{
   const req=route.request(),name=new URL(req.url()).pathname.split('/').at(-1);
   if(name==='portal-session'){assert(['GET','POST'].includes(req.method()));if(req.method()==='POST')assert.equal(req.postDataJSON().action,'refresh');return route.fulfill({json:{ok:true,user:null}})}
   assert.equal(name,'dmca-public-contact');assert.equal(req.method(),'GET');return route.fulfill({json:{ok:true,contact:{status:'active',name:'Synthetic agent',organization:'Synthetic operator',address:'Synthetic address',phone:'555-0100',email:'agent@example.invalid',registration:'DMCA-123'}}});
  });
  for(const path of ['/privacy','/terms','/refund-policy','/copyright']){
   const response=await page.goto(origin+path,{waitUntil:'networkidle'});assert.equal(response.status(),200);await page.locator('.legal-content h2').first().waitFor();
   const note=page.locator('.legal-content>p[role=note]');assert.equal(await note.count(),expectPreview?1:0,`${path} preview notice follows deployment context`);
   if(expectPreview)assert.match(await note.innerText(),lang==='es'?/Borrador de preview/:/Preview draft/);
   else assert(!await page.locator('.legal-content').innerText().then(text=>text.includes('These additions are not published production policies.')||text.includes('Estas adiciones no son políticas publicadas en producción.')));
   const policyText=await page.locator('.legal-content > section').allTextContents();
   for(const section of policyText)assert.doesNotMatch(section,/\bpreview\b|avisos de borrador/i,`${path} policy body contains preview copy`);
   if(path==='/copyright'){await page.getByRole('link',{name:'agent@example.invalid',exact:true}).waitFor();assert.match(await page.locator('.legal-content').innerText(),/DMCA-123/)}
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);console.log('PASS legal publication context and configured contact',engine,width,theme,lang,path,expectPreview?'preview':'production');
  }
  await context.close();
 }
}finally{await browser.close();await server?.close()}
