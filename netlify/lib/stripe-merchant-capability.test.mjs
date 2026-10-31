import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyMerchantCapability} from './stripe-merchant-capability.mjs';
const id='acct_merchantFixture';
test('shared readiness reads the supported v1 merchant view with the existing platform key',async()=>{
  let seen;
  const state=await verifyMerchantCapability(id,{secretKey:'sk_test_fixture',fetcher:async(url,options)=>{seen={url,options};return Response.json({id,charges_enabled:true,capabilities:{card_payments:'active'}})}});
  assert.equal(state,'active');assert.equal(seen.url,`https://api.stripe.com/v1/accounts/${id}`);assert.equal(seen.options.headers.Authorization,'Bearer sk_test_fixture');assert.equal(seen.options.headers['Stripe-Version'],'2026-08-26.dahlia');assert.ok(seen.options.signal);
});
test('card capability alone cannot enable a disabled merchant and missing capability stays pending',async()=>{
  for(const [account,expected] of [[{id,charges_enabled:false,capabilities:{card_payments:'active'}},'pending'],[{id,charges_enabled:true,capabilities:{}},'pending'],[{id,charges_enabled:true,capabilities:{card_payments:'inactive'}},'inactive']]){
    assert.equal(await verifyMerchantCapability(id,{fetcher:async()=>Response.json(account)}),expected);
  }
});
test('provider credential, permission and outage errors cannot expose provider messages or secrets',async()=>{
  for(const status of [400,401,403,404,429,500]){
    let calls=0;
    await assert.rejects(verifyMerchantCapability(id,{fetcher:async()=>{calls++;return Response.json({error:{message:'sk_test_private_test_value and private merchant details'}},{status})}}),error=>{assert.equal(error.status,[400,401,403,404].includes(status)?409:503);assert.doesNotMatch(error.message,/sk_test|private merchant/);return true});
    assert.equal(calls,1);
  }
});
test('invalid identifiers and mismatched provider accounts never report an active merchant',async()=>{
  await assert.rejects(verifyMerchantCapability('../other',{fetcher:async()=>{throw Error('must not call provider')}}),{status:409});
  await assert.rejects(verifyMerchantCapability(id,{fetcher:async()=>Response.json({id:'acct_other',charges_enabled:true,capabilities:{card_payments:'active'}})}),{status:502});
});
