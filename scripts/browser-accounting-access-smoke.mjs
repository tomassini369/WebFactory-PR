import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {preview} from 'vite';
import {chromium,webkit} from 'playwright';
import {kioskFixture} from './fixtures/kiosk-fixture.mjs';
import {selectPortalSection} from './qa-workspace-navigation.mjs';
import {authorizeSiteUser,membershipCapabilities} from '../netlify/lib/client-auth.mjs';
import {PORTAL_ROLES} from '../netlify/lib/financial-permissions.mjs';
import {financialOnly,financialPortalSite,financialMembershipView} from '../netlify/lib/financial-portal.mjs';
import {createAccountingAccessHandler} from '../netlify/functions/client-accounting-access.mjs';
import {financialAuditHistory} from '../netlify/lib/financial-audit.mjs';
import {createAccountingHandler} from '../netlify/functions/client-business-accounting.mjs';
import {createBusinessModulesHandler} from '../netlify/functions/client-business-modules.mjs';

const isWebKit=process.env.QA_ENGINE==='webkit',port=Number(process.env.QA_PORT||5310),server=await preview({preview:{host:'127.0.0.1',port,strictPort:true}}),root=process.env.QA_ORIGIN||`http://127.0.0.1:${port}`;
const executablePath=isWebKit?process.env.QA_WEBKIT_PATH:process.env.QA_CHROMIUM_PATH;
const browser=await(isWebKit?webkit:chromium).launch({...(executablePath?{executablePath}:{}),...(!isWebKit?{args:['--no-sandbox']}:{}),...(process.env.QA_ORIGIN&&process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
const widths=(process.env.QA_WIDTHS||'320,375,390,430,768,1024,1440').split(',').map(Number),output='/tmp/webfactory-accounting-access';await mkdir(output,{recursive:true});
const owner={id:'accounting-owner-qa',email:'owner@example.invalid',mfa:{required:false}},accountant={id:'accountant-qa',email:'accountant@example.invalid',mfa:{required:false}};
let site=kioskFixture(root).site;site.members=[{email:owner.email,role:'owner'}];site.revision=0;site.status='published';site.hours={};site.settings={locale:'en',timezone:'America/Puerto_Rico',currency:'usd'};site.googleCalendar={};site.features={};site.servicePlan={billingModel:'complimentary',subscriptionStatus:'complimentary'};site.business.name='Isolated Accounting QA';
const db=new Map(),etags=new Map();
const store={get:async key=>structuredClone(db.get(key)||null),getWithMetadata:async key=>db.has(key)?{data:structuredClone(db.get(key)),etag:String(etags.get(key)||1)}:null,list:async function*({prefix}){yield{blobs:[...db.keys()].filter(key=>key.startsWith(prefix)).map(key=>({key}))}},setJSON:async(key,value,options={})=>{if(options.onlyIfNew&&db.has(key)||options.onlyIfMatch&&options.onlyIfMatch!==String(etags.get(key)||1))return{modified:false};db.set(key,structuredClone(value));etags.set(key,(etags.get(key)||1)+1);return{modified:true}}};
const errors=[],messages=[];let writes=0,lastPage;
const seedPreferences=({lang,theme,origin})=>{if(window!==window.top||location.origin!==origin)return;localStorage.setItem('wf-lang',lang);localStorage.setItem('wf-theme',theme);localStorage.setItem('webfactory-theme-v2',theme)};
async function contextFor(user,width=390,lang='en',theme='light',malformed=false){
 const context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce',serviceWorkers:'block',...(isWebKit?{hasTouch:true}:{})}),page=await context.newPage();lastPage=page;page.setDefaultTimeout(18000);
 page.on('pageerror',error=>errors.push(error.message));
 await context.addInitScript(seedPreferences,{lang,theme,origin:new URL(root).origin});
 const authorize=async(id,roles=PORTAL_ROLES)=>{assert.equal(id,site.siteId);return authorizeSiteUser(user,structuredClone(site),roles)};
 const handlers={
  'client-accounting-access':createAccountingAccessHandler({authorize,currentUser:async()=>user,load:async()=>structuredClone(site),save:async next=>{assert.equal(next.revision,site.revision+1);site=structuredClone(next);writes++;return next},ensureIdentity:async()=>{},mailReady:()=>true,deliver:async message=>{messages.push(message)},history:siteId=>financialAuditHistory(store,siteId)}),
  'client-business-accounting':createAccountingHandler({authorize,getStore:()=>store}),
  'client-business-modules':createBusinessModulesHandler({authorize,getStore:()=>store}),
 };
 await context.route('**/.netlify/functions/**',async route=>{
  const req=route.request(),url=new URL(req.url()),name=url.pathname.split('/').at(-1);
  if(malformed&&['client-business-modules','client-accounting-access'].includes(name))return route.fulfill({json:{ok:true}});
  if(handlers[name]){const response=await handlers[name](new Request(req.url(),{method:req.method(),headers:req.headers(),...(req.method()==='POST'?{body:req.postData()}: {})}));return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});}
  assert(req.method()==='GET'||name==='portal-session',`Unexpected live operation ${name}`);
  let data={ok:true};
  if(name==='portal-session')data={ok:true,user};
  if(name==='client-admin'){
   const membership=site.members.find(member=>member.email===user.email);
   if(url.searchParams.has('siteId')){
    try{authorizeSiteUser(user,site,PORTAL_ROLES);data={ok:true,site:financialOnly(membership)?financialPortalSite(site,membership):site,membership:financialMembershipView(membership,membershipCapabilities(membership))};}catch{return route.fulfill({status:403,json:{ok:false,message:'Access revoked'}})}
   }else data={ok:true,user,sites:membership?[{siteId:site.siteId,slug:site.slug,businessName:site.business.name,status:'published'}]:[]};
  }
  if(name==='client-commerce-admin')data={ok:true,orders:[],bookings:[]};
  if(name==='client-workforce')data={ok:true,enabled:false,admin:true,paidBreaks:false,employees:[],locations:[],bindings:[],shifts:[],requests:[],events:[],serverNow:new Date().toISOString(),totals:{todayMinutes:0,weekMinutes:0}};
  return route.fulfill({json:data});
 });
 return{context,page};
}
try{
 let visualCases=0;
 for(const width of widths)for(const lang of ['en','es'])for(const theme of ['light','dark']){
  const f=await contextFor(owner,width,lang,theme);await f.page.goto(root+'/client-admin');await f.page.locator('.ca-dashboard').waitFor();
  await f.page.getByRole('button',{name:lang==='es'?'ES':'EN',exact:true}).first().click();
  await f.page.evaluate(theme=>document.documentElement.setAttribute('data-wf-theme',theme),theme);
  // Use the rendered locale, including browsers whose stored language key differs.
  const es=await f.page.getByRole('button',{name:'ES',exact:true}).first().getAttribute('class').then(value=>value?.includes('active'));
  await selectPortalSection(f.page,es?'Ajustes del negocio':'Business settings');
  const panel=f.page.locator('.wf-financial-access').filter({has:f.page.getByRole('heading',{name:/^(Accounting Access|Acceso contable)$/})});await panel.waitFor();
  await panel.getByRole('textbox',{name:'Email',exact:true}).waitFor();
  assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`overflow ${width}/${lang}/${theme}`);
  const small=await panel.locator('button,input:not([type=checkbox]),select').evaluateAll(elements=>elements.filter(element=>{const box=element.getBoundingClientRect();return box.width&&box.height&&box.height<43}).map(element=>element.tagName));assert.deepEqual(small,[]);
  if(width===390){await panel.scrollIntoViewIfNeeded();await f.page.screenshot({path:`${output}/${isWebKit?'webkit':'chromium'}-${lang}-${theme}.png`,fullPage:true});}
  await f.context.close();visualCases++;
 }
 const own=await contextFor(owner);await own.page.goto(root+'/client-admin');await own.page.locator('.ca-dashboard').waitFor();await selectPortalSection(own.page,'Business settings');
 const panel=own.page.locator('.wf-financial-access').filter({has:own.page.getByRole('heading',{name:'Accounting Access',exact:true})});
 const modules=own.page.locator('.wf-financial-access').filter({has:own.page.getByRole('heading',{name:'Team modules',exact:true})});
 const attendanceToggle=modules.getByRole('checkbox',{name:'Attendance / Clock-in-out',exact:true});await attendanceToggle.click();await modules.getByText('Modules saved.',{exact:false}).waitFor();assert.equal(await attendanceToggle.isChecked(),true);assert.equal(db.get(site.siteId+'/workforce/state.json').enabled,true);await attendanceToggle.click();await modules.getByText('Modules saved.',{exact:false}).waitFor();assert.equal(await attendanceToggle.isChecked(),false);assert.equal(db.get(site.siteId+'/workforce/state.json').enabled,false);assert.equal(await modules.getByRole('checkbox',{name:'Frappe HR payroll',exact:true}).isDisabled(),true);
 await panel.getByRole('textbox',{name:'Email',exact:true}).fill(accountant.email);await panel.getByRole('button',{name:'Send invitation',exact:true}).click();await panel.getByText('Invitation sent.',{exact:false}).waitFor();
 assert.equal(site.members.length,1);assert.equal(messages.length,1);const link=messages[0].text.match(/https?:\/\/[^\s]+#accountingSite=[^\s]+/)[0];
 const acc=await contextFor(accountant);await acc.page.goto(link);await acc.page.getByRole('button',{name:'Accept permissions',exact:true}).waitFor();assert.equal(new URL(acc.page.url()).hash,'');await acc.page.getByRole('button',{name:'Accept permissions',exact:true}).click();await acc.page.locator('.wf-accounting').waitFor();
 const readOnly=acc.page.locator('.wf-accounting');await readOnly.getByRole('button',{name:'Refresh',exact:true}).waitFor();assert.equal(await readOnly.locator('form').count(),0);assert.equal(await readOnly.getByRole('button',{name:/Download accounting/,includeHidden:true}).isVisible(),false);
 const denial=await acc.page.evaluate(async siteId=>{const response=await fetch('/.netlify/functions/client-business-accounting',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({siteId,type:'expense',id:'forbidden-123',revision:0,date:'2026-10-20',category:'operations',description:'Blocked',amountCents:100,quantity:0})});return response.status},site.siteId);assert.equal(denial,403);
 await own.page.reload();await own.page.locator('.ca-dashboard').waitFor();await selectPortalSection(own.page,'Business settings');own.page.once('dialog',dialog=>dialog.accept());await own.page.getByRole('button',{name:'Revoke',exact:true}).click();await own.page.getByText('Permissions updated.',{exact:true}).waitFor();
 const revoked=await acc.page.evaluate(async siteId=>(await fetch('/.netlify/functions/client-business-accounting?'+new URLSearchParams({siteId,from:'2026-10-01',to:'2026-10-30'}))).status,site.siteId);assert.equal(revoked,403);
 await acc.context.close();await own.context.close();
 const broken=await contextFor(owner,390,'en','light',true);await broken.page.goto(root+'/client-admin');await broken.page.locator('.ca-dashboard').waitFor();await selectPortalSection(broken.page,'Business settings');await broken.page.getByRole('button',{name:'Retry modules',exact:true}).waitFor();await broken.page.getByText('Accounting permissions could not be verified. Retry.',{exact:true}).waitFor();await broken.page.locator('.kiosk-settings').waitFor();await broken.context.close();
 // Preview tooling injects sandboxed frames with opaque origins. Reproduce one
 // without the app or Playwright's service-worker-blocking init script.
 const frameContext=await browser.newContext();const framePage=await frameContext.newPage();framePage.on('pageerror',error=>errors.push(error.message));
 await frameContext.addInitScript(seedPreferences,{lang:'en',theme:'light',origin:new URL(root).origin});
 await frameContext.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated frame fixture</title>'}));
 await framePage.goto(root+'/__accounting-qa-frame');assert.equal(await framePage.evaluate(()=>localStorage.getItem('wf-lang')),'en');
 await framePage.evaluate(()=>new Promise(resolve=>{const frame=document.createElement('iframe');frame.setAttribute('sandbox','allow-scripts');frame.srcdoc='<p>Isolated preview frame</p>';frame.onload=()=>resolve();document.body.append(frame)}));
 assert.equal(await framePage.frames()[1].evaluate(()=>{try{localStorage.getItem('wf-lang');return false}catch{return true}}),true);
 await frameContext.close();assert.deepEqual(errors,[]);assert.equal(writes,3);
 console.log(JSON.stringify({engine:isWebKit?'webkit':'chromium',visualCases,functional:['invite','review','accept','read-only API denial','revocation with existing session','independent module enable/disable','malformed financial responses preserve kiosk settings'],realEmails:0,realFinancialTransactions:0,errors}));
}catch(error){console.error('Browser errors:',errors);if(lastPage&&!lastPage.isClosed()){await writeFile(output+'/failure.html',await lastPage.content());console.error((await lastPage.locator('body').innerText()).slice(0,3000));await lastPage.screenshot({path:output+'/failure.png',fullPage:true})}throw error;}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
