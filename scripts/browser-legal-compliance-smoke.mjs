import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const server=await createServer({server:{host:'127.0.0.1',port:5397,strictPort:true}});await server.listen();
const browser=await chromium.launch({executablePath:process.env.QA_CHROMIUM_PATH,args:['--no-sandbox']});
try{for(const width of [320,375,390,430,768,1024,1440])for(const lang of ['es','en'])for(const theme of ['light','dark']){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});await context.addInitScript(({lang,theme})=>{localStorage.setItem('webfactory-language',lang);localStorage.setItem('webfactory-theme-v2',theme)},{lang,theme});const page=await context.newPage();
 for(const route of ['/privacy','/terms','/refund-policy','/copyright']){await page.goto('http://127.0.0.1:5397'+route);await page.locator('.legal-hero h1').waitFor();assert(await page.locator('.legal-hero h1').innerText());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow ${route}/${width}/${lang}`);assert(await page.getByRole('note').count());if(route==='/copyright'){assert(await page.locator('form').count());assert.equal(await page.locator('input[type=checkbox]:checked').count(),0);}}
 await context.close();console.log(`PASS legal preview disclosures ${width} ${lang} ${theme}`);
}}finally{await browser.close();await server.close()}
