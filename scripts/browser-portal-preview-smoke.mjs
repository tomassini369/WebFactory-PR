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
  let savedAppearance=null;
  await page.addInitScript(()=>{
   window.__tones=0;window.__vibrations=0;
   Object.defineProperty(navigator,'vibrate',{value:()=>{window.__vibrations++;return true},configurable:true});
   const Original=window.AudioContext;
   window.AudioContext=class extends Original{createOscillator(){window.__tones++;return super.createOscillator()}};
  });
  // Keep an account-backed fixture across reloads, as the real endpoint does.
  await page.addInitScript(()=>{
   const nativeFetch=window.fetch.bind(window);const install=()=>{const original=window.fetch;window.fetch=async(input,init)=>String(input).includes('/portal-preferences')?nativeFetch('/qa-account-preferences',init):original(input,init)};
   window.addEventListener('load',install);
  });
  await page.route('**/qa-account-preferences',async route=>{if(route.request().method()==='PUT')savedAppearance=route.request().postDataJSON();await route.fulfill({json:{ok:true,preferences:savedAppearance}})});
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
  if(width<821)await page.getByRole('button',{name:'Business menu',exact:true}).click();
  await page.locator('.ca-nav-groups summary').filter({hasText:/^Account and settings$/}).click();
  await page.getByRole('button',{name:'Appearance and preferences',exact:true}).click();
  const preferences=page.locator('.portal-appearance');
  await preferences.getByRole('button',{name:'Sound Effects: On',exact:true}).waitFor();
  const layouts=[];
  for(const color of ['#7C3AED','#0D9488','#D97706','#FFFFFF','#000000'])for(const mode of ['light','dark']){
   await preferences.getByLabel('Full layout color',{exact:true}).fill(color);
   await preferences.getByRole('radio',{name:mode==='light'?'Light':'Dark',exact:true}).check();
   await page.waitForFunction(({color,mode})=>document.documentElement.dataset.wfTheme===mode&&getComputedStyle(document.querySelector('.ca-dashboard')).getPropertyValue('--portal-accent').trim()===color,{color,mode});
   const layout=await page.evaluate(()=>{
    const luminance=c=>{const rgb=c.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>{const x=n/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722};
    const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
    const root=getComputedStyle(document.querySelector('.ca-dashboard')),panel=getComputedStyle(document.querySelector('.portal-appearance')),heading=getComputedStyle(document.querySelector('.portal-appearance h2')),copy=getComputedStyle(document.querySelector('.portal-appearance p')),sidebar=getComputedStyle(document.querySelector('.ca-sidebar'));
    return {page:root.backgroundColor,panel:panel.backgroundColor,menu:sidebar.backgroundImage,headingContrast:contrast(heading.color,panel.backgroundColor),copyContrast:contrast(copy.color,panel.backgroundColor)};
   });
   assert(layout.headingContrast>=4.5&&layout.copyContrast>=4.5,JSON.stringify({color,mode,layout}));layouts.push(layout);
  }
  assert.equal(new Set(layouts.map(x=>x.page)).size,10);assert.equal(new Set(layouts.map(x=>x.panel)).size,10);assert.equal(new Set(layouts.map(x=>x.menu)).size,10);
  await preferences.getByRole('button',{name:'#7C3AED',exact:true}).click();
  await preferences.getByRole('radio',{name:'Light',exact:true}).check();
  await page.waitForFunction(()=>document.documentElement.dataset.wfTheme==='light');
  assert.equal(await page.locator('.ca-dashboard').evaluate(el=>getComputedStyle(el).getPropertyValue('--portal-accent').trim()),'#7C3AED');
  await preferences.getByRole('radio',{name:'Dark',exact:true}).check();
  await preferences.getByRole('button',{name:'Test sound and feedback',exact:true}).click();
  assert(await page.evaluate(()=>window.__tones>0&&window.__vibrations>0));
  await preferences.getByRole('button',{name:'Sound Effects: On',exact:true}).click();
  await preferences.getByRole('button',{name:'Haptics: On',exact:true}).click();
  const silent=await page.evaluate(()=>[window.__tones,window.__vibrations]);
  await preferences.getByRole('button',{name:'Test sound and feedback',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>[window.__tones,window.__vibrations]),silent);
  await preferences.getByText('Preferences saved',{exact:true}).waitFor();
  // Confirm exact user values were sent; the authenticated backend test covers isolation.
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('webfactory:appearance:preview-user')||'{}').soundEnabled===false);
  assert.equal(savedAppearance.soundEnabled,false);assert.equal(savedAppearance.hapticsEnabled,false);assert.equal(savedAppearance.accent,'#7C3AED');
  const restoredSave=page.waitForResponse(response=>response.url().endsWith('/qa-account-preferences')&&response.request().method()==='PUT'&&response.request().postDataJSON()?.paletteMode==='original'&&response.ok());
  await preferences.getByRole('button',{name:'Restore original WebFactory colors',exact:true}).click();
  await preferences.getByText('Original WebFactory palette active.',{exact:true}).waitFor();
  assert.equal(await page.locator('.ca-dashboard').getAttribute('data-portal-palette'),'original');
  assert.equal(await page.getByRole('radio',{name:'Dark',exact:true}).isChecked(),true);
  await preferences.getByRole('button',{name:'Sound Effects: Off',exact:true}).waitFor();
  await preferences.getByRole('button',{name:'Haptics: Off',exact:true}).waitFor();
  await preferences.getByText('Preferences saved',{exact:true}).waitFor();
  await restoredSave;
  assert.equal(savedAppearance.paletteMode,'original');assert.equal(savedAppearance.accent,'#3C86F6');
  await page.reload();
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.ca-dashboard')).getPropertyValue('--portal-accent').trim()==='#3C86F6'&&document.querySelector('.ca-dashboard').dataset.portalPalette==='original');
  assert.deepEqual(errors,[]);console.log('Portal navigation, inventory, QR, appearance, theme and feedback persistence: '+width);await context.close();
 }
}finally{await browser?.close();server?.kill()}
