import {chromium} from 'playwright';
import {membershipTrialDays} from '../shared/membership-plans.mjs';
import {execFileSync} from 'node:child_process';
import {readdir,readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
execFileSync(process.execPath,['scripts/preview-emails.mjs'],{stdio:'inherit'});
const directory=resolve('.email-preview');
const files=new Set(await readdir(directory));
const pages=[...files].filter(file=>file.endsWith('.html')&&file!=='index.html');
// Serve only generated fixtures; managed browsers may prohibit file:// pages.
const server=createServer(async(request,response)=>{
  const name=new URL(request.url,'http://localhost').pathname.slice(1);
  if(!files.has(name)){response.writeHead(404);response.end();return;}
  try{const type=name.endsWith('.html')?'text/html':name.endsWith('.js')?'text/javascript':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':'text/plain';response.setHeader('Content-Type',type+'; charset=utf-8');response.end(await readFile(resolve(directory,name)));}
  catch{response.writeHead(404);response.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
let browser;
try{
  browser=await chromium.launch(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH,args:['--no-sandbox']}:undefined);
  const page=await browser.newPage();
  // Verification cannot send, fetch remote images, or call platform APIs.
  await page.route('http**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  await page.goto(origin+'/index.html');
  await page.frameLocator('#email').getByRole('heading',{name:'Tu cita está confirmada'}).waitFor();
  await page.frameLocator('#email').getByText('PIN privado del kiosco',{exact:true}).waitFor();
  await page.frameLocator('#email').getByText('D3A00001',{exact:true}).waitFor();
  await page.getByLabel('Ejemplo').selectOption('platform-es-trial');
  await page.frameLocator('#email').getByRole('heading',{name:`Tu invitación a probar WebFactory por ${membershipTrialDays} días`}).waitFor();
  await page.getByRole('button',{name:'Ver móvil'}).click();
  assert.equal(await page.locator('#email').evaluate(element=>element.clientWidth),390);
  for(const width of [390,1280]){
    await page.setViewportSize({width,height:900});
    for(const file of pages){
      await page.goto(origin+'/'+file);
      assert.equal(await page.locator('h1').count(),1,`${file}: title`);
      assert(await page.locator('h1').innerText(),`${file}: empty title`);
      const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert(dimensions.scroll<=dimensions.width,`${file}: horizontal overflow at ${width}px`);
      assert.equal(await page.locator('script').count(),0,`${file}: email contains script`);
    }
    console.log(`Email previews passed: ${pages.length} at ${width}px`);
  }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
