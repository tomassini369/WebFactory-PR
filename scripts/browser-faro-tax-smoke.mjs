import {kioskFixture} from './fixtures/kiosk-fixture.mjs'
import {previewBarberData} from './seed-preview-barber.mjs'
import {renderBusinessQr} from '../netlify/lib/business-qr-image.mjs'
import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {preview,createServer} from 'vite'
import sharp from 'sharp'
import {chromium,webkit} from 'playwright'
import {createDashboardAppearanceHandler} from '../netlify/functions/dashboard-appearance.mjs'
import {siteRoleCapabilities} from '../netlify/lib/client-auth.mjs'
import {selectPortalSection} from './qa-workspace-navigation.mjs'
const port=Number(process.env.QA_PORT||5343),origin=process.env.QA_ORIGIN||`http://127.0.0.1:${port}`
const server=process.env.QA_DEV==='1'?await createServer({server:{host:'127.0.0.1',port,strictPort:true}}):await preview({preview:{host:'127.0.0.1',port,strictPort:true}});if(process.env.QA_DEV==='1')await server.listen()
const isWebKit=process.env.QA_ENGINE==='webkit';const browser=await (isWebKit?webkit:chromium).launch(isWebKit?(process.env.QA_WEBKIT_PATH?{executablePath:process.env.QA_WEBKIT_PATH}:{}):{...(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']})
const output='/tmp/glassy-dashboard-qa';await mkdir(output,{recursive:true})
const user={id:'glassy-user',email:'glassy@example.invalid',user_metadata:{},app_metadata:{roles:['admin']},mfa:{required:false}}
const {site}=await previewBarberData('fixture-owner@example.test','acct_fixture')
const admin={generatedAt:new Date().toISOString(),administrator:{name:'Isolated admin QA',email:user.email},summary:{clients:0,publishedSites:0,connectedStripe:0,blockers:0},capacity:{level:'healthy',safeClientCapacity:20,activeClients:0,estimatedOpenings:20,utilizationPercent:0,model:'Isolated fixture'},integrations:{configured:0,total:0,configuration:[]},operations:{transactionStatuses:{},pendingTransactions:[],stripeWebhookEvents:0,clientWebhookEvents:0},clients:[],subscriptionBilling:{missing:[],ready:false},resources:{netlify:{plan:'QA',utilizationPercent:null,dashboardUrl:'/',source:'Fixture'},storage:{},runtime:{}}}
let role='owner';const records=new Map(),versions=new Map();const storage={get:async k=>structuredClone(records.get(k)||null),getWithMetadata:async k=>records.has(k)?{data:structuredClone(records.get(k)),etag:String(versions.get(k))}:null,getMetadata:async k=>records.has(k)?{etag:String(versions.get(k))}:null,setJSON:async(k,v,o)=>{if(o.onlyIfNew&&records.has(k)||o.onlyIfMatch&&o.onlyIfMatch!==String(versions.get(k)))return {modified:false};records.set(k,structuredClone(v));versions.set(k,(versions.get(k)||0)+1);return {modified:true}}}
const appearance=createDashboardAppearanceHandler({store:()=>storage,siteAccess:async()=>({user}),platformAccess:async()=>user})
async function intercept(page){await page.route('**/.netlify/functions/**',async route=>{const req=route.request(),url=new URL(req.url()),name=url.pathname.split('/').at(-1)
 if(name==='dashboard-appearance'){
  const response=await appearance(new Request(req.url(),{method:req.method(),headers:await req.allHeaders(),...(!['GET','HEAD'].includes(req.method())?{body:req.postDataBuffer()}: {})}));return route.fulfill({status:response.status,headers:{...Object.fromEntries(response.headers),etag:'W/"cdn-rewritten-validator"'},body:Buffer.from(await response.arrayBuffer())})
 }
 if(name==='client-stripe-status')return route.fulfill({json:{ok:true,configured:true,webhookConfigured:true,connected:true,capabilityStatus:'active'}});
 if(name==='client-customer-display')return route.fulfill({json:{ok:true,paired:false,sequence:0}});
 if(name==='business-qr')return route.fulfill({contentType:'image/png',body:await renderBusinessQr({target:origin+'/sites/'+site.slug})});
 if(name==='client-admin'&&req.method()==='PATCH'){const body=req.postDataJSON();assert(['taxConfig','catalog'].includes(body.section));site[body.section]=body.value;site.revision++;return route.fulfill({json:{ok:true,site}})}
 if(req.method()!=='GET'&&name!=='portal-session')throw Error('Unexpected operational mutation '+name)
 let data={ok:true,records:[],customers:[],receipts:[],movements:[],adjustments:[],analytics:{},offers:[],campaigns:[],claims:[],cases:[],reviews:[]}
 if(name==='portal-session')data={ok:true,user}
 if(name==='client-admin')data=url.searchParams.has('siteId')?{ok:true,site,membership:{role,capabilities:siteRoleCapabilities(role)},posOperations:{cashierEnabled:true,displayEnabled:true,profile:'auto',revision:0}}:{ok:true,sites:[{siteId:site.siteId,slug:site.slug,businessName:site.business.name,status:'published'}]}
 if(name==='client-v3-admin'&&url.searchParams.get('collection')==='customers')data={ok:true,records:[{customerId:'qa-customer',name:'Isolated customer QA',email:'fixture@example.invalid',totalSpent:5500,orderCount:1,bookingCount:0}]};
 if(name==='client-commerce-admin')data={ok:true,orders:[{transactionId:'qa-paid',kind:'order',amountTotal:5500,paymentStatus:'paid',status:'confirmed',createdAt:new Date().toISOString(),customer:{name:'Isolated fixture'}}],bookings:[]}
 if(name==='webfactory-admin-overview')data={ok:true,...admin}
 if(name==='webfactory-admin-revenue')data={ok:true,revenue:{available:false,reason:'temporarily_unavailable'}}
 if(name==='client-inventory-health')data={ok:true,checkedAt:new Date().toISOString(),heldCount:0,reviewCount:0,hiddenReviewCount:0,reservations:[],journal:{operationCount:0,reservationCount:0,bytes:0,nearCapacity:false,atCapacity:false},pos:{pointerCount:0,cleanupEligibleCount:0,reviewCount:0,hiddenCount:0,rows:[]}}
 return route.fulfill({json:data})
})}
const noOverflow=async(page)=>{const info=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1&&e.getBoundingClientRect().width>0).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width}))}));if(info.scroll>info.width+1){console.error('OVERFLOW',JSON.stringify(info));await page.screenshot({path:output+'/overflow.png',fullPage:true})}assert(info.scroll<=info.width+1,'No page overflow')}

