import {renderBusinessQr} from '../netlify/lib/business-qr-image.mjs'
import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {preview,createServer} from 'vite'
import sharp from 'sharp'
import {chromium,webkit} from 'playwright'
import {createDashboardAppearanceHandler} from '../netlify/functions/dashboard-appearance.mjs'
import {siteRoleCapabilities} from '../netlify/lib/client-auth.mjs'
import {selectPortalSection} from './qa-workspace-navigation.mjs'
const port=Number(process.env.QA_PORT||5339),origin=process.env.QA_ORIGIN||`http://127.0.0.1:${port}`
const server=process.env.QA_DEV==='1'?await createServer({server:{host:'127.0.0.1',port,strictPort:true}}):await preview({preview:{host:'127.0.0.1',port,strictPort:true}});if(process.env.QA_DEV==='1')await server.listen()
const isWebKit=process.env.QA_ENGINE==='webkit';const browser=await (isWebKit?webkit:chromium).launch(isWebKit?(process.env.QA_WEBKIT_PATH?{executablePath:process.env.QA_WEBKIT_PATH}:{}):{...(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']})
const output='/tmp/glassy-dashboard-qa';await mkdir(output,{recursive:true})
const user={id:'glassy-user',email:'glassy@example.invalid',user_metadata:{},app_metadata:{roles:['admin']},mfa:{required:false}}
const site={siteId:'glassy-site',slug:'glassy-site',status:'published',revision:1,business:{name:'Glassy fixture · QA',category:'Barber',email:'fixture@example.invalid'},design:{primary:'#0B1529',secondary:'#3C86F6',style:'Modern'},catalog:[{id:'tax-product',type:'product',nameEn:'Tax product',nameEs:'Producto IVU',price:100,active:true}],taxConfig:{enabled:false,stateRate:0,municipalRate:0},employees:[],hours:{},members:[],settings:{locale:'en',timezone:'America/Puerto_Rico',currency:'USD'},paymentRules:{},googleCalendar:{},features:{},servicePlan:{code:'complimentary',billingModel:'complimentary'}}
const admin={generatedAt:new Date().toISOString(),administrator:{name:'Isolated admin QA',email:user.email},summary:{clients:0,publishedSites:0,connectedStripe:0,blockers:0},capacity:{level:'healthy',safeClientCapacity:20,activeClients:0,estimatedOpenings:20,utilizationPercent:0,model:'Isolated fixture'},integrations:{configured:0,total:0,configuration:[]},operations:{transactionStatuses:{},pendingTransactions:[],stripeWebhookEvents:0,clientWebhookEvents:0},clients:[],subscriptionBilling:{missing:[],ready:false},resources:{netlify:{plan:'QA',utilizationPercent:null,dashboardUrl:'/',source:'Fixture'},storage:{},runtime:{}}}
let role='owner';const records=new Map(),versions=new Map();const storage={get:async k=>structuredClone(records.get(k)||null),getWithMetadata:async k=>records.has(k)?{data:structuredClone(records.get(k)),etag:String(versions.get(k))}:null,getMetadata:async k=>records.has(k)?{etag:String(versions.get(k))}:null,setJSON:async(k,v,o)=>{if(o.onlyIfNew&&records.has(k)||o.onlyIfMatch&&o.onlyIfMatch!==String(versions.get(k)))return {modified:false};records.set(k,structuredClone(v));versions.set(k,(versions.get(k)||0)+1);return {modified:true}}}
const appearance=createDashboardAppearanceHandler({store:()=>storage,siteAccess:async()=>({user}),platformAccess:async()=>user})
async function intercept(page){await page.route('**/.netlify/functions/**',async route=>{const req=route.request(),url=new URL(req.url()),name=url.pathname.split('/').at(-1)
 if(name==='dashboard-appearance'){
  const response=await appearance(new Request(req.url(),{method:req.method(),headers:await req.allHeaders(),...(!['GET','HEAD'].includes(req.method())?{body:req.postDataBuffer()}: {})}));return route.fulfill({status:response.status,headers:{...Object.fromEntries(response.headers),etag:'W/"cdn-rewritten-validator"'},body:Buffer.from(await response.arrayBuffer())})
 }
 // Personal profile persistence is exercised by browser-portal-profile-smoke.
 if(name==='portal-profile'){assert(['GET','PUT'].includes(req.method()));return route.fulfill({json:{ok:true,profile:{name:'',phone:'',language:null,theme:null},hasPhoto:false,revision:0,version:'isolated-profile-fixture'}})}
 if(name==='client-customer-display')return route.fulfill({json:{ok:true,paired:false,sequence:0}});
 if(name==='business-qr')return route.fulfill({contentType:'image/png',body:await renderBusinessQr({target:origin+'/sites/'+site.slug})});
 if(name==='client-admin'&&req.method()==='PATCH'){const body=req.postDataJSON();assert.equal(body.section,'taxConfig');site.taxConfig=body.value;site.revision++;return route.fulfill({json:{ok:true,site}})}
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

async function cardContrast(card,theme){
 const colors=await card.evaluate(e=>({fill:getComputedStyle(e).backgroundColor,glass:getComputedStyle(e.closest('.wf-portal-panel'),'::before').backgroundColor,ink:getComputedStyle(e.querySelector('span')||e).color}));
 const rgb=s=>{const a=s.match(/[\d.]+/g).map(Number);return [...a.slice(0,3),a[3]??1]},blend=(a,b)=>a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3]));
 const bg=blend(rgb(colors.fill),blend(rgb(colors.glass),Array(3).fill(theme==='dark'?163:0))),ink=blend(rgb(colors.ink),bg),lum=c=>c.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 assert((Math.max(lum(ink),lum(bg))+.05)/(Math.min(lum(ink),lum(bg))+.05)>=4.5,'Nested card text contrast');
}
try {
for(const width of (process.env.QA_WIDTHS||'320,375,390,430,768,1024,1440').split(',').map(Number))for(const theme of ['light','dark'])for(const lang of ['es','en']){
 site.taxConfig={enabled:false,stateRate:0,municipalRate:0};site.revision++;
 const context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce'}),page=await context.newPage();await page.addInitScript(t=>localStorage.setItem('webfactory-theme-v2',t),theme);await intercept(page);await page.goto(origin+'/client-admin');await page.locator('.gd-content').waitFor();await page.locator('.portal-language').getByRole('button',{name:lang.toUpperCase(),exact:true}).click();
 const section=(es,en)=>selectPortalSection(page,lang==='es'?es:en);
 await section('Ajustes del negocio','Business settings');const settings=page.locator('.ca-panel').filter({has:page.locator('.ca-tax-presets')});
 await settings.getByRole('button',{name:/0%/}).click();const enabled=settings.getByLabel(lang==='es'?'Calcular IVU':'Calculate IVU',{exact:true});await enabled.check();assert.equal(await settings.getByLabel(lang==='es'?'IVU estatal %':'State rate %',{exact:true}).inputValue(),'10.5');
 await settings.getByRole('button',{name:lang==='es'?'Guardar configuración':'Save settings',exact:true}).click();await page.locator('.ca-success').waitFor();
 for(const card of await page.locator('.ca-danger-actions article').all()) {const color=await card.evaluate(e=>({bg:getComputedStyle(e).backgroundColor,ink:getComputedStyle(e.querySelector('strong')||e).color,button:e.querySelector('button').textContent}));assert.notEqual(color.bg,'rgb(255, 255, 255)');assert(color.button.trim());await cardContrast(card,theme);}
 await noOverflow(page);if(width===390)await page.locator('.ca-danger-actions').screenshot({path:output+'/danger-'+theme+'-'+lang+'.png'});
 await section('POS','POS');await page.locator('.pos-product').first().click();assert.match(await page.locator('.pos-totals').innerText(),/11[.,]50/);assert.match(await page.locator('.pos-grand-total').innerText(),/111[.,]50/);
 await section('Ajustes del negocio','Business settings');
 await settings.getByRole('button',{name:/^4%/}).click();await settings.getByRole('button',{name:/0%/}).click();await enabled.check();assert.equal(await settings.getByLabel(lang==='es'?'IVU estatal %':'State rate %',{exact:true}).inputValue(),'4','Disabling tax must preserve a custom rate');await settings.getByRole('button',{name:lang==='es'?'Guardar configuración':'Save settings',exact:true}).click();await page.locator('.ca-success').waitFor();
 await section('POS','POS');await page.locator('.pos-product').first().click();assert.match(await page.locator('.pos-totals').innerText(),/4[.,]00/);
 await section('Compartir página','Share website');await page.locator('.business-qr-image').waitFor();await page.waitForFunction(()=>document.querySelector('.business-qr-image')?.naturalWidth===900);await noOverflow(page);if(width===390)await page.locator('.business-qr').screenshot({path:output+'/business-qr-'+theme+'-'+lang+'.png'});
 await section('Ver clientes','View customers');await page.locator('.ca-v3-table article').waitFor();for(const card of await page.locator('.ca-v3-table article').all())assert(!/19, 2[0-9], [34][0-9]/.test(await card.evaluate(e=>getComputedStyle(e).backgroundColor)));await noOverflow(page);
 await section('Resultados','Business results');await page.locator('.ca-v3-metrics article').first().waitFor();for(const card of await page.locator('.ca-v3-metrics article').all())assert(!/19, 2[0-9], [34][0-9]/.test(await card.evaluate(e=>getComputedStyle(e).backgroundColor)));await noOverflow(page);
 await context.close();console.log('PASS Glassy regressions',width,theme,lang);
}
} finally {await browser.close();await server.close()}
