import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {preview,createServer} from 'vite'
import sharp from 'sharp'
import {chromium,webkit} from 'playwright'
import {createPortalProfileHandler} from '../netlify/functions/portal-profile.mjs'
import {createDashboardAppearanceHandler} from '../netlify/functions/dashboard-appearance.mjs'
import {siteRoleCapabilities} from '../netlify/lib/client-auth.mjs'
import {selectPortalSection} from './qa-workspace-navigation.mjs'
const port=Number(process.env.QA_PORT||5356),origin=process.env.QA_ORIGIN||`http://127.0.0.1:${port}`
const server=process.env.QA_DEV==='1'?await createServer({server:{host:'127.0.0.1',port,strictPort:true}}):await preview({preview:{host:'127.0.0.1',port,strictPort:true}});if(process.env.QA_DEV==='1')await server.listen()
const isWebKit=process.env.QA_ENGINE==='webkit';const browser=await (isWebKit?webkit:chromium).launch(isWebKit?(process.env.QA_WEBKIT_PATH?{executablePath:process.env.QA_WEBKIT_PATH}:{}):{...(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']})
const output='/tmp/portal-profile-qa';await mkdir(output,{recursive:true})
const user={id:'glassy-user',email:'glassy@example.invalid',user_metadata:{},app_metadata:{roles:['admin']},mfa:{required:false}}
const site={siteId:'glassy-site',slug:'glassy-site',status:'published',revision:1,business:{name:'Glassy fixture · QA',category:'Barber',email:'fixture@example.invalid'},design:{primary:'#0B1529',secondary:'#3C86F6',style:'Modern'},catalog:[],employees:[],hours:{},members:[],settings:{locale:'en',timezone:'America/Puerto_Rico',currency:'USD'},paymentRules:{},googleCalendar:{},features:{},servicePlan:{code:'complimentary',billingModel:'complimentary'}}
const admin={generatedAt:new Date().toISOString(),administrator:{name:'Isolated admin QA',email:user.email},summary:{clients:0,publishedSites:0,connectedStripe:0,blockers:0},capacity:{level:'healthy',safeClientCapacity:20,activeClients:0,estimatedOpenings:20,utilizationPercent:0,model:'Isolated fixture'},integrations:{configured:0,total:0,configuration:[]},operations:{transactionStatuses:{},pendingTransactions:[],stripeWebhookEvents:0,clientWebhookEvents:0},clients:[],subscriptionBilling:{missing:[],ready:false},resources:{netlify:{plan:'QA',utilizationPercent:null,dashboardUrl:'/',source:'Fixture'},storage:{},runtime:{}}}
let role='owner';const records=new Map(),versions=new Map();const storage={get:async k=>structuredClone(records.get(k)||null),getWithMetadata:async k=>records.has(k)?{data:structuredClone(records.get(k)),etag:String(versions.get(k))}:null,getMetadata:async k=>records.has(k)?{etag:String(versions.get(k))}:null,setJSON:async(k,v,o)=>{if(o.onlyIfNew&&records.has(k)||o.onlyIfMatch&&o.onlyIfMatch!==String(versions.get(k)))return {modified:false};records.set(k,structuredClone(v));versions.set(k,(versions.get(k)||0)+1);return {modified:true}}}
const appearance=createDashboardAppearanceHandler({store:()=>storage,siteAccess:async()=>({user}),platformAccess:async()=>user})
const profileHandler=createPortalProfileHandler({store:()=>storage,siteAccess:async()=>({user}),platformAccess:async()=>user})
async function intercept(page){await page.route('**/.netlify/functions/**',async route=>{const req=route.request(),url=new URL(req.url()),name=url.pathname.split('/').at(-1)
 if(['dashboard-appearance','portal-profile'].includes(name)){
  const response=await (name==='portal-profile'?profileHandler:appearance)(new Request(req.url(),{method:req.method(),headers:await req.allHeaders(),...(!['GET','HEAD'].includes(req.method())?{body:req.postDataBuffer()}: {})}));return route.fulfill({status:response.status,headers:{...Object.fromEntries(response.headers),etag:'W/"cdn-rewritten-validator"'},body:Buffer.from(await response.arrayBuffer())})
 }
 if(name==='client-customer-display')return route.fulfill({json:{ok:true,paired:false,sequence:0}});
 if(req.method()!=='GET'&&name!=='portal-session')throw Error('Unexpected operational mutation '+name)
 let data={ok:true,records:[],customers:[],receipts:[],movements:[],adjustments:[],analytics:{},offers:[],campaigns:[],claims:[],cases:[],reviews:[]}
 if(name==='portal-session')data={ok:true,user}
 if(name==='client-admin')data=url.searchParams.has('siteId')?{ok:true,site,membership:{role,capabilities:siteRoleCapabilities(role)},posOperations:{cashierEnabled:true,displayEnabled:true,profile:'auto',revision:0}}:{ok:true,sites:[{siteId:site.siteId,slug:site.slug,businessName:site.business.name,status:'published'}]}
 if(name==='client-commerce-admin')data={ok:true,orders:[{transactionId:'qa-paid',kind:'order',amountTotal:5500,paymentStatus:'paid',status:'confirmed',createdAt:new Date().toISOString(),customer:{name:'Isolated fixture'}}],bookings:[]}
 if(name==='webfactory-admin-overview')data={ok:true,...admin}
 if(name==='webfactory-admin-revenue')data={ok:true,revenue:{available:false,reason:'temporarily_unavailable'}}
 if(name==='client-inventory-health')data={ok:true,checkedAt:new Date().toISOString(),heldCount:0,reviewCount:0,hiddenReviewCount:0,reservations:[],journal:{operationCount:0,reservationCount:0,bytes:0,nearCapacity:false,atCapacity:false},pos:{pointerCount:0,cleanupEligibleCount:0,reviewCount:0,hiddenCount:0,rows:[]}}
 return route.fulfill({json:data})
})}
const noOverflow=async(page)=>{const info=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1&&e.getBoundingClientRect().width>0).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width}))}));if(info.scroll>info.width+1){console.error('OVERFLOW',JSON.stringify(info));await page.screenshot({path:output+'/overflow.png',fullPage:true})}assert(info.scroll<=info.width+1,'No page overflow')}

