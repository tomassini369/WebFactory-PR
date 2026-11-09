import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {preview} from 'vite';
import {chromium,webkit} from 'playwright';
import {selectPortalSection} from './qa-workspace-navigation.mjs';
import {normalizeClientSection} from '../netlify/functions/client-admin.mjs';
import {BUSINESS_WEEK} from '../shared/business-hours.mjs';
const engine=process.env.QA_ENGINE==='webkit'?'webkit':'chromium',port=Number(process.env.QA_PORT||5460);
const server=process.env.QA_ORIGIN?null:await preview({preview:{host:'127.0.0.1',port,strictPort:true}}),origin=process.env.QA_ORIGIN||`http://127.0.0.1:${port}`;
const browser=await(engine==='webkit'?webkit:chromium).launch({...engine==='webkit'?(process.env.QA_WEBKIT_PATH?{executablePath:process.env.QA_WEBKIT_PATH}:{}):{...(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH}:{}),args:['--no-sandbox']},...(process.env.QA_ORIGIN&&process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
const out='/tmp/webfactory-platform-audit-fixes';await mkdir(out,{recursive:true});
const makeSite=hours=>({siteId:'audit-fixture',slug:'audit-fixture',revision:1,status:'active',business:{name:'Isolated audit fixture',category:'Barber',locations:[]},design:{primary:'#0b1529',secondary:'#285fa6'},catalog:[],employees:[],members:[],hours,settings:{timezone:'America/Puerto_Rico',locale:'en'},paymentRules:{},googleCalendar:{},features:{},servicePlan:{subscriptionStatus:'active',billingModel:'complimentary'}});
async function fixtures(page,state,lang){
 await page.route('**/.netlify/functions/**',async route=>{
  const req=route.request(),url=new URL(req.url()),name=url.pathname.split('/').at(-1);let data={ok:true,records:[],orders:[],bookings:[],customers:[]},status=200;
  if(name==='portal-session'){if(req.method()==='POST')assert.equal(req.postDataJSON().action,'refresh');data={ok:true,user:{id:'audit-owner',email:'audit@example.invalid',mfa:{required:false}}}}
  else if(name==='client-admin'){
   if(req.method()==='PATCH'){
    const input=req.postDataJSON();assert.equal(input.section,'hours');assert.equal(input.siteId,state.site.siteId);assert.equal(input.revision,state.site.revision);
    const hours=normalizeClientSection(state.site,'hours',input.value,{id:'audit-owner'},{role:'owner'});state.saved.push(structuredClone(hours));state.site={...state.site,hours,revision:state.site.revision+1};data={ok:true,site:state.site};
   }else{
    assert.equal(req.method(),'GET');const detail=url.searchParams.has('siteId');if(detail)state.detailReads++;else state.listReads++;
    if(state.failure===(detail?'detail':'list')){status=503;data={ok:false,message:detail?'Synthetic detail outage':'Synthetic list outage'}}
    else if(!detail&&state.failure==='malformed')data={ok:true,sites:null};
    else data=detail?{ok:true,site:state.site,membership:{role:'owner'},posOperations:{cashierEnabled:true,displayEnabled:false,profile:'auto',revision:0}}:{ok:true,sites:state.empty?[]:[{siteId:state.site.siteId,slug:state.site.slug,businessName:state.site.business.name,status:state.site.status}]};
   }
  }else if(name==='dashboard-appearance'){assert.equal(req.method(),'GET');data={ok:true,prefs:{},hasCustom:false}}
  else if(name==='portal-profile'){assert.equal(req.method(),'GET');data={ok:true,profile:{name:'',phone:'',theme:null,language:lang},hasPhoto:false,revision:0,version:'isolated-audit'}}
  else assert.equal(req.method(),'GET','Only an explicitly requested fixture hours save is allowed');
  await route.fulfill({status,json:data});
 });
}
try{
 for(const width of (process.env.QA_WIDTHS||'320,375,390,430,768,1024,1440').split(',').map(Number))for(const theme of (process.env.QA_THEMES||'light,dark').split(','))for(const lang of (process.env.QA_LANGS||'es,en').split(',')){
  const context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await context.addInitScript(({theme,lang})=>{if(window.top===window){localStorage.setItem('webfactory-theme-v2',theme);localStorage.setItem('webfactory-language',lang)}},{theme,lang});
  const previous={enabled:true,open:'09:00',close:'17:00',breaks:[{start:'12:00',end:'13:00'}]};
  const state={site:makeSite(lang==='en'?{Monday:previous}:{}),failure:width===375?'malformed':'list',listReads:0,detailReads:0,saved:[],empty:false};await fixtures(page,state,lang);
  try{
   await page.goto(origin+'/client-admin');const retry=page.getByRole('button',{name:lang==='es'?'Reintentar':'Try again',exact:true});await retry.waitFor();
   assert.equal(await page.getByText(lang==='es'?'No hay negocios asignados.':'No businesses are assigned.',{exact:true}).count(),0);assert.equal(await page.locator('.ca-empty a[href="/builder"]').count(),0);assert(await page.getByRole('alert').isVisible());assert.equal(state.listReads,1,'No automatic access retry');
   const bounds=await retry.boundingBox();assert(bounds.width>=44&&bounds.height>=44,'Retry remains a touch target');
   state.failure='detail';await retry.focus();await page.keyboard.press('Enter');await page.getByRole('alert').filter({hasText:'Synthetic detail outage'}).waitFor();assert.equal(state.listReads,2);assert.equal(state.detailReads,1);
   state.failure='';await retry.click();await page.locator('.gd-client-dashboard').waitFor();await selectPortalSection(page,lang==='es'?'Editar página':'Edit website');
   const hours=page.locator('.ca-hours');assert.equal(await hours.locator(':scope>article').count(),7);assert.equal(await hours.locator('input[type=time]').count(),14);assert.equal(state.saved.length,0,'Rendering defaults cannot save business data');
   for(const day of BUSINESS_WEEK){const label=lang==='es'?day.es:day.en;assert.equal(await page.getByLabel(`${label} ${lang==='es'?'apertura':'open'}`,{exact:true}).count(),1);assert.equal(await page.getByLabel(`${label} ${lang==='es'?'cierre':'close'}`,{exact:true}).count(),1)}
   if(lang==='en')assert.equal(await page.getByLabel('Monday open',{exact:true}).inputValue(),'09:00');
   const tuesday=hours.locator(':scope>article').nth(1);assert.equal(await tuesday.getByRole('checkbox').isChecked(),false);await tuesday.getByRole('checkbox').check();
   await page.getByLabel(lang==='es'?'Martes apertura':'Tuesday open',{exact:true}).fill('10:00');await page.getByLabel(lang==='es'?'Martes cierre':'Tuesday close',{exact:true}).fill('12:00');
   const panel=page.locator('.ca-panel').filter({has:hours});await panel.getByRole('button',{name:lang==='es'?'Guardar cambios':'Save changes',exact:true}).click();await page.getByRole('status').filter({hasText:lang==='es'?'Cambios publicados':'Changes published'}).waitFor();
   assert.equal(state.saved.length,1);assert.equal(Object.keys(state.saved[0]).length,7);assert.deepEqual(state.saved[0].Martes,{enabled:true,open:'10:00',close:'12:00',breaks:[]});
   if(lang==='en'){assert.deepEqual(state.saved[0].Monday,previous);assert.equal(state.saved[0].Lunes,undefined)}
   await page.reload();await page.locator('.gd-client-dashboard').waitFor();await selectPortalSection(page,lang==='es'?'Editar página':'Edit website');assert.equal(await page.getByLabel(lang==='es'?'Martes apertura':'Tuesday open',{exact:true}).inputValue(),'10:00');assert.equal(await page.locator('.ca-hours>article').count(),7);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow');assert.deepEqual(errors,[]);
   if(width===390&&lang==='es')await page.screenshot({path:`${out}/${engine}-${theme}.png`,fullPage:true});
   console.log('PASS access errors/retry, seven-day hours, labels, explicit save and reload',engine,width,theme,lang);
  }catch(error){await page.screenshot({path:`${out}/failure-${engine}.png`,fullPage:true});throw error}finally{await context.close()}
 }
 const context=await browser.newContext({viewport:{width:390,height:900},serviceWorkers:'block'}),page=await context.newPage();await context.addInitScript(()=>localStorage.setItem('webfactory-language','en'));
 const state={site:makeSite({}),failure:'',listReads:0,detailReads:0,saved:[],empty:true};await fixtures(page,state,'en');await page.goto(origin+'/client-admin');await page.getByText('No businesses are assigned.',{exact:true}).waitFor();assert(await page.getByRole('link',{name:'Open Builder',exact:true}).isVisible());assert.equal(await page.getByRole('alert').count(),0);assert.equal(state.detailReads,0);await context.close();console.log('PASS genuinely empty business list remains distinct from failed access',engine);
}finally{await browser.close();await server?.close()}
