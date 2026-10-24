import assert from 'node:assert/strict';
import {preview} from 'vite';
import {chromium,webkit} from 'playwright';
import {mkdir} from 'node:fs/promises';
import {kioskSkins} from '../netlify/lib/kiosk-skins.mjs';
const port=Number(process.env.QA_PORT||5340),server=await preview({preview:{host:'127.0.0.1',port,strictPort:true}}),root=process.env.QA_ORIGIN||`http://127.0.0.1:${port}`;
const engine=process.env.QA_ENGINE==='webkit'?webkit:chromium,browser=await engine.launch({...engine===chromium?{args:['--no-sandbox'],...(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH}:{})}:process.env.QA_WEBKIT_PATH?{executablePath:process.env.QA_WEBKIT_PATH}:{}});
const errors=[],output='/tmp/webfactory-kiosk-skins';await mkdir(output,{recursive:true});
try{
for(const width of (process.env.QA_WIDTHS||'320,375,390,430,768,1024,1440').split(',').map(Number))for(const theme of ['light','dark'])for(const lang of ['es','en']){
 const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
 await context.addInitScript(({lang,theme})=>{localStorage.setItem('wf-kiosk-language',lang);localStorage.setItem('webfactory-theme-v2',theme)}, {lang,theme});
 await context.route('**/.netlify/functions/**',route=>{errors.push('Unexpected operational network request: '+new URL(route.request().url()).pathname);return route.abort()});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 await page.goto(root+'/design-preview/kiosk/preview/kiosk-skins.html');await page.locator('.kiosk-skin-options').waitFor();
 // The kiosk locale preference sets the shared language when its real core mounts.
 await page.getByRole('button',{name:'Ver kiosco / View kiosk',exact:true}).click();await page.locator('.kiosk-products').waitFor();await page.getByRole('button',{name:'Apariencia / Appearance',exact:true}).click();
 const t=(es,en)=>lang==='es'?es:en;
 for(const skin of kioskSkins){
  await page.getByRole('button',{name:new RegExp('^'+skin.name)}).click();
  await page.getByRole('button',{name:t('Previsualizar apariencia','Preview appearance'),exact:true}).click();
  assert.equal(await page.locator('.kiosk-appearance-preview').getAttribute('data-skin'),skin.id);
  await page.getByRole('button',{name:t('Cerrar vista previa','Close preview'),exact:true}).click();
  const save=page.getByRole('button',{name:t('Guardar apariencia','Save appearance'),exact:true});if(await save.isEnabled()){await save.click();await page.getByRole('status').filter({hasText:t('Apariencia guardada','Appearance saved')}).waitFor()}
  await page.getByRole('button',{name:'Ver kiosco / View kiosk',exact:true}).click();await page.locator('.kiosk-products').waitFor();assert.equal(await page.locator('main.wf-kiosk').getAttribute('data-skin'),skin.id);
  await page.getByRole('button',{name:t('Añadir Producto de práctica','Add Practice product'),exact:true}).click();assert.equal(await page.locator('.kiosk-cart li').count(),1);
  assert.equal(await page.locator('.kiosk-booking-actions').count(),0,'Disabled booking options must stay absent');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${skin.id} overflow ${width}`);
  if([390,1440].includes(width))await page.screenshot({path:`${output}/${skin.id}-${width}-${theme}-${lang}-${process.env.QA_ENGINE||'chromium'}.png`});
  await page.getByRole('button',{name:'Apariencia / Appearance',exact:true}).click();
 }
 await page.getByLabel(t('Color principal · fondo','Primary color · background'),{exact:true}).fill('#112233');await page.getByLabel(t('Color secundario · botones','Secondary color · buttons'),{exact:true}).fill('#ffffff');
 await page.getByLabel(t('Tipografía','Typography'),{exact:true}).selectOption('rounded');await page.getByLabel(t('Botones','Buttons'),{exact:true}).selectOption('square');await page.getByLabel(t('Tarjetas','Cards'),{exact:true}).selectOption('soft');await page.getByLabel(t('Fondo','Background'),{exact:true}).selectOption('neutral');await page.getByLabel(t('Animaciones','Animations'),{exact:true}).selectOption('none');await page.getByRole('button',{name:t('Guardar apariencia','Save appearance'),exact:true}).click();await page.getByRole('status').filter({hasText:t('Apariencia guardada','Appearance saved')}).waitFor();
 await page.getByRole('button',{name:'Ver kiosco / View kiosk',exact:true}).click();await page.locator('.kiosk-products').waitFor();const surface=page.locator('main.wf-kiosk');assert.equal(await surface.getAttribute('data-font'),'rounded');assert.equal(await surface.getAttribute('data-buttons'),'square');assert.equal(await surface.getAttribute('data-motion'),'none');
 await page.getByRole('button',{name:'Apariencia / Appearance',exact:true}).click();await page.getByLabel(t('Color principal · fondo','Primary color · background'),{exact:true}).fill('invalid');await page.getByRole('button',{name:t('Guardar apariencia','Save appearance'),exact:true}).click();await page.getByRole('alert').waitFor();
 await page.getByRole('button',{name:t('Restaurar Classic original','Restore original Classic'),exact:true}).click();await page.getByRole('status').filter({hasText:t('Apariencia guardada','Appearance saved')}).waitFor();await page.getByRole('button',{name:'Ver kiosco / View kiosk',exact:true}).click();await page.locator('.kiosk-products').waitFor();assert.equal(await page.locator('main.wf-kiosk').getAttribute('data-skin'),'classic');
 await context.close();console.log('PASS five skins/configurator/visual preview/save/tokens/validation/restore/disabled features/no network',width,theme,lang);
}
assert.deepEqual(errors,[]);
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve))}