const photo=await sharp({create:{width:800,height:600,channels:3,background:'#216e8c'}}).png().toBuffer();
const section=async(page,es,name)=>page.locator('.gd-profile-sections').getByRole('button',{name,exact:true}).click();
const openProfile=async(page,es)=>{if(await page.locator('.gd-account').isVisible())await page.locator('.gd-account').click();else await selectPortalSection(page,es?'Mi perfil':'My profile')};
const profileWrite=(page,method)=>page.waitForResponse(r=>r.url().includes('/portal-profile')&&r.request().method()===method);
try{
 for(const width of (process.env.QA_WIDTHS||'320,375,390,430,768,1024,1440').split(',').map(Number))for(const theme of ['light','dark'])for(const lang of ['es','en']){
  user.id=`profile-${width}-${theme}-${lang}`;records.clear();versions.clear();role='owner';
  const es=lang==='es',context=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(({lang,theme})=>{localStorage.setItem('webfactory-language',lang);localStorage.setItem('webfactory-theme-v2',theme)},{lang,theme});await intercept(page);
  for(const path of ['/client-admin','/webfactory-admin']){
   await page.goto(origin+path);await page.locator('.gd-root').waitFor();await openProfile(page,es);await page.locator('.gd-profile-editor input[type=file]').waitFor();await page.waitForFunction(()=>!document.querySelector('.gd-profile-editor fieldset').disabled);
   const name=page.getByRole('textbox',{name:es?'Nombre':'Name',exact:true});await name.fill('Personal QA');await page.getByRole('textbox',{name:es?'Teléfono personal':'Personal phone',exact:true}).fill('787-555-0101');let write=profileWrite(page,'PUT');await page.getByRole('button',{name:es?'Guardar perfil':'Save profile',exact:true}).click();assert.equal((await write).status(),200);
   write=profileWrite(page,'POST');await page.locator('.gd-profile-editor input[type=file]').setInputFiles({name:'photo.png',mimeType:'image/png',buffer:photo});assert.equal((await write).status(),200);await page.locator('.gd-account img').waitFor({state:'attached'});assert(await page.locator('.gd-account img').evaluate(i=>i.complete&&i.naturalWidth>0));
   await page.reload();await page.locator('.gd-account img').waitFor({state:'attached'});
   if(path==='/client-admin'){await page.locator('.gd-profile-photo-button img').waitFor();await page.locator('.gd-profile-photo-button').click()}else await openProfile(page,es);await page.waitForFunction(()=>!document.querySelector('.gd-profile-editor fieldset').disabled);assert.equal(await name.inputValue(),'Personal QA');assert(await page.getByRole('textbox',{name:es?'Correo de acceso':'Sign-in email',exact:true}).getAttribute('readonly')!==null);
   await noOverflow(page);if(width===390)await page.screenshot({path:output+'/'+path.slice(1)+'-'+theme+'-'+lang+'.png',fullPage:true});
   await section(page,es,es?'Mi acceso':'My access');assert.equal(await page.locator('.gd-personal-profile select').count(),0);assert.match(await page.locator('.gd-personal-profile').innerText(),path==='/client-admin'?/Dueño|Owner/:/Administración de plataforma|Platform administration/);
   await section(page,es,es?'Seguridad':'Security');await page.locator('#password-security-title').waitFor();assert.equal(await page.locator('#password-security-title').count(),1);
   await section(page,es,es?'Preferencias':'Preferences');await page.locator('.gd-appearance').waitFor();assert.equal(await page.locator('.gd-appearance').count(),1);assert.equal(await page.getByRole('combobox',{name:es?'Idioma':'Language',exact:true}).inputValue(),lang);assert.equal(await page.getByRole('combobox',{name:es?'Tema':'Theme',exact:true}).inputValue(),theme);
   await section(page,es,es?'Datos personales':'Personal details');write=profileWrite(page,'DELETE');await page.getByRole('button',{name:es?'Eliminar foto':'Remove photo',exact:true}).click();assert.equal((await write).status(),200);await page.waitForFunction(()=>!document.querySelector('.gd-account img'));assert.equal(await name.inputValue(),'Personal QA');
  }
  assert.deepEqual(errors,[]);await context.close();console.log(`PASS personal profile upload/reload/remove, own access, canonical preferences/security ${width} ${theme} ${lang}`);
 }
 user.id='profile-errors';records.clear();versions.clear();role='employee';
 const context=await browser.newContext({viewport:{width:390,height:850},serviceWorkers:'block'}),page=await context.newPage();await page.addInitScript(()=>localStorage.setItem('webfactory-language','es'));await intercept(page);
 await page.goto(origin+'/client-admin');await openProfile(page,true);await page.waitForFunction(()=>!document.querySelector('.gd-profile-editor fieldset').disabled);
 const name=page.getByRole('textbox',{name:'Nombre',exact:true});await name.fill('Empleado personal');let write=profileWrite(page,'PUT');await page.getByRole('button',{name:'Guardar perfil',exact:true}).click();assert.equal((await write).status(),200);
 await section(page,true,'Mi acceso');assert.match(await page.locator('.gd-personal-profile').innerText(),/Empleado/);await section(page,true,'Preferencias');
 write=profileWrite(page,'PUT');await page.getByRole('combobox',{name:'Idioma',exact:true}).selectOption('en');assert.equal((await write).status(),200);
 write=profileWrite(page,'PUT');await page.locator('.portal-language').getByRole('button',{name:'ES',exact:true}).click();assert.equal((await write).status(),200);
 const nextTheme=await page.getByRole('combobox',{name:'Tema',exact:true}).inputValue()==='dark'?'light':'dark';write=profileWrite(page,'PUT');await page.getByRole('combobox',{name:'Tema',exact:true}).selectOption(nextTheme);assert.equal((await write).status(),200);
 await page.reload();await openProfile(page,true);await section(page,true,'Preferencias');assert.equal(await page.getByRole('combobox',{name:'Idioma',exact:true}).inputValue(),'es');assert.equal(await page.getByRole('combobox',{name:'Tema',exact:true}).inputValue(),nextTheme);await section(page,true,'Datos personales');
 const second=await context.newPage();await intercept(second);await second.goto(origin+'/client-admin');await openProfile(second,true);await second.waitForFunction(()=>!document.querySelector('.gd-profile-editor fieldset').disabled);
 await name.fill('Nombre actualizado');write=profileWrite(page,'PUT');await page.getByRole('button',{name:'Guardar perfil',exact:true}).click();assert.equal((await write).status(),200);
 await second.getByRole('textbox',{name:'Nombre',exact:true}).fill('Nombre obsoleto');write=profileWrite(second,'PUT');await second.getByRole('button',{name:'Guardar perfil',exact:true}).click();assert.equal((await write).status(),409);assert.equal(await second.getByRole('textbox',{name:'Nombre',exact:true}).inputValue(),'Nombre obsoleto');second.once('dialog',d=>d.accept());await second.getByRole('button',{name:'Recargar perfil',exact:true}).click();await second.waitForFunction(()=>document.querySelector('.gd-profile-editor input[autocomplete=name]').value==='Nombre actualizado');await second.close();
 await page.route('**/.netlify/functions/portal-profile*',async route=>route.request().method()==='PUT'?route.fulfill({status:503,json:{ok:false}}):route.fallback(),{times:1});await name.fill('Borrador conservado');write=profileWrite(page,'PUT');await page.getByRole('button',{name:'Guardar perfil',exact:true}).click();assert.equal((await write).status(),503);assert.equal(await name.inputValue(),'Borrador conservado');
 write=profileWrite(page,'PUT');await page.getByRole('button',{name:'Guardar perfil',exact:true}).click();assert.equal((await write).status(),200);
 await context.close();console.log('PASS employee own profile, header preference sync, reload, stale tab protection and failed-save retry');
 console.log('PASS profile fixture mutations only; no real identity, business or payment writes');
}finally{await browser.close();await server.close()}
