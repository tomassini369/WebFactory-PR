import {openPanelTools} from './qa-workspace-navigation.mjs'
import assert from 'node:assert/strict'
import {mkdir,readFile} from 'node:fs/promises'
import {createServer,preview} from 'vite'
import {chromium,webkit} from 'playwright'
const port=Number(process.env.QA_PORT||5220),engine=process.env.QA_ENGINE==='webkit'?webkit:chromium
const built=process.env.QA_BUILT==='1'
const instance=built?await preview({preview:{host:'127.0.0.1',port,strictPort:true}}):await createServer({server:{host:'127.0.0.1',port,strictPort:true}})
if(!built)await instance.listen()
const server=built?{close:()=>new Promise((resolve,reject)=>instance.httpServer.close(error=>error?reject(error):resolve()))}:instance
const browser=await engine.launch(process.env.QA_ENGINE==='webkit'?(process.env.QA_WEBKIT_PATH?{executablePath:process.env.QA_WEBKIT_PATH}:undefined):(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH,args:['--no-sandbox'],...(process.env.QA_ORIGIN&&process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})}:undefined))
const output='/tmp/webfactory-pos-v2';await mkdir(output,{recursive:true});const photo=await readFile(new URL('../assets/template-images/262978.jpg',import.meta.url))
const user={id:'pos-qa-user',email:'pos@example.invalid',user_metadata:{full_name:'POS QA fixture'},app_metadata:{},mfa:{required:false}}
let employeePos=false,role='owner',scenario='success',cardStatus='pending',directCalls=[],cardCalls=[],siteEmpty=false
const catalog=[{id:'product-1',name:'QA Product',nameEn:'QA Product',nameEs:'Producto QA',type:'product',price:10,active:true,trackInventory:true,inventory:2,imageAssetKey:'qa-product.webp'},{id:'service-1',name:'QA Service',nameEn:'QA Service',nameEs:'Servicio QA',type:'service',price:25,active:true,taxable:false},{id:'sold-out',name:'QA Sold out',type:'product',price:5,active:true,trackInventory:true,inventory:0},{id:'inactive',name:'Invisible QA',type:'product',price:99,active:false}]
const site={siteId:'pos-qa',slug:'pos-qa',status:'published',revision:1,business:{name:'Isolated POS QA fixture',nameEs:'Fixture POS QA aislado',category:'Retail',logoAssetKey:'qa-logo.webp'},design:{primary:'#0B1529',secondary:'#285fa6',style:'Modern'},catalog,employees:[],hours:{},members:[],settings:{locale:'en',timezone:'America/Puerto_Rico',currency:'USD'},taxConfig:{enabled:true,stateRate:10.5,municipalRate:1},paymentRules:{methods:{stripe:true},stripeConnectedAccountId:'acct_qa'},googleCalendar:{},features:{},servicePlan:{code:'complimentary',billingModel:'complimentary'}}
const caps={owner:['overview','orders','payments','catalog','bookings','pos'],employee:['overview','bookings']}
try{
 const context=await browser.newContext({reducedMotion:'reduce',...(process.env.QA_ENGINE==='webkit'?{hasTouch:true}: {})}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(Number(process.env.QA_TIMEOUT||30000))
 await page.route('**/.netlify/functions/**',async route=>{
  const req=route.request(),u=new URL(req.url()),name=u.pathname.split('/').at(-1)
  if(name==='client-asset')return route.fulfill(u.searchParams.get('key')==='qa-logo.webp'?{contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" rx="12" fill="#285fa6"/><text x="40" y="48" text-anchor="middle" font-family="sans-serif" font-size="24" fill="white">QA</text></svg>'}:{contentType:'image/jpeg',body:photo})
  let data={ok:true},status=200
  if(req.method()!=='GET'){
   if(name==='portal-session'){assert.equal(req.postDataJSON()?.action,'refresh')}
   else if(name==='client-customer-display'){assert.equal(req.postDataJSON()?.action,'keepalive');assert.equal(req.postDataJSON()?.siteId,site.siteId)}
   else if(name==='client-pos-sale-idempotent'){directCalls.push(req.postDataJSON());await new Promise(r=>setTimeout(r,150));if(scenario==='lost'){status=503;data={ok:false,message:'Isolated lost response'}}else if(scenario==='disabled'){status=403;data={ok:false,message:'Cashier POS disabled / POS del cajero deshabilitado.'}}else data={ok:true,receiptId:'receipt-qa',record:{transactionId:'txn-qa'}}}
   else if(name==='client-pos-checkout'){cardCalls.push(req.postDataJSON());data={ok:true,transactionId:'txn_pos_'+req.postDataJSON().saleAttemptId,checkoutUrl:'https://checkout.stripe.com/isolated-qa'}}
   else throw Error('Unexpected write in isolated POS QA: '+name)
  }
  if(name==='client-workforce')data={ok:true,enabled:false,paidBreaks:false,revision:0,serverNow:new Date().toISOString(),admin:role==='owner',employeeId:'',shifts:[],requests:[],employees:[],locations:[],bindings:[],events:[],confirmedOperationIds:[],totals:{todayMinutes:0,weekMinutes:0}}
  else if(name==='portal-session')data={ok:true,user}
  else if(name==='client-admin')data=u.searchParams.has('siteId')?{ok:true,site:{...site,catalog:siteEmpty?[]:catalog},membership:{role,capabilities:role==='employee'&&employeePos?['overview','bookings','orders','pos','collect']:caps[role],permissions:role==='employee'&&employeePos?{pos:true,collect:true,orders:true}:{}}}:{ok:true,sites:[{siteId:site.siteId,slug:site.slug,businessName:site.business.name,status:'published'}]}
  else if(name==='client-commerce-admin')data={ok:true,orders:[],bookings:[]}
  else if(name==='client-pos-status')data={ok:true,transaction:{transactionId:u.searchParams.get('transactionId'),paymentStatus:cardStatus,status:cardStatus==='paid'?'completed':'payment_pending',receiptId:cardStatus==='paid'?'receipt-card-qa':'',amountTotal:1115}}
  else if(name==='client-pos-attempt-status')data={ok:true,status:scenario==='completed'?'completed':'uncertain',receiptId:scenario==='completed'?'receipt-qa':'',transactionId:'txn-qa'}
  else if(!['client-pos-sale-idempotent','client-pos-checkout'].includes(name))data={ok:true,orders:[],bookings:[],receipts:[],customers:[],entries:[],report:{},inventory:[]}
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)})
 })
 const root=process.env.QA_ORIGIN||`http://127.0.0.1:${port}`
 const open=async()=>{
  await page.goto(root+'/client-admin');await page.locator('.gd-client-dashboard').waitFor();
  await page.locator('.ca-mobile-menu-toggle').click();await page.locator('.gd-navigation').getByRole('button',{name:'POS',exact:true}).click();await page.locator('.pos-workspace').waitFor()
 }
 const tenantCanvases={light:new Set(),dark:new Set()}
 const fresh=async()=>{await page.goto(root);await page.evaluate(()=>sessionStorage.clear());await open()}
 for(const width of (process.env.QA_WIDTHS||'320,375,390,430,768,1024,1440').split(',').map(Number))for(const theme of (process.env.QA_THEMES||'light,dark').split(','))for(const lang of (process.env.QA_LANGS||'es,en').split(',')){
  site.design.primary=['#0B1529','#126b43','#9b245c','#f0b429','#ffffff','#000000','#663399'][[320,375,390,430,768,1024,1440].indexOf(width)]||'#126b43'
  site.design.secondary=['#285fa6','#e4be5b','#ef4444','#22c55e','#ffffff','#000000','#777777'][[320,375,390,430,768,1024,1440].indexOf(width)]||'#777777'
  await page.setViewportSize({width,height:900});await fresh();await page.getByRole('button',{name:lang.toUpperCase(),exact:true}).click();if(await page.locator('html').getAttribute('data-wf-theme')!==theme)await page.locator('.wf-theme-toggle').click()
  const pos=page.locator('.pos-workspace');assert.equal(await pos.locator('.pos-customer-info h3').innerText(),lang==='es'?'Información del cliente':'Customer Info');for(const input of await pos.locator('.pos-customer-info input').all())assert(await input.isVisible(),'Customer fields remain expanded');assert.equal(await pos.locator('.pos-product').count(),3);assert.equal(await pos.locator('.pos-order').evaluate(el=>getComputedStyle(el).position),width>1150?'sticky':'static');assert.equal(await pos.locator('.pos-product img').count(),1);assert.equal(await pos.locator('.pos-identity img').count(),1)
  const contrast=await pos.evaluate(el=>{
   const rgb=color=>{const c=document.createElement('canvas'),ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,1,1);const rgba=[...ctx.getImageData(0,0,1,1).data],alpha=rgba[3]/255,backdrop=document.documentElement.dataset.wfTheme==='dark'?163:0;return rgba.slice(0,3).map(v=>v*alpha+backdrop*(1-alpha))}
   const lum=color=>{const c=rgb(color).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return .2126*c[0]+.7152*c[1]+.0722*c[2]}
   const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
   const sidebar=getComputedStyle(document.querySelector('.gd-dock button[aria-current=page]')),label=sidebar,dashboard=getComputedStyle(document.querySelector('.gd-client-dashboard'))
   const heading=getComputedStyle(el.querySelector('.pos-heading')),root=getComputedStyle(el),order=getComputedStyle(el.querySelector('.pos-order')),muted=getComputedStyle(el.querySelector('.pos-heading p'))
   return {sidebarBrand:rgb(sidebar.backgroundColor),expectedSidebarBrand:rgb(dashboard.getPropertyValue('--ca-pos-accent')),sidebarContrast:ratio(label.color,sidebar.backgroundColor),primary:root.getPropertyValue('--pos-primary').trim(),body:ratio(root.color,heading.backgroundColor),muted:ratio(muted.color,heading.backgroundColor),order:ratio(order.color,order.backgroundColor),orderMuted:ratio(getComputedStyle(el.querySelector('.pos-order-empty')).color,order.backgroundColor),control:ratio(getComputedStyle(el.querySelector('.pos-search input')).borderTopColor,getComputedStyle(el.querySelector('.pos-search input')).backgroundColor),canvas:root.backgroundColor,colors:[root.color,order.backgroundColor,getComputedStyle(el.querySelector('.pos-order-empty')).color,getComputedStyle(el.querySelector('.pos-search input')).borderTopColor,getComputedStyle(el.querySelector('.pos-search input')).backgroundColor]}
  })

  assert.equal(await page.locator('.gd-client-dashboard').evaluate(el=>getComputedStyle(el).backgroundImage),'none','POS content stays transparent over the shared dashboard wallpaper')
  tenantCanvases[theme].add(contrast.canvas)
  assert.equal(contrast.primary,site.design.primary,'Use this business primary rather than a portal default')
  assert.equal(await page.locator('.gd-dock button[aria-current=page]').getAttribute('aria-label'),'POS','POS remains the active destination in the new dock')
  assert(contrast.sidebarContrast>=4.5,`Business navigation text contrast ${JSON.stringify(contrast)}`)
  assert(contrast.control>=3,`Tenant input boundary contrast ${JSON.stringify(contrast)}`)
  assert(contrast.body>=4.5&&contrast.muted>=4.5&&contrast.order>=4.5&&contrast.orderMuted>=4.5,`Tenant palette text contrast ${JSON.stringify(contrast)}`)
  await pos.getByRole('button',{name:lang==='es'?'Servicios':'Services',exact:true}).click();assert.equal(await pos.locator('.pos-product').count(),1)
  await pos.getByRole('button',{name:lang==='es'?'Todo':'All',exact:true}).click();await pos.getByRole('searchbox').fill('no-match');assert.equal(await pos.locator('.pos-product').count(),0);await pos.getByRole('button',{name:lang==='es'?'Limpiar filtros':'Clear filters',exact:true}).click()
  await pos.locator('.pos-product').first().click();await pos.locator('.pos-product').first().click();assert.equal(await pos.locator('.pos-quantity output').innerText(),'2');assert(await pos.locator('.pos-product').first().isDisabled());assert.match(await pos.locator('.pos-grand-total dd').innerText(),/22.30/)
  await pos.getByRole('button',{name:new RegExp('^(Restar|Decrease)')}).click();assert.match(await pos.locator('.pos-grand-total dd').innerText(),/11.15/)
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`No page overflow ${width}/${theme}/${lang}`)
  for(const button of await pos.locator('button').all()){if(await button.isVisible()){const box=await button.boundingBox();assert(box.height>=44-.1&&box.width>=44-.1,`44px targets ${await button.innerText()}: ${JSON.stringify(box)}`)}}
  for(const input of await pos.locator('input').all()){if(await input.isVisible())assert(parseFloat(await input.evaluate(el=>getComputedStyle(el).fontSize))>=16)}
  await page.locator('.gd-client-work').evaluate(el=>el.scrollTo({top:0,behavior:'instant'}));assert.equal(await pos.evaluate(el=>getComputedStyle(el).backgroundImage),'none');assert.equal(await pos.evaluate(el=>getComputedStyle(el).backdropFilter),'none');assert(parseFloat(await pos.locator('.pos-search input').evaluate(el=>getComputedStyle(el).paddingLeft))>=44,'Search icon must not overlap text');
  if(width===390||width===1440)await page.screenshot({path:`${output}/pos-${width}-${theme}-${lang}-${process.env.QA_ENGINE||'chromium'}.png`})
  console.log('PASS POS responsive',width,theme,lang)
 }
 assert.equal(tenantCanvases.light.size,1,'New dashboard uses one material canvas across tenant colors')
 assert.equal(tenantCanvases.dark.size,tenantCanvases.light.size,'One shared Glassy canvas in both themes')
 site.design.primary='invalid-color';await fresh();assert.equal(await page.locator('.pos-workspace').evaluate(el=>getComputedStyle(el).getPropertyValue('--pos-primary').trim()),'#0b1529');assert.equal(await page.locator('.gd-client-dashboard').evaluate(el=>getComputedStyle(el).getPropertyValue('--ca-pos-primary').trim()),'#0b1529');site.design.primary='#0B1529'
 role='employee';employeePos=true;await fresh();assert.equal(await page.locator('.pos-adjustments').count(),0);assert.equal(await page.locator('.pos-shortcuts button').count(),2)
 employeePos=false;role='employee';await page.goto(root+'/client-admin');await page.locator('.gd-client-dashboard').waitFor();await page.locator('.ca-mobile-menu-toggle').click();assert.equal(await page.locator('.gd-navigation').getByRole('button',{name:'POS',exact:true}).count(),0)
 role='owner';siteEmpty=true;await fresh();await page.locator('.pos-empty').waitFor();assert(await page.locator('.pos-primary').isDisabled());siteEmpty=false
 await fresh();await page.locator('.pos-product').first().click();page.on('dialog',dialog=>dialog.accept());scenario='lost';await page.locator('select').filter({has:page.locator('option[value="stripe_qr"]')}).selectOption('cash');await page.locator('.pos-primary').click();await page.getByRole('alert').filter({hasText:'Isolated lost response'}).waitFor();assert.equal(directCalls.length,1);assert(await page.locator('.pos-primary').isDisabled());assert(await page.locator('.pos-product').first().isDisabled())
 await page.getByRole('button',{name:/Retry same attempt|Reintentar el mismo intento/}).click();await page.waitForTimeout(250);assert.equal(directCalls.length,2);assert.deepEqual(directCalls[0],directCalls[1]);assert.equal(directCalls[0].items[0].quantity,1)
 const marker=await page.evaluate(()=>sessionStorage.getItem('wf-pos-active:pos-qa:pos-qa-user'));assert(marker);assert(!marker.includes('email')&&!marker.includes('customer')&&!marker.includes('token'))
 scenario='disabled';await page.getByRole('button',{name:/Retry same attempt|Reintentar el mismo intento/}).click();await page.getByRole('alert').filter({hasText:'Cashier POS disabled'}).waitFor();assert.equal(await page.evaluate(()=>sessionStorage.getItem('wf-pos-active:pos-qa:pos-qa-user')),marker,'disabling POS after a lost response cannot discard an existing attempt');assert(await page.locator('.pos-primary').isDisabled());assert.deepEqual(directCalls.at(-1),directCalls[0]);scenario='lost'
 await open();assert(await page.locator('.pos-primary').isDisabled());assert.equal(await page.getByRole('button',{name:/Retry same attempt|Reintentar el mismo intento/}).count(),0);scenario='completed';await page.getByRole('button',{name:/Check server result|Verificar resultado en servidor/}).click();await page.getByRole('status').filter({hasText:'receipt-qa'}).waitFor()
 scenario='success';await fresh();await page.locator('.pos-product').first().click();const inputs=page.locator('.pos-customer-info input');await inputs.nth(0).fill('Isolated QA customer');await inputs.nth(1).fill('customer@example.invalid');const methods=page.locator('select').filter({has:page.locator('option[value="stripe_qr"]')});assert.deepEqual(await methods.locator('option').evaluateAll(options=>options.map(o=>o.value)),['cash','manual_ath','stripe_qr']);assert.equal(await methods.inputValue(),'stripe_qr');const receivedBefore=directCalls.length;await page.locator('.pos-primary').click();await page.locator('.pos-remote').waitFor();assert.equal(directCalls.length,receivedBefore,'Stripe QR never records a manual received payment');await page.locator('.pos-remote .kiosk-checkout-qr img').waitFor();assert.equal(context.pages().length,1,'QR renders inline without another tab');assert.equal(cardCalls.length,1);assert(await page.locator('.pos-primary').isDisabled());assert.equal(await page.locator('.ca-success').count(),0)
 await page.getByRole('button',{name:/Check server result|Verificar resultado en servidor/}).click();await page.locator('.pos-remote p').filter({hasText:/Pending verification|Pendiente de verificación/}).waitFor();assert.equal(await page.locator('.ca-success').count(),0);cardStatus='paid';/* The cashier now receives confirmation automatically without another click. */await page.getByRole('status').filter({hasText:'receipt-card-qa'}).waitFor();assert.equal(await page.evaluate(()=>sessionStorage.getItem('wf-pos-active:pos-qa:pos-qa-user')),null)
 await page.locator('.pos-remote').waitFor({state:'detached'});assert.equal(await page.locator('.pos-customer-info input').first().inputValue(),'');await page.locator('.pos-product').first().click();await methods.selectOption('manual_ath');const before=directCalls.length;await page.locator('.pos-primary').click();await page.getByRole('status').filter({hasText:'receipt-qa'}).waitFor();assert.equal(directCalls.length,before+1);assert.equal(directCalls.at(-1).paymentMethod,'manual_ath');assert.notEqual(directCalls.at(-1).saleAttemptId,directCalls[0].saleAttemptId)
 const pos=page.locator('.pos-workspace');await openPanelTools(pos);await pos.locator('.wf-panel-tools button').last().click();assert.equal(await pos.getAttribute('role'),'dialog');await page.keyboard.press('Escape');assert.equal(await pos.getAttribute('role'),null);assert.equal(await pos.locator('.pos-sale-layout').isVisible(),true,'Closing expanded POS restores its live state');
 await page.keyboard.press('Tab');await page.locator('.pos-search input').focus();assert.notEqual(await page.locator('.pos-search input').evaluate(el=>getComputedStyle(el).outlineStyle),'none');assert.deepEqual(errors,[])
 console.log('PASS isolated permissions, empty state, exact-attempt retry, reload protection, Stripe pending/server confirmation and new sale; no real transactions')
 await context.close()
}finally{await browser.close();await server.close()}

