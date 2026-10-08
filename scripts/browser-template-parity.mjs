import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {writeFile,unlink} from 'node:fs/promises';
import assert from 'node:assert/strict';
const fixture='.qa-template-parity.html',origin='http://127.0.0.1:5187';let browser,server;
try{
await writeFile(fixture,`<!doctype html><html><body><div id="root"></div><script type="module">
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import Template from '/src/TemplatePreview.tsx';import Storefront from '/src/ClientStorefront.tsx';import Editor from '/src/WebsiteEditor.tsx';import {templatePreviewData} from '/src/template-preview-data.ts';import {templateBySlug} from '/src/templateData.ts';import {ThemeProvider} from '/src/theme.tsx';import '/src/styles.css';import '/src/theme.css';
const params=new URLSearchParams(location.search),mode=params.get('mode'),lang=params.get('lang')||'en';localStorage.setItem('webfactory-template-language',lang);
const site=templatePreviewData(templateBySlug('balance-wellness'));site.siteId='qa';site.revision=1;site.servicePlan={subscriptionStatus:'active'};site.design.style='Luxury';
window.mutations=[];window.fetch=async(input,init)=>{const url=String(input);if(!url.includes('/.netlify/functions/'))return fetch(input,init);if(init?.method==='POST')window.mutations.push(url);if(url.includes('public-client-site'))return Response.json({site});if(url.includes('booking-month-availability')){const {month}=JSON.parse(init.body),available={};const [year,m]=month.split('-').map(Number);for(let d=1;d<=new Date(year,m,0).getDate();d++){const date=month+'-'+String(d).padStart(2,'0');if(new Date(date+'T12:00:00Z')>new Date())available[date]=4}return Response.json({available})}if(url.includes('booking-availability')){const {date}=JSON.parse(init.body);return Response.json({slots:[{start:date+'T13:00:00.000Z',end:date+'T14:00:00.000Z',employeeId:'elena'}]})}if(url.includes('create-client-checkout'))return Response.json({ok:true});if(url.includes('client-asset'))return Response.json({assetKey:'sites/qa/photo'});throw Error('Unexpected request '+url)};
function App(){const [data,setData]=useState(site);return mode==='editor'?React.createElement(Editor,{site:data,lang,busy:false,onSave:business=>{window.saved=business;setData({...data,business,revision:data.revision+1})}}):mode==='template'?React.createElement(Template,{slug:'balance-wellness'}):React.createElement(Storefront,{slug:'balance-wellness',...(mode==='live'?{}:{previewSite:site}),previewLanguage:lang})}
createRoot(document.getElementById('root')).render(React.createElement(ThemeProvider,null,React.createElement(App)));
</script></body></html>`);
server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5187','--strictPort'],{stdio:'ignore'});
for(let i=0;i<80;i++){try{if((await fetch(origin)).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
browser=await chromium.launch(process.env.WF_QA_BROWSER?{executablePath:process.env.WF_QA_BROWSER}:{});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message)});
for(const width of [390,1280])for(const lang of ['en','es']){
 await page.setViewportSize({width,height:844});let reference;
 for(const mode of ['template','builder','live']){
  await page.goto(origin+'/'+fixture+'?mode='+mode+'&lang='+lang);if(mode==='live')await page.getByRole('button',{name:lang==='es'?'ES':'EN',exact:true}).click();
  await page.locator('.template-hero h1').waitFor();
  const layout=await page.locator('.template-site').evaluate(el=>{const h=el.querySelector('h1'),button=el.querySelector('.template-solid');return {visual:el.className.split(' ').find(x=>x.startsWith('visual-')),font:getComputedStyle(h).fontFamily,radius:getComputedStyle(button).borderRadius,metaColumns:getComputedStyle(el.querySelector('.template-hero-meta')).gridTemplateColumns}});
  assert.equal(layout.visual,'visual-minimal');if(!reference)reference=layout;else assert.deepEqual(layout,reference);
  await page.locator('.template-hero-actions .template-solid').click();await page.locator('.template-choice-grid button').first().click();await page.locator('.wf-month-day:not(:disabled)').first().click();await page.locator('.template-time-grid button').first().click();await page.locator('.template-confirm-booking').click();
  await page.locator('.cs-checkout input').nth(0).fill('Sample customer');await page.locator('.cs-checkout input[type=email]').fill('sample@example.com');await page.locator('.cs-checkout form>button').click();await page.locator('.template-confirmed-panel').waitFor();
  const mutations=await page.evaluate(()=>window.mutations);if(mode!=='live')assert.deepEqual(mutations,[],'Preview must never send mutations');else assert.equal(mutations.filter(x=>x.includes('create-client-checkout')).length,1);
 }
 await page.goto(origin+'/'+fixture+'?mode=editor&lang='+lang);await page.getByLabel('Headline · English',{exact:true}).fill('Edited headline');await page.getByLabel('Título principal · Español',{exact:true}).fill('Título editado');await page.getByRole('button',{name:lang==='es'?'Guardar y publicar contenido':'Save and publish content',exact:true}).click();assert.equal(await page.evaluate(()=>window.saved.headlineEs),'Título editado');assert.equal(await page.locator('iframe').count(),1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Editor must not overflow');
 for(const dark of [false,true]){await page.evaluate(dark=>document.documentElement.setAttribute('data-wf-theme',dark?'dark':'light'),dark);const field=page.getByLabel('Headline · English',{exact:true});assert.equal(await field.isVisible(),true);const contrast=await field.evaluate(el=>{const rgb=color=>color.match(/\d+/g).slice(0,3).map(Number);const lum=color=>{const c=rgb(color).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722};const style=getComputedStyle(el),a=lum(style.color),b=lum(style.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)});assert.ok(contrast>=4.5,'Editor field contrast must pass in both themes');}
 console.log('Shared template/builder/live booking and dashboard editing:',width,lang);
}
assert.deepEqual(errors,[]);
}finally{await browser?.close();server?.kill();await unlink(fixture).catch(()=>{})}
