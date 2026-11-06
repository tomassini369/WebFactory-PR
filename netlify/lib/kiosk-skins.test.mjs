import test from 'node:test';
import assert from 'node:assert/strict';
import {kioskAppearance,kioskSkins,validateKioskAppearance} from './kiosk-skins.mjs';
import {kioskFixture} from '../../scripts/fixtures/kiosk-fixture.mjs';
import {kioskConfigKey,kioskDeviceKey} from './kiosk.mjs';
test('appearance is finite, versioned and fails back to the original Classic',()=>{
 assert.equal(kioskSkins.length,5);
 for(const value of [null,[],{},'classic',{skinId:'foreign'},{skinId:'classic',version:2},{font:'url(https://invalid)'},{primary:'red'},{secondary:'#fff'},{script:'alert(1)'},{paymentProvider:'stripe'},{motion:'loop'}]){
  if(value&&typeof value==='object'&&!Array.isArray(value)&&!Object.keys(value).length)continue;
  assert.equal(kioskAppearance(value).skinId,'classic');
  assert.throws(()=>validateKioskAppearance(value));
 }
 assert.equal(kioskAppearance().primary,'');
});
for(const skin of kioskSkins)test(`${skin.name}: save is tenant scoped, preserves pending sale and is visible on paired screens`,async()=>{
 const f=kioskFixture(),paired=await f.paired();
 const before=await f.store.get(kioskConfigKey(f.site.siteId));
 const checkout=await f.handler(f.request({action:'checkout',saleId:paired.view.saleId,items:[{id:'product',quantity:1}],customer:{name:'Fixture',email:'fixture@example.invalid'},paymentProvider:'stripe'},paired.cookie));
 assert.equal(checkout.status,200);
 const device=await f.store.get(kioskDeviceKey(paired.id));
 const appearance={...kioskAppearance(),skinId:skin.id,primary:'#102030',secondary:'#ffffff',font:'rounded',buttons:'square',cards:'soft',background:'neutral',motion:'none'};
 const saved=await f.admin('appearance',{appearance});assert.equal(saved.status,200);assert.deepEqual((await saved.json()).appearance,appearance);
 const after=await f.store.get(kioskConfigKey(f.site.siteId));assert.deepEqual(after.devices,before.devices);assert.equal(after.enabled,true);
 assert.deepEqual(await f.store.get(kioskDeviceKey(paired.id)),device);
 const view=await (await f.handler(f.request(null,paired.cookie))).json();assert.deepEqual(view.presentation.appearance,appearance);assert.equal(view.saleId,paired.view.saleId);assert.equal(view.sale.status,'pending');assert.equal(f.calls(),1);
 const restored=await f.admin('appearance',{appearance:kioskAppearance()});assert.equal(restored.status,200);assert.deepEqual(await f.store.get(kioskDeviceKey(paired.id)),device);
});
test('invalid writes, employee writes, paired device writes and foreign tenants cannot change appearance',async()=>{
 const f=kioskFixture(),p=await f.paired();
 const original=await f.store.get(kioskConfigKey(f.site.siteId));
 assert.equal((await f.admin('appearance',{appearance:{skinId:'unknown'}})).status,400);
 assert.equal((await f.admin('appearance',{appearance:{...kioskAppearance(),css:'body{}'}})).status,400);
 f.setRole('employee');assert.equal((await f.admin('appearance',{appearance:kioskAppearance()})).status,403);f.setRole('owner');
 assert.equal((await f.admin('appearance',{siteId:'foreign',appearance:kioskAppearance()})).status,403);
 assert.equal((await f.handler(f.request({action:'appearance',appearance:kioskAppearance()},p.cookie))).status,403);
 assert.deepEqual(await f.store.get(kioskConfigKey(f.site.siteId)),original);
 await f.store.setJSON(kioskConfigKey(f.site.siteId),{...original,appearance:{skinId:'retail-minimal',version:99}});
 const view=await(await f.handler(f.request(null,p.cookie))).json();assert.equal(view.presentation.appearance.skinId,'classic');
});
for(const skin of kioskSkins)for(const provider of ['stripe','ath_movil','in_person'])test(`${skin.name}: ${provider} uses the existing checkout, receipt and reset contract`,async()=>{
 const f=kioskFixture();if(provider==='in_person')f.setMode('in_person');const p=await f.paired();
 await f.admin('appearance',{appearance:{...kioskAppearance(),skinId:skin.id}});
 const response=await f.handler(f.request({action:'checkout',saleId:p.view.saleId,items:[{id:'product',quantity:1}],customer:{name:'Fixture',email:'fixture@example.invalid'},paymentProvider:provider},p.cookie));
 assert.equal(response.status,200);let view=await response.json();assert.equal(f.calls(),1);assert.equal(view.sale.status,provider==='in_person'?'due':'pending');
 if(provider!=='in_person'){await f.confirm();view=await(await f.handler(f.request(null,p.cookie))).json();assert.equal(view.sale.status,'paid');assert.equal(view.sale.receipt.id,'receipt-fixture')}
 assert.equal(view.presentation.appearance.skinId,skin.id);assert.equal(view.sale.canReset,true);
 const reset=await f.handler(f.request({action:'reset',saleId:p.view.saleId},p.cookie));assert.equal(reset.status,200);const next=await reset.json();assert.equal(next.sale,null);assert.notEqual(next.saleId,p.view.saleId);assert.equal(next.presentation.appearance.skinId,skin.id);
});
test('disabled new bookings do not gain public booking links from a skin',async()=>{
 const f=kioskFixture();f.site.features={bookings:false};const p=await f.paired();await f.admin('configure',{enabled:true,bookingModes:{newBookings:true,existingBookings:false}});
 const view=await(await f.handler(f.request(null,p.cookie))).json();assert.equal(view.hasAppointments,false);assert.equal(view.bookingModes.newBookings,false);assert.deepEqual(view.appointmentServices,[]);
});

