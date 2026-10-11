import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {preview} from 'vite';
import {chromium,webkit} from 'playwright';
import {kioskFixture} from './fixtures/kiosk-fixture.mjs';
import {createPosSettingsHandler} from '../netlify/functions/client-pos-settings.mjs';
import {readPosOperations} from '../netlify/lib/pos-operations.mjs';
import {authorizeSiteUser,siteRoleCapabilities} from '../netlify/lib/client-auth.mjs';
const port=Number(process.env.QA_PORT||5244),isWebKit=process.env.QA_ENGINE==='webkit',engine=isWebKit?webkit:chromium;
const server=await preview({preview:{host:'127.0.0.1',port,strictPort:true}}),root=process.env.QA_ORIGIN||`http://127.0.0.1:${port}`;
const executablePath=isWebKit?process.env.QA_WEBKIT_PATH:process.env.QA_CHROMIUM_PATH;
const browser=await engine.launch({...(!isWebKit?{args:['--no-sandbox']}:{}),...(executablePath?{executablePath}:{}),...(process.env.QA_ORIGIN&&process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
const widths=(process.env.QA_WIDTHS||'320,375,390,430,768,1024,1440').split(',').map(Number),errors=[],photo=await readFile(new URL('../assets/template-images/262978.jpg',import.meta.url));
const output='/tmp/webfactory-pos-capabilities';await mkdir(output,{recursive:true});
async function setup(){
 const f=kioskFixture(root),context=await browser.newContext({reducedMotion:'reduce',...(isWebKit?{hasTouch:true}:{})}),page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 let cookie='',failSettings=false,role='owner',saleCalls=0;
 const user={id:'fixture-owner',email:'owner@example.invalid',user_metadata:{},app_metadata:{},mfa:{required:false}};
 const authorize=async siteId=>{if(siteId!==f.site.siteId)throw Object.assign(Error('Cross-tenant denied'),{status:403});return authorizeSiteUser(user,f.site,['owner','manager','employee','cashier'])};
 const settings=createPosSettingsHandler({authorize,getStore:()=>f.store});
 await context.route('**/.netlify/functions/**',async route=>{
  const req=route.request(),url=new URL(req.url()),name=url.pathname.split('/').at(-1),headers={...await req.allHeaders(),origin:root,cookie};
  const request=new Request(req.url(),{method:req.method(),headers,...(req.method()!=='GET'?{body:req.postData()}:{})});
  if(['client-pos-settings','client-kiosk'].includes(name)){
   if(name==='client-pos-settings'&&failSettings)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,message:'Isolated settings disconnect'})});
   const response=await (name==='client-pos-settings'?settings(request):f.handler(request));if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
  }
  if(name==='client-asset')return route.fulfill({contentType:'image/jpeg',body:photo});
  if(req.method()!=='GET'&&name!=='portal-session'){if(/client-pos-sale|client-pos-checkout/.test(name))saleCalls++;throw Error('Unexpected write during isolated capabilities QA: '+name)}
  let data={ok:true};
  if(name==='portal-session')data={ok:true,user};
  if(name==='client-admin')data=url.searchParams.has('siteId')?{ok:true,site:{...f.site,revision:1,status:'published',hours:{},settings:{locale:'en',timezone:'America/Puerto_Rico',currency:'USD'},googleCalendar:{},servicePlan:{code:'complimentary',billingModel:'complimentary'}},membership:{role,capabilities:siteRoleCapabilities(role)},posOperations:await readPosOperations(f.site.siteId,f.store)}:{ok:true,sites:[{siteId:f.site.siteId,slug:f.site.slug,businessName:f.site.business.name,status:'published'}]};
  if(name==='client-workforce')data={ok:true,enabled:false,admin:role==='owner',paidBreaks:false,employees:[],locations:[],bindings:[],shifts:[],requests:[],events:[],serverNow:new Date().toISOString(),totals:{todayMinutes:0,weekMinutes:0}};
  if(name==='client-commerce-admin')data={ok:true,orders:[],bookings:[]};
  if(name==='client-pos-attempt-status')data={ok:true,status:'completed',transactionId:'txn-fixture',receiptId:'receipt-fixture'};
  await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
 });
 const goto=async path=>page.goto(root+path,{waitUntil:process.env.QA_ORIGIN?'domcontentloaded':'load'});
 const nav=async name=>{const button=page.locator('.sidebar-container').getByRole('button',{name,exact:true});if(!await button.isVisible())await page.locator('.ca-mobile-menu-toggle').click();await button.click()};
 const open=async()=>{await goto('/client-admin');await page.locator('.ca-dashboard').waitFor()};
 return {f,context,page,goto,nav,open,settings,fail:value=>failSettings=value,role:value=>{role=value;f.site.members[0].role=value},saleCalls:()=>saleCalls};
}
try{
 const canvases={light:new Set(),dark:new Set()};
 for(const width of widths)for(const theme of ['light','dark'])for(const lang of ['es','en']){
  const qa=await setup(),{page}=qa,es=lang==='es';qa.f.site.design={primary:['#0b1529','#126b43','#9b245c','#f0b429','#ffffff','#000000','#663399'][widths.indexOf(width)%7],secondary:'#285fa6'};
  await page.setViewportSize({width,height:1000});await qa.open();await page.getByRole('button',{name:lang.toUpperCase(),exact:true}).click();if(await page.locator('html').getAttribute('data-wf-theme')!==theme)await page.locator('.wf-theme-toggle').click();await qa.nav(es?'Ajustes del negocio':'Business settings');
  const panel=page.locator('.pos-operations-settings'),select=panel.getByRole('combobox');await select.waitFor();assert.equal(await select.inputValue(),'auto');assert.equal(await panel.getByRole('checkbox').count(),2);assert.equal(await select.locator('option').count(),7);
  assert(await panel.getByRole('button',{name:es?'Guardar ajustes del POS':'Save POS settings',exact:true}).isDisabled());
  const contrast=await panel.evaluate(el=>{
   const rgb=color=>{const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3)};
   const lum=color=>rgb(color).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0),ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
   const s=getComputedStyle(el),p=getComputedStyle(el.querySelector('p')),select=getComputedStyle(el.querySelector('select')),heading=getComputedStyle(el.querySelector('h2'));return {canvas:s.backgroundColor,body:ratio(s.color,s.backgroundColor),copy:ratio(p.color,s.backgroundColor),heading:ratio(heading.color,s.backgroundColor),field:ratio(select.color,select.backgroundColor),control:ratio(select.borderTopColor,select.backgroundColor)};
  });assert(contrast.body>=4.5&&contrast.copy>=4.5&&contrast.heading>=4.5&&contrast.field>=4.5&&contrast.control>=3,JSON.stringify(contrast));canvases[theme].add(contrast.canvas);assert.equal(await panel.locator('.wf-panel-tools').evaluate(el=>getComputedStyle(el).position),'static','panel controls cannot float over the settings title');
  for(const control of await panel.locator('button,select').all()){const box=await control.boundingBox();if(box)assert(box.height>=43.5,'44px touch control')}
  for(const row of await panel.locator('.pos-module-options>label').all())assert.equal(await row.evaluate(el=>getComputedStyle(el).display),'flex','module checkbox stays beside its label on mobile');
  await select.focus();assert.notEqual(await select.evaluate(el=>getComputedStyle(el).outlineStyle),'none');await page.keyboard.press('Tab');
  await select.selectOption('barber');await panel.getByRole('button',{name:es?'Guardar ajustes del POS':'Save POS settings',exact:true}).click();await panel.getByRole('status').filter({hasText:es?'confirmados':'confirmed'}).waitFor();assert.equal((await readPosOperations(qa.f.site.siteId,qa.f.store)).profile,'barber');
  await qa.nav('POS');const pos=page.locator('.pos-workspace');await pos.waitFor();assert.match(await pos.locator('.pos-heading').innerText(),es?/Barbería/:/Barbershop/);assert.equal(await pos.locator('.pos-categories button').nth(1).innerText(),es?'Servicios':'Services');assert.equal(await pos.locator('.pos-catalog-heading h3').innerText(),es?'Servicios y productos':'Services and products');
  await pos.getByRole('button',{name:es?/Añadir Producto QA/:/Add QA Product/}).click();assert.match(await pos.locator('.pos-grand-total').innerText(),/11.15/);assert.equal(qa.saleCalls(),0);
  await qa.nav(es?'Ajustes del negocio':'Business settings');await panel.getByRole('checkbox',{name:es?/POS del cajero/:/Cashier POS/}).uncheck();await panel.getByRole('checkbox',{name:es?/Pantalla del cliente/:/Customer display/}).uncheck();await panel.getByRole('button',{name:es?'Guardar ajustes del POS':'Save POS settings',exact:true}).click();await panel.getByRole('status').filter({hasText:es?'confirmados':'confirmed'}).waitFor();assert.equal(await page.locator('.sidebar-container').getByRole('button',{name:'POS',exact:true}).count(),0);
  await panel.getByRole('checkbox',{name:es?/POS del cajero/:/Cashier POS/}).check();await panel.getByRole('button',{name:es?'Guardar ajustes del POS':'Save POS settings',exact:true}).click();await panel.getByRole('status').filter({hasText:es?'confirmados':'confirmed'}).waitFor();await qa.nav('POS');await pos.waitFor();assert.equal(await pos.locator('.pos-customer-display').count(),0);
  await qa.nav(es?'Ajustes del negocio':'Business settings');await select.waitFor();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no page overflow');
  if(width===390||width===1440)await panel.screenshot({path:`${output}/settings-${width}-${theme}-${lang}-${isWebKit?'webkit':'chromium'}.png`});
  console.log(`PASS business profile, module enablement, contrast, keyboard and layout ${width} ${theme} ${lang}`);await qa.context.close();
 }
 if(widths.length>1)assert(canvases.light.size>1&&canvases.dark.size>1,'business colors tint both themes');
 const qa=await setup(),{page}=qa;await page.setViewportSize({width:390,height:1000});await qa.open();await page.getByRole('button',{name:'EN',exact:true}).click();await qa.nav('Business settings');let panel=page.locator('.pos-operations-settings');await panel.getByRole('combobox').waitFor();
 for(const [profile,title,first] of [['restaurant','Menu','Products'],['barber','Services and products','Services'],['salon','Services and products','Services'],['retail','Catalog','Products'],['workshop','Services and products','Services'],['general','Catalog','Products'],['auto','Menu','Products']]){
  await panel.getByRole('combobox').selectOption(profile);const save=panel.getByRole('button',{name:'Save POS settings',exact:true});if(await save.isEnabled()){await save.click();await panel.getByRole('status').filter({hasText:'confirmed'}).waitFor()}
  await qa.nav('POS');await page.locator('.pos-workspace').waitFor();assert.equal(await page.locator('.pos-catalog-heading h3').innerText(),title);assert.equal(await page.locator('.pos-categories button').nth(1).innerText(),first);await qa.nav('Business settings');await panel.getByRole('combobox').waitFor();
 }
 await panel.getByRole('combobox').selectOption('workshop');page.once('dialog',dialog=>dialog.dismiss());await qa.nav('POS');assert(await panel.isVisible(),'unsaved configuration can cancel navigation');page.once('dialog',dialog=>dialog.accept());await qa.nav('POS');await page.locator('.pos-workspace').waitFor();assert.equal((await readPosOperations(qa.f.site.siteId,qa.f.store)).profile,'auto');
 qa.fail(true);await qa.nav('Business settings');await panel.getByRole('alert').filter({hasText:'Isolated settings disconnect'}).waitFor();qa.fail(false);await panel.getByRole('button',{name:'Retry',exact:true}).click();await panel.getByRole('combobox').waitFor();
 const a=await readPosOperations(qa.f.site.siteId,qa.f.store);await qa.settings(new Request(root+'/.netlify/functions/client-pos-settings',{method:'POST',headers:{Origin:root},body:JSON.stringify({siteId:qa.f.site.siteId,...a,profile:'retail'})}));await panel.getByRole('combobox').selectOption('workshop');await panel.getByRole('button',{name:'Save POS settings',exact:true}).click();await panel.getByRole('alert').filter({hasText:/changed/}).waitFor();page.once('dialog',dialog=>dialog.accept());await panel.getByRole('button',{name:'Reload settings',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.pos-profile-select select')?.value==='retail');
 qa.role('manager');await qa.open();await qa.nav('Business settings');await panel.getByRole('combobox').waitFor();assert.equal(await panel.getByRole('combobox').isDisabled(),false);
 qa.role('cashier');await qa.open();await page.locator('.ca-mobile-menu-toggle').click();assert.equal(await page.locator('.sidebar-container').getByRole('button',{name:'Business settings',exact:true}).count(),0);
 qa.role('owner');const pending=await readPosOperations(qa.f.site.siteId,qa.f.store);await qa.settings(new Request(root+'/.netlify/functions/client-pos-settings',{method:'POST',headers:{Origin:root},body:JSON.stringify({siteId:qa.f.site.siteId,...pending,cashierEnabled:false})}));await page.evaluate(()=>sessionStorage.setItem('wf-pos-active:kiosk-qa:fixture-owner',JSON.stringify({id:'attempt-fixture',kind:'direct'})));await qa.open();await qa.nav('POS');await page.getByRole('status').filter({hasText:'Cashier POS disabled'}).waitFor();assert(await page.locator('.pos-primary').isDisabled());await page.getByRole('button',{name:'Check server result',exact:true}).click();await page.getByRole('status').filter({hasText:'receipt-fixture'}).waitFor();assert.equal(qa.saleCalls(),0);const disabled=await readPosOperations(qa.f.site.siteId,qa.f.store);await qa.settings(new Request(root+'/.netlify/functions/client-pos-settings',{method:'POST',headers:{Origin:root},body:JSON.stringify({siteId:qa.f.site.siteId,...disabled,cashierEnabled:true})}));
 qa.role('owner');await qa.open();await qa.nav('Business settings');await panel.getByRole('combobox').waitFor();await panel.getByRole('combobox').selectOption('workshop');await panel.getByRole('button',{name:'Save POS settings',exact:true}).click();await panel.getByRole('status').filter({hasText:'confirmed'}).waitFor();
 const created=await (await qa.f.admin('configure',{enabled:true})).json();assert(created.enabled);const device=await (await qa.f.admin('create',{locationId:'branch'})).json();await qa.goto(new URL(device.pairUrl).pathname+new URL(device.pairUrl).hash);await page.getByRole('button',{name:'EN',exact:true}).click();await page.getByRole('button',{name:'Pair this kiosk',exact:true}).click();await page.locator('.kiosk-products').waitFor();assert.equal(await page.locator('.kiosk-categories button').nth(1).innerText(),'Services');assert.equal(await page.locator('.kiosk-categories button').nth(2).innerText(),'Parts and products');assert.equal(await page.locator('.kiosk-catalog-heading h2').innerText(),'Services and products');
 await qa.context.close();assert.deepEqual(errors,[]);console.log('PASS unsaved changes, error/retry, conflicting saves, manager/cashier permissions and kiosk/profile parity; zero real writes or payments');
}finally{await browser.close();await new Promise((resolve,reject)=>server.httpServer.close(error=>error?reject(error):resolve()))}
