import test from 'node:test';
import assert from 'node:assert/strict';
import {clientCheckoutReturn} from './client-checkout-return.mjs';
import {publicBaseUrl} from './platform-utils.mjs';
const seed={slug:'fixture',requestUrl:'https://deploy-preview-107--webfactorypr.netlify.app/.netlify/functions/create-client-checkout?redirect=https://foreign.invalid',receiptReturn:'receipt=opaque-fixture',trackingToken:'tracking-fixture'};
test('kiosk provider return preserves preview origin and excludes all receipt/session/tracking query capabilities',()=>{assert.deepEqual(clientCheckoutReturn({...seed,kiosk:true}),{success:'https://deploy-preview-107--webfactorypr.netlify.app/kiosk',cancel:'https://deploy-preview-107--webfactorypr.netlify.app/kiosk',ath:'/kiosk'})});
test('storefront returns retain the original receipt, session and tracking contracts',()=>{const result=clientCheckoutReturn(seed);assert.equal(result.success,`${publicBaseUrl()}/sites/fixture?checkout=success&receipt=opaque-fixture&session_id={CHECKOUT_SESSION_ID}&tracking=tracking-fixture`);assert.equal(result.cancel,`${publicBaseUrl()}/sites/fixture?checkout=cancelled`);assert.equal(result.ath,'/sites/fixture?receipt=opaque-fixture&tracking=tracking-fixture')});
test('business slug and tracking data cannot inject another return target',()=>{const result=clientCheckoutReturn({...seed,slug:'fixture?x=1',trackingToken:'x&redirect=https://foreign.invalid'});assert.equal(new URL(result.success).origin,new URL(publicBaseUrl()).origin);assert.equal(new URL(result.success).pathname,'/sites/fixture%3Fx%3D1');assert.equal(new URL(result.success).searchParams.get('redirect'),null)});
test('production kiosk returns remain on the actual paired host',()=>{const result=clientCheckoutReturn({...seed,kiosk:true,requestUrl:'https://webfactorypr.com/.netlify/functions/create-client-checkout'});assert.equal(result.success,'https://webfactorypr.com/kiosk');assert.equal(result.cancel,result.success)});

test('public sandbox checkout returns to its actual preview and keeps receipt access scoped to it',t=>{
 const previous=globalThis.Netlify;t.after(()=>{globalThis.Netlify=previous});
 globalThis.Netlify={context:{deploy:{context:'deploy-preview'}},env:{get:key=>key==='URL'?'https://webfactorypr.com':''}};
 const returns=clientCheckoutReturn({slug:'faro-norte-preview',requestUrl:'https://deploy-preview-125--webfactorypr.netlify.app/.netlify/functions/create-client-checkout',receiptReturn:'receipt=test-capability',trackingToken:'test-tracking'});
 assert.equal(new URL(returns.success).origin,'https://deploy-preview-125--webfactorypr.netlify.app');assert.equal(new URL(returns.cancel).origin,'https://deploy-preview-125--webfactorypr.netlify.app');assert.match(returns.success,/receipt=test-capability/);assert.match(returns.success,/session_id=\{CHECKOUT_SESSION_ID\}/);
});
test('production storefront keeps the configured canonical return origin',t=>{
 const previous=globalThis.Netlify;t.after(()=>{globalThis.Netlify=previous});
 globalThis.Netlify={context:{deploy:{context:'production'}},env:{get:key=>key==='URL'?'https://webfactorypr.com':''}};
 const returns=clientCheckoutReturn({slug:'business',requestUrl:'https://some-deploy.netlify.app/.netlify/functions/create-client-checkout',receiptReturn:'receipt=test'});
 assert.equal(new URL(returns.success).origin,'https://webfactorypr.com');assert.equal(new URL(returns.cancel).origin,'https://webfactorypr.com');
});