try {
for(const width of (process.env.QA_WIDTHS||'320,375,390,430,768,1024,1440').split(',').map(Number))for(const theme of ['light','dark'])for(const lang of ['es','en']){
 Object.assign(site,(await previewBarberData('fixture-owner@example.test','acct_fixture')).site);
 const context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce'}),page=await context.newPage();await page.addInitScript(t=>localStorage.setItem('webfactory-theme-v2',t),theme);await intercept(page);await page.goto(origin+'/client-admin');await page.locator('.gd-content').waitFor();await page.locator('.portal-language').getByRole('button',{name:lang.toUpperCase(),exact:true}).click();
 const section=(es,en)=>selectPortalSection(page,lang==='es'?es:en);
 await section('POS','POS');
 for(const id of ['corte-clasico-walk-in','corte-barba-walk-in','barba-walk-in','ritual-toalla-walk-in']){const item=site.catalog.find(x=>x.id===id);await page.locator('.pos-product').filter({hasText:lang==='es'?item.nameEs:item.nameEn}).click()}
 assert.match(await page.locator('.pos-totals').innerText(),/13[.,]82/);assert.match(await page.locator('.pos-grand-total').innerText(),/133[.,]82/);await noOverflow(page);if(width===390){await page.locator('.pos-totals').scrollIntoViewIfNeeded();await page.locator('.pos-totals').screenshot({path:output+'/faro-pos-'+theme+'-'+lang+'.png'})}
 await section('Productos y servicios','Products and services');const first=page.locator('[data-training=catalog-item]').first(),taxable=first.getByLabel(lang==='es'?'Aplicar IVU a este artículo':'Apply IVU to this item',{exact:true}),override=first.getByLabel(lang==='es'?'Tasa de IVU particular % (opcional)':'Item tax rate % (optional)',{exact:true});
 assert.equal(await taxable.isChecked(),true);await taxable.uncheck();await override.fill('0');await page.locator('[data-training=catalog-save] button').click();await page.locator('.ca-success').waitFor();
 await section('Ajustes del negocio','Business settings');await page.locator('.ca-tax-exempt-note').waitFor();await section('POS','POS');await page.locator('.pos-product').first().click();assert.match(await page.locator('.pos-totals').innerText(),/0[.,]00/);assert.match(await page.locator('.pos-grand-total').innerText(),/25[.,]00/);
 await section('Productos y servicios','Products and services');await taxable.check();await override.fill('');await page.locator('[data-training=catalog-save] button').click();await page.locator('.ca-success').waitFor();await section('Productos y servicios','Products and services');assert.equal(await override.inputValue(),'','Blank clears an override instead of persisting 0');await section('POS','POS');await page.locator('.pos-product').first().click();assert.match(await page.locator('.pos-totals').innerText(),/2[.,]88/);assert.match(await page.locator('.pos-grand-total').innerText(),/27[.,]88/);
 await section('Conexiones','Connected apps');await page.locator('.ca-payment-status').waitFor();const chat=page.locator('.ca-chatgpt-panel');assert(await chat.locator('.wf-panel-tools').count());for(const el of [page.locator('.ca-payment-status'),chat.locator('.btn')]){const color=await el.evaluate(e=>getComputedStyle(e).backgroundColor);assert.notEqual(color,'rgb(17, 27, 45)');assert.notEqual(color,'rgb(19, 29, 47)')}
 await noOverflow(page);if(width===390){await chat.scrollIntoViewIfNeeded();await chat.screenshot({path:output+'/faro-chatgpt-'+theme+'-'+lang+'.png'});await page.locator('.ca-payment-status').scrollIntoViewIfNeeded();await page.locator('.ca-payment-status').screenshot({path:output+'/faro-stripe-'+theme+'-'+lang+'.png'})}
 const kiosk=kioskFixture(origin);Object.assign(kiosk.site,structuredClone(site),{members:[{email:'owner@example.invalid',role:'owner'}]});let cookie='';await page.route('**/.netlify/functions/client-kiosk*',async route=>{const req=route.request(),headers={...await req.allHeaders(),origin,cookie};const response=await kiosk.handler(new Request(req.url(),{method:req.method(),headers,...(req.method()==='POST'?{body:req.postData()}:{})}));if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()})});await kiosk.admin('configure',{enabled:true});const creation=await kiosk.admin('create',{locationId:'arecibo-preview'}),created=await creation.json();assert.equal(creation.status,200,created.message);await page.goto(created.pairUrl);await page.locator('.wf-kiosk').waitFor();await page.getByRole('button',{name:lang.toUpperCase(),exact:true}).click();await page.getByRole('button',{name:lang==='es'?'Vincular este kiosco':'Pair this kiosk',exact:true}).click();await page.locator('.kiosk-products').waitFor();
 for(const id of ['corte-clasico-walk-in','corte-barba-walk-in','barba-walk-in','ritual-toalla-walk-in']){const item=site.catalog.find(x=>x.id===id);await page.locator('.kiosk-product').filter({hasText:lang==='es'?item.nameEs:item.nameEn}).locator('.kiosk-add').click()}
 assert.match(await page.locator('.kiosk-cart dl').innerText(),/13[.,]82/);assert.match(await page.locator('.kiosk-total').innerText(),/133[.,]82/);assert.equal(kiosk.calls(),0);await noOverflow(page);if(width===390){await page.locator('.kiosk-cart dl').scrollIntoViewIfNeeded();await page.locator('.kiosk-cart dl').screenshot({path:output+'/faro-kiosk-'+theme+'-'+lang+'.png'})}await context.close();console.log('PASS Faro catalog IVU, exemptions, overrides and integration materials',width,theme,lang)
}
} finally {await browser.close();await server.close()}
