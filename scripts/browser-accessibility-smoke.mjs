import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {writeFile,unlink} from 'node:fs/promises';
import assert from 'node:assert/strict';
const fixture='.qa-panel.html',origin='http://127.0.0.1:5177';
let browser,server;
try {
 await writeFile(fixture,`<!doctype html><html><body><div id="root"></div><script type="module">
 import React from 'react';import {createRoot} from 'react-dom/client';
 import {PortalPanelProvider,PortalPanel} from '/src/PortalPanel.tsx';
 createRoot(document.getElementById('root')).render(React.createElement(PortalPanelProvider,{lang:'en'},React.createElement('button',{id:'outside'},'Outside'),React.createElement(PortalPanel,null,React.createElement('button',{id:'inside'},'Inside'))));
 </script></body></html>`);
 server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5177','--strictPort'],{stdio:'ignore'});
 let ready=false;
 for(let attempt=0;attempt<80;attempt++){try{if((await fetch(origin)).ok){ready=true;break}}catch{}await new Promise(resolve=>setTimeout(resolve,100))}
 assert(ready,'Vite did not start');browser=await chromium.launch();
 const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 for(const viewport of [{width:390,height:844},{width:1280,height:800}]){
  await page.setViewportSize(viewport);await page.goto(`${origin}/${fixture}`);
  const expand=page.getByRole('button',{name:'Expand',exact:true});await expand.click();
  const dialog=page.getByRole('dialog');await dialog.waitFor();
  assert.equal(await page.locator('#outside').evaluate(element=>element.inert),true);
  await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Hide');
  await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'inside');
  await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Hide');
  await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});
  assert.equal(await page.locator('#outside').evaluate(element=>element.inert),false);
  assert.equal(await expand.evaluate(element=>element===document.activeElement),true);
  console.log(`Panel focus, isolation and Escape passed: ${viewport.width}px`);
 }
 assert.deepEqual(errors,[]);
} finally {await browser?.close();server?.kill();await unlink(fixture).catch(()=>{})}
