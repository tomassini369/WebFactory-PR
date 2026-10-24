import assert from 'node:assert/strict'
import {mkdir, writeFile} from 'node:fs/promises'
import {createServer} from 'vite'
import {chromium, webkit} from 'playwright'
import {PDFDocument} from 'pdf-lib'
import {execFileSync} from 'node:child_process'

const server=await createServer({server:{host:'127.0.0.1',port:5221,strictPort:true}})
await server.listen()
const engine=process.env.QA_ENGINE==='webkit'?webkit:chromium
const browser=await engine.launch(engine===chromium&&process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH,args:['--no-sandbox']}:undefined)
const output='/tmp/wf-receipt-print-qa';await mkdir(output,{recursive:true})
const receipt={receiptId:'receipt-print-fixture',transactionId:'txn-print-fixture',total:2500,subtotal:2500,tax:0,discounts:0,tip:0,paymentStatus:'paid',paymentMethod:'stripe',createdAt:'2026-10-24T23:30:00Z',customer:{name:'Cliente de prueba',email:'qa@example.invalid'},businessName:'Faro Norte · PRUEBAS',logoUrl:'/webfactory-pr-logo.png',items:[{name:'Corte clásico walk in',quantity:1,unitAmount:2500,amount:2500}]}
try{
 for(const width of (process.env.QA_WIDTHS||'320,375,390,430,768,1024,1440').split(',').map(Number))for(const theme of ['light','dark'])for(const lang of ['es','en']){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.route('**/__qa-print',async route=>route.fulfill({contentType:'text/html',body:await server.transformIndexHtml('/__qa-print','<html><head></head><body><div id="root"></div></body></html>')}))
  await page.route('**/.netlify/functions/**',()=>{throw Error('Print fixtures must never contact payment or tenant services')})
  await page.goto('http://127.0.0.1:5221/__qa-print')
  await page.evaluate(async({receipt,theme,lang})=>{
   const react=await import('/node_modules/.vite/deps/react.js'),React=react.default||react,dom=await import('/node_modules/.vite/deps/react-dom_client.js'),createRoot=dom.createRoot||dom.default.createRoot
   const {ThemeProvider}=await import('/src/theme.tsx'),{default:Buyer}=await import('/src/BuyerReceipt.tsx')
   await import('/src/styles.css');await import('/src/theme.css');await import('/src/liquid-glass.css')
   localStorage.setItem('webfactory-theme-v2',theme)
   // Reproduce the tall storefront and decorative background seen in iOS print.
   document.getElementById('root').style.cssText='min-height:6000px;background:linear-gradient(100deg,#3478ed 50%,black 50%);transform:translateZ(0)'
   const root=createRoot(document.getElementById('root')),{default:Paper}=await import('/src/ReceiptPaper.tsx')
   window.__renderReceipt=(value,standalone=false)=>root.render(React.createElement(ThemeProvider,null,React.createElement(standalone?Paper:Buyer,{receipt:value,lang,onClose:()=>{}})))
   window.__renderReceipt(receipt)
   window.print=()=>{window.__printed=(window.__printed||0)+1}
  },{receipt,theme,lang})
  await page.locator('.wf-original-receipt[data-print-state=completed]').waitFor()
  assert.equal(await page.evaluate(()=>Boolean(window.__printed)),false,'Never print automatically')
  await page.locator('.btn-action-tear').click();await page.locator('.inspector-modal[open]').waitFor()
  await page.locator('.inspector-action-btn.secondary').click()
  assert.equal(await page.evaluate(()=>window.__printed),1)
  await page.emulateMedia({media:'print'})
  const root=page.locator('body > .wf-receipt-print-root[data-active=true]')
  assert(await root.isVisible());assert.equal(await page.locator('#root').isVisible(),false)
  assert.equal(await page.locator('dialog:visible').count(),0,'Neither modal top layer may obscure the printed receipt')
  assert.match(await root.innerText(),/25[.,]00/);assert.match(await root.innerText(),/txn-print-fixture/)
  assert(await root.locator('.receipt-platform-logo img').evaluate(img=>img.complete&&img.naturalWidth>0))
  assert.equal(await root.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)')
  const pages={}
  if(engine===chromium)for(const format of ['Letter','A4']){
   const pdf=await page.pdf({format,printBackground:true});pages[format]=(await PDFDocument.load(pdf)).getPageCount()
   assert.equal(pages[format],1,`${width}/${theme}/${lang}/${format}: a short receipt must occupy one page`)
   if(width===390&&theme==='dark'&&lang==='es')await writeFile(`${output}/receipt-${format}.pdf`,pdf)
  }
  await page.emulateMedia({media:'screen'})
  assert.equal(await root.isVisible(),false);assert(await page.locator('.inspector-modal[open]').isVisible())
  await page.locator('.inspector-close-btn').click();assert(await page.locator('.wf-buyer-receipt[open]').isVisible())
  if(width===390&&theme==='dark'&&lang==='es'){
   await page.evaluate(receipt=>window.__renderReceipt({...receipt,total:150000,subtotal:150000,items:Array.from({length:60},(_,i)=>({...receipt.items[0],name:'Servicio '+(i+1)}))},true),receipt)
   await page.locator('.wf-buyer-receipt').waitFor({state:'detached'})
   await page.locator('.wf-original-receipt[data-print-state=completed]').waitFor()
   await page.locator('.btn-action-tear').click();await page.locator('.inspector-modal[open]').waitFor()
   await page.locator('.inspector-action-btn.secondary').click();await page.emulateMedia({media:'print'})
   if(engine===chromium){
    const pdf=await page.pdf({format:'Letter',printBackground:true})
    assert((await PDFDocument.load(pdf)).getPageCount()>1,'Long receipts must paginate instead of clipping')
    const text=execFileSync('pdftotext',['-','-'],{input:pdf}).toString()
    assert.match(text,/Servicio 60/);assert.match(text,/1,500[.]00/);assert.match(text,/txn-print-fixture/)
    await writeFile(`${output}/receipt-long.pdf`,pdf)
   }
   await page.emulateMedia({media:'screen'})
   console.log('PASS standalone portal and 60-item receipt pagination')
  }
  assert.deepEqual(errors,[])
  console.log('PASS receipt print isolation',width,theme,lang,pages)
  await page.close()
 }
}finally{await browser.close();await server.close()}
