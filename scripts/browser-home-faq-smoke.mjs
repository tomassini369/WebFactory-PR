import {chromium,webkit,devices} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:5179';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5179','--strictPort'],{stdio:'ignore'});
try {
 let ready=false;
 for(let i=0;i<80;i++){try{if((await fetch(origin)).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}
 assert(ready,'Vite did not start');
 for(const [engine,options,label] of [[chromium,{viewport:{width:1440,height:900}},'desktop Chromium'],[webkit,devices['iPhone 13'],'mobile WebKit']]){
  const browser=await engine.launch();
  try{
   for(const theme of ['dark','light'])for(const lang of ['en','es']){
    const context=await browser.newContext(options);
    await context.addInitScript(t=>localStorage.setItem('webfactory-theme-v2',t),theme);
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin);await page.locator('.wf-h-header').waitFor();
    if(lang==='es')await page.getByRole('button',{name:'ES',exact:true}).click();
    const mobile=label.startsWith('mobile'),menu=page.locator('.wf-h-menu');
    if(mobile)await menu.click();
    const link=page.locator('#wf-main-nav').getByRole('link',{name:'FAQ',exact:true});
    assert(await link.isVisible());assert.equal(await link.getAttribute('href'),'#faq');
    if(mobile)assert((await link.boundingBox()).height>=44);
    await link.focus();await page.keyboard.press('Enter');
    await page.waitForFunction(()=>location.hash==='#faq'&&document.querySelector('#faq').getBoundingClientRect().top>=document.querySelector('.wf-h-header').getBoundingClientRect().bottom&&document.querySelector('#faq').getBoundingClientRect().top<innerHeight);
    if(mobile)assert.equal(await menu.getAttribute('aria-expanded'),'false');
    assert.equal(await page.locator('#faq').count(),1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.equal(await page.evaluate(()=>document.documentElement.dataset.wfTheme),theme);
    assert.equal(await page.locator('#faq summary').first().innerText(),lang==='es'?'¿Puedo vender y recibir citas?\n+':'Can I sell and accept bookings?\n+');
    assert.deepEqual(errors,[]);
    console.log(`FAQ verified: ${label}, ${theme}, ${lang}`);await context.close();
   }
  }finally{await browser.close()}
 }
}finally{server.kill()}
