import assert from 'node:assert/strict';
import {preview} from 'vite';
import {chromium,webkit} from 'playwright';
const server=await preview({preview:{host:'127.0.0.1',port:5273,strictPort:true}});
const engine=process.env.QA_ENGINE==='webkit'?webkit:chromium;
const browser=await engine.launch(process.env.QA_ENGINE!=='webkit'&&process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH,args:['--no-sandbox','--single-process','--no-zygote']}:undefined);
const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];
await page.addInitScript(()=>localStorage.setItem('webfactory-theme-v2','light'));
page.on('pageerror',error=>errors.push(error.message));
const user={id:'mfa-contrast-fixture',email:'fixture@example.invalid',user_metadata:{},app_metadata:{},mfa:{required:true,verified:false,enrolled:false,policyRequired:true,authenticatorAvailable:true,credentials:[]}};
await page.route('**/.netlify/functions/**',route=>{
 if(route.request().method()!=='GET'){
  assert.ok(route.request().url().endsWith('/portal-session'));
  assert.equal(route.request().postDataJSON().action,'refresh','Contrast checks only simulate session refresh; security writes are forbidden');
 }
 return route.fulfill({json:{ok:true,user}});
});
const contrast=({color,background})=>{
 const luminance=rgb=>rgb.match(/[\d.]+/g).slice(0,3).map(n=>Number(n)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((s,n,i)=>s+n*[.2126,.7152,.0722][i],0);
 const a=luminance(color),b=luminance(background);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
};
try{
 for(const path of ['/client-admin','/webfactory-admin'])for(const width of [320,375,390,430,768,1024,1440]){
  await page.setViewportSize({width,height:844});await page.goto('http://127.0.0.1:5273'+path,{waitUntil:'domcontentloaded'});await page.locator('.mfa-login-card').waitFor();
  for(const lang of ['es','en'])for(const theme of ['light','dark']){
   await page.locator('.portal-language').getByRole('button',{name:lang.toUpperCase(),exact:true}).click();
   if(await page.locator('html').getAttribute('data-wf-theme')!==theme)await page.locator('.wf-theme-toggle').click();
   const input=page.locator('.mfa-actions input');await input.fill('iPhone de prueba');
   for(const selector of ['.mfa-actions input','.mfa-actions .btn:not(.secondary)','.mfa-actions .btn.secondary']){
    const control=page.locator(selector);await control.scrollIntoViewIfNeeded();
    const style=await control.evaluate(e=>{const s=getComputedStyle(e);return {color:s.color,background:s.backgroundColor,fill:s.webkitTextFillColor}});
    assert.ok(contrast(style)>=4.5,`${path} ${width} ${lang} ${theme} ${selector}: ${JSON.stringify(style)}`);
    assert.equal(style.fill,style.color,'Safari text fill must follow the visible text color');
   }
   assert.equal(await input.inputValue(),'iPhone de prueba');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   console.log(`PASS MFA text/input/button contrast ${path} ${width} ${lang} ${theme}`);
  }
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve))}
