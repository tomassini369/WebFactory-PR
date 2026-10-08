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
  for(const viewport of [{width:1366,height:600},{width:1280,height:720},{width:1366,height:900},{width:910,height:400},{width:390,height:844},{width:390,height:650},{width:320,height:568},{width:390,height:350},{width:844,height:390}]){
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
    await page.locator('.portal-password-field button').click();assert.equal(await password.getAttribute('type'),'text');
    await page.locator('.portal-password-field button').click();assert.equal(await password.getAttribute('type'),'password');
    for(const language of ['ES','EN']){await page.locator('.portal-language').getByRole('button',{name:language,exact:true}).click();assert.equal(await page.locator('html').getAttribute('lang'),language.toLowerCase())}
    const submit=page.locator('form button:not([type="button"])');
    await submit.scrollIntoViewIfNeeded();
    const reachable=await submit.evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('button')===el});
    if(!reachable){await page.screenshot({path:'/tmp/login-layout-failure.png'});console.log(await submit.evaluate(el=>{const r=el.getBoundingClientRect();return {rect:r.toJSON(),hit:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.outerHTML,card:el.closest('section')?.getBoundingClientRect().toJSON(),main:el.closest('main')?.getBoundingClientRect().toJSON()}}))}
    assert(reachable,`Submit must be visible and reachable: ${path} ${viewport.width}x${viewport.height} ${theme}`);
    assert.equal(await page.locator('.wf-theme-toggle').count(),1);
    assert.equal(await page.locator('button.portal-return-home').count(),1);
    const cardStyle=await page.locator('.ca-login,.wfa-login').evaluate(el=>({radius:getComputedStyle(el).borderRadius,shadow:getComputedStyle(el).boxShadow}));assert.notEqual(cardStyle.radius,'0px');assert.notEqual(cardStyle.shadow,'none');
    const row=await page.locator('.portal-return-home').evaluate(el=>{const a=el.getBoundingClientRect(),group=el.closest('.portal-language');return {inside:!!group,aligned:!!group&&Array.from(group.children).filter(node=>node!==el).every(node=>{const b=node.getBoundingClientRect();return Math.abs((a.top+a.bottom)/2-(b.top+b.bottom)/2)<2&&!(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)})}});assert(row.inside&&row.aligned,'Home icon must share the language row without overlapping other controls');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Login must not overflow horizontally');
   }
   if(process.env.QA_SCREENSHOT_DIR&&viewport.width===390&&viewport.height===844)await page.screenshot({path:`${process.env.QA_SCREENSHOT_DIR}/${path.includes('client')?'client-login':'admin-login'}.png`});
   console.log('Login fields and submit reachable in both themes:',path,viewport);
  }
 }
 for(const path of ['/client-admin/','/webfactory-admin/']){
  await page.setViewportSize({width:390,height:844});await page.goto(origin+path);
  await page.locator('input[type=email]').click();
  assert.equal(await page.locator('input[type=email]').evaluate(el=>getComputedStyle(el).fontSize),'17px');
  await page.setViewportSize({width:390,height:400});
  await page.waitForFunction(()=>document.documentElement.hasAttribute('data-pg-keyboard'));
  assert(await page.locator('.wf-adaptive-logo-slot').isVisible(),'AutoFill must not remove the logo');
  assert(await page.locator('h1').isVisible(),'AutoFill must not remove the heading');
  for(const selector of ['.portal-return-home','input[type=email]','input[autocomplete=current-password]','form>button','.ca-link,.wfa-text-button']){
   await page.locator(selector).scrollIntoViewIfNeeded();
   assert(await page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=visualViewport.height}),`Keyboard viewport must keep ${selector} reachable by scrolling`);
  }
  assert.equal(await page.evaluate(()=>visualViewport.scale),1);
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-pg-keyboard'));
  assert(await page.locator('.wf-adaptive-logo-slot').isVisible());
  console.log('PASS keyboard viewport and focus text size:',path);
 }
 assert.deepEqual(errors,[]);
}finally{await browser?.close();server?.kill()}
