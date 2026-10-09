import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:5188';let server,browser;
try{
 server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5188','--strictPort'],{stdio:'ignore'});
 let ready=false;for(let i=0;i<80;i++){try{if((await fetch(origin)).ok){ready=true;break}}catch{}await new Promise(resolve=>setTimeout(resolve,100));}assert(ready);
 browser=await chromium.launch();const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:844});await page.goto(origin+'/shadcn-preview');await page.getByRole('heading',{name:'Shadcn instalado'}).waitFor();
  for(const theme of ['light','dark']){
   if(await page.locator('html').getAttribute('data-wf-theme')!==theme)await page.locator('.wf-theme-toggle').click();
   await page.getByLabel('Nombre de prueba').fill('Kevin');await page.getByRole('button',{name:'Probar componente'}).click();
   await page.getByRole('status').filter({hasText:'Funciona, Kevin.'}).waitFor();
   const style=await page.getByRole('button',{name:'Probar componente'}).evaluate(el=>({display:getComputedStyle(el).display,color:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor}));
   assert(['inline-flex','flex'].includes(style.display),'Button must retain flex alignment (grid items may be blockified)');assert.notEqual(style.color,style.background);assert.notEqual(style.background,'rgba(0, 0, 0, 0)');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if(width<768)assert(parseFloat(await page.getByLabel('Nombre de prueba').evaluate(el=>getComputedStyle(el).fontSize))>=16);
   assert.equal(await page.locator('.wf-theme-toggle').count(),1);
   const trigger=page.getByRole('button',{name:'Probar diálogo',exact:true});
   await trigger.click();const dialog=page.getByRole('dialog',{name:'Diálogo de prueba'});await dialog.waitFor();
   const surface=await dialog.evaluate(el=>{const r=el.getBoundingClientRect();const s=getComputedStyle(el);return {x:r.x,right:r.right,width:r.width,background:s.backgroundColor,color:s.color,focus:el.contains(document.activeElement)}});
   assert(surface.focus,'Dialog moves focus inside');assert(surface.x>=0&&surface.right<=width+1,'Dialog stays inside viewport');
   assert.notEqual(surface.background,'rgba(0, 0, 0, 0)','Portaled Dialog retains scoped theme');assert.notEqual(surface.color,surface.background);
   await dialog.press('Escape');await dialog.waitFor({state:'hidden'});assert(await trigger.evaluate(el=>el===document.activeElement),'Escape restores trigger focus');
   await trigger.click();await page.getByRole('button',{name:'Cerrar diálogo',exact:true}).click();await dialog.waitFor({state:'hidden'});
   console.log('Official Shadcn input/card/button verified',width,theme,style);
  }
 }
 assert.deepEqual(errors,[]);
}finally{await browser?.close();server?.kill();}
