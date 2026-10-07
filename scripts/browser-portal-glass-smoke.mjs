import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:5182';
let browser,server;
try {
 server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5182','--strictPort'],{stdio:'ignore'});
 let ready=false;
 for(let i=0;i<80;i++){try{if((await fetch(origin)).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}
 assert(ready,'Vite did not start');browser=await chromium.launch(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH,args:['--single-process','--no-sandbox']}:undefined);
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/.netlify/functions/portal-session',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,user:null})}));
 await page.route('**/.netlify/functions/portal-login',()=>{throw new Error('Layout regression must never submit login credentials')});
 // No login is submitted. The local page uses disposable input values only.
 for(const path of ['/client-admin/','/webfactory-admin/']){
  for(const viewport of [{width:1366,height:600},{width:1280,height:720},{width:1366,height:900},{width:910,height:400},{width:390,height:844},{width:390,height:650},{width:844,height:390}]){
   await page.setViewportSize(viewport);await page.goto(origin+path);
   const email=page.locator('input[type="email"]'),password=page.locator('input[autocomplete="current-password"]');
   try{await email.waitFor({state:'visible'});await page.locator('.ca-login,.wfa-login').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)))}catch(error){console.error('Login fixture diagnostic',path,await page.locator('body').innerText(),errors);throw error}
   for(const theme of ['light','dark']){
    if(await page.locator('html').getAttribute('data-wf-theme')!==theme)await page.locator('.wf-theme-toggle').click();
    const layout=await page.locator('main').evaluate(shell=>({overflow:getComputedStyle(shell).overflowY,height:shell.clientHeight,scrollHeight:shell.scrollHeight}));
    if(viewport.width>820)assert.notEqual(layout.overflow,'hidden','Desktop login must not clip a tall form');
    else {
     const card=await page.locator('.ca-login,.wfa-login').evaluate(el=>({overflow:getComputedStyle(el).overflowY,height:el.clientHeight,scrollHeight:el.scrollHeight}));
     assert.equal(card.overflow,'auto','Fixed mobile login must permit inner scrolling at every height');
    }
    await email.click();await email.fill('layout-test@example.invalid');assert.equal(await email.inputValue(),'layout-test@example.invalid');
    await password.click();await password.fill('disposable-layout-test');assert.equal(await password.inputValue(),'disposable-layout-test');
    const submit=page.locator('form button:not([type="button"])');
    await submit.scrollIntoViewIfNeeded();
    const reachable=await submit.evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('button')===el});
    if(!reachable){await page.screenshot({path:'/tmp/login-layout-failure.png'});console.log(await submit.evaluate(el=>{const r=el.getBoundingClientRect();return {rect:r.toJSON(),hit:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.outerHTML,card:el.closest('section')?.getBoundingClientRect().toJSON(),main:el.closest('main')?.getBoundingClientRect().toJSON()}}))}
    assert(reachable,`Submit must be visible and reachable: ${path} ${viewport.width}x${viewport.height} ${theme}`);
    assert.equal(await page.locator('.wf-theme-toggle').count(),1);
    assert.equal(await page.locator('button.portal-return-home').count(),1);
    const cardStyle=await page.locator('.ca-login,.wfa-login').evaluate(el=>({radius:getComputedStyle(el).borderRadius,shadow:getComputedStyle(el).boxShadow}));assert.notEqual(cardStyle.radius,'0px');assert.notEqual(cardStyle.shadow,'none');
    const overlap=await page.locator('.portal-return-home').evaluate(el=>{const a=el.getBoundingClientRect(),b=el.closest('section').querySelector('.portal-language').getBoundingClientRect();return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top});assert.equal(overlap,false,'Home button and language controls must not overlap');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Login must not overflow horizontally');
   }
   if(process.env.QA_SCREENSHOT_DIR&&viewport.width===390&&viewport.height===844)await page.screenshot({path:`${process.env.QA_SCREENSHOT_DIR}/${path.includes('client')?'client-login':'admin-login'}.png`});
   console.log('Login fields and submit reachable in both themes:',path,viewport);
  }
 }
 assert.deepEqual(errors,[]);
}finally{await browser?.close();server?.kill()}
