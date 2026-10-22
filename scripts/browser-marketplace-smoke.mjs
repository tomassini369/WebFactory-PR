import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {preview} from 'vite'
import {chromium,webkit} from 'playwright'
const engine=process.env.QA_ENGINE||'chromium',port=Number(process.env.QA_PORT||5340)
const server=process.env.QA_ORIGIN?null:await preview({preview:{host:'127.0.0.1',port,strictPort:true}})
const origin=process.env.QA_ORIGIN||`http://127.0.0.1:${port}`
const browser=await(engine==='webkit'?webkit:chromium).launch(engine==='webkit'?(process.env.QA_WEBKIT_PATH?{executablePath:process.env.QA_WEBKIT_PATH}:{}):(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH,args:['--no-sandbox']}:{}))
const widths=(process.env.QA_WIDTHS||'320,375,390,430,768,1024,1440').split(',').map(Number)
const artifact='/tmp/webfactory-marketplace-qa';await mkdir(artifact,{recursive:true})
const noOverflow=async page=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Marketplace has horizontal page overflow')
async function checkAccessibility(page){
 const data=await page.locator('.mk-root').evaluate(root=>{
  const rgba=value=>{const match=value.match(/[\d.]+/g);return match?match.map(Number):[0,0,0,0]}
  const luminance=rgb=>rgb.slice(0,3).reduce((sum,v,i)=>{const c=v/255;return sum+((c<=.04045)?c/12.92:((c+.055)/1.055)**2.4)*[.2126,.7152,.0722][i]},0)
  const contrast=(a,b)=>{const l1=luminance(a),l2=luminance(b);return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)}
  const background=node=>{for(let item=node;item;item=item.parentElement){const color=rgba(getComputedStyle(item).backgroundColor);if(color.length===3||color[3]>=.99)return color}return [255,255,255]}
  const visible=node=>node.getClientRects().length&&getComputedStyle(node).visibility!=='hidden'
  const text=[],targets=[],boundaries=[]
  for(const node of root.querySelectorAll('p,h1,h2,h3,small,span,a,button,input,select,figcaption')){
   if(!visible(node)||node.closest('select')&&node.tagName!=='SELECT')continue
   const style=getComputedStyle(node)
   const hasText=[...node.childNodes].some(child=>child.nodeType===Node.TEXT_NODE&&child.textContent.trim())||['INPUT','SELECT'].includes(node.tagName)
   if(hasText){const label=(node.innerText||node.value||node.placeholder||node.tagName).slice(0,70),minimum=parseFloat(style.fontSize)>=24||(parseFloat(style.fontSize)>=18.66&&parseFloat(style.fontWeight)>=700)?3:4.5;text.push({label,ratio:contrast(rgba(style.color),background(node)),minimum})}
   if(node.matches('a,button,input,select')){const box=node.getBoundingClientRect();if(node.matches('.mk-skip')&&box.bottom<0)continue;targets.push({name:(node.innerText||node.getAttribute('aria-label')||node.tagName).slice(0,40),width:box.width,height:box.height})}
   if(node.matches('button,.mk-search label>div')){const adjacent=background(node.parentElement);boundaries.push({label:(node.innerText||node.tagName).slice(0,40),ratio:Math.max(contrast(rgba(style.borderTopColor),adjacent),contrast(background(node),adjacent)),interactive:node.matches('button')})}
  }
  const logos=[...root.querySelectorAll('.wf-adaptive-logo')].map(node=>{const style=getComputedStyle(node);return {src:node.getAttribute('src'),filter:style.filter,fit:style.objectFit,clip:style.clipPath,transform:style.transform}})
  return {text,targets,boundaries,logos}
 })
 assert.deepEqual(data.text.filter(item=>item.ratio+.01<item.minimum),[],'Text contrast')
 assert.deepEqual(data.targets.filter(item=>item.width<43.9||item.height<43.9),[],'44px touch targets')
 // The selected language has a border; unselected language buttons use readable text.
 assert.deepEqual(data.boundaries.filter(item=>item.interactive&&!['ES','EN'].includes(item.label)&&item.ratio<3),[],'Interactive contrast')
 for(const logo of data.logos){assert(['/webfactory-pr-logo.png','/webfactory-pr-logo-dark.png'].includes(logo.src));assert.equal(logo.filter,'none');assert.equal(logo.fit,'contain');assert.equal(logo.clip,'none');assert.equal(logo.transform,'none')}
}
try{
 for(const width of widths)for(const theme of ['light','dark'])for(const lang of ['es','en']){
  const context=await browser.newContext({viewport:{width,height:width===320?740:900},reducedMotion:'reduce',serviceWorkers:'block',...(engine==='webkit'?{hasTouch:true}:{})})
  await context.addInitScript(({theme,lang})=>{if(window.top!==window)return;localStorage.setItem('webfactory-theme-v2',theme);localStorage.setItem('webfactory-language',lang)},{theme,lang})
  const page=await context.newPage(),errors=[],functions=[],media=[]
  page.on('pageerror',error=>errors.push(error.message))
  page.on('request',request=>{if(request.url().includes('/.netlify/functions/'))functions.push(request.url());if(/webfactory-hero|HomePage-[^/]+\.(js|css)/.test(request.url()))media.push(request.url())})
  await page.route('**/.netlify/functions/**',route=>route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({ok:false,message:'Unexpected function request on public Marketplace'})}))
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});await page.locator('.mk-root').waitFor()
  await page.waitForFunction(()=>{const image=document.querySelector('.mk-hero-photo img');return image?.complete&&image.naturalWidth>0})
  assert.match(await page.locator('.mk-hero-photo img').getAttribute('src'),/^\/marketplace\//)
  assert.equal(await page.locator('.mk-photo-error').count(),0)
  assert.equal(await page.locator('html').getAttribute('lang'),lang)
  assert.equal(await page.locator('html').getAttribute('data-wf-theme'),theme)
  assert.equal(await page.locator('.wf-theme-toggle').count(),1,'No duplicated floating theme control')
  assert.equal(await page.locator('.mk-root select option').count(),79,'All 78 municipalities plus All')
  assert.equal(await page.locator('.mk-category-list button').count(),9)
  // Deploy Preview tooling may add its own iframe outside the application.
  assert.equal(await page.locator('.mk-root').locator('.wf-premium-home,video,iframe,.template-highlights').count(),0)
  assert.deepEqual(media,[],'Marketplace must not load the commercial landing/video')
  assert.deepEqual(functions,[],'No private tenant listing or fabricated feed API')
  await noOverflow(page);await checkAccessibility(page)
  const query=page.getByRole('searchbox'),municipality=page.locator('select[name="municipio"]')
  await query.fill('café & servicio');await municipality.selectOption('Rincón');await page.locator('.mk-search-button').click()
  await page.waitForURL('**/?q=**');await page.locator('.mk-applied').waitFor()
  assert.equal(new URL(page.url()).searchParams.get('municipio'),'Rincón');assert.match(await page.locator('.mk-applied').innerText(),/café & servicio/)
  assert.match(await page.locator('.mk-selected-town').innerText(),/Rincón/)
  await page.locator('.mk-category-list button').nth(1).click();assert.equal(new URL(page.url()).searchParams.get('categoria'),'barberias')
  assert.equal(await page.locator('.mk-category-list button').nth(1).getAttribute('aria-pressed'),'true')
  await noOverflow(page);await page.reload({waitUntil:'domcontentloaded'});await page.locator('.mk-applied').waitFor();assert.equal(await query.inputValue(),'café & servicio');assert.equal(await municipality.inputValue(),'Rincón')
  await page.locator('.mk-applied button').click();assert.equal(new URL(page.url()).search,'');assert.equal(await query.inputValue(),'');assert.equal(await municipality.inputValue(),'');await page.waitForFunction(()=>document.querySelector('input[name="q"]')===document.activeElement)
  await page.locator('.mk-languages button').filter({hasText:lang==='es'?'EN':'ES'}).click();assert.equal(await page.locator('html').getAttribute('lang'),lang==='es'?'en':'es');await page.locator('.mk-languages button').filter({hasText:lang.toUpperCase()}).click()
  await page.locator('.mk-tools .wf-theme-toggle').click();assert.equal(await page.locator('html').getAttribute('data-wf-theme'),theme==='light'?'dark':'light');await page.locator('.mk-tools .wf-theme-toggle').click()
  await page.keyboard.press('Control+Home');await page.keyboard.press('Tab');await noOverflow(page)
  await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur()})
  if([390,1440].includes(width))await page.screenshot({path:`${artifact}/marketplace-${width}-${theme}-${lang}-${engine}.png`,fullPage:true})
  assert.equal(await page.locator('.mk-navigation a[href="#descubrir"]').getAttribute('href'),'#descubrir')
  assert.equal(await page.locator('.mk-create-link').getAttribute('href'),'/crear')
  assert.deepEqual(errors,[]);console.log('PASS Marketplace filters, locales, theme, empty states, logo and accessibility',width,theme,lang,engine)
  await context.close()
 }
 // Same-document cross navigation and original commercial landing integrity.
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'})
 await context.addInitScript(()=>{if(window.top!==window)return;localStorage.setItem('webfactory-language','es')})
 const page=await context.newPage(),errors=[];let documents=0
 page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(request.isNavigationRequest()&&request.frame()===page.mainFrame())documents++})
 await page.route('**/.netlify/functions/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,user:null})}))
 await page.goto(origin+'/',{waitUntil:'domcontentloaded'});await page.locator('.mk-root').waitFor();const baseline=documents
 await page.keyboard.press('Tab');assert(await page.locator('.mk-skip').evaluate(node=>node===document.activeElement));await page.keyboard.press('Enter');assert(await page.locator('#marketplace-content').evaluate(node=>node===document.activeElement))
 // Skip-link fragments intentionally use native navigation in the existing router.
 await page.evaluate(()=>history.replaceState(history.state,'','/'))
 await page.locator('.mk-create-link').click();await page.locator('.wf-premium-home').waitFor();assert.equal(new URL(page.url()).pathname,'/crear');assert.equal(documents,baseline)
 assert.equal(await page.locator('.wf-theme-toggle').count(),1)
 assert.equal(await page.locator('.wf-hero-media img').getAttribute('src'),'/media/webfactory-hero-poster.webp')
 assert.equal(await page.locator('.wf-tour-step').count(),5);assert.equal(await page.locator('#plataforma .wf-platform article').count(),5)
 for(const section of ['recorrido','plataforma','explorar','como-funciona','planes','faq'])assert.equal(await page.locator('#'+section).count(),1,section)
 assert.equal(await page.locator('.wf-mcp').count(),1);assert.equal(await page.getByRole('tab').count(),4);assert.match(await page.locator('.wf-price').innerText(),/\$30/);assert.match(await page.locator('.wf-price').innerText(),/350/)
 assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://webfactorypr.com/crear')
 await page.getByRole('tab').first().click();await page.locator('.wf-demo-product button').click();assert.match(await page.locator('.wf-demo-total').innerText(),/29/)
 await page.locator('.wf-h-login').click();await page.locator('input[type="email"]').waitFor();await page.locator('.portal-return-home').click();await page.locator('.mk-root').waitFor();assert.equal(documents,baseline)
 assert.equal(await page.locator('html').getAttribute('lang'),'es');assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://webfactorypr.com/')
 await page.goBack();await page.locator('input[type="email"]').waitFor();await page.goBack();await page.locator('.wf-premium-home').waitFor();await page.goBack();await page.locator('.mk-root').waitFor()
 await page.goto(origin+'/crear/',{waitUntil:'domcontentloaded'});await page.locator('.wf-premium-home').waitFor();await noOverflow(page)
 // Reduced motion never attaches video sources. Ordinary motion retains the approved file.
 assert.equal(await page.locator('.wf-hero-media video').count(),0)
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(origin+'/crear',{waitUntil:'load'});await page.locator('.wf-hero-media video').waitFor();assert.equal(await page.locator('.wf-hero-media video source').first().getAttribute('src'),'/media/webfactory-hero-original.mp4')
 await page.route('**/marketplace/*.webp',route=>route.abort());await page.goto(origin+'/',{waitUntil:'domcontentloaded'});await page.locator('.mk-photo-error').waitFor();assert(await page.getByRole('searchbox').isVisible());await noOverflow(page)
 assert.deepEqual(errors,[]);await context.close();console.log('PASS Marketplace /crear /portal history, complete landing, video, reduced motion and image recovery',engine)
}catch(error){console.error('::error title=Marketplace phase 1::'+String(error?.stack||error).replace(/%/g,'%25').replace(/\n/g,'%0A'));throw error}finally{await browser.close();if(server)await new Promise(resolve=>server.httpServer.close(resolve))}
