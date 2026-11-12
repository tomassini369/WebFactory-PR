import assert from 'node:assert/strict'
import {chromium} from 'playwright'
import {preview} from 'vite'

const port=Number(process.env.QA_PORT||5480)
const origin=process.env.QA_ORIGIN||`http://127.0.0.1:${port}`
const server=process.env.QA_ORIGIN?null:await preview({preview:{host:'127.0.0.1',port,strictPort:true}})
const browser=await chromium.launch({
  ...(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH}:{}),
  args:['--no-sandbox'],
  ...(process.env.QA_ORIGIN&&process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{}),
})
const fixtures=[
  {path:'/track/isolated-fixture',endpoint:'public-order-tracking',body:{ok:true,order:{items:[],updatedAt:'2026-11-10T00:00:00Z',status:'confirmed',paymentStatus:'paid',kitchenStatus:'preparing'}}},
  {path:'/customer-display',endpoint:'client-customer-display',body:{business:{siteId:'isolated',nameEn:'Isolated display',nameEs:'Pantalla aislada'},stale:false,payment:'draft',totals:{items:[],subtotal:0,discount:0,tax:0,tip:0,total:0}}},
]
const flush=()=>new Promise(resolve=>setTimeout(resolve,100))
async function setVisibility(page,state){
  await page.evaluate(value=>{
    Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>value})
    document.dispatchEvent(new Event('visibilitychange'))
    if(value==='visible')window.dispatchEvent(new Event('focus'))
  },state)
}
async function tick(page,ms){await page.clock.runFor(ms);await flush()}
try{
  for(const fixture of fixtures){
    const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'})
    await page.clock.install()
    let requests=0
    await page.route('**/.netlify/functions/**',route=>{
      assert.equal(route.request().method(),'GET','Fixtures never write to the deployed site')
      if(new URL(route.request().url()).pathname.endsWith('/'+fixture.endpoint)){
        requests++;return route.fulfill({json:fixture.body})
      }
      return route.fulfill({json:{ok:true}})
    })
    await page.goto(origin+fixture.path,{waitUntil:'domcontentloaded'})
    await page.locator('main h1').waitFor();await flush()
    const initial=requests
    for(let i=0;i<6;i++)await tick(page,5000)
    const visible=requests-initial
    await setVisibility(page,'hidden');const beforeHidden=requests
    for(let i=0;i<6;i++)await tick(page,5000)
    const hidden=requests-beforeHidden
    await setVisibility(page,'visible');await flush()
    const resumed=requests-beforeHidden-hidden
    assert(visible>=4,`${fixture.path} must keep refreshing while visible`)
    assert.equal(hidden,0,`${fixture.path} made background requests`)
    assert.equal(resumed,1,`${fixture.path} must refresh once on return`)
    console.log(JSON.stringify({path:fixture.path,visibleRequests30s:visible,hiddenRequests30s:hidden,resumeRequests:resumed}))
    await page.close()
  }

  const page=await browser.newPage({serviceWorkers:'block'})
  await page.clock.install()
  let requests=0
  const held=[]
  await page.route('**/.netlify/functions/**',route=>{
    assert.equal(route.request().method(),'GET')
    if(new URL(route.request().url()).pathname.endsWith('/public-order-tracking')){requests++;held.push(route);return}
    return route.fulfill({json:{ok:true}})
  })
  await page.goto(origin+'/track/isolated-slow',{waitUntil:'domcontentloaded'})
  await page.locator('main h1').waitFor();await flush()
  for(let i=0;i<3;i++)await tick(page,4000)
  assert.equal(requests,1,'Slow tracking response must not allow overlapping requests')
  await held[0].fulfill({json:fixtures[0].body})
  await page.getByText(/Preparing|En preparación/).waitFor()
  await tick(page,5500)
  assert.equal(requests,2,'Tracking resumes after a slow response')
  console.log(JSON.stringify({slowTrackingRequestsStartedIn12s:requests-1,recovered:true}))
  await page.close()
}finally{await browser.close();server?.httpServer.close()}