test('Glassy depth and bundled wallpaper persist through the existing paired kiosk view',async()=>{
 const f=kioskFixture(),p=await f.paired();
 const response=await f.admin('appearance',{appearance:{...kioskAppearance(),cardDepth:'raised',buttonDepth:'flat',wallpaper:'landscape'}});assert.equal(response.status,200);
 const view=await(await f.handler(f.request(null,p.cookie))).json();assert.equal(view.presentation.appearance.cardDepth,'raised');assert.equal(view.presentation.appearance.buttonDepth,'flat');assert.equal(view.presentation.appearance.wallpaper,'landscape');
 for(const patch of [{cardDepth:'url(x)'},{buttonDepth:'loop'},{wallpaper:'https://invalid/x'}])assert.throws(()=>validateKioskAppearance({...kioskAppearance(),...patch}));
});

test('kiosk clear glass settings preserve existing appearance and reject unsafe values',()=>{
 const legacy=kioskAppearance({glassOpacity:70,overlayOpacity:55});
 assert.equal(legacy.glassStyle,'classic');assert.equal(legacy.backgroundNatural,false);
 const clear=validateKioskAppearance({...legacy,glassStyle:'liquid',backgroundNatural:true,glassOpacity:25,glassBlur:24,overlayOpacity:0});
 assert.equal(clear.glassStyle,'liquid');assert.equal(clear.backgroundNatural,true);
 assert.equal(clear.glassOpacity,25);assert.equal(clear.overlayOpacity,0);
 for(const patch of [{glassStyle:'script'},{backgroundNatural:'true'},{glassOpacity:24},{glassBlur:25}]){
  assert.throws(()=>validateKioskAppearance({...legacy,...patch}));
 }
});

