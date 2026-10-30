import assert from 'node:assert/strict';
import {preview} from 'vite';
import {chromium,webkit} from 'playwright';
import {mkdir,readFile} from 'node:fs/promises';
const port=Number(process.env.QA_PORT||5370),server=await preview({preview:{host:'127.0.0.1',port,strictPort:true}}),root=process.env.QA_ORIGIN||`http://127.0.0.1:${port}`,engine=process.env.QA_ENGINE==='webkit'?webkit:chromium;
const browser=await engine.launch(engine===chromium?{args:['--no-sandbox'],...(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH}:{}),...(process.env.QA_ORIGIN&&process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})}:process.env.QA_WEBKIT_PATH?{executablePath:process.env.QA_WEBKIT_PATH}:{});
const output='/tmp/webfactory-kiosk-customizer',errors=[],photo=await readFile(new URL('../assets/template-images/262978.jpg',import.meta.url));await mkdir(output,{recursive:true});
try{
 for(const width of (process.env.QA_WIDTHS||'320,375,390,430,768,1024,1440').split(',').map(Number))for(const theme of (process.env.QA_THEMES||'light,dark').split(','))for(const lang of (process.env.QA_LANGS||'es,en').split(',')){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),t=(es,en)=>lang==='es'?es:en;
  await context.addInitScript(({lang,theme})=>{localStorage.setItem('wf-kiosk-language',lang);localStorage.setItem('webfactory-theme-v2',theme)},{lang,theme});
  await context.route('**/.netlify/functions/**',route=>{errors.push('Unexpected operational request '+new URL(route.request().url()).pathname);return route.abort()});
  const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(root+'/design-preview/kiosk/preview/kiosk-skins.html');await page.locator('.kiosk-recipe-options').first().waitFor();
  await page.getByRole('button',{name:'Ver kiosco / View kiosk',exact:true}).click();await page.locator('.kiosk-products').waitFor();await page.getByRole('button',{name:'Apariencia / Appearance',exact:true}).click();await page.waitForFunction(()=>{const fieldset=document.querySelector('.kiosk-editor-controls fieldset');return fieldset&&!fieldset.disabled});
  await page.getByRole('button',{name:t('Previsualizar apariencia','Preview appearance'),exact:true}).click();const surface=page.locator('.kiosk-appearance-preview');await surface.waitFor();
  for(const [name,skin] of [['Classic','classic'],['Studio Matte','barber-luxury'],['Bistro Gloss','restaurant-touch'],['Aurora Glass','glass-premium'],['Boutique Copper','retail-minimal'],['Garden Waves','classic']]){
   await page.getByRole('button',{name:`${t('Aplicar diseño','Apply design')} ${name}`,exact:true}).click();assert.equal(await surface.getAttribute('data-skin'),skin);
  }
  const paletteCards=page.locator('.kiosk-palette-options .kiosk-palette-card');
  assert.equal(await paletteCards.count(),23,'One color-palette catalogue contains all original and added options');
  assert.equal(await page.locator('.kiosk-premium-palette-options').count(),0,'No separate premium catalogue');
  assert.equal(await page.getByText(t('17 paletas premium','17 premium palettes'),{exact:true}).count(),0,'No premium classification is shown');
  assert.equal(await page.locator('.kiosk-palette-options .kiosk-palette-stack i').count(),23*6,'Every palette displays exactly six layered colors');
  await page.getByRole('button',{name:t('Paleta Ocean Blue','Palette Ocean Blue'),exact:true}).click();
  assert.equal(await page.getByLabel(t('Color principal · fondo','Primary color · background'),{exact:true}).inputValue(),'#021024');
  assert.equal(await page.getByLabel(t('Tipo de fondo','Background type'),{exact:true}).inputValue(),'gradient');
  assert.equal(await page.getByRole('button',{name:t('Paleta Ocean Blue','Palette Ocean Blue'),exact:true}).getAttribute('aria-pressed'),'true');
  assert.equal(await surface.getAttribute('data-palette-active'),'true');
  const six=await surface.evaluate(el=>Array.from({length:6},(_,i)=>el.style.getPropertyValue(`--wf-palette-${i+1}`).toUpperCase()));
  assert.deepEqual(six,['#021024','#052659','#16498A','#5483B3','#7DA0CA','#C1E8FF'],'All six colors are materialized on the actual kiosk surface');
  const roles=await surface.evaluate(el=>({panel:getComputedStyle(el).getPropertyValue('--sales-base').trim().toUpperCase(),action:getComputedStyle(el).getPropertyValue('--kiosk-brand').trim().toUpperCase()}));
  assert.equal(roles.panel,'#16498A');assert.equal(roles.action,'#5483B3');
  await page.getByLabel(t('Acabado','Finish'),{exact:true}).selectOption('glass');
  const tint=page.getByRole('checkbox',{name:t('Aplicar paleta a los cristales','Apply palette to glass'),exact:true});
  const tinted=await surface.locator('.kiosk-catalog').evaluate(el=>getComputedStyle(el).backgroundColor);
  await tint.uncheck();assert.equal(await surface.getAttribute('data-glass-palette'),'false');
  assert.notEqual(await surface.locator('.kiosk-catalog').evaluate(el=>getComputedStyle(el).backgroundColor),tinted);
  await tint.check();assert.equal(await surface.getAttribute('data-glass-palette'),'true');
  await page.locator('.gd-kiosk-wallpapers button').first().click();
  await page.getByRole('checkbox',{name:t('Mantener imagen original, sin oscurecimiento','Keep original image, without dimming'),exact:true}).check();
  await page.getByRole('button',{name:t('Paleta Forest','Palette Forest'),exact:true}).click();
  assert.equal(await surface.getAttribute('data-color-mode'),'solid','A palette can tint glass without replacing a natural photo');
  assert.equal(await surface.getAttribute('data-palette-active'),'true');
  assert.match(await surface.locator('.kiosk-backdrop-art').evaluate(el=>getComputedStyle(el).backgroundImage),/room.webp/);
  assert.equal(await surface.locator('.kiosk-backdrop-art').evaluate(el=>getComputedStyle(el).boxShadow),'none');
  await page.getByRole('checkbox',{name:t('Mantener imagen original, sin oscurecimiento','Keep original image, without dimming'),exact:true}).uncheck();

  await page.getByRole('button',{name:t('Paleta Forest','Palette Forest'),exact:true}).click();assert.equal(await page.getByLabel(t('Color principal · fondo','Primary color · background'),{exact:true}).inputValue(),'#143d30');
  assert.equal(await page.getByRole('button',{name:t('Paleta Forest','Palette Forest'),exact:true}).getAttribute('aria-pressed'),'true');
  assert.equal(await page.getByLabel(t('Color principal · fondo · Selector visual','Primary color · background · Visual picker'),{exact:true}).getAttribute('type'),'color');
  await page.getByLabel(t('Color principal · fondo','Primary color · background'),{exact:true}).fill('#123456');await page.getByRole('button',{name:t('Deshacer','Undo'),exact:true}).click();assert.equal(await page.getByLabel(t('Color principal · fondo','Primary color · background'),{exact:true}).inputValue(),'#143d30');await page.getByRole('button',{name:t('Rehacer','Redo'),exact:true}).click();assert.equal(await page.getByLabel(t('Color principal · fondo','Primary color · background'),{exact:true}).inputValue(),'#123456');
  await page.getByLabel(t('Acabado','Finish'),{exact:true}).selectOption('gloss');assert.equal(await surface.getAttribute('data-finish'),'gloss');
  await page.getByLabel(t('Tipo de fondo','Background type'),{exact:true}).selectOption('solid');
  await page.locator('.gd-kiosk-wallpapers button').first().click();
  await page.getByRole('checkbox',{name:t('Mantener imagen original, sin oscurecimiento','Keep original image, without dimming'),exact:true}).check();
  assert.equal(await surface.getAttribute('data-background-natural'),'true');
  assert.equal(await surface.locator('.kiosk-backdrop-shade').count(),0,'Natural wallpaper has no overlay');
  await page.getByLabel(t('Apariencia del cristal','Glass appearance'),{exact:true}).selectOption('liquid');
  assert.equal(await surface.getAttribute('data-glass-style'),'liquid');
  await surface.locator('.wf-licensed-liquid-glass').first().waitFor({state:'attached'});
  await page.getByLabel(t('Apariencia del cristal','Glass appearance'),{exact:true}).selectOption('classic');
  await page.getByRole('checkbox',{name:t('Mantener imagen original, sin oscurecimiento','Keep original image, without dimming'),exact:true}).uncheck();
  await page.getByLabel(t('Tipo de fondo','Background type'),{exact:true}).selectOption('gradient');await page.getByLabel(t('Ángulo del degradado','Gradient angle'),{exact:true}).press('End');assert.match(await surface.locator('.kiosk-backdrop-art').evaluate(el=>getComputedStyle(el).backgroundImage),/360deg/);
  await page.getByLabel(t('Tipo de fondo','Background type'),{exact:true}).selectOption('pattern');await page.getByLabel(t('Patrón','Pattern'),{exact:true}).selectOption('dots');assert.equal(await surface.locator('.kiosk-backdrop-art').evaluate(el=>getComputedStyle(el).backgroundSize),'24px 24px');
  await page.getByLabel(t('Color de cabecera','Header color'),{exact:true}).fill('#ffffff');await page.getByLabel(t('Color de tarjetas','Card color'),{exact:true}).fill('#000000');await page.getByLabel(t('Color del carrito','Cart color'),{exact:true}).fill('#102038');
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.kiosk-appearance-preview .kiosk-header')).backgroundColor==='rgb(255, 255, 255)'&&getComputedStyle(document.querySelector('.kiosk-appearance-preview .kiosk-product')).backgroundColor==='rgb(0, 0, 0)');assert.equal(await surface.locator('.kiosk-header').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)');assert.equal(await surface.locator('.kiosk-product').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(0, 0, 0)');
  await page.getByLabel(t('Bienvenida','Welcome'),{exact:true}).selectOption('hero');await page.getByLabel(t('Texto de bienvenida','Welcome text'),{exact:true}).fill('Welcome / Bienvenidos');assert.equal(await surface.locator('.kiosk-welcome h2').innerText(),'Welcome / Bienvenidos');
  await page.getByLabel(t('Distribución','Layout'),{exact:true}).selectOption('gallery');assert.equal(await surface.getAttribute('data-layout-override'),'gallery');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width} editor overflow`);
  // Fixture image remains entirely in this preview's in-memory transport.
  if([390,1440].includes(width)){
   await page.getByLabel(t('Subir imagen de fondo','Upload background image'),{exact:true}).setInputFiles({name:'background.jpg',mimeType:'image/jpeg',buffer:photo});await page.getByRole('status').filter({hasText:t('Imagen optimizada','Image optimized')}).waitFor();assert.equal(await surface.getAttribute('data-color-mode'),'image');assert.match(await surface.locator('.kiosk-backdrop-art').evaluate(el=>getComputedStyle(el).backgroundImage),/blob:/);
   await page.getByLabel(t('Posición horizontal','Horizontal position'),{exact:true}).press('End');await page.getByLabel(t('Posición vertical','Vertical position'),{exact:true}).press('Home');await page.getByLabel(t('Desenfoque','Blur'),{exact:true}).press('End');await page.waitForFunction(()=>getComputedStyle(document.querySelector('.kiosk-appearance-preview .kiosk-backdrop-art')).filter==='blur(20px)');assert.equal(await surface.locator('.kiosk-backdrop-art').evaluate(el=>getComputedStyle(el).filter),'blur(20px)');
   await page.getByLabel(t('Nombre de mi diseño','My design name'),{exact:true}).fill('My kiosk');await page.getByRole('button',{name:t('Guardar como diseño propio','Save as my design'),exact:true}).click();await page.getByRole('button',{name:t('Aplicar My kiosk','Apply My kiosk'),exact:true}).waitFor();
   await page.getByRole('button',{name:/^(Eliminar fondo|Delete background) background/}).click();await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/diseño guardado|saved design/);
   await page.getByRole('button',{name:t('Eliminar diseño My kiosk','Delete design My kiosk'),exact:true}).click();await page.getByRole('button',{name:t('Aplicar My kiosk','Apply My kiosk'),exact:true}).waitFor({state:'hidden'});
   await page.getByRole('button',{name:t('Quitar imagen del diseño','Remove image from design'),exact:true}).click();await page.getByRole('button',{name:/^(Eliminar fondo|Delete background) background/}).click();await page.locator('.kiosk-background-library article').waitFor({state:'hidden'});
   await page.getByLabel(t('Subir imagen de fondo','Upload background image'),{exact:true}).setInputFiles({name:'active-background.jpg',mimeType:'image/jpeg',buffer:photo});await page.getByRole('status').filter({hasText:t('Imagen optimizada','Image optimized')}).waitFor();
  }
  await page.getByRole('button',{name:t('Guardar apariencia','Save appearance'),exact:true}).click();await page.getByRole('status').filter({hasText:t('Apariencia guardada','Appearance saved')}).waitFor();
  await page.getByRole('button',{name:'Ver kiosco / View kiosk',exact:true}).click();await page.locator('.kiosk-products').waitFor();assert(await page.locator('.kiosk-cart').evaluate(cart=>{const rgb=value=>{const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.fillStyle=value;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3)},lum=value=>{const c=rgb(value).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return .2126*c[0]+.7152*c[1]+.0722*c[2]};return [...cart.querySelectorAll('input,select')].every(input=>{const css=getComputedStyle(input),a=lum(css.color),b=lum(css.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5})}),'Custom cart colors cannot make form text unreadable');assert.equal(await page.locator('main.wf-kiosk').getAttribute('data-finish'),'gloss');assert.equal(await page.locator('.kiosk-welcome h2').innerText(),'Welcome / Bienvenidos');await page.getByRole('button',{name:t('Añadir Producto de práctica','Add Practice product'),exact:true}).click();assert.equal(await page.locator('.kiosk-cart li').count(),1);assert.equal(await page.locator('.kiosk-booking-actions').count(),0);
  if([390,1440].includes(width)){assert.equal(await page.locator('main.wf-kiosk').getAttribute('data-color-mode'),'image');assert.match(await page.locator('main.wf-kiosk .kiosk-backdrop-art').evaluate(el=>getComputedStyle(el).backgroundImage),/blob:/)}
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width} customized kiosk overflow`);if([390,1440].includes(width))await page.screenshot({path:`${output}/customized-${width}-${theme}-${lang}-${process.env.QA_ENGINE||'chromium'}.png`,fullPage:true});
  // All four large reading panels reveal the photo; nested cards do not add blur.
  await page.getByRole('button',{name:'Apariencia / Appearance',exact:true}).click();await page.waitForFunction(()=>{const fieldset=document.querySelector('.kiosk-editor-controls fieldset');return fieldset&&!fieldset.disabled});await page.getByLabel(t('Acabado','Finish'),{exact:true}).selectOption('glass');
  await page.getByLabel(t('Opacidad de paneles','Panel opacity'),{exact:true}).press('Home');await page.getByLabel(t('Desenfoque del cristal','Glass blur'),{exact:true}).press('End');
  if([390,1440].includes(width)){await page.getByLabel(t('Desenfoque','Blur'),{exact:true}).press('Home');await page.getByLabel(t('Oscurecimiento','Overlay opacity'),{exact:true}).press('Home')}
  await page.getByRole('button',{name:t('Guardar apariencia','Save appearance'),exact:true}).click();await page.getByRole('status').filter({hasText:t('Apariencia guardada','Appearance saved')}).waitFor();await page.getByRole('button',{name:'Ver kiosco / View kiosk',exact:true}).click();await page.locator('.kiosk-products').waitFor();
  await page.waitForFunction(()=>[...document.querySelectorAll('.wf-kiosk .kiosk-header,.wf-kiosk .kiosk-welcome,.wf-kiosk .kiosk-catalog,.wf-kiosk .kiosk-cart')].every(el=>/0\.25(?:\)|\s|$)/.test(getComputedStyle(el).backgroundColor)&&getComputedStyle(el).backdropFilter.startsWith('blur(24px)')));
  for(const selector of ['.kiosk-header','.kiosk-welcome','.kiosk-catalog','.kiosk-cart']){const panel=page.locator(selector);assert.match(await panel.evaluate(el=>getComputedStyle(el).backgroundColor),/0\.25(?:\)|\s|$)/);assert.match(await panel.evaluate(el=>getComputedStyle(el).backdropFilter),/^blur\(24px\)/);assert.equal(await panel.evaluate(el=>getComputedStyle(el).opacity),'1')}
  assert.equal(await page.locator('.kiosk-product').first().evaluate(el=>getComputedStyle(el).backdropFilter),'none');await page.getByRole('button',{name:t('Añadir Producto de práctica','Add Practice product'),exact:true}).click();assert.equal(await page.locator('.kiosk-cart li').count(),1);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if([390,1440].includes(width))await page.screenshot({path:`${output}/glass-${width}-${theme}-${lang}.png`,fullPage:true});
  await page.emulateMedia({forcedColors:'active'});await page.waitForFunction(()=>matchMedia('(forced-colors: active)').matches&&getComputedStyle(document.querySelector('.kiosk-catalog')).backdropFilter==='none');assert.equal(await page.locator('.kiosk-catalog').evaluate(el=>getComputedStyle(el).backdropFilter),'none');await page.emulateMedia({forcedColors:'none',media:'print'});await page.waitForFunction(()=>matchMedia('print').matches&&getComputedStyle(document.querySelector('.kiosk-catalog')).backdropFilter==='none');assert.equal(await page.locator('.kiosk-catalog').evaluate(el=>getComputedStyle(el).backdropFilter),'none');await page.emulateMedia({media:'screen'});
  await page.getByRole('button',{name:'Apariencia / Appearance',exact:true}).click();await page.waitForFunction(()=>{const fieldset=document.querySelector('.kiosk-editor-controls fieldset');return fieldset&&!fieldset.disabled});assert.equal(await page.getByLabel(t('Opacidad de paneles','Panel opacity'),{exact:true}).inputValue(),'25');await page.waitForFunction(label=>[...document.querySelectorAll('input')].some(el=>el.labels?.[0]?.textContent===label&&el.value==='#000000'),t('Color de tarjetas','Card color'));assert.equal(await page.getByLabel(t('Color de tarjetas','Card color'),{exact:true}).inputValue(),'#000000');await page.getByRole('button',{name:t('Restaurar Classic original','Restore original Classic'),exact:true}).click();await page.getByRole('status').filter({hasText:t('Apariencia guardada','Appearance saved')}).waitFor();assert.equal(await page.getByLabel(t('Acabado','Finish'),{exact:true}).inputValue(),'original');
  await context.close();console.log('PASS visual recipes/palettes/color picker/finishes/gradient/pattern/zones/welcome/layout/undo/redo/presets/images/restore/commerce',width,theme,lang);
 }
 assert.deepEqual(errors,[]);
}catch(error){for(const c of browser.contexts())for(const p of c.pages())console.error({screen:(await p.locator('body').innerText()).slice(-4500),errors});throw error}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve))}
