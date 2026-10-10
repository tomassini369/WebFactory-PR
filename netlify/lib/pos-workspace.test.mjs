import test from 'node:test';
import assert from 'node:assert/strict';
import {estimatePosTotals,posQuantityLimit,posItemName,posBrandPair} from '../../src/pos-domain.ts';
import {calculateTax} from './webfactory-v3-domain.mjs';
import {requirePosAdjustments} from './pos-permissions.mjs';
import {createPosAttemptStatusHandler} from '../functions/client-pos-attempt-status.mjs';
const catalog=[{id:'taxable',type:'product',name:'Product',nameEs:'Producto',price:12.34,trackInventory:true,inventory:3},{id:'exempt',type:'service',name:'Service',price:25,taxable:false},{id:'override',type:'service',price:7.19,taxRateOverride:7}];
test('POS estimates use integer cents and match backend per-line tax including exemptions and included tax',()=>{
 for(const pricesIncludeTax of [false,true])for(const enabled of [false,true])for(const discount of [0,299,99999]){
  const config={enabled,pricesIncludeTax,stateRate:10.5,municipalRate:1},cart=[{id:'taxable',quantity:2},{id:'exempt',quantity:1},{id:'override',quantity:1}];
  const result=estimatePosTotals(catalog,cart,discount,411,config);assert.equal(result.invalid,false);
  let tax=0;for(const line of cart){const item=catalog.find(i=>i.id===line.id);const amount=Math.round((result.subtotal-result.discount)*(Math.round(item.price*100)*line.quantity/result.subtotal));tax+=calculateTax({amountCents:amount,taxable:item.taxable!==false,taxRateOverride:item.taxRateOverride??null,config}).taxCents}
  assert.equal(result.tax,tax);assert.equal(result.total,result.subtotal-result.discount+(pricesIncludeTax?0:tax)+411);
 }
});
test('cashier quantities respect stock and both existing sale contracts; invalid catalog/amounts block checkout',()=>{
 assert.equal(posQuantityLimit(catalog[0]),3);assert.equal(posQuantityLimit({...catalog[0],inventory:0}),0);assert.equal(posQuantityLimit({...catalog[0],inventory:100}),20);assert.equal(posQuantityLimit({...catalog[0],allowBackorder:true}),20);assert.equal(posQuantityLimit(catalog[1]),20);
 for(const quantity of [0,1.5,4,21])assert.equal(estimatePosTotals(catalog,[{id:'taxable',quantity}],0,0).invalid,true);
 assert.equal(estimatePosTotals(catalog,[{id:'missing',quantity:1}],0,0).invalid,true);
 assert.equal(estimatePosTotals(catalog,[{id:'taxable',quantity:1}],NaN,0).invalid,true);
 assert.equal(estimatePosTotals([{...catalog[0],price:NaN}],[{id:'taxable',quantity:1}],0,0).invalid,true);
 assert.equal(posItemName(catalog[0],'es'),'Producto');assert.equal(posItemName(catalog[0],'en'),'Product');
});
test('financial adjustments require trusted manager membership and reject malformed cents',()=>{
 for(const role of ['cashier','employee','staff','constructor',undefined]){
  assert.doesNotThrow(()=>requirePosAdjustments({role},{discountCents:0,tipCents:0}));
  for(const field of ['discountCents','tipCents'])assert.throws(()=>requirePosAdjustments({role},{[field]:100}),{status:403});
 }
 for(const role of ['owner','manager','admin'])assert.doesNotThrow(()=>requirePosAdjustments({role},{discountCents:100,tipCents:500}));
 for(const value of [-1,0.5,NaN,'bad',Number.MAX_SAFE_INTEGER+1])assert.throws(()=>requirePosAdjustments({role:'owner'},{tipCents:value}),{status:400});
});
test('attempt status authorizes POS, scopes keys to tenant and never returns customer details or tokens',async()=>{
 let key,capability;const handler=createPosAttemptStatusHandler({authorize:async(siteId,cap)=>{capability=cap;assert.equal(siteId,'tenant-a');return {site:{siteId}}},getStore:()=>({get:async k=>{key=k;return {siteId:'tenant-a',status:'completed',receiptId:'r-1',transactionId:'t-1',response:{record:{customer:{email:'private@example.invalid'},createdBy:'private',token:'secret'}}}}})});
 const result=await handler(new Request('https://example.invalid/api?siteId=tenant-a&saleAttemptId=attempt-123'));assert.equal(result.status,200);assert.equal(capability,'pos');assert.ok(key.startsWith('tenant-a/'));assert.deepEqual(await result.json(),{ok:true,status:'completed',receiptId:'r-1',transactionId:'t-1'});assert.equal(result.headers.get('cache-control'),'private, no-store');
 const denied=createPosAttemptStatusHandler({authorize:async()=>{throw Object.assign(new Error('Denied'),{status:403})},getStore:()=>{throw Error('Must not read storage')}});assert.equal((await denied(new Request('https://example.invalid/api?siteId=b&saleAttemptId=attempt-123'))).status,403);
 const wrong=createPosAttemptStatusHandler({authorize:async()=>({site:{siteId:'a'}}),getStore:()=>({get:async()=>({siteId:'b',status:'completed'})})});assert.equal((await wrong(new Request('https://example.invalid/api?siteId=a&saleAttemptId=attempt-123'))).status,404);
 assert.equal((await handler(new Request('https://example.invalid/api',{method:'POST'}))).status,405);
});

test('tenant accents keep readable checkout text or fall back to calibrated brand blue',()=>{assert.deepEqual(posBrandPair('#ffffff'),{background:'#ffffff',foreground:'#0b1529'});assert.deepEqual(posBrandPair('#000000'),{background:'#000000',foreground:'#ffffff'});assert.deepEqual(posBrandPair('#777777'),{background:'#285fa6',foreground:'#ffffff'});assert.deepEqual(posBrandPair('var(--unsafe)'),{background:'#285fa6',foreground:'#ffffff'});});
