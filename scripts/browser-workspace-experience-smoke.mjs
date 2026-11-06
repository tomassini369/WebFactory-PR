import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {preview} from 'vite'
import {chromium,webkit} from 'playwright'
import {siteRoleCapabilities} from '../netlify/lib/client-auth.mjs'
import {selectPortalSection,openPanelTools,showBuilderPreview} from './qa-workspace-navigation.mjs'
const port=Number(process.env.QA_PORT||5280),isWebKit=process.env.QA_ENGINE==='webkit'
const server=await preview({preview:{host:'127.0.0.1',port,strictPort:true}})
const origin=process.env.QA_ORIGIN||`http://127.0.0.1:${port}`
const pageLoadTimeout=process.env.QA_ORIGIN?60000:30000
async function openPage(page,path,selector){
 let response
 try{
  response=await page.goto(origin+path,{waitUntil:process.env.QA_ORIGIN?'domcontentloaded':'load',timeout:pageLoadTimeout})
  await page.locator(selector).waitFor({timeout:pageLoadTimeout})
 }
 catch(error){
  const state=await page.evaluate(()=>({readyState:document.readyState,dashboard:document.querySelectorAll('.gd-client-dashboard').length,builder:document.querySelectorAll('.wf-builder-app').length,login:document.querySelectorAll('.portal-auth').length})).catch(()=>({readyState:'unavailable'}))
  console.error('Isolated portal bootstrap diagnostic',JSON.stringify({status:response?.status(),expectedPath:path,selector,path:new URL(page.url()).pathname,...state}))
  throw error
 }
}
const openPortal=page=>openPage(page,'/client-admin','.gd-client-dashboard')
const browser=await (isWebKit?webkit:chromium).launch(isWebKit?(process.env.QA_WEBKIT_PATH?{executablePath:process.env.QA_WEBKIT_PATH}:{}):(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH,args:['--no-sandbox']}:{}))
const widths=(process.env.QA_WIDTHS||'320,375,390,430,768,1024,1440').split(',').map(Number)
const output='/tmp/webfactory-workspace-experience';await mkdir(output,{recursive:true})
const user={id:'workspace-ui-fixture',email:'workspace@example.invalid',user_metadata:{full_name:'Isolated workspace QA'},app_metadata:{},mfa:{required:false}}
const site={siteId:'workspace-ui',slug:'workspace-ui',status:'published',revision:1,business:{name:'Isolated workspace QA',category:'Retail'},design:{primary:'#126b43',secondary:'#285fa6',style:'Modern'},catalog:[],employees:[],hours:{},members:[],settings:{locale:'en',timezone:'America/Puerto_Rico',currency:'USD'},paymentRules:{},googleCalendar:{},features:{},servicePlan:{code:'complimentary',billingModel:'complimentary'}}
const commerce={orders:[{kind:'order',transactionId:'qa-pending',amountTotal:1200,status:'processing',paymentStatus:'due',createdAt:new Date().toISOString()},{kind:'order',transactionId:'qa-paid',amountTotal:5500,status:'confirmed',paymentStatus:'paid',createdAt:new Date().toISOString()}],bookings:[]}
const noOverflow=async page=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No document overflow')
try{
 for(const width of widths)for(const theme of ['light','dark'])for(const lang of (process.env.QA_LANGS||'es,en').split(',')){
  let role='owner',writes=0,emailConnected=false,oauthStarts=0,deliveryReason='',balanceMode=false,balanceReviewed=false,balanceClosed=false,balanceCancelled=false;const balanceActions=[]
  const context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce',serviceWorkers:process.env.QA_OPAQUE_REVIEW==='1'?'allow':'block',...(isWebKit?{hasTouch:true}: {})}),page=await context.newPage();const errors=[];page.setDefaultNavigationTimeout(pageLoadTimeout);page.on('pageerror',e=>errors.push(e.message))
  await page.addInitScript(theme=>{if(window!==window.top)return;localStorage.setItem('webfactory-theme-v2',theme);sessionStorage.clear()},theme)
  await page.route('**/.netlify/functions/**',async route=>{
   if(route.request().method()==='POST'&&new URL(route.request().url()).pathname.endsWith('/client-customer-display')&&route.request().postDataJSON()?.action==='keepalive')return route.fulfill({json:{ok:true}});
  const req=route.request(),url=new URL(req.url()),name=url.pathname.split('/').at(-1)
   if(name==='client-commerce-admin'&&req.method()==='POST'&&balanceMode){
    const payload=req.postDataJSON();assert.equal(payload.transactionId,'fixture-balance');assert.equal(payload.siteId,site.siteId);assert.equal(payload.kind,'booking');balanceActions.push(payload.action)
    if(payload.action==='review_booking_balance'){assert.equal(payload.expectedBalanceAttempt,'a'.repeat(64));balanceReviewed=true}
    else if(payload.action==='close_booking_balance'){assert(balanceReviewed);assert.equal(payload.expectedBalanceAttempt,'a'.repeat(64));balanceClosed=true}
    else if(payload.action==='cancel'){assert(balanceClosed);balanceCancelled=true}
    else throw Error('Unexpected balance fixture action')
    return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,reconciliation:{state:balanceClosed?'closed':'unpaid'}})})
   }
   if(req.method()!=='GET'&&name!=='portal-session'){writes++;throw Error('Unexpected write in presentation QA: '+name)}
   if(name==='business-email-google-start'){
    assert.equal(url.searchParams.get('siteId'),site.siteId);oauthStarts++;
    return route.fulfill({contentType:'text/html',body:'<!doctype html><html><body>Isolated Gmail authorization fixture</body></html>'})
   }
   let data={ok:true,records:[],customers:[],receipts:[],movements:[],adjustments:[],analytics:{}}
   if(name==='portal-session')data={ok:true,user}
   if(name==='client-admin')data=url.searchParams.has('siteId')?{ok:true,site:{...site,businessEmail:{provider:'google',connected:emailConnected,connectedEmail:emailConnected?'owner@example.invalid':''}},membership:{role,capabilities:siteRoleCapabilities(role)}}:{ok:true,sites:[{siteId:site.siteId,slug:site.slug,businessName:site.business.name,status:site.status}]}
   if(name==='client-commerce-admin')data={ok:true,...commerce,...(deliveryReason?{bookings:[{kind:'booking',transactionId:'fixture-mail',confirmationEmailRequested:true,customerEmailDeliveryStatus:deliveryReason==='rate_limited'?'pending_retry':'action_required',customerEmailDeliveryStatusReason:deliveryReason,customer:{name:'Isolated email diagnostic',email:'customer@example.invalid'},amountTotal:2500,paymentStatus:'due',status:'confirmed',createdAt:new Date().toISOString()}]}:{})}
   if(name==='client-commerce-admin'&&balanceMode)data={ok:true,orders:commerce.orders,bookings:[{kind:'booking',transactionId:'fixture-balance',bookingCode:'A0B1C2D3',customer:{name:'Isolated balance recovery',email:'customer@example.invalid'},amountTotal:2500,paymentStatus:'due',status:balanceCancelled?'cancelled':'confirmed',createdAt:new Date().toISOString(),...(!balanceClosed?{balanceAttempt:{attempt:'a'.repeat(64)}}:{}),...(balanceReviewed?{balanceReconciliation:{state:balanceClosed?'closed':'unpaid'}}:{})}]}
   if(name==='client-workforce')data={ok:true,enabled:false,admin:role==='owner',paidBreaks:false,employees:[],locations:[],bindings:[],shifts:[],requests:[],events:[],serverNow:new Date().toISOString(),totals:{todayMinutes:0,weekMinutes:0}}
   if(name==='client-inventory-health')data={ok:true,checkedAt:new Date().toISOString(),heldCount:0,reviewCount:0,hiddenReviewCount:0,reservations:[],journal:{operationCount:0,reservationCount:0,bytes:0,nearCapacity:false,atCapacity:false},pos:{pointerCount:0,cleanupEligibleCount:0,reviewCount:0,hiddenCount:0,rows:[]}}
   await route.fulfill({contentType:'application/json',body:JSON.stringify(data)})
  })
  await openPortal(page);await page.locator('.bcc').waitFor();await page.locator('.portal-language').getByRole('button',{name:lang.toUpperCase(),exact:true}).click();assert.equal(await page.locator('html').getAttribute('lang'),lang);assert.equal(await page.locator('html').getAttribute('data-wf-theme'),theme)
  await noOverflow(page);assert.equal(await page.locator('.gd-client-dashboard').evaluate(el=>getComputedStyle(el).backgroundImage),'none')
  assert.equal(await page.locator('.gd-topnav button').count(),3)
  assert.equal(await page.locator('.bcc-metrics article').count(),4)
  assert.match(await page.locator('.bcc-metrics article').first().innerText(),/55[.,]00/)
  assert.equal(await page.locator('.gd-overview-grid>.wf-portal-panel').count(),5,'Reference profile/board/revenue/calendar/activity composition');
  await page.locator('.gd-board-columns').getByRole('button',{name:lang==='es'?'Abrir Órdenes':'Open Orders',exact:true}).click();await page.locator('.ca-transactions').waitFor();await selectPortalSection(page,lang==='es'?'Resumen':'Overview');await page.locator('.bcc').waitFor()
  const panel=page.locator('.gd-revenue').first();const options=await panel.locator(':scope>.wf-panel-tools>.wf-panel-expand').boundingBox();assert.equal(Math.round(options.height),44,'Compact 44px panel option target');await openPanelTools(panel);await panel.getByRole('button',{name:lang==='es'?'Ampliar tarjeta':'Expand card',exact:true}).click();assert.equal(await panel.getAttribute('role'),'dialog')
  assert.equal(await page.locator('.wf-portal-panel:visible').count(),1,'Expanded card hides the rest of the workspace');await page.keyboard.press('Escape');assert.equal(await panel.getAttribute('role'),null)
  await selectPortalSection(page,lang==='es'?'Editar página':'Edit website');await page.locator('.ca-website-panel').waitFor();await noOverflow(page)
  if([320,390,1440].includes(width)){
   for(const [reason,expected] of [['gmail_api_disabled',/Gmail API/],['workspace_policy',/Google Workspace/],['rate_limited',lang==='es'?/límite de envío/:/sending limit/]]){
    deliveryReason=reason;await selectPortalSection(page,lang==='es'?'Resumen':'Overview');await page.locator('.bcc').waitFor();await selectPortalSection(page,lang==='es'?'Ver citas':'View appointments');await page.locator('.ca-warning').waitFor();assert.match(await page.locator('.ca-warning').innerText(),expected);await noOverflow(page)
   }
   await selectPortalSection(page,lang==='es'?'Conexiones':'Connected apps')
   const connect=page.getByRole('link',{name:lang==='es'?'Conectar Gmail / Google Workspace':'Connect Gmail / Google Workspace',exact:true})
   await connect.waitFor();assert.match(await connect.getAttribute('href'),/business-email-google-start\?siteId=workspace-ui/);await noOverflow(page)
   emailConnected=true;await page.reload();await page.locator('.bcc').waitFor({timeout:pageLoadTimeout});await page.locator('.portal-language').getByRole('button',{name:lang.toUpperCase(),exact:true}).click();assert.equal(await page.locator('html').getAttribute('lang'),lang);await selectPortalSection(page,lang==='es'?'Conexiones':'Connected apps')
   const renew=page.getByRole('link',{name:lang==='es'?'Renovar autorización de Gmail':'Renew Gmail authorization',exact:true})
   await renew.waitFor();await renew.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');assert.equal(await renew.evaluate(el=>el===document.activeElement),true)
   assert.notEqual(await renew.evaluate(el=>getComputedStyle(el).outlineStyle),'none');await noOverflow(page)
   await renew.click();await page.waitForURL('**/.netlify/functions/business-email-google-start?siteId=workspace-ui');await page.getByText('Isolated Gmail authorization fixture',{exact:true}).waitFor();assert.equal(oauthStarts,1,'Renew uses existing OAuth flow, intercepted without contacting Google')
  }
  balanceMode=true;await openPortal(page);await page.locator('.portal-language').getByRole('button',{name:lang.toUpperCase(),exact:true}).click();await selectPortalSection(page,lang==='es'?'Resumen':'Overview');await selectPortalSection(page,lang==='es'?'Ver citas':'View appointments')
  const balanceRow=page.locator('.ca-transactions article').filter({hasText:'Isolated balance recovery'}),cancel=balanceRow.getByRole('button',{name:lang==='es'?'Cancelar':'Cancel',exact:true})
  assert(await cancel.isDisabled());assert.equal(await balanceRow.getByRole('button',{name:lang==='es'?'Cerrar checkout sin cobrar':'Close unpaid checkout',exact:true}).count(),0)
  const review=balanceRow.getByRole('button',{name:lang==='es'?'Revisar cobro de saldo':'Review balance checkout',exact:true});await review.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');assert.equal(await review.evaluate(el=>el===document.activeElement),true);assert.notEqual(await review.evaluate(el=>getComputedStyle(el).outlineStyle),'none');await page.keyboard.press('Enter')
  const close=balanceRow.getByRole('button',{name:lang==='es'?'Cerrar checkout sin cobrar':'Close unpaid checkout',exact:true});await close.waitFor();assert(await cancel.isDisabled());await noOverflow(page)
  const textRatio=await balanceRow.locator('.ca-balance-review p').first().evaluate(node=>{
   const ctx=document.createElement('canvas').getContext('2d'),color=value=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=value;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].map((v,i)=>i===3?v/255:v)},over=(a,b)=>[...a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3])),1]
   const parents=[];for(let el=node;el;el=el.parentElement)parents.push(el);const bg=parents.reverse().reduce((b,el)=>over(color(getComputedStyle(el).backgroundColor),b),[255,255,255,1]),fg=over(color(getComputedStyle(node).color),bg),lum=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0),x=lum(bg),y=lum(fg);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)
  });assert(textRatio>=4.5,'Balance review contrast: '+textRatio)
  for(const button of [review,close])assert((await button.boundingBox()).height>=44)
  if(width===390&&lang==='es')await balanceRow.screenshot({path:`${output}/balance-review-${theme}-${isWebKit?'webkit':'chromium'}.png`})
  page.once('dialog',dialog=>dialog.dismiss());await close.click();assert.deepEqual(balanceActions,['review_booking_balance']);
  page.once('dialog',dialog=>dialog.accept());await close.click();await page.waitForFunction(()=>!document.querySelector('.ca-balance-review'));assert(await cancel.isEnabled());assert.match(await balanceRow.innerText(),/A0B1C2D3/)
  page.once('dialog',dialog=>dialog.accept());await cancel.click();await page.waitForFunction(()=>[...document.querySelectorAll('.ca-transactions article')].some(el=>el.textContent.includes('Isolated balance recovery')&&el.textContent.includes('cancelled')))
  assert.deepEqual(balanceActions,['review_booking_balance','close_booking_balance','cancel']);assert.match(await balanceRow.innerText(),/due/);await noOverflow(page);balanceMode=false
  await openPage(page,'/builder','.wf-builder-app');await page.locator('.header .langs button').filter({hasText:new RegExp('^'+lang.toUpperCase()+'$')}).click();assert.equal(await page.locator('html').getAttribute('lang'),lang);await page.locator('.wf-builder-nav button').first().click()
  const more=page.locator('.wf-builder-disclosure');if(!await more.evaluate(el=>el.open))await more.locator(':scope>summary').click();await more.getByLabel('Instagram',{exact:true}).fill('https://instagram.com/isolated-qa');await more.getByLabel('Instagram',{exact:true}).fill('');assert(await more.evaluate(el=>el.open),'Clearing the optional field must not close the section')
  await page.getByLabel('Business name · English',{exact:true}).fill('Preserved fixture draft')
  await page.evaluate(opaque=>{const frame=document.createElement('iframe');frame.hidden=true;frame.title='Isolated review-tool frame';if(opaque){frame.setAttribute('sandbox','allow-scripts');frame.srcdoc='<!doctype html><html><body></body></html>'}document.body.appendChild(frame)},process.env.QA_OPAQUE_REVIEW==='1');
  await showBuilderPreview(page);await page.frameLocator('.wf-template-preview-frame').locator('.template-site').waitFor({timeout:pageLoadTimeout});const frame=await page.locator('.wf-template-preview-frame').elementHandle()
  const views=page.locator('.wf-builder-view-switch');if(await views.isVisible()){await views.getByRole('button',{name:/^(Edit|Editar)$/}).click();assert.equal(await page.getByLabel('Business name · English',{exact:true}).inputValue(),'Preserved fixture draft');await showBuilderPreview(page);assert(await frame.evaluate(el=>el.isConnected),'Preview iframe stays mounted');assert.equal(await page.locator('.wf-template-preview-frame').count(),1)}
  await noOverflow(page)
  if([390,1440].includes(width))await page.screenshot({path:`${output}/builder-${width}-${theme}-${lang}-${isWebKit?'webkit':'chromium'}.png`})
  role='employee';await openPortal(page);await page.locator('.portal-language').getByRole('button',{name:lang.toUpperCase(),exact:true}).click();assert.equal(await page.locator('.gd-navigation button[aria-label="POS"]').count(),0);assert.equal(await page.locator('.gd-navigation button').filter({hasText:/Business settings|Ajustes del negocio/}).count(),0)
  balanceMode=true;balanceClosed=false;balanceCancelled=false;balanceReviewed=false;await selectPortalSection(page,lang==='es'?'Ver citas':'View appointments');await page.locator('[data-training="employee-agenda"]').waitFor();assert.equal(await page.getByRole('button',{name:/Review balance checkout|Revisar cobro de saldo|Cancel|Cancelar/,exact:true}).count(),0)

  assert.equal(writes,0);assert.deepEqual(errors,[]);console.log(`PASS unified hierarchy, balance review/close/cancel, permissions, focus and Builder persistence ${width} ${theme} ${lang}`);await context.close()
 }
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve))}
