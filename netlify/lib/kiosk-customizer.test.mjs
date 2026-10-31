import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {kioskAppearance,validateKioskAppearance,validateKioskPresets} from './kiosk-skins.mjs';
import {kioskConfigKey,kioskDeviceKey} from './kiosk.mjs';
import {kioskBackgroundAssets} from './kiosk-backgrounds.mjs';
import {optimizeKioskBackground} from './kiosk-background-image.mjs';
import {createKioskBackgroundHandler} from '../functions/client-kiosk-visual-assets.mjs';
import {kioskFixture} from '../../scripts/fixtures/kiosk-fixture.mjs';
const image=()=>sharp({create:{width:2500,height:1200,channels:3,background:'#285fa6'}}).png().toBuffer();
function setup(){const f=kioskFixture(),files=new Map();let role='owner';const assets={set:async(key,data,options)=>files.set(key,{data,options}),delete:async key=>files.delete(key)};
 const handler=createKioskBackgroundHandler({getStore:()=>f.store,getAssets:()=>assets,authorize:async siteId=>{if(siteId!==f.site.siteId)throw Object.assign(Error('Foreign business'),{status:403});return {site:f.site,user:{email:'owner@example.invalid'},membership:{role}}}});
 const upload=async(bytes,type='image/png',siteId=f.site.siteId)=>{const form=new FormData();form.append('file',new File([bytes],'Background.png',{type}));return handler(new Request(`${f.origin}/.netlify/functions/client-kiosk-visual-assets?siteId=${siteId}`,{method:'POST',headers:{Origin:f.origin},body:form}))};
 const remove=key=>handler(new Request(`${f.origin}/.netlify/functions/client-kiosk-visual-assets?siteId=${f.site.siteId}`,{method:'DELETE',headers:{Origin:f.origin},body:JSON.stringify({assetKey:key})}));return {f,files,assets,handler,upload,remove,setRole:value=>role=value};}
