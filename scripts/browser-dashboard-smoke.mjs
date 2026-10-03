import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('dist');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!path.startsWith(root+'/'))throw Error('Invalid path');const data=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream'});res.end(data)}catch{res.writeHead(404);res.end('Not found')}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const url=`${origin}/design-preview/portal/preview.html`;
const browser=await chromium.launch({executablePath:process.env.WF_BROWSER_PATH||undefined,args:process.env.WF_BROWSER_PATH?['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--use-gl=angle','--use-angle=swiftshader']:[]});
const screenshots=process.env.WF_DASHBOARD_SCREENSHOTS;
if(screenshots)await mkdir(screenshots,{recursive:true});
const errors=[],backendCalls=[];
async function open(width,height,theme='dark',query=''){
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce',isMobile:width<=820,hasTouch:width<=820});
 page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(request.url().includes('/.netlify/functions/'))backendCalls.push(request.url())});
 await page.addInitScript(theme=>localStorage.setItem('webfactory-theme-v2',theme),theme);
 await page.goto(url+query);await page.locator('.bcc-v8[aria-busy=false]').waitFor();return page;
}
try{
 for(const [width,height] of [[320,568],[390,844],[430,932],[768,1024],[844,390],[1024,768],[1440,1000]])for(const theme of ['dark','light']){
  const page=await open(width,height,theme);
  if(theme==='light')await page.getByRole('button',{name:'ES',exact:true}).click();
  const dimensions=await page.evaluate(()=>({body:document.documentElement.scrollWidth,width:innerWidth,workBottom:document.querySelector('.ca-work').getBoundingClientRect().bottom,viewHeight:innerHeight}));
  assert(dimensions.body<=width+1,`page overflow at ${width}/${theme}`);assert(dimensions.workBottom<=height+1,`workspace below viewport at ${width}/${theme}`);
  const outside=await page.locator('.bcc-v8').evaluate(el=>[...el.querySelectorAll('*')].filter(node=>{if(node.closest('svg'))return false;const r=node.getBoundingClientRect();return r.width>0&&(r.left< -1||r.right>innerWidth+1)}).map(el=>el.className));
  assert.deepEqual(outside,[],`dashboard overflow at ${width}/${theme}`);
  await page.locator('.bcc-business-details').scrollIntoViewIfNeeded();
  const bottom=await page.locator('.bcc-business-details').boundingBox();assert(bottom.y+bottom.height<=height+2,`bottom card inaccessible ${width}`);
  await page.locator('.ca-work').evaluate(el=>el.scrollTop=0);
  if(screenshots&&[390,1440].includes(width))await page.screenshot({path:`${screenshots}/dashboard-${width}-${theme}.png`});
  await page.close();console.log(`Dashboard layout ${width}×${height} ${theme} passed`);
 }
 const page=await open(390,844);
 await page.getByRole('button',{name:'Next month',exact:true}).click();assert((await page.locator('.v8-month-controls strong').innerText()).length>0);
 await page.getByRole('button',{name:'Back to today',exact:true}).click();assert.equal(await page.locator('.v8-calendar-grid button[aria-pressed=true]').count(),1);
 const bookedDay=page.locator('.v8-calendar-grid button').filter({has:page.locator('i')}).first();await bookedDay.click();assert(await page.locator('.v8-day-summary li').count()>0);
 await page.locator('.v8-filters').getByRole('button',{name:'Orders',exact:true}).click();assert.equal(await page.locator('.v8-activity-icon.booking').count(),0);
 const panel=page.locator('.v8-performance');await panel.getByRole('button',{name:'Hide',exact:true}).click();assert.equal(await panel.locator('.v8-metric-grid').isVisible(),false);await panel.getByRole('button',{name:'Show',exact:true}).click();
 await panel.getByRole('button',{name:'Expand',exact:true}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
 await panel.getByRole('button',{name:'Scroll',exact:true}).click();assert.equal(await panel.getAttribute('class').then(s=>s.includes('wf-panel-scroll')),true);await panel.getByRole('button',{name:'Scroll',exact:true}).click();
 await page.locator('.v8-training').getByRole('button',{name:/Learn and practice/}).click();await page.locator('.wf-training').waitFor();await page.getByRole('button',{name:'Exit Training',exact:true}).click();await page.locator('.bcc-v8').waitFor();
 await page.locator('.v8-action-grid').getByRole('button',{name:/Bookings/}).click();await page.getByRole('heading',{name:'Manage appointments',exact:true}).waitFor();
 await page.close();
 const staff=await open(390,844,'dark','?caps=orders,bookings');assert.equal(await staff.locator('.v8-primary').count(),0);assert.equal(await staff.locator('.v8-action-grid > button').count(),2);await staff.close();
 const empty=await open(390,844,'dark','?state=empty');assert.equal(await empty.locator('.v8-metric > strong').first().innerText(),'$0.00');assert.equal(await empty.locator('.v8-booking').count(),0);await empty.close();
 const failed=await open(390,844,'dark','?state=error');assert.equal(await failed.locator('.v8-metric > strong').first().innerText(),'—');assert.equal(await failed.locator('.v8-trend').count(),0);await failed.close();
 assert.deepEqual(errors,[]);assert.deepEqual(backendCalls,[]);
 console.log('Calendar, filters, panel controls, Training, navigation, capability limits, empty/error states and preview isolation passed.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
