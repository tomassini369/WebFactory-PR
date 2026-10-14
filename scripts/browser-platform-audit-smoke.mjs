import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';

const server=await createServer({server:{host:'127.0.0.1',port:5270,strictPort:true}});await server.listen();
const origin='http://127.0.0.1:5270';
const browser=await chromium.launch(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH,args:['--no-sandbox','--single-process','--no-zygote']}:undefined);
const {formatBusinessHours}=await server.ssrLoadModule('/src/business-hours.ts');
const schedule={Lunes:{enabled:true,open:'09:00',close:'17:00'},Martes:{enabled:false},Viernes:{enabled:true,open:'10:00',close:'14:00'}};
assert.equal(formatBusinessHours(schedule,'es'),'Lunes · 09:00–17:00; Viernes · 10:00–14:00');
assert.equal(formatBusinessHours({Monday:schedule.Lunes,Tuesday:schedule.Lunes},'en'),'Monday–Tuesday · 09:00–17:00');
const site={siteId:'audit-fixture',slug:'audit-fixture',business:{name:'Audit business',nameEn:'Audit business',nameEs:'Negocio de prueba',category:'Barber',description:'Fixture',locations:[]},design:{templateSlug:'northline-barber',primary:'#111111',secondary:'#D1B07C'},settings:{locale:'es',timezone:'America/New_York'},features:{bookings:true,cart:true},hours:schedule,paymentRules:{bookingPayment:'in_person',productPayment:'in_person',methods:{}},employees:[{id:'e',name:'Professional',serviceIds:['service']}],catalog:[{id:'service',name:'Service',type:'service',price:20,requiresAppointment:true,duration:30,inventory:null,description:''},{id:'product',name:'Product',type:'product',price:10,requiresAppointment:false,inventory:null,description:''}]};
const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];
page.setDefaultTimeout(12000);page.setDefaultNavigationTimeout(15000);
page.on('pageerror',error=>errors.push(error.message));
await page.route('**/.netlify/functions/**',route=>{
 const name=new URL(route.request().url()).pathname.split('/').at(-1);
 if(name==='public-client-site')return route.fulfill({json:{ok:true,site}});
 if(name==='booking-month-availability')return route.fulfill({json:{ok:true,available:{}}});
 if(name==='booking-availability')return route.fulfill({json:{ok:true,slots:[]}});
 return route.fulfill({json:{ok:true,user:null}});
});
const noOverflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
const closeWithKeyboard=async(selector)=>{
 const dialog=page.locator(selector);await dialog.waitFor();
 assert.equal(await dialog.getAttribute('role'),'dialog');assert.ok(await dialog.getAttribute('aria-label'));
 await page.keyboard.press('Tab');assert.ok(await dialog.evaluate(element=>element.contains(document.activeElement)));
 await page.keyboard.press('Shift+Tab');assert.ok(await dialog.evaluate(element=>element.contains(document.activeElement)));
 await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
};
try{
 for(const width of [320,375,390,430,768,1024,1440])for(const lang of ['es','en'])for(const theme of ['light','dark']){
  console.log(`CHECK ${width} ${lang} ${theme}`);
  await page.setViewportSize({width,height:1000});
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:lang.toUpperCase(),exact:true}).click();
  if(await page.locator('html').getAttribute('data-wf-theme')!==theme)await page.locator('.wf-theme-toggle').click();
  await noOverflow();
  for(const button of await page.locator('.footer .wf-feedback-preferences button').all())assert.ok((await button.boundingBox()).height>=44);
  await page.goto(origin+'/builder?template=brisa-cocina',{waitUntil:'domcontentloaded'});await page.locator('.wf-palette-row').waitFor();
  await page.locator('.langs').getByRole('button',{name:lang.toUpperCase(),exact:true}).click();
  assert.equal(await page.locator('.wf-palette-row button[aria-label]').count(),5);
  assert.equal(await page.locator('.wf-color-grid input[aria-label]').count(),4);await noOverflow();
  await page.goto(origin+'/sites/audit-fixture');await page.locator('.template-hero').waitFor();
  await page.locator('.template-languages').getByRole('button',{name:lang.toUpperCase(),exact:true}).click();
  await noOverflow();await page.locator('.template-hero-actions .template-glass').click();await closeWithKeyboard('.template-catalog-modal');
  await page.locator('.template-hero-actions .template-solid').click();await closeWithKeyboard('.cs-modal>section');
  console.log(`PASS public surfaces, colors, dialogs ${width} ${lang} ${theme}`);
 }
 for(const path of ['/client-admin','/webfactory-admin']){
  await page.goto(origin+path);await page.locator('input[type=email]').waitFor();
  const colors=await page.locator('.ca-login form>button,.wfa-login form>button').evaluate(element=>{const s=getComputedStyle(element);return {background:s.backgroundColor,color:s.color}});
  assert.equal(colors.background,'rgb(40, 95, 166)');assert.equal(colors.color,'rgb(255, 255, 255)');
 }
 assert.deepEqual(errors,[]);
 console.log('PASS grouped business hours and portal contrast tokens');
}finally{await browser.close();await server.close()}
