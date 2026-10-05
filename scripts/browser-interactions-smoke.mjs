import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {writeFile,unlink} from 'node:fs/promises';
import assert from 'node:assert/strict';
const fixture='.qa-interactions.html',origin='http://127.0.0.1:5179';
let browser,server;
try{
 await writeFile(fixture,`<!doctype html><html><body><div id="root"></div><script type="module">
 import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
 import StorefrontPreview from '/src/StorefrontPreview.tsx';
 import {useUnsavedChanges,confirmLeaveDrafts} from '/src/interaction-state.ts';
 import {ThemeProvider,ThemeToggle} from '/src/theme.tsx';
 import '/src/styles.css';import '/src/theme.css';import '/src/interactions.css';import '/src/theme-accessibility.css';
 const site={siteId:'isolated-qa',slug:'isolated-qa',business:{name:'Isolated QA',category:'Retail'},design:{primary:'#0b1529',secondary:'#3c86f6'},features:{products:true,cart:true},catalog:[{id:'qa-product',type:'product',name:'QA product',description:'QA',price:20,inventory:null,requiresAppointment:false,duration:0,imageUrl:''}],employees:[],hours:{},paymentRules:{productPayment:'in_person'},settings:{}};
 function Draft(){const[value,setValue]=useState('saved');const[revision,setRevision]=useState(0);useUnsavedChanges(value,revision,setValue,'en');return React.createElement('div',null,React.createElement('input',{'aria-label':'Draft',value,onChange:e=>setValue(e.target.value)}),React.createElement('button',{onClick:()=>setRevision(x=>x+1)},'Save draft'),React.createElement('button',{onClick:()=>{if(confirmLeaveDrafts())document.getElementById('result').textContent='left'}},'Leave'),React.createElement('output',{id:'result'}))}
 createRoot(document.getElementById('root')).render(React.createElement(ThemeProvider,null,React.createElement(ThemeToggle),React.createElement(Draft),React.createElement(StorefrontPreview,{previewSite:site,lang:'en',device:'mobile'})));
 </script></body></html>`);
 server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5179','--strictPort'],{stdio:'ignore'});
 for(let i=0;i<80;i++){try{if((await fetch(origin)).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch();const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:844});await page.goto(origin+'/'+fixture);
  await page.getByLabel('Draft',{exact:true}).fill('unsaved');page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('button',{name:'Leave',exact:true}).click();assert.equal(await page.locator('#result').textContent(),'');
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Leave',exact:true}).click();assert.equal(await page.getByLabel('Draft',{exact:true}).inputValue(),'saved');
  await page.getByLabel('Draft',{exact:true}).fill('persisted');await page.getByRole('button',{name:'Save draft',exact:true}).click();
  let prompted=false;const unexpected=dialog=>{prompted=true;return dialog.dismiss()};page.on('dialog',unexpected);await page.getByRole('button',{name:'Leave',exact:true}).click();assert.equal(prompted,false);page.off('dialog',unexpected);
  const frame=page.frameLocator('iframe');await frame.getByRole('button',{name:'Explore catalog',exact:true}).click();await frame.locator('.template-card-actions .template-solid').click();await frame.locator('.template-catalog-modal .catalog-close').click();await frame.getByRole('button',{name:/^Cart 1$/}).click();
  try{await frame.locator('.cs-cart-lines').waitFor({timeout:5000})}catch(error){console.error('Cart diagnostic',await frame.locator('body').innerText());throw error}
  assert.equal(await frame.locator('.cs-cart-lines strong').innerText(),'Total $20.00');await frame.getByRole('button',{name:'Remove QA product',exact:true}).click();assert.equal(await frame.locator('.cs-cart-line').count(),0);assert.equal(await frame.locator('.cs-checkout form button').isDisabled(),true);
  await frame.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await frame.locator('.cs-cart-line').count(),1);assert.equal(await frame.locator('.cs-cart-lines strong').innerText(),'Total $20.00');
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.getByRole('button',{name:'Save draft',exact:true}).evaluate(el=>getComputedStyle(el).scale),'none');
  console.log('Draft cancellation, saved state, Builder iframe cart remove/undo and reduced motion:',width);
 }
 assert.deepEqual(errors,[]);
}finally{await browser?.close();server?.kill();await unlink(fixture).catch(()=>{})}
