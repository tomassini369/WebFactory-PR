import assert from 'node:assert/strict';
import sharp from 'sharp';
import {neutralContrast} from '../shared/neutral-glass.mjs';
import {colorPalettes} from '../shared/color-palettes.mjs';
import {mkdir} from 'node:fs/promises';
const parse=value=>{const n=value.match(/[\d.]+/g)?.map(Number)||[];return [...n.slice(0,3),n[3]??1]};
export async function measureReadingPixels(page,selector){
 const card=page.locator(selector);await card.scrollIntoViewIfNeeded();
 const samples=await card.evaluate(card=>{
  let id=0;const rows=[];
  for(const el of card.querySelectorAll('h2,h3,p,dt,dd,.ca-note,.gd-month-grid>span')){
   if(!el.textContent.trim()||el.closest('button,svg')||el.querySelector('button,input,select'))continue;
   const css=getComputedStyle(el);let opacity=1;for(let n=el;n&&n!==card.parentElement;n=n.parentElement)opacity*=Number(getComputedStyle(n).opacity);
   const range=document.createRange();range.selectNodeContents(el);const rects=[...range.getClientRects()].filter(r=>r.width>1&&r.height>1&&r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight);
   if(!rects.length)continue;el.setAttribute('data-wf-contrast-sample',String(id++));
   rows.push({text:el.textContent.trim().slice(0,55),color:css.color,opacity,rects:rects.map(r=>({left:Math.floor(r.left),top:Math.floor(r.top),width:Math.ceil(r.right)-Math.floor(r.left),height:Math.ceil(r.bottom)-Math.floor(r.top)}))});
  }
  return rows;
 });
 assert(samples.length>0,'At least one visible text sample must be measured');
 const restoration=await card.evaluate(card=>[...card.querySelectorAll('[data-wf-contrast-sample],[data-wf-contrast-sample] *')].map((el,index)=>{
  el.setAttribute('data-wf-mask-index',String(index));return {index,values:['color','text-shadow','-webkit-text-fill-color'].map(key=>({key,value:el.style.getPropertyValue(key),priority:el.style.getPropertyPriority(key)}))};
 }));
 await card.locator('[data-wf-mask-index]').evaluateAll(els=>els.forEach(el=>{el.style.setProperty('color','transparent','important');el.style.setProperty('text-shadow','none','important');el.style.setProperty('-webkit-text-fill-color','transparent','important')}));
 let screenshot;try{screenshot=await page.screenshot()}finally{await card.evaluate((card,rows)=>{for(const row of rows){const el=card.querySelector(`[data-wf-mask-index="${row.index}"]`);if(el){for(const {key,value,priority} of row.values){if(value)el.style.setProperty(key,value,priority);else el.style.removeProperty(key)}el.removeAttribute('data-wf-mask-index')}}},restoration);await card.locator('[data-wf-contrast-sample]').evaluateAll(els=>els.forEach(el=>el.removeAttribute('data-wf-contrast-sample')))}
 const {data,info}=await sharp(screenshot).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 return samples.map(sample=>{
  const ink=parse(sample.color);let minimum=Infinity;
  for(const r of sample.rects)for(let y=r.top;y<Math.min(info.height,r.top+r.height);y++)for(let x=r.left;x<Math.min(info.width,r.left+r.width);x++){
   const i=(y*info.width+x)*4,bg=[data[i],data[i+1],data[i+2]],a=ink[3]*sample.opacity;
   minimum=Math.min(minimum,neutralContrast(ink.slice(0,3).map((v,j)=>v*a+bg[j]*(1-a)),bg));
  }
  return {text:sample.text,color:sample.color,opacity:sample.opacity,ratio:minimum};
 });
}
export async function verifyNeutralGlass({browser,origin,intercept,appearance,site}){
 const output='/tmp/wf-neutral-reading';await mkdir(output,{recursive:true});const endpoint=origin+'/.netlify/functions/dashboard-appearance?siteId='+site.siteId;
 const write=async(method,body,type='application/json')=>{const current=await(await appearance(new Request(endpoint))).json();const response=await appearance(new Request(endpoint,{method,headers:{origin,'content-type':type,'x-appearance-version':current.version},body:type==='application/json'?JSON.stringify(body):body}));assert.equal(response.status,200);return response.json()};
 let measured=0,negativeChecked=false;
 for(const width of (process.env.QA_WIDTHS||'390,1440').split(',').map(Number))for(const theme of ['light','dark'])for(const background of ['room','black','white'])for(const alpha of [.2,.96]){
  if(background!=='room'){const image=await sharp({create:{width:128,height:128,channels:3,background:background==="black"?'#000000':'#ffffff'}}).png().toBuffer();await write('POST',image,'image/png')}
  await write('PUT',{background:background==='room'?'room':'custom',backgroundNatural:true,glassStyle:'liquid',alpha,blur:34,motion:0,paletteId:width===1440&&background==='room'?colorPalettes[0].id:''});
  const context=await browser.newContext({viewport:{width,height:950},deviceScaleFactor:1,reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',dialog=>dialog.accept());await page.addInitScript(t=>localStorage.setItem('webfactory-theme-v2',t),theme);await intercept(page);await page.goto(origin+'/client-admin');await page.locator('.gd-calendar').waitFor();await page.waitForFunction(()=>document.querySelector('.gd-root')?.dataset.glassStyle==='liquid'&&document.querySelector('.gd-root')?.dataset.backgroundNatural==='true');await page.evaluate(async()=>{const match=getComputedStyle(document.querySelector('.gd-wallpaper')).backgroundImage.match(/^url\(["']?(.*?)["']?\)$/);if(match){const image=new Image();image.src=match[1];await image.decode()}});
  const fill=parse(await page.locator('.gd-calendar>.wf-neutral-reading-layer').evaluate(el=>getComputedStyle(el).backgroundColor));assert(fill[3]>=.82);assert.equal(await page.locator('.gd-shade').evaluate(el=>getComputedStyle(el).opacity),'0');
  let minimum=Infinity;
  for(const panel of ['.gd-profile','.gd-calendar','.gd-activity'])for(const row of await measureReadingPixels(page,panel)){assert(row.ratio>=4.5,`${theme}/${background}/${alpha}/${width} ${panel}: ${JSON.stringify(row)}`);minimum=Math.min(minimum,row.ratio);measured++}
  if(width===1440&&background==='room'&&alpha===.2){
   await page.locator('.gd-topnav').getByRole('button',{name:'POS',exact:true}).click();await page.locator('.pos-workspace').waitFor();
   for(const panel of ['.pos-heading','.pos-catalog','.pos-order'])for(const row of await measureReadingPixels(page,panel)){assert(row.ratio>=4.5,`${theme} ${panel}: ${JSON.stringify(row)}`);measured++}
   await page.locator('.gd-topnav').getByRole('button',{name:/^(Overview|Resumen)$/,exact:true}).click();await page.locator('.gd-calendar').waitFor();
  }
  if(width===390&&background==='room'&&alpha===.2){
   await page.locator('.gd-dock').getByRole('button',{name:/^(Personalization|Personalización)$/,exact:true}).click();
   const control=page.getByRole('slider',{name:/^(Glass opacity|Opacidad del cristal)$/,exact:true});assert.equal(await control.getAttribute('min'),'0.82');assert.equal(await control.inputValue(),'0.82');
   assert.equal((await(await appearance(new Request(endpoint))).json()).prefs.alpha,.2,'Rendering must not silently rewrite old preferences');
   await control.press('End');await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.gd-root')).getPropertyValue('--wf-reading-alpha'))===.96);await control.press('Home');
   const blur=page.getByRole('slider',{name:/^(Glass blur|Desenfoque del cristal)$/,exact:true});await blur.press('Home');await page.waitForFunction(()=>[...document.querySelectorAll('.wf-licensed-liquid-glass')].length>0&&[...document.querySelectorAll('.wf-licensed-liquid-glass')].every(el=>el.dataset.fluidBlur==='0'));await blur.press('End');await page.waitForFunction(()=>[...document.querySelectorAll('.wf-licensed-liquid-glass')].every(el=>el.dataset.fluidBlur==='40'));
   await page.locator('.gd-topnav').getByRole('button',{name:/^(Overview|Resumen)$/,exact:true}).click();await page.locator('.gd-calendar').waitFor();
  }
  if(width===1440&&theme==='dark'&&background==='white'&&alpha===.2){
   const old=await page.addStyleTag({content:'html[data-wf-theme] body #root .gd-root[data-glass-style=liquid] .gd-content .gd-calendar>.wf-neutral-reading-layer{background:transparent!important}'});
   const broken=await measureReadingPixels(page,'.gd-calendar');assert(broken.some(row=>row.ratio<4.5),'Negative control must detect the old transparent-reading-layer failure');negativeChecked=true;await old.evaluate(el=>el.remove());
  }
  if(background==='room'&&alpha===.2){await page.locator('.gd-calendar').scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/${width}-${theme}-${process.env.QA_ENGINE||'chromium'}.png`})}
  await page.emulateMedia({forcedColors:'active'});await page.waitForFunction(()=>matchMedia('(forced-colors: active)').matches&&getComputedStyle(document.querySelector('.gd-root')).getPropertyValue('--wf-neutral-fill').trim()==='Canvas');await page.waitForFunction(()=>document.querySelector('.gd-calendar>.wf-neutral-reading-layer')?.style.backgroundColor.toLowerCase()==='canvas');const forced=await page.locator('.gd-calendar>.wf-neutral-reading-layer').evaluate(el=>{const probe=document.createElement('i');probe.style.backgroundColor='Canvas';el.append(probe);const expected=getComputedStyle(probe).backgroundColor;probe.remove();return {actual:getComputedStyle(el).backgroundColor,expected,fill:getComputedStyle(el).getPropertyValue('--wf-neutral-fill'),display:getComputedStyle(el,'::before').display}});assert.equal(forced.actual,forced.expected,JSON.stringify(forced));await page.emulateMedia({forcedColors:'none'});
  assert.deepEqual(errors,[]);await context.close();console.log('PASS composited reading pixels',width,theme,background,alpha,'minimum',Math.round(minimum*100)/100);
 }
 console.log('PASS actual background pixels behind',measured,'visible text samples; old-rule negative control:',negativeChecked);
}
export async function verifyKioskNeutral(page,lang,{custom=false}={}){
 const root='.kiosk-appearance-preview',t=(a,b)=>lang==='es'?a:b;
 const opacity=page.getByRole('slider',{name:t('Opacidad del cristal','Glass opacity'),exact:true});assert.equal(await opacity.getAttribute('min'),'82');
 await opacity.press('End');await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.kiosk-appearance-preview')).getPropertyValue('--wf-reading-alpha'))===.95);const high=Number((await page.locator(root+' .kiosk-header').evaluate(el=>getComputedStyle(el.querySelector(':scope>.wf-neutral-reading-layer')).backgroundColor)).match(/[\d.]+/g).at(-1));assert(high>=.95,JSON.stringify(await page.locator(root+' .kiosk-header').evaluate(el=>({paint:getComputedStyle(el.querySelector(':scope>.wf-neutral-reading-layer')).backgroundColor,alpha:getComputedStyle(el).getPropertyValue('--wf-reading-alpha'),theme:document.documentElement.dataset.wfTheme,content:getComputedStyle(el,'::before').content,neutral:getComputedStyle(el).getPropertyValue('--wf-neutral-fill'),rgb:getComputedStyle(el).getPropertyValue('--wf-neutral-rgb'),root:el.closest('.wf-kiosk')?.outerHTML.slice(0,420),sheets:[...document.styleSheets].map(x=>x.href)}))));
 await opacity.press('Home');await page.getByRole('slider',{name:t('Desenfoque del cristal','Glass blur'),exact:true}).press('End');
 await page.waitForFunction(()=>[...document.querySelectorAll('.kiosk-appearance-preview .wf-licensed-liquid-glass')].length===2&&[...document.querySelectorAll('.kiosk-appearance-preview .wf-licensed-liquid-glass')].every(el=>el.dataset.fluidBlur==='24'));
 assert.match(await page.locator(root+' .kiosk-catalog').evaluate(el=>getComputedStyle(el).backdropFilter),/^blur\(24px\)/);
 let minimum=Infinity;for(const selector of ['.kiosk-header','.kiosk-cart'])for(const row of await measureReadingPixels(page,root+' '+selector)){assert(row.ratio>=4.5,`${custom?'custom':'neutral'} ${selector}: ${JSON.stringify(row)}`);minimum=Math.min(minimum,row.ratio)}
 if(custom){
  await page.emulateMedia({forcedColors:'active'});await page.waitForFunction(()=>matchMedia('(forced-colors: active)').matches);assert.equal(await page.locator(root+' .kiosk-header').evaluate(el=>getComputedStyle(el).getPropertyValue('--sales-ink').trim()),'CanvasText');
  await page.emulateMedia({forcedColors:'none',media:'print'});await page.waitForFunction(()=>matchMedia('print').matches);assert.equal(await page.locator(root+' .kiosk-header').evaluate(el=>getComputedStyle(el).color),'rgb(0, 0, 0)');await page.emulateMedia({media:'screen'});
 }
 console.log('PASS kiosk neutral reading pixels and connected opacity/blur; custom:',custom,'minimum',Math.round(minimum*100)/100);
}
