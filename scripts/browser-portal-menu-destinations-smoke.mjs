import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'

// All account data and writes are isolated fixtures; never contacts live endpoints.
const server=await createServer({server:{host:'127.0.0.1',port:5240,strictPort:true}})
await server.listen()
let browser
try {
 for(const width of [390,1280])for(const theme of ['light','dark'])for(const lang of ['es','en']) {
  browser=await chromium.launch(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH,args:['--single-process','--no-sandbox']}:undefined)
  const page=await browser.newPage({viewport:{width,height:844}})
  const errors=[];page.on('pageerror',e=>errors.push(e.message))
  let site={siteId:'menu-fixture',slug:'menu-fixture',status:'published',revision:1,business:{name:'Menu fixture',category:'Retail',phone:'787-555-0100',locations:[]},design:{primary:'#0B1529',secondary:'#3C86F6',style:'Modern'},catalog:[],employees:[],hours:{},members:[],settings:{locale:'en',timezone:'America/Puerto_Rico',currency:'USD'},paymentRules:{},googleCalendar:{},features:{},servicePlan:{code:'complimentary',billingModel:'complimentary',subscriptionStatus:'complimentary'}}
  let writes=0
  await page.addInitScript(theme=>localStorage.setItem('webfactory-theme-v2',theme),theme)
  await page.route('**/.netlify/functions/**',async route=>{
   const request=route.request(),url=new URL(request.url()),name=url.pathname.split('/').at(-1)
   let payload={ok:true}
   if(name==='portal-session')payload={ok:true,user:{id:'menu-fixture-user',email:'menu@example.invalid',mfa:{required:false}}}
   else if(name==='client-admin') {
    if(request.method()==='PATCH') {
     const body=request.postDataJSON();assert.equal(body.siteId,site.siteId);assert.equal(body.section,'business');assert.equal(body.value.name,site.business.name);assert.equal(body.value.phone,site.business.phone)
     assert.equal(body.value.locations.length,1);assert.equal(body.value.locations[0].name,'Branch fixture');assert.equal(body.value.locations[0].address,'Test address');assert.equal(body.value.locations[0].active,true)
     site={...site,revision:site.revision+1,business:body.value};writes++;payload={ok:true,site}
    }else payload=url.searchParams.has('siteId')?{ok:true,site,membership:{role:'owner'}}:{ok:true,sites:[{siteId:site.siteId,slug:site.slug,businessName:site.business.name,status:'published'}]}
   }else {
    assert.equal(request.method(),'GET','Only the isolated location save is permitted')
    payload={ok:true,orders:[],bookings:[],configuration:[],policies:{},entries:[]}
   }
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)})
  })
  await page.goto('http://127.0.0.1:5240/client-admin');await page.locator('.ca-dashboard').waitFor()
  await page.locator('.portal-language').getByRole('button',{name:lang==='es'?'ES':'EN',exact:true}).click()
  const toggle=page.locator('.ca-mobile-menu-toggle'),nav=page.locator('.wf-sidebar-frame nav')
  const select=async name=>{if(width<=820&&await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();await nav.getByRole('button',{name,exact:true}).click()}
  await select(lang==='es'?'Sucursales':'Locations')
  const work=page.locator('.ca-work')
  await work.getByRole('button',{name:lang==='es'?'+ Añadir sucursal':'+ Add location',exact:true}).click()
  await work.getByLabel(lang==='es'?'Nombre':'Name',{exact:true}).fill('Branch fixture')
  await work.getByLabel(lang==='es'?'Dirección':'Address',{exact:true}).fill('Test address')
  page.once('dialog',dialog=>dialog.dismiss());await select(lang==='es'?'Cambiar diseño':'Change design')
  assert.equal(await nav.getByRole('button',{name:lang==='es'?'Sucursales':'Locations',exact:true}).getAttribute('aria-current'),'page')
  assert.equal(await work.getByLabel(lang==='es'?'Nombre':'Name',{exact:true}).inputValue(),'Branch fixture')
  if(width<=820)await toggle.click()
  await work.getByRole('button',{name:lang==='es'?'Guardar cambios':'Save changes',exact:true}).click()
  await work.getByRole('status').filter({hasText:lang==='es'?'Cambios publicados':'Changes published'}).waitFor()
  assert.equal(writes,1)
  await select(lang==='es'?'Cambiar diseño':'Change design')
  const builder=work.getByRole('link',{name:lang==='es'?'Abrir Builder para rediseñar ↗':'Open Builder to redesign ↗',exact:true})
  assert.equal(await builder.getAttribute('href'),'/builder?edit=menu-fixture')
  assert.equal(await nav.getByRole('button',{name:lang==='es'?'Cambiar diseño':'Change design',exact:true,includeHidden:true}).getAttribute('aria-current'),'page')
  await builder.click();await page.waitForURL('**/builder?edit=menu-fixture')
  await page.locator('.wf-redesign').getByRole('heading',{name:/Redesign your page|Rediseña tu página/,exact:true}).waitFor()
  assert.equal(await page.locator('.wf-redesign-grid input').first().inputValue(),'Menu fixture')
  site={...site,servicePlan:{...site.servicePlan,subscriptionStatus:'inactive'}}
  await page.goto('http://127.0.0.1:5240/client-admin');await page.locator('.ca-dashboard').waitFor();await page.locator('.portal-language').getByRole('button',{name:lang==='es'?'ES':'EN',exact:true}).click();await select(lang==='es'?'Cambiar diseño':'Change design')
  await work.getByText(lang==='es'?'Activa tu suscripción para rediseñar la página.':'Activate your subscription to redesign the website.',{exact:true}).waitFor()
  assert.equal(await work.locator('a[href^="/builder?edit="]').count(),0,'Inactive accounts retain the existing redesign plan gate')
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
  assert.deepEqual(errors,[])
  console.log('PASS menu destinations, isolated save, draft cancellation and redesign plan gate:',width,theme,lang)
  await browser.close();browser=null
 }
}finally{await browser?.close();await server.close()}
