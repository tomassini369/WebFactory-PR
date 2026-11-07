import assert from 'node:assert/strict';
import {GLASS_OPTIC_CONTROLS} from '../shared/glass-optics.mjs';
import {openAppearanceDetails} from './qa-appearance-disclosures.mjs';
export async function exerciseGlassOptics(page,scope,lang){
 const root=page.locator(scope),es=lang==='es';
 assert.equal(await root.getByRole('combobox',{name:es?'Diseño':'Design',exact:true}).count(),1);
 await root.getByRole('combobox',{name:es?'Apariencia del cristal':'Glass appearance',exact:true}).selectOption('liquid');await openAppearanceDetails(page,scope);
 const optics=root.locator('.wf-glass-controls'),names=await optics.locator('[aria-label]').evaluateAll(els=>els.map(el=>el.getAttribute('aria-label')));assert.equal(new Set(names).size,names.length,'No duplicated optical control');
 const layer=page.locator('.wf-licensed-liquid-glass').first();await layer.waitFor({state:'attached'});await layer.scrollIntoViewIfNeeded();await page.waitForFunction(()=>['svg','webgl'].includes(document.querySelector('.wf-licensed-liquid-glass')?.dataset.glassStrategy));const strategy=await layer.getAttribute('data-glass-strategy');
 await optics.getByRole('combobox',{name:es?'Calidad del cristal':'Glass quality',exact:true}).selectOption('standard');
 const motion=optics.getByRole('combobox',{name:es?'Ondulación del cristal':'Glass motion',exact:true});if(strategy==='svg')await motion.waitFor({state:'attached'});const hasMotion=(await motion.count())>0;assert.equal(hasMotion,strategy==='svg','Motion controls match actual renderer and remain available when offscreen');if(hasMotion)await motion.selectOption('flow');
 for(const c of GLASS_OPTIC_CONTROLS.filter(c=>hasMotion||!['liquidSpeed','liquidScale'].includes(c.key))){const control=optics.getByRole('slider',{name:es?c.es:c.en,exact:true});assert.equal(await control.count(),1);await control.press('End');assert.equal(Number(await control.inputValue()),c.max);await page.waitForFunction(({key,value})=>[...document.querySelectorAll('.wf-licensed-liquid-glass')].some(el=>JSON.parse(el.dataset.fluidOptics||'{}')[key]===value),{key:c.key,value:c.max});await root.getByRole('button',{name:es?'Deshacer':'Undo',exact:true}).click()}
 if(hasMotion){
  await page.emulateMedia({reducedMotion:'no-preference'});await layer.scrollIntoViewIfNeeded();const noise=layer.locator('feTurbulence');await noise.waitFor({state:'attached'});const before=await noise.getAttribute('baseFrequency');await page.waitForFunction(before=>{const el=document.querySelector('.wf-licensed-liquid-glass feTurbulence');return el&&el.getAttribute('baseFrequency')!==before},before);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>!document.querySelector('.wf-licensed-liquid-glass feTurbulence'));await motion.selectOption('off');
 }
 await optics.getByRole('combobox',{name:es?'Material del cristal':'Glass material',exact:true}).selectOption('smoked');
 await optics.getByRole('slider',{name:es?'Curvatura':'Curvature',exact:true}).press('End');
 assert.equal(JSON.parse(await layer.getAttribute('data-fluid-optics')).material,'smoked');
 console.log('PASS supported optical ranges, native keyboard, single controls, actual renderer configuration; SVG animation:',hasMotion,scope,lang);
}
