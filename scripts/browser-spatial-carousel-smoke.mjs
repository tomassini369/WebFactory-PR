import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium,webkit} from 'playwright'
// A dev-only fixture exercises real business data changes without creating tenant records.
const fixture=`import React from 'react';import{createRoot}from'react-dom/client';import Highlights from '/src/TemplateHighlights.tsx';import '/src/template-glass.css';
const image='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="500"><rect width="600" height="500" fill="#506477"/></svg>');
const items=Array.from({length:3},(_,i)=>({id:'item-'+i,name:'Business highlight '+i,image,description:'A full business description. '.repeat(20),price:20+i,badge:'Featured'}));
const root=createRoot(document.getElementById('root'));window.renderHighlights=(count,lang='en',replace=false)=>root.render(React.createElement('div',{className:'template-site',style:{padding:'24px',minHeight:'1800px',background:document.documentElement.dataset.wfTheme==='dark'?'#171b24':'#f7f8fa'}},React.createElement(Highlights,{items:items.slice(0,count).map(v=>replace?{...v,id:'new-'+v.id}:v),language:lang})));window.renderHighlights(3);`
const server=await createServer({server:{host:'127.0.0.1',port:5199,strictPort:true},plugins:[{name:'carousel-qa-only',resolveId(id){if(id==='/carousel-qa.js')return '\0carousel-qa'},load(id){if(id==='\0carousel-qa')return fixture},configureServer(s){s.middlewares.use('/carousel-qa',async(req,res,next)=>{if(req.url!=='/')return next();res.setHeader('Content-Type','text/html');res.end(await s.transformIndexHtml('/carousel-qa','<html><head><style>body{margin:0}*{box-sizing:border-box}</style></head><body><div id="root"></div><script type="module" src="/carousel-qa.js"></script></body></html>'))})}}]})
await server.listen()
let checked=0
try{
 for(const engine of process.env.QA_SKIP_WEBKIT?[chromium]:[chromium,webkit]){
 const browser=await engine.launch(engine===chromium&&process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH,args:['--single-process']}:undefined)
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message))
 try{for(const width of [320,390,768,1440])for(const theme of ['light','dark'])for(const lang of ['en','es']){
  await page.setViewportSize({width,height:900})
  await page.goto('http://127.0.0.1:5199/carousel-qa/')
  await page.waitForFunction(()=>typeof window.renderHighlights==='function')
  await page.evaluate(({theme,lang})=>{document.documentElement.dataset.wfTheme=theme;window.renderHighlights(3,lang)},{theme,lang})
  const stage=page.locator('.template-spatial-stage'),active=()=>stage.locator('[data-active="true"]')
  await stage.waitFor()
  const next=page.getByRole('button',{name:lang==='es'?'Siguiente destacado':'Next highlight',exact:true})
  for(let i=1;i<=3;i++){await next.click();assert.equal(await active().getAttribute('data-index'),String(i%3))}
  await stage.press('End');assert.equal(await active().getAttribute('data-index'),'2')
  await stage.press('Home');assert.equal(await active().getAttribute('data-index'),'0')
  // Keyboard selection returns focus to the carousel, rather than a hidden side card.
  await stage.locator('[data-index="1"]').focus();await stage.locator('[data-index="1"]').press('Enter')
  assert.equal(await active().getAttribute('data-index'),'1');assert.equal(await stage.evaluate(e=>e===document.activeElement),true)
  await stage.press('Home')
  await page.emulateMedia({reducedMotion:'reduce'})
  assert.equal(await active().evaluate(e=>getComputedStyle(e).transitionDuration),'0s')
  const box=await stage.boundingBox();const x=box.x+box.width/2,y=box.y+100
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x-90,y,{steps:10});await page.mouse.up()
  await page.waitForFunction(()=>document.querySelector('.template-spatial-card[data-active="true"]').dataset.index==='1')
  assert.equal(await active().getAttribute('data-index'),'1','Horizontal dragging advances exactly one item')
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+90,{steps:10});await page.mouse.up()
  assert.equal(await active().getAttribute('data-index'),'1','Vertical gestures do not change the selection')
  if(engine===chromium&&width===390&&theme==='light'&&lang==='en'){
   const cdp=await page.context().newCDPSession(page)
   await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true})
   await stage.press('Home')
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]})
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-100,y}]})
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
   await page.waitForFunction(()=>document.querySelector('.template-spatial-card[data-active="true"]').dataset.index==='1')
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:y+100}]})
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-100}]})
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
   await page.waitForFunction(()=>scrollY>0)
   assert.equal(await active().getAttribute('data-index'),'1','Native vertical touch scrolling does not advance the carousel')
   await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach()
   await page.evaluate(()=>scrollTo(0,0))
  }
  await stage.press('Home')
  await page.waitForTimeout(300) // Let the original drag spring settle and release click suppression.
  await page.mouse.click(box.x+Math.min(box.width-10,box.width/2+250),box.y+box.height/2)
  await page.waitForTimeout(750) // Original spring completes before measuring the new front card.
  assert.equal(await active().getAttribute('data-index'),'1','Clicking the exposed side card selects it')
  // Geometry includes the full active card and dock, with no horizontal page overflow.
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
  const geometry=await active().evaluate(e=>{const r=e.getBoundingClientRect(),s=e.parentElement.getBoundingClientRect();return{inside:r.left>=s.left-1&&r.right<=s.right+1,ink:getComputedStyle(e.querySelector('h3')).color}})
  assert.ok(geometry.inside);assert.equal(geometry.ink,'rgb(255, 255, 255)')
  for(const button of await page.locator('.template-spatial-dock button').evaluateAll(es=>es.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}))))assert.ok(button.w>=44&&button.h>=44)
  const description=active().locator('p');assert.ok(await description.evaluate(e=>e.clientHeight>20&&e.scrollHeight>e.clientHeight));await description.focus();await description.press('End');await page.waitForFunction(()=>document.querySelector('.template-spatial-card[data-active="true"] p').scrollTop>0)
  const favorite=page.locator('.template-spatial-dock button[aria-pressed]')
  await favorite.click();assert.equal(await favorite.getAttribute('aria-pressed'),'true')
  const more=active().locator('.card-more-btn');await more.click()
  const options=page.locator('.wf-carousel-menu');await options.waitFor()
  assert.equal(await options.locator('button').first().evaluate(e=>e===document.activeElement),true)
  await page.keyboard.press('Escape');await options.waitFor({state:'detached'});assert.equal(await more.evaluate(e=>e===document.activeElement),true)
  await active().locator('.card-expand-btn').click()
  const dialog=page.getByRole('dialog');await dialog.waitFor();assert.equal(await dialog.locator('h2').textContent(),'Business highlight 1')
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'})
  assert.equal(await active().locator('.card-expand-btn').evaluate(e=>e===document.activeElement),true)
  if(width===390&&theme==='light'&&lang==='en'){
   await page.evaluate(()=>document.querySelector('.template-site').style.setProperty('--template-accent','#147354'))
   assert.equal(await favorite.evaluate(e=>getComputedStyle(e).color),'rgb(20, 115, 84)','Controls inherit business brand')
   await page.emulateMedia({reducedMotion:'no-preference'})
   await page.getByRole('button',{name:'Play slideshow',exact:true}).click();await page.waitForTimeout(4650)
   assert.equal(await active().getAttribute('data-index'),'2')
   await page.getByRole('button',{name:'Pause slideshow',exact:true}).click()
  }
  await page.evaluate(()=>window.renderHighlights(2));await page.waitForFunction(()=>document.querySelectorAll('.template-spatial-card').length===2);assert.equal(await stage.locator('article').count(),2)
  await page.getByRole('button',{name:'Next highlight',exact:true}).click();assert.equal(await stage.locator('[data-active="true"]').count(),1)
  await page.evaluate(()=>window.renderHighlights(1,'en',true));await page.waitForFunction(()=>document.querySelectorAll('.template-spatial-card').length===1);assert.equal(await active().getAttribute('data-index'),'0');assert.ok(await page.getByRole('button',{name:'Next highlight',exact:true}).isDisabled())
  await page.evaluate(()=>window.renderHighlights(0));await stage.waitFor({state:'detached'})
  assert.deepEqual(errors,[])
  checked++
 }}finally{await browser.close()}}
 console.log(`Spatial carousel QA: ${checked} engine/width/theme/locale cases passed; pointer, keyboard, reduced motion, long content and 0/1/2/3 items verified`)
}finally{await server.close()}