test('kiosk distortion defaults legacy records and rejects unsupported optical values',()=>{
 assert.equal(validateKioskAppearance({glassStyle:'liquid'}).glassDistortion,10);
 for(const value of [0,10,50])assert.equal(validateKioskAppearance({glassDistortion:value}).glassDistortion,value);
 for(const value of [-1,51,1.5,'20',null,NaN,Infinity])assert.throws(()=>validateKioskAppearance({glassDistortion:value}));
});
test('kiosk distortion saves to paired presentation and presets without changing the sale',async()=>{
 const f=kioskFixture(),p=await f.paired();
 const appearance={...kioskAppearance(),glassStyle:'liquid',glassDistortion:35};
 assert.equal((await f.admin('appearance',{appearance})).status,200);
 let view=await(await f.handler(f.request(null,p.cookie))).json();assert.equal(view.presentation.appearance.glassDistortion,35);assert.equal(view.saleId,p.view.saleId);
 const presets=[{id:'distortion-fixture',name:'Lens fixture',appearance}];
 const saved=await f.admin('appearance_presets',{presets});assert.equal(saved.status,200);assert.equal((await saved.json()).presets[0].appearance.glassDistortion,35);
 assert.equal((await f.admin('appearance',{appearance:{...appearance,glassDistortion:51}})).status,400);
 f.setRole('employee');assert.equal((await f.admin('appearance',{appearance})).status,403);
 view=await(await f.handler(f.request(null,p.cookie))).json();assert.equal(view.presentation.appearance.glassDistortion,35);assert.equal(view.saleId,p.view.saleId);
});

test('older clients keep their appearance shape and cannot erase stored distortion',async()=>{
 const f=kioskFixture(),p=await f.paired();
 const appearance={...kioskAppearance(),skinId:'barber-luxury',glassStyle:'liquid',glassDistortion:34};
 await f.admin('appearance',{appearance});await f.admin('appearance_presets',{presets:[{id:'legacy-design',name:'Before',appearance}]});
 const legacy=async(input,cookie='')=>{const request=f.request(input,cookie);request.headers.delete('X-WF-Kiosk-Optics');return f.handler(request)};
 let response=await legacy(null,p.cookie),data=await response.json();assert.equal(data.presentation.appearance.skinId,'barber-luxury');assert.equal(Object.hasOwn(data.presentation.appearance,'glassDistortion'),false);assert.equal(data.saleId,p.view.saleId);
 data=await(await legacy({action:'admin',siteId:f.site.siteId})).json();assert.equal(Object.hasOwn(data.appearance,'glassDistortion'),false);assert.equal(Object.hasOwn(data.presets[0].appearance,'glassDistortion'),false);
 const {glassDistortion,...oldAppearance}=appearance;
 assert.equal((await legacy({action:'appearance',siteId:f.site.siteId,appearance:{...oldAppearance,primary:'#123456'}})).status,200);
 assert.equal((await legacy({action:'appearance_presets',siteId:f.site.siteId,presets:[{id:'legacy-design',name:'Renamed',appearance:oldAppearance}]})).status,200);
 data=await(await f.admin('admin')).json();assert.equal(data.appearance.glassDistortion,34);assert.equal(data.appearance.primary,'#123456');assert.equal(data.presets[0].appearance.glassDistortion,34);assert.equal(data.presets[0].name,'Renamed');
 assert.equal((await legacy({action:'appearance',siteId:f.site.siteId,appearance:{...oldAppearance,glassDistortion:51}})).status,400);
});

test('legacy writes preserve distortion from the current CAS snapshot, not a stale read',async()=>{
 const f=kioskFixture(),p=await f.paired(),appearance={...kioskAppearance(),glassDistortion:20};await f.admin('appearance',{appearance});
 const get=f.store.get.bind(f.store);let armed=true;
 f.store.get=async(key,options)=>{const value=await get(key,options);if(armed&&key===kioskConfigKey(f.site.siteId)){armed=false;await f.store.setJSON(key,{...value,appearance:{...value.appearance,glassDistortion:43}})}return value};
 const {glassDistortion,...old}=appearance,request=f.request({action:'appearance',siteId:f.site.siteId,appearance:{...old,secondary:'#123456'}});request.headers.delete('X-WF-Kiosk-Optics');
 assert.equal((await f.handler(request)).status,200);f.store.get=get;
 const data=await(await f.admin('admin')).json();assert.equal(data.appearance.glassDistortion,43);assert.equal(data.appearance.secondary,'#123456');
 assert.equal((await(await f.handler(f.request(null,p.cookie))).json()).saleId,p.view.saleId);
});
