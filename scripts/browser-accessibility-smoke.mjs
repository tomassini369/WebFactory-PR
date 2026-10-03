import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {writeFile,unlink} from 'node:fs/promises';
import assert from 'node:assert/strict';
const fixture='.qa-panel.html',origin='http://127.0.0.1:5177';
let browser,server;
try {
 await writeFile(fixture,`<!doctype html><html><body><div id="root"></div><script type="module">
 import React from 'react';import {createRoot} from 'react-dom/client';
 import {PortalPanelProvider,PortalPanel} from '/src/PortalPanel.tsx';import ClientAuthenticatorReset from '/src/ClientAuthenticatorReset.tsx';
 createRoot(document.getElementById('root')).render(React.createElement(PortalPanelProvider,{lang:'en'},React.createElement('button',{id:'outside'},'Outside'),React.createElement(PortalPanel,null,React.createElement('button',{id:'inside'},'Inside')),React.createElement(ClientAuthenticatorReset,{lang:'en',sites:[{siteId:'test-business',businessName:'Isolated test business',ownerEmail:'customer@example.com'}]})));
 </script></body></html>`);
 server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5177','--strictPort'],{stdio:'ignore'});
 let ready=false;
 for(let attempt=0;attempt<80;attempt++){try{if((await fetch(origin)).ok){ready=true;break}}catch{}await new Promise(resolve=>setTimeout(resolve,100))}
 assert(ready,'Vite did not start');browser=await chromium.launch();
 const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 for(const viewport of [{width:390,height:844},{width:1280,height:800}]){
  await page.setViewportSize(viewport);await page.goto(`${origin}/${fixture}`);
  const expand=page.getByRole('button',{name:'Expand',exact:true}).first();await expand.click();
  const dialog=page.getByRole('dialog');await dialog.waitFor();
  assert.equal(await page.locator('#outside').evaluate(element=>element.inert),true);
  await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Hide');
  await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'inside');
  await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Hide');
  await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});
  assert.equal(await page.locator('#outside').evaluate(element=>element.inert),false);
  assert.equal(await expand.evaluate(element=>element===document.activeElement),true);
  const reset=page.getByRole('button',{name:'Reset client Authenticator',exact:true});assert.equal(await reset.isDisabled(),true);
  await page.getByLabel('Business',{exact:true}).selectOption('test-business');
  await page.getByLabel('Support request reference',{exact:true}).fill('SUPPORT-TEST-2026');await page.getByLabel('Reason (no documents or sensitive data)',{exact:true}).fill('Lost test device');
  await page.getByLabel('The account holder explicitly requested recovery.').check();assert.equal(await reset.isDisabled(),true);
  await page.getByLabel('I verified the registered contact through an independent channel and authority over the business, and recorded evidence in the support case.').check();
  await page.getByLabel('Type RESET AUTHENTICATOR',{exact:true}).fill('RESET AUTHENTICATOR');assert.equal(await reset.isEnabled(),true);
  const calls=[];await page.route('**/.netlify/functions/admin-reset-authenticator',async route=>{calls.push(route.request().postDataJSON());await route.fulfill({status:calls.length===1?503:200,contentType:'application/json',body:JSON.stringify(calls.length===1?{ok:false,message:'Simulated uncertain response'}:{ok:true,auditId:'isolated-test',notification:'review_required'})})});
  await reset.click();await page.getByRole('alert').filter({hasText:'Simulated uncertain response'}).waitFor();await reset.click();await page.getByRole('status').filter({hasText:'isolated-test'}).waitFor();
  assert.equal(calls.length,2);assert.equal(calls[0].requestId,calls[1].requestId);assert.equal(calls[0].email,'customer@example.com');assert.equal(await reset.isDisabled(),true);await page.unroute('**/.netlify/functions/admin-reset-authenticator');
  console.log(`Panel keyboard and recovery form safety passed: ${viewport.width}px`);
 }
 assert.deepEqual(errors,[]);
} finally {await browser?.close();server?.kill();await unlink(fixture).catch(()=>{})}
