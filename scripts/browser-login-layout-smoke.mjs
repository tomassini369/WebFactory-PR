import {chromium,webkit} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:5182';
let browser,server;
try {
 server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5182','--strictPort'],{stdio:'ignore'});
 let ready=false;
 for(let i=0;i<80;i++){try{if((await fetch(origin)).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}
 assert(ready,'Vite did not start');browser=await (process.env.QA_ENGINE==='webkit'?webkit:chromium).launch(process.env.QA_ENGINE==='webkit'?(process.env.QA_WEBKIT_PATH?{executablePath:process.env.QA_WEBKIT_PATH}:{}):{...(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/.netlify/functions/portal-session',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,user:null})}));
 await page.route('**/.netlify/functions/portal-login',()=>{throw new Error('Layout regression must never submit login credentials')});
 // Layout checks never submit credentials; the storage regression below mocks login entirely.
 for(const path of ['/client-admin/','/webfactory-admin/']){
  for(const viewport of [{width:1366,height:600},{width:1280,height:720},{width:1366,height:900},{width:910,height:400},{width:390,height:844},{width:390,height:650},{width:844,height:390}]){
   await page.setViewportSize(viewport);await page.goto(origin+path);
   const email=page.locator('input[type="email"]'),password=page.locator('input[autocomplete="current-password"]');
   try{await email.waitFor({state:'visible'})}catch(error){console.error('Login fixture diagnostic',path,await page.locator('body').innerText(),errors);throw error}
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
    // Center the control: nearest-edge scrolling can leave a fractional pixel outside the viewport.
    await submit.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
    const reachable=await submit.evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('button')===el});
    assert(reachable,`Submit must be visible and reachable: ${path} ${viewport.width}x${viewport.height} ${theme}`);
    assert.equal(await page.locator('.wf-theme-toggle').count(),1);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Login must not overflow horizontally');
   }
   console.log('Login fields and submit reachable in both themes:',path,viewport);
  }
 }
 // Storage denial must not blank a portal or prevent a mocked login attempt.
 for(const path of ['/client-admin/','/webfactory-admin/']){
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
  await context.addInitScript(()=>{
   for(const method of ['getItem','setItem','removeItem'])Object.defineProperty(Storage.prototype,method,{value(){throw new DOMException('Fixture storage denied','SecurityError')}});
  });
  let loginCalls=0;
  await context.route('**/.netlify/functions/**',route=>{
   if(new URL(route.request().url()).pathname.endsWith('/portal-session'))return route.fulfill({json:{ok:true,user:null}});
   if(new URL(route.request().url()).pathname.endsWith('/portal-login')){
    loginCalls++;return route.fulfill({status:401,json:{ok:false,message:'Fixture rejected login'}});
   }
   throw new Error('Unexpected endpoint in isolated storage fixture');
  });
  const denied=await context.newPage();denied.on('pageerror',error=>errors.push(error.message));
  await denied.goto(origin+path);await denied.locator('input[type=email]').waitFor();
  const oldTheme=await denied.locator('html').getAttribute('data-wf-theme');await denied.locator('.wf-theme-toggle').click();assert.notEqual(await denied.locator('html').getAttribute('data-wf-theme'),oldTheme,'Theme still works with blocked storage');
  await denied.getByRole('button',{name:'ES',exact:true}).click();await denied.getByRole('button',{name:'EN',exact:true}).click();
  await denied.locator('input[type=email]').fill('storage-test@example.invalid');
  await denied.locator('input[autocomplete=current-password]').fill('disposable-fixture');
  await denied.locator('form button:not([type=button])').click();
  await denied.locator('.ca-error,.wfa-alert.danger').waitFor();
  assert.equal(loginCalls,1,'Optional storage failure must not prevent a login request');
  await denied.reload();await denied.locator('input[type=email]').waitFor();
  await context.close();console.log('PASS denied storage still renders portal and reaches mocked authentication:',path);
 }
 assert.deepEqual(errors,[]);
}finally{await browser?.close();server?.kill()}
