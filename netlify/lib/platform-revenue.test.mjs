import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPlatformRevenue, revenueWindow, summarizePlatformCharges } from './platform-revenue.mjs';
import endpoint from '../functions/webfactory-admin-revenue.mjs';
const now = new Date('2026-10-01T02:00:00Z'); // Sep 30 in Puerto Rico.
const charge = (id, extra = {}) => ({ id, paid: true, captured: true, status: 'succeeded', livemode: true, currency: 'usd', amount_captured: 3000, amount_refunded: 0, created: Date.parse('2026-09-30T20:00:00Z') / 1000, ...extra });
test('uses PR calendar dates and a 30-day window across month boundary', () => {
  const result = revenueWindow(now);
  assert.equal(result.days[0], '2026-09-01');
  assert.equal(result.days.at(-1), '2026-09-30');
  assert.equal(new Date(result.since*1000).toISOString(), '2026-09-01T04:00:00.000Z');
});
test('sums captured cents, partial/full refunds and deduplicates charge IDs', () => {
  const result = summarizePlatformCharges([charge('a', { amount_captured: 1500, amount_refunded: 500 }), charge('a'), charge('b', { amount_refunded: 3000 }), charge('c')], { now });
  assert.equal(result.capturedCents, 7500);
  assert.equal(result.refundedCents, 3500);
  assert.equal(result.netCents, 4000);
  assert.equal(result.paymentCount, 3);
  assert.equal(result.days.at(-1).netCents, 4000);
  assert.equal(result.last7DaysCents, 4000);
  assert.equal(result.days.length, 7);
});
test('excludes failed, uncaptured, test, destination/client sales, disputed and non-USD charges', () => {
  const excluded = [{paid:false},{captured:false},{status:'pending'},{livemode:false},{currency:'eur'},{disputed:true},{transfer_data:{destination:'acct_client'}},{source_transfer:'tr_client'},{on_behalf_of:'acct_client'},{metadata:{flow:'webfactory_client_commerce'}},{metadata:{flow:'webfactory_terminal'}}];
  const result = summarizePlatformCharges([charge('real'), ...excluded.map((extra,index)=>charge(`bad${index}`,extra))], { now });
  assert.equal(result.netCents, 3000);
  assert.equal(result.paymentCount, 1);
  assert.equal(result.excludedCount, excluded.length);
});
test('rejects invalid amounts, old/future records and groups midnight UTC into previous PR day', () => {
  const result = summarizePlatformCharges([charge('ok',{created:Date.parse('2026-09-30T02:00:00Z')/1000}),charge('old',{created:Date.parse('2026-09-01T02:00:00Z')/1000}),charge('future',{created:Date.parse('2026-10-02T00:00:00Z')/1000}),charge('negative',{amount_refunded:-1}),charge('too-much',{amount_refunded:4000}),charge('nan',{amount_captured:'bad'})], { now });
  assert.equal(result.netCents, 3000);
  assert.equal(result.days.at(-2).netCents, 3000);
  assert.equal(result.days.at(-1).netCents, 0);
});
test('test payments are separately labeled and never mix live charges', () => {
  const result = summarizePlatformCharges([charge('live'),charge('test',{livemode:false})],{now,mode:'test'});
  assert.equal(result.mode,'test');
  assert.equal(result.netCents,3000);
});
test('loads all pages with read-only calls and reports completion', async () => {
  const calls=[];
  const stripe={charges:{list:async(params)=>{calls.push(params);return calls.length===1?{data:[charge('a')],has_more:true}:{data:[charge('b')],has_more:false}}}};
  const result=await loadPlatformRevenue({secretKey:'sk_live_fixture',createStripe:()=>stripe,now});
  assert.equal(result.netCents,6000);
  assert.equal(result.complete,true);
  assert.equal(calls[1].starting_after,'a');
  assert.equal(calls[0].limit,100);
  assert.equal(Object.hasOwn(calls[0],'stripeAccount'),false);
});
test('flags a capped history as partial', async () => {
  const result=await loadPlatformRevenue({secretKey:'sk_live_fixture',createStripe:()=>({charges:{list:async()=>({data:[charge('a')],has_more:true})}}),now,maxPages:1});
  assert.equal(result.complete,false);
});
test('missing credentials and API errors show unavailable, never fake zero income or expose error', async () => {
  const missing=await loadPlatformRevenue({secretKey:'',createStripe:()=>{throw Error('must not run')},now});
  assert.equal(missing.reason,'not_configured');
  assert.equal(missing.netCents,undefined);
  const failed=await loadPlatformRevenue({secretKey:'rk_live_fixture',createStripe:()=>({charges:{list:async()=>{throw Error('secret payload')}}}),now});
  assert.equal(failed.available,false);
  assert.equal(JSON.stringify(failed).includes('secret payload'),false);
});
test('report endpoint rejects writes before any payment interaction', async () => {
  const response=await endpoint(new Request('https://example.invalid/report',{method:'POST'}));
  assert.equal(response.status,405);
});
