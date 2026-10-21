import {selectPortalSection} from './qa-workspace-navigation.mjs'
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {preview} from 'vite';
import {chromium,webkit} from 'playwright';
import {kioskFixture} from './fixtures/kiosk-fixture.mjs';
import {renamePublicSiteSlug} from '../netlify/lib/client-site-slug.mjs';
import {authorizeSiteUser,siteRoleCapabilities} from '../netlify/lib/client-auth.mjs';

const port=Number(process.env.QA_PORT||5260),isWebKit=process.env.QA_ENGINE==='webkit';
const server=await preview({preview:{host:'127.0.0.1',port,strictPort:true}}),root=process.env.QA_ORIGIN||`http://127.0.0.1:${port}`;
const executablePath=isWebKit?process.env.QA_WEBKIT_PATH:process.env.QA_CHROMIUM_PATH;
const browser=await (isWebKit?webkit:chromium).launch({...(!isWebKit?{args:['--no-sandbox']}:{}),...(executablePath?{executablePath}:{}),...(process.env.QA_ORIGIN&&process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
const widths=(process.env.QA_WIDTHS||'320,375,390,430,768,1024,1440').split(',').map(Number),errors=[],photo=await readFile(new URL('../assets/template-images/262978.jpg',import.meta.url));
const output='/tmp/webfactory-public-site-link';await mkdir(output,{recursive:true});

async function setup(){
 const f=kioskFixture(root),context=await browser.newContext({reducedMotion:'reduce',...(isWebKit?{hasTouch:true}:{})}),page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 f.site.slug='fixture-original';f.site.revision=1;f.site.status='published';f.site.hours={};f.site.googleCalendar={};f.site.settings={locale:'en',timezone:'America/Puerto_Rico',currency:'USD'};f.site.servicePlan={code:'complimentary',billingModel:'complimentary'};
 await f.store.setJSON('slugs/fixture-original.json',{siteId:f.site.siteId});
 const other={...structuredClone(f.site),siteId:'fixture-second',slug:'fixture-second',business:{...f.site.business,name:'Second isolated fixture'}};
 await f.store.setJSON('slugs/fixture-second.json',{siteId:other.siteId});
 let calls=0,role='owner',mode='',release;
 const user={id:'fixture-owner',email:'owner@example.invalid',user_metadata:{},app_metadata:{},mfa:{required:false}};
 await context.addInitScript(()=>{window.fixtureClipboard=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.fixtureClipboard.push(text)}})});
 await context.route('**/.netlify/functions/**',async route=>{
  const req=route.request(),url=new URL(req.url()),name=url.pathname.split('/').at(-1);
  if(name==='client-asset')return route.fulfill({contentType:'image/jpeg',body:photo});
  if(name==='client-admin'&&req.method()==='PATCH'){
   calls++;const p=req.postDataJSON();assert.equal(p.section,'slug','only the isolated URL editor may write');assert.equal(p.siteId,f.site.siteId,'stable tenant identity');
   if(mode==='wait')await new Promise(resolve=>release=resolve);
   try{
    authorizeSiteUser(user,f.site,['owner','manager']);
    if(mode==='offline')throw Object.assign(Error('Fixture disconnect'),{status:503,code:'SLUG_STORAGE'});
    const saved=await renamePublicSiteSlug({siteId:p.siteId,requestedSlug:p.value,expectedRevision:p.revision,loadSite:async()=>structuredClone(f.site),store:f.store,patchSite:async(id,patch,{expectedRevision})=>{
     if(f.site.revision!==expectedRevision)throw Object.assign(Error('Fixture revision conflict'),{status:409});Object.assign(f.site,patch,{revision:expectedRevision+1});return structuredClone(f.site);
    }});
    if(mode==='lost-response')throw Object.assign(Error('Fixture lost response after saving'),{status:503,code:'SLUG_STORAGE'});
    return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,site:saved})});
   }catch(error){return route.fulfill({status:error.status||500,contentType:'application/json',body:JSON.stringify({ok:false,code:error.code,message:error.message})})}
  }
  assert(req.method()==='GET'||name==='portal-session',`Unexpected write during isolated URL QA: ${name}`);
  let data={ok:true};
  if(name==='portal-session')data={ok:true,user};
  if(name==='client-admin'){
   const site=url.searchParams.get('siteId')===other.siteId?other:f.site;
   data=url.searchParams.has('siteId')?{ok:true,site,membership:{role,capabilities:siteRoleCapabilities(role)},posOperations:{cashierEnabled:true,displayEnabled:true,profile:'auto',revision:0}}:{ok:true,sites:[f.site,other].map(s=>({siteId:s.siteId,slug:s.slug,businessName:s.business.name,status:'published'}))};
  }
  if(name==='client-workforce')data={ok:true,enabled:false,admin:true,paidBreaks:false,employees:[],locations:[],bindings:[],shifts:[],requests:[],events:[],serverNow:new Date().toISOString(),totals:{todayMinutes:0,weekMinutes:0}};
  if(name==='client-commerce-admin')data={ok:true,orders:[],bookings:[]};
  await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
 });
 const open=async()=>{await page.goto(root+'/client-admin',{waitUntil:process.env.QA_ORIGIN?'domcontentloaded':'load'});await page.locator('.ca-dashboard').waitFor()};
 const nav=name=>selectPortalSection(page,name);
 return {f,other,context,page,open,nav,calls:()=>calls,mode:value=>mode=value,release:()=>release?.(),role:value=>{role=value;f.site.members[0].role=value}};
}
function contrast(element){
 const rgb=color=>{const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3)};
 const lum=color=>rgb(color).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0),ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
 const card=getComputedStyle(element),field=getComputedStyle(element.querySelector('input')),wrapper=getComputedStyle(element.querySelector('.ca-public-site-field'));
 return {copy:[...element.querySelectorAll('p,label,small,strong')].filter(el=>el.offsetHeight).map(el=>({text:el.textContent,ratio:ratio(getComputedStyle(el).color,card.backgroundColor)})),buttons:[...element.querySelectorAll('button,a')].filter(el=>!el.disabled).map(el=>{const s=getComputedStyle(el);return ratio(s.color,s.backgroundColor==='rgba(0, 0, 0, 0)'?card.backgroundColor:s.backgroundColor)}),input:ratio(field.color,wrapper.backgroundColor),border:ratio(wrapper.borderTopColor,wrapper.backgroundColor)};
}
try{
 for(const width of widths)for(const theme of ['light','dark'])for(const lang of ['es','en']){
  const qa=await setup(),{page}=qa,es=lang==='es';await page.setViewportSize({width,height:1000});await qa.open();await page.getByRole('button',{name:lang.toUpperCase(),exact:true}).click();if(await page.locator('html').getAttribute('data-wf-theme')!==theme)await page.locator('.wf-theme-toggle').click();await qa.nav(es?'Editar página':'Edit website');
  const card=page.locator('.ca-public-site-editor'),input=card.getByRole('textbox'),save=card.getByRole('button',{name:es?'Guardar enlace':'Save link',exact:true});await input.waitFor();assert.equal(await input.inputValue(),'fixture-original');assert(await save.isDisabled());
  await input.fill('admin');assert.equal(await input.getAttribute('aria-invalid'),'true');assert(await save.isDisabled());
  await input.fill('fixture-new');assert.match(await card.locator('.ca-public-site-preview').innerText(),/webfactorypr.com\/sites\/fixture-new/);
  const c=await card.evaluate(contrast);assert(c.copy.every(x=>x.ratio>=4.5)&&c.buttons.every(x=>x>=4.5)&&c.input>=4.5&&c.border>=3,JSON.stringify(c));
  await input.focus();assert.equal(await card.locator('.ca-public-site-field').evaluate(el=>getComputedStyle(el).outlineStyle),'solid');assert.equal(await input.evaluate(el=>getComputedStyle(el).fontSize),'16px');assert.equal(await input.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)','the field has one continuous themed surface');
  for(const control of await card.locator('button,a,input').all()){const box=await control.boundingBox();assert(box&&box.height>=43.5,`44px touch target: ${await control.evaluate(el=>el.outerHTML)} ${JSON.stringify(box)}`)}
  assert.equal(await page.locator('.ca-website-panel .wf-panel-tools').evaluate(el=>getComputedStyle(el).position),'static');
  page.once('dialog',d=>d.dismiss());await save.click();assert.equal(qa.calls(),0);assert.equal(await input.inputValue(),'fixture-new');
  await card.getByRole('button',{name:es?'Copiar enlace':'Copy link',exact:true}).click();assert.deepEqual(await page.evaluate(()=>window.fixtureClipboard),['https://webfactorypr.com/sites/fixture-original'],'copy uses the confirmed address');
  page.once('dialog',d=>d.accept());await save.click();await card.getByRole('status').filter({hasText:es?'Enlace actualizado':'Link updated'}).waitFor();assert.equal(qa.calls(),1);assert.equal(qa.f.site.revision,2);assert.equal((await qa.f.store.get('slugs/fixture-original.json')).siteId,qa.f.site.siteId);assert.equal((await qa.f.store.get('slugs/fixture-new.json')).siteId,qa.f.site.siteId);assert.equal(await input.inputValue(),'fixture-new');assert(await save.isDisabled());assert.equal(await card.getByRole('link',{name:es?'Ver website':'View website'}).getAttribute('href'),'/sites/fixture-new');
  assert.equal(await page.getByRole('link',{name:es?'Abrir Builder':'Open Builder',exact:true}).getAttribute('href'),'/builder?edit=kiosk-qa');
  await input.fill('x'.repeat(64));assert.equal(await input.getAttribute('maxlength'),'64');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow with maximum URL length');
  await card.getByRole('button',{name:es?'Cancelar edición':'Cancel editing',exact:true}).click();assert.equal(await input.inputValue(),'fixture-new');assert(await input.evaluate(el=>el===document.activeElement));
  assert.equal(await save.evaluate(el=>getComputedStyle(el).transitionDuration),'0s','reduced motion');
  if(width===390||width===1440)await page.locator('.ca-website-panel').screenshot({path:`${output}/website-${width}-${theme}-${lang}-${isWebKit?'webkit':'chromium'}.png`});
  console.log(`PASS editable URL, confirmation, copy, aliases, contrast, keyboard, motion and layout ${width} ${theme} ${lang}`);await qa.context.close();
 }
 const qa=await setup(),{page}=qa;await page.setViewportSize({width:390,height:1000});await qa.open();await page.getByRole('button',{name:'EN',exact:true}).click();await qa.nav('Edit website');const card=page.locator('.ca-public-site-editor'),input=card.getByRole('textbox'),save=card.getByRole('button',{name:'Save link',exact:true});await input.waitFor();
 const preserved=structuredClone({catalog:qa.f.site.catalog,employees:qa.f.site.employees,paymentRules:qa.f.site.paymentRules});
 await input.fill('fixture-unsaved');page.once('dialog',d=>d.dismiss());await qa.nav('POS');assert(await input.isVisible());assert.equal(await input.inputValue(),'fixture-unsaved');page.once('dialog',d=>d.accept());await qa.nav('POS');await page.locator('.pos-workspace').waitFor();assert.equal(qa.calls(),0);await qa.nav('Edit website');await input.waitFor();assert.equal(await input.inputValue(),'fixture-original');
 await input.fill('fixture-conflict');qa.f.site.revision=2;page.once('dialog',d=>d.accept());await save.click();await card.getByRole('alert').filter({hasText:'Reload before saving'}).waitFor();assert.equal(await input.inputValue(),'fixture-conflict');page.once('dialog',d=>d.accept());await card.getByRole('button',{name:'Reload address',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#ca-public-site-slug')?.value==='fixture-original');
 qa.mode('wait');await input.fill('fixture-retry');page.once('dialog',d=>d.accept());await save.click();await page.waitForFunction(()=>document.querySelector('.ca-site-switcher select')?.disabled===true);assert(await input.isDisabled());assert(await card.locator('.ca-public-site-save').isDisabled());qa.release();qa.mode('');await card.getByRole('status').filter({hasText:'Link updated'}).waitFor();assert.equal(qa.calls(),2);assert.equal(qa.f.site.revision,3);
 for(const mode of ['offline','lost-response']){
  qa.mode(mode);await input.fill('fixture-'+mode);page.once('dialog',d=>d.accept());await save.click();await card.getByRole('alert').filter({hasText:'Reload to verify'}).waitFor();assert.equal(await input.inputValue(),'fixture-'+mode);qa.mode('');page.once('dialog',d=>d.accept());await card.getByRole('button',{name:'Reload address',exact:true}).click();const expected=qa.f.site.slug;await page.waitForFunction(value=>document.querySelector('#ca-public-site-slug')?.value===value,expected);assert(await save.isDisabled());assert.equal(qa.calls(),mode==='offline'?3:4);
 }
 assert.deepEqual({catalog:qa.f.site.catalog,employees:qa.f.site.employees,paymentRules:qa.f.site.paymentRules},preserved);
 qa.role('owner');await qa.open();await qa.nav('Edit website');await input.waitFor();assert.equal(await input.isDisabled(),false);qa.role('employee');await qa.open();await page.locator('.ca-mobile-menu-toggle').click();assert.equal(await page.locator('.sidebar-container').getByRole('button',{name:'Edit website',exact:true}).count(),0);
 await qa.context.close();assert.deepEqual(errors,[]);console.log('PASS draft navigation, conflicts, server reload, pending tenant switch protection, lost responses, Owner/Employee permissions; zero real writes or payments');
}finally{await browser.close();await new Promise((resolve,reject)=>server.httpServer.close(error=>error?reject(error):resolve()))}
