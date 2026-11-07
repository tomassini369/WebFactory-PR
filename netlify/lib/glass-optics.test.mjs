import {svgMotionCapability} from '../../shared/glass-optics.mjs';
import {appearanceFingerprint,appearanceMatches} from '../../shared/appearance-equality.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GLASS_OPTIC_CONTROLS,validGlassOptics,normalizeGlassOptics,glassRendererOptions} from '../../shared/glass-optics.mjs';
import {kioskAppearance} from './kiosk-skins.mjs';
import {kioskFixture} from '../../scripts/fixtures/kiosk-fixture.mjs';
test('each optical parameter is bounded and unsafe strings or unknown keys are rejected',()=>{
 for(const c of GLASS_OPTIC_CONTROLS){assert(validGlassOptics({[c.key]:c.min}));assert(validGlassOptics({[c.key]:c.max}));for(const value of [c.min-1,c.max+1,NaN,Infinity,'0',null])assert.equal(validGlassOptics({[c.key]:value}),false,c.key);assert.equal(normalizeGlassOptics({[c.key]:c.max+1})[c.key],c.max)}
 for(const input of [{tint:'url(https://bad.invalid)'},{material:'unknown'},{liquid:'script'},{quality:'unknown'},{css:'body{}'},{constructor:'x'},null,[]])assert.equal(validGlassOptics(input),false);
 assert.deepEqual(normalizeGlassOptics({css:'x',depth:NaN,tint:'red'}),{});
});
test('renderer maps actual optics without changing the original absent configuration',()=>{
 const original=glassRendererOptions({},10);assert.equal(original.lensOptions.strength,.1);assert.equal(original.frost,.08);assert.equal(original.material,'clear');assert.equal(original.glassColor,'rgba(255,255,255,0.08)');assert.equal(original.liquid,false);
 const values=Object.fromEntries(GLASS_OPTIC_CONTROLS.map(c=>[c.key,c.max]));const p=glassRendererOptions({...values,material:'smoked',tint:'#112233',liquid:'flow',quality:'high'},0);
 for(const key of ['depth','curvature','bend','bendWidth','sheen','sheenWidth','sheenFalloff','sheenAngle','specular','glow','glowSpread','glowFalloff','brightness'])assert.equal(p.lensOptions[key],values[key]);
 for(const key of ['frost','saturation','dispersion','aberrationIntensity','liquidSpeed','liquidScale'])assert.equal(p[key],values[key]);
 assert.equal(p.glassColor,'rgba(17,34,51,1)');assert.equal(p.liquid,'flow');assert.equal(p.quality,'high');assert.equal(glassRendererOptions({liquid:'flow'},10,false).liquid,false);
});
test('kiosk advanced optics are owner scoped and compatible with version 0/1 paired screens and writes',async()=>{
 const f=kioskFixture(),paired=await f.paired(),appearance={...kioskAppearance(),glassStyle:'liquid',glassDistortion:29,glassOptics:{curvature:.8,tint:'#112233'}};
 assert.equal((await f.admin('appearance',{appearance})).status,200);
 for(const version of [0,1,2]){const req=f.request(null,paired.cookie);req.headers.set('X-WF-Kiosk-Optics',String(version));const data=await(await f.handler(req)).json();assert.equal(Object.hasOwn(data.presentation.appearance,'glassOptics'),version===2);assert.equal(Object.hasOwn(data.presentation.appearance,'glassDistortion'),version>=1);assert.equal(data.saleId,paired.view.saleId)}
 const {glassOptics,...v1}=appearance;const req=f.request({action:'appearance',siteId:f.site.siteId,appearance:{...v1,glassDistortion:31}});req.headers.set('X-WF-Kiosk-Optics','1');assert.equal((await f.handler(req)).status,200);
 let data=await(await f.admin('admin')).json();assert.equal(data.appearance.glassOptics.curvature,.8);assert.equal(data.appearance.glassDistortion,31);
 assert.equal((await f.admin('appearance',{appearance:{...appearance,glassOptics:{curvature:4}}})).status,400);
 f.setRole('employee');assert.equal((await f.admin('appearance',{appearance})).status,403);
});

test('legacy CAS writes preserve advanced optics changed after the initial read',async()=>{
 const f=kioskFixture(),p=await f.paired();await f.admin('appearance',{appearance:{...kioskAppearance(),glassOptics:{curvature:.2}}});
 const get=f.store.get.bind(f.store);let armed=true;
 f.store.get=async(key,options)=>{const value=await get(key,options);if(armed&&key.includes('kiosk')&&value?.appearance){armed=false;await f.store.setJSON(key,{...value,appearance:{...value.appearance,glassOptics:{curvature:.9}}})}return value};
 const {glassOptics,...old}=kioskAppearance(),req=f.request({action:'appearance',siteId:f.site.siteId,appearance:old});req.headers.set('X-WF-Kiosk-Optics','1');assert.equal((await f.handler(req)).status,200);const data=await(await f.admin('admin')).json();assert.equal(data.appearance.glassOptics.curvature,.9);assert.equal((await(await f.handler(f.request(null,p.cookie))).json()).saleId,p.view.saleId);
});

test('duplicate appearance detection ignores nested JSON order without merging different functions',()=>{
 const first={background:'room',glassOptics:{curvature:.7,depth:.4}},second={glassOptics:{depth:.4,curvature:.7},background:'room'};
 assert.equal(appearanceFingerprint(first),appearanceFingerprint(second));assert(appearanceMatches(first,second));assert(appearanceMatches(first,{background:'room'}));assert.equal(appearanceMatches(first,{glassOptics:{depth:.8,curvature:.7}}),false);
});

test('SVG capability survives offscreen pause but not an observed WebGL renderer',()=>{assert.equal(svgMotionCapability(false,['paused']),false);assert.equal(svgMotionCapability(false,['svg']),true);assert.equal(svgMotionCapability(true,['paused','pending']),true);assert.equal(svgMotionCapability(true,['webgl']),false)});