test('new appearance fields hydrate old designs; all inputs remain finite data',()=>{
 assert.equal(kioskAppearance({skinId:'classic',version:1}).finish,'original');assert.equal(kioskAppearance({skinId:'glass-premium',version:1}).glassOpacity,76);assert.equal(validateKioskAppearance({finish:'glass',glassOpacity:70,glassBlur:0}).glassOpacity,70);
 for(const patch of [{glassOpacity:24},{glassOpacity:96},{glassOpacity:'76'},{glassBlur:25},{glassBlur:-1},{finish:'javascript'},{gradientFrom:'url(https://example.invalid)'},{gradientAngle:NaN},{imageBlur:21},{overlayOpacity:-1},{imageX:Infinity},{welcomeText:'<script>'},{backgroundAssetKey:'sites/other/x.svg'},{layout:'external'}, {pattern:'url(x)'},{cardColor:'red'}])assert.throws(()=>validateKioskAppearance({...kioskAppearance(),...patch}));
 for(const glassOpacity of [25,69,70,95])assert.equal(validateKioskAppearance({glassOpacity}).glassOpacity,glassOpacity);
 for(const glassBlur of [0,12,13,24])assert.equal(validateKioskAppearance({glassBlur}).glassBlur,glassBlur);
 assert.throws(()=>validateKioskPresets([{id:'same',name:'One',appearance:{}},{id:'same',name:'Two',appearance:{}}]));
 assert.throws(()=>validateKioskPresets(Array(9).fill({})));
 assert.equal(validateKioskAppearance({finish:'gloss',colorMode:'gradient',gradientAngle:270}).finish,'gloss');
});
test('backgrounds are decoded, re-encoded to WebP, stripped of metadata and bounded',async()=>{
 const bytes=await optimizeKioskBackground(await image(),'image/png'),meta=await sharp(bytes).metadata();assert.equal(meta.format,'webp');assert.equal(meta.width,1920);assert(bytes.length<=1024*1024);assert.equal(meta.exif,undefined);
 await assert.rejects(()=>optimizeKioskBackground(Buffer.from('<svg/>'),'image/png'));
 await assert.rejects(async()=>optimizeKioskBackground(await image(),'image/jpeg'));
 await assert.rejects(()=>optimizeKioskBackground(Buffer.alloc(4*1024*1024+1),'image/webp'));
});
test('owner upload, tenant-safe activation, preset save and deletion preserve devices and sales',async()=>{
 const {f,files,upload,remove}=setup(),paired=await f.paired(),device=await f.store.get(kioskDeviceKey(paired.id));
 const response=await upload(await image());assert.equal(response.status,200);const uploaded=await response.json();assert.equal(uploaded.backgroundAssets.length,1);assert.match(uploaded.assetKey,/kiosk-backgrounds\/.*\.webp$/);assert.equal(files.get(uploaded.assetKey).options.metadata.contentType,'image/webp');
 assert.deepEqual(await f.store.get(kioskDeviceKey(paired.id)),device);
 const appearance={...kioskAppearance(),finish:'glass',colorMode:'image',backgroundAssetKey:uploaded.assetKey,headerColor:'#ffffff',cardColor:'#000000',cartColor:'#102038'};
 assert.equal((await f.admin('appearance',{appearance})).status,200);assert.equal((await remove(uploaded.assetKey)).status,409);
 assert.equal((await f.admin('appearance_presets',{presets:[{id:'my-design',name:'My design',appearance}]})).status,200);
 const view=await(await f.handler(f.request(null,paired.cookie))).json();assert.equal(view.presentation.appearance.backgroundAssetKey,uploaded.assetKey);assert.equal(view.saleId,paired.view.saleId);
 await f.admin('appearance',{appearance:kioskAppearance()});assert.equal((await remove(uploaded.assetKey)).status,409,'saved designs retain the image');await f.admin('appearance_presets',{presets:[]});assert.equal((await remove(uploaded.assetKey)).status,200);assert.equal(files.size,0);assert.deepEqual(await f.store.get(kioskDeviceKey(paired.id)),device);assert.equal(f.calls(),0);
});
test('foreign and unregistered references, invalid files and employee uploads cannot mutate a tenant',async()=>{
 const {f,upload,remove,setRole}=setup(),bytes=await image();setRole('employee');assert.equal((await upload(bytes)).status,403);setRole('owner');assert.equal((await upload(bytes,'image/png','foreign')).status,403);assert.equal((await upload(Buffer.from('not an image'))).status,400);assert.equal((await upload(bytes,'image/gif')).status,400);
 assert.equal((await f.admin('appearance',{appearance:{...kioskAppearance(),backgroundAssetKey:'sites/kiosk-qa/kiosk-backgrounds/00000000-0000-4000-8000-000000000000.webp'}})).status,400);
 assert.equal((await f.admin('appearance',{appearance:{...kioskAppearance(),backgroundAssetKey:'sites/foreign/kiosk-backgrounds/00000000-0000-4000-8000-000000000000.webp'}})).status,400);
 assert.equal((await remove('sites/foreign/kiosk-backgrounds/00000000-0000-4000-8000-000000000000.webp')).status,400);assert.equal(await f.store.get(kioskConfigKey(f.site.siteId)),null);
});
test('background quota is atomic under simultaneous uploads and releases on deletion',async()=>{
 const {f,files,upload,remove}=setup(),bytes=await image();const results=await Promise.all(Array.from({length:10},()=>upload(bytes)));assert.equal(results.filter(x=>x.status===200).length,8);assert(results.filter(x=>x.status!==200).every(x=>x.status===409));assert.equal(files.size,8);assert.equal(kioskBackgroundAssets(await f.store.get(kioskConfigKey(f.site.siteId)),f.site.siteId).length,8);
 const key=[...files.keys()][0];assert.equal((await remove(key)).status,200);assert.equal((await upload(bytes)).status,200);assert.equal(files.size,8);
});
test('failed uploads release reservations and unfinished uploads cannot become active designs',async()=>{
 const {f,assets,upload}=setup();let release;assets.set=()=>new Promise(resolve=>release=resolve);const pending=upload(await image());while(!release)await new Promise(resolve=>setTimeout(resolve,1));const config=await f.store.get(kioskConfigKey(f.site.siteId)),key=config.backgroundAssets[0].key;assert.equal(kioskBackgroundAssets(config,f.site.siteId).length,0);assert.equal((await f.admin('appearance',{appearance:{backgroundAssetKey:key}})).status,400);release();assert.equal((await pending).status,200);
 assets.set=async()=>{throw Error('Isolated storage outage')};const failed=await upload(await image());assert.equal(failed.status,500);assert.equal(kioskBackgroundAssets(await f.store.get(kioskConfigKey(f.site.siteId)),f.site.siteId,true).length,1);
});
