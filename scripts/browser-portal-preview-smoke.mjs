import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:5193';let server,browser;
try{
 server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5193','--strictPort'],{stdio:'ignore'});
 for(let i=0;i<80;i++){try{if((await fetch(origin)).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({...(process.env.WF_QA_BROWSER?{executablePath:process.env.WF_QA_BROWSER}:{}),headless:true});
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:844}}),page=await context.newPage();let errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/design-preview/portal/preview.html');
  await page.getByRole('button',{name:'Catalog Products and services'}).click();
  await page.getByRole('checkbox',{name:'Track stock'}).waitFor();assert.equal(await page.getByRole('checkbox',{name:'Track stock'}).isChecked(),true);
  await page.getByRole('heading',{name:'Reservations and maintenance'}).waitFor();await page.getByText('0 active reservations',{exact:false}).waitFor();
  if(width<821)await page.getByRole('button',{name:'Business menu'}).click();
  if(!await page.locator('.ca-nav-groups details').filter({has:page.locator('summary').filter({hasText:/^Business$/})}).getAttribute('open').then(v=>v!==null))await page.locator('.ca-nav-groups summary').filter({hasText:/^Business$/}).click();
  if(width<821){
   const geometry=await page.locator('.ca-nav-groups').evaluate(el=>({display:getComputedStyle(el).display,groups:Array.from(el.children).map(e=>{const r=e.getBoundingClientRect();return {x:r.x,right:r.right,width:r.width}})}));
   assert.equal(geometry.display,'grid');
   // Leave room for the iPhone browser toolbar below the last menu action.
   await page.locator('.ca-sidebar').evaluate(el=>{el.scrollTop=el.scrollHeight});
   const clearance=await page.locator('.ca-sidebar').evaluate(el=>({rect:el.getBoundingClientRect().toJSON(),scrollHeight:el.scrollHeight,scrollTop:el.scrollTop,clientHeight:el.clientHeight,bottom:el.querySelector('.ca-signout').getBoundingClientRect().bottom,padding:parseFloat(getComputedStyle(el).paddingBottom),overflow:getComputedStyle(el).overflowY}));assert(clearance.padding>=112&&clearance.overflow==='auto'&&clearance.bottom<=844-96);
   await page.getByRole('button',{name:'Inventory',exact:true}).scrollIntoViewIfNeeded();assert(geometry.groups.every(g=>Math.abs(g.x-geometry.groups[0].x)<1&&g.right<=width));
  }
  await page.getByRole('button',{name:'Inventory',exact:true}).click();await page.getByRole('heading',{name:'Stock and consumption'}).waitFor();
  if(width<821)await page.getByRole('button',{name:'Business menu'}).click();
  await page.locator('.ca-nav-groups summary').filter({hasText:/^Your website$/}).click();await page.getByRole('button',{name:'Share website',exact:true}).click();
  await page.getByRole('note').filter({hasText:'Sample QR'}).waitFor();await page.locator('.business-qr-image').waitFor();
  await page.waitForFunction(()=>document.querySelector('.business-qr-image')?.naturalWidth>0);assert.equal(await page.locator('.business-qr-details code').innerText(),'https://webfactorypr.com/');
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download',exact:true}).click();assert((await download).suggestedFilename().endsWith('-qr.png'));
  if(width<821)await page.getByRole('button',{name:'Business menu'}).click();if(!await page.locator('.ca-nav-groups details').filter({has:page.locator('summary').filter({hasText:/^Business$/})}).getAttribute('open').then(v=>v!==null))await page.locator('.ca-nav-groups summary').filter({hasText:/^Business$/}).click();await page.getByRole('button',{name:'Products and services',exact:true}).click();
  // The real health component must reject incomplete API data without blanking the portal.
  await page.evaluate(()=>{const original=window.fetch;window.fetch=async(input,init)=>String(input).includes('client-inventory-health')?Response.json({ok:true}):original(input,init)});
  await page.getByRole('button',{name:'Refresh review'}).click();await page.getByRole('alert').filter({hasText:'incomplete data'}).waitFor();await page.getByRole('heading',{name:'Products and services',exact:true}).waitFor();
  assert.deepEqual(errors,[]);console.log('Portal menu, stock tracking, Inventory entry, sample QR and incomplete health: '+width);await context.close();
 }
}finally{await browser?.close();server?.kill()}
