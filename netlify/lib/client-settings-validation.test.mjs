import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeClientSection} from '../functions/client-admin.mjs';
import {catalogPriceCents} from './catalog-price.mjs';
import {zonedToUtc} from './booking-engine.mjs';
const site={settings:{timezone:'America/Puerto_Rico'},catalog:[],members:[],business:{}};
const normalize=(section,value)=>normalizeClientSection(site,section,value,{id:'owner'},{role:'owner'});
test('catalog rejects nonfinite and coerced numeric fields before persistence',()=>{
 for(const field of ['price','inventory','duration','bufferMinutes','taxRateOverride','lowStockThreshold']){
  for(const invalid of ['not-a-number','1e309',NaN,Infinity,{},[],true]){
   const item={id:'fixture',name:'Fixture',type:field==='duration'||field==='bufferMinutes'?'service':'product',price:25,[field]:invalid};
   assert.throws(()=>normalize('catalog',[item]),{status:400},`${field}: ${String(invalid)}`);
  }
 }
 assert.throws(()=>normalize('catalog',[{price:1e308}]),{status:400});
});
test('catalog preserves numeric strings, optional inventory and zero-price items',()=>{
 const [product,service]=normalize('catalog',[{id:'p',type:'product',price:'25.50',inventory:null},{id:'s',type:'service',price:0,duration:'45',bufferMinutes:'10'}]);
 assert.equal(product.price,25.5);assert.equal(product.inventory,null);assert.equal(service.price,0);assert.equal(service.duration,45);assert.equal(service.bufferMinutes,10);
 assert.deepEqual(JSON.parse(JSON.stringify([product,service])),[product,service]);
});
test('settings reject invalid IANA zones and preserve an omitted valid zone',()=>{
 for(const timezone of ['Not/A_Timezone','America/Invalid',{},123])assert.throws(()=>normalize('settings',{timezone}),{status:400});
 const saved=normalize('settings',{timezone:'America/New_York'});assert.equal(zonedToUtc('2028-02-01','10:00',saved.timezone).toISOString(),'2028-02-01T15:00:00.000Z');
 assert.equal(normalize('settings',{}).timezone,'America/Puerto_Rico');
});

test('checkout price conversion rejects invalid legacy values and preserves legitimate zero',()=>{
 for(const value of [null,undefined,'',true,[],{},NaN,Infinity,'1e309',-1,1e308])assert.throws(()=>catalogPriceCents(value),{status:409});
 assert.equal(catalogPriceCents(0),0);assert.equal(catalogPriceCents('25.50'),2550);
});
