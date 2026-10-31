import assert from 'node:assert/strict';
import {preview} from 'vite';
import {chromium,webkit} from 'playwright';
import {mkdir} from 'node:fs/promises';
import {kioskFixture} from './fixtures/kiosk-fixture.mjs';
import {commerceKey} from '../netlify/lib/client-store.mjs';
import {createCommerceAdminHandler} from '../netlify/functions/client-commerce-admin.mjs';
const port=Number(process.env.QA_PORT||5378),server=await preview({preview:{host:'127.0.0.1',port,strictPort:true}}),root=`http://127.0.0.1:${port}`,engine=process.env.QA_ENGINE==='webkit'?webkit:chromium;
const browser=await engine.launch(engine===chromium?{args:['--no-sandbox'],...(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH}:{})}:{}),shots='/tmp/webfactory-kiosk-qr';await mkdir(shots,{recursive:true});
try{
 for(const width of (process.env.QA_WIDTHS||'320,375,390,430,768,1024,1440').split(',').map(Number))for(const theme of ['light','dark'])for(const lang of ['es','en']){
  const f=kioskFixture(root),ctx=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[],t=(es,en)=>lang==='es'?es:en;let cookie='',cashWrites=0,receiptReady=false;
  f.setMode('in_person');const paired=await f.paired();cookie=paired.cookie;await f.admin('configure',{enabled:true,checkoutMode:'qr'});
  const admin=createCommerceAdminHandler({authorizeAccess:async()=>({site:f.site,membership:{role:'owner'}}),getStore:()=>f.store,pendingSales:async()=>[]});
  await ctx.addInitScript(({theme})=>localStorage.setItem('webfactory-theme-v2',theme),{theme});
  await ctx.route('**/.netlify/functions/**',async route=>{
   if(route.request().method()==='POST'&&new URL(route.request().url()).pathname.endsWith('/client-customer-display')&&route.request().postDataJSON()?.action==='keepalive')return route.fulfill({json:{ok:true}});
  const req=route.request(),url=new URL(req.url()),name=url.pathname.split('/').at(-1);let data={ok:true};
   if(name==='client-kiosk'){
    const response=await f.handler(new Request(req.url(),{method:req.method(),headers:{Origin:root,Cookie:cookie,'Content-Type':'application/json'},...(req.method()==='POST'?{body:req.postData()}:{})}));
    const body=await response.json();if(body.sale?.transactionId){const row=await f.store.get(commerceKey(f.site.siteId,'transactions',body.sale.transactionId));if(row)await f.store.setJSON(commerceKey(f.site.siteId,'orders',body.sale.transactionId),row)}return route.fulfill({status:response.status,contentType:'application/json',body:JSON.stringify(body)})
   }
   if(name==='client-commerce-admin'){
    if(req.method()==='POST'){const body=req.postDataJSON();assert.equal(body.action,'mark_paid');assert.equal(body.cash,true);cashWrites++;await f.confirm();data={ok:true,record:await f.store.get(commerceKey(f.site.siteId,'transactions',body.transactionId))}}
    else if(url.searchParams.has('kioskSale')){const response=await admin(new Request(req.url()));return route.fulfill({status:response.status,contentType:'application/json',body:await response.text()})}
    else data={ok:true,orders:[],bookings:[]}
   }else if(name==='public-buyer-receipt'){
    assert.equal((await req.allHeaders()).cookie,undefined);const body=req.postDataJSON();assert.equal(body.token,'abcdefghijklmnopqrstuvwxyz123456');assert.equal(body.slug,'kiosk-qa');
    data=receiptReady?{ok:true,status:'ready',timeZone:'America/Puerto_Rico',receipt:{receiptId:'qa-receipt',transactionId:'qa-txn',total:1115,subtotal:1000,tax:115,discounts:0,tip:0,paymentStatus:'paid',paymentMethod:'stripe',createdAt:new Date().toISOString(),customer:{name:'',email:''},businessName:'Isolated receipt',items:[{name:'QA Product',quantity:1,unitAmount:1000,amount:1000}]}}:{ok:true,status:'pending'}
   }else if(req.method()!=='GET'&&name!=='portal-session')throw Error('Unexpected operational write '+name);
   if(name==='portal-session')data={ok:true,user:{id:'fixture-owner',email:'owner@example.invalid',user_metadata:{},app_metadata:{},mfa:{required:false}}};
   if(name==='client-admin')data=url.searchParams.has('siteId')?{ok:true,site:{...f.site,status:'published',revision:1,hours:{},settings:{locale:lang,timezone:'America/Puerto_Rico',currency:'USD'},googleCalendar:{},servicePlan:{billingModel:'complimentary'}},membership:{role:'owner',capabilities:['overview','orders','bookings','settings','collect']}}:{ok:true,sites:[{siteId:f.site.siteId,slug:f.site.slug,businessName:f.site.business.name,status:'published'}]};
   if(name==='client-pos-settings')data={ok:true,operations:{cashierEnabled:true,displayEnabled:true,profile:'auto',revision:0},canManage:true};
   if(name==='client-asset')return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#285fa6"/></svg>'});
   return route.fulfill({contentType:'application/json',body:JSON.stringify(data)})
  });
  const page=await ctx.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));await page.goto(root+'/kiosk');await page.locator('.kiosk-products').waitFor();await page.getByRole('button',{name:lang.toUpperCase(),exact:true}).click();
  const buy=async()=>{await page.getByRole('button',{name:t('Añadir Producto QA','Add QA Product'),exact:true}).click();await page.getByLabel(t('Nombre','Name'),{exact:true}).fill('Isolated buyer');await page.getByLabel('Email',{exact:true}).fill('qa@example.invalid');await page.locator('.kiosk-cart button[type=submit],.kiosk-cart form>button').click();await page.locator('.kiosk-result').waitFor()};
  await buy();const qr=page.locator('.kiosk-checkout-qr img');await qr.waitFor();assert.match(await qr.getAttribute('src'),/^data:image\/png;base64,/);assert(await qr.evaluate(img=>img.complete&&img.naturalWidth===512));assert.equal(await page.getByRole('button',{name:t('Nueva orden','New order'),exact:true}).count(),0);assert.equal(cashWrites,0);
  const id=(await f.store.get('pos-kiosk-devices/'+paired.id+'.json')).active.response.transactionId,staff=await ctx.newPage();staff.setDefaultTimeout(15000);staff.on('pageerror',e=>errors.push(e.message));await staff.goto(root+`/client-admin?siteId=${f.site.siteId}&kioskSale=${id}&kind=order`);const panel=staff.locator('.kiosk-cash-confirmation');await panel.waitFor();
  // Portal language can differ from kiosk language; use both translated labels.
  await panel.getByRole('button',{name:/Confirmar efectivo recibido|Confirm cash received/}).click();assert.equal(cashWrites,0);await panel.getByRole('button',{name:/Sí, recibí el efectivo|Yes, I received cash/}).click();await panel.getByRole('status').waitFor();assert.equal(cashWrites,1);await page.getByText(t('PAGO CONFIRMADO','PAYMENT CONFIRMED'),{exact:true}).waitFor();assert.equal(f.calls(),1);assert.equal(await page.locator('.kiosk-checkout-qr').count(),0);
  if([390,1440].includes(width)){await page.screenshot({path:`${shots}/cash-confirmed-${width}-${theme}-${lang}.png`,fullPage:true});await staff.screenshot({path:`${shots}/cash-portal-${width}-${theme}-${lang}.png`,fullPage:true})}await staff.close();await page.getByRole('button',{name:t('Nueva orden','New order'),exact:true}).click();await page.locator('.kiosk-products').waitFor();assert.equal(await page.locator('.kiosk-cart li').count(),0);
  f.setMode('stripe');await page.reload();await page.locator('.kiosk-products').waitFor();await buy();await page.locator('.kiosk-checkout-qr img').waitFor();assert.equal(await page.getByRole('link',{name:/Continuar con el pago seguro|Continue to secure payment/}).count(),0);assert.equal((await f.store.get('pos-kiosk-devices/'+paired.id+'.json')).active.response.checkoutUrl,root+'/fixture-checkout');assert.equal(f.calls(),2);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if([390,1440].includes(width)){
   const mobile=await ctx.newPage();mobile.setDefaultTimeout(15000);mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(root+'/kiosk-receipt#receipt=abcdefghijklmnopqrstuvwxyz123456&slug=kiosk-qa');await mobile.getByRole('button',{name:lang.toUpperCase(),exact:true}).click();await mobile.getByText(t('Esperando confirmación del pago','Waiting for payment confirmation'),{exact:true}).waitFor();assert.equal(await mobile.locator('.wf-buyer-receipt[open]').count(),0);receiptReady=true;await mobile.locator('.wf-buyer-receipt[open]').waitFor();assert.match(await mobile.locator('.wf-buyer-receipt header small').innerText(),/PAGO CONFIRMADO|PAYMENT CONFIRMED/);await mobile.getByRole('button',{name:t('Cerrar recibo','Close receipt'),exact:true}).click();await mobile.getByRole('button',{name:t('Ver recibo','View receipt'),exact:true}).click();await mobile.locator('.wf-buyer-receipt[open]').waitFor();await mobile.close()
  }
  assert.deepEqual(errors,[]);await ctx.close();console.log('PASS QR cash portal confirmation, server settlement, reset, mobile handoff, receipt privacy',width,theme,lang)
 }
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve))}
