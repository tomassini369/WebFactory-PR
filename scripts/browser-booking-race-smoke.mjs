import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const origin='http://127.0.0.1:5271',server=await createServer({server:{host:'127.0.0.1',port:5271,strictPort:true}});await server.listen();
const browser=await chromium.launch(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH,args:['--no-sandbox','--single-process','--no-zygote']}:undefined),page=await browser.newPage({reducedMotion:'reduce'});
const site={siteId:'race',slug:'race',business:{name:'Test',locations:[]},design:{templateSlug:'northline-barber'},features:{bookings:true},settings:{locale:'en',timezone:'America/Puerto_Rico'},hours:{},paymentRules:{bookingPayment:'in_person'},catalog:[{id:'cut',type:'service',name:'Cut',price:20,inventory:null,requiresAppointment:true,duration:30}],employees:[{id:'e',name:'Professional',serviceIds:['cut']}]};
let releaseFirst,firstSeen,firstCompleted;
const seen=new Promise(resolve=>firstSeen=resolve),completed=new Promise(resolve=>firstCompleted=resolve),release=new Promise(resolve=>releaseFirst=resolve);
await page.route('**/.netlify/functions/**',async route=>{
 const name=new URL(route.request().url()).pathname.split('/').at(-1);
 if(name==='public-client-site')return route.fulfill({json:{ok:true,site}});
 if(name==='booking-month-availability')return route.fulfill({json:{ok:true,available:{}}});
 if(name==='booking-availability'){
  const date=route.request().postDataJSON().date;
  if(date==='2030-01-07'){firstSeen();await release}
  const start=date+(date==='2030-01-07'?'T13:00:00.000Z':'T15:00:00.000Z');
  await route.fulfill({json:{ok:true,slots:[{start,end:date+'T15:30:00.000Z'}]}}).catch(()=>{});
  if(date==='2030-01-07')firstCompleted();
  return;
 }
 return route.fulfill({json:{ok:true,user:null}});
});
try{
 await page.goto(origin+'/sites/race');await page.locator('.template-hero-actions .template-solid').click();
 await page.locator('.cs-booking select').nth(1).selectOption('e');await page.getByRole('button',{name:'Quick date',exact:true}).click();
 const date=page.locator('.cs-quick-date input');await date.fill('2030-01-07');await seen;await date.fill('2030-01-08');
 const option=page.locator('.cs-booking fieldset button');await option.waitFor();const latest=await option.textContent();
 releaseFirst();await completed;await page.waitForTimeout(50);
 assert.equal(await date.inputValue(),'2030-01-08');assert.equal(await option.textContent(),latest);
 await option.click();assert.equal(await option.getAttribute('class'),'active');
 await page.keyboard.press('Escape');await page.locator('.cs-booking').waitFor({state:'hidden'});
 console.log('PASS reversed availability responses preserve the newest selection and Escape closes the live booking dialog');
}finally{releaseFirst();await browser.close();await server.close()}
