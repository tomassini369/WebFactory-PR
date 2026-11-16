import test from 'node:test';
import assert from 'node:assert/strict';
import {getStore} from '@netlify/blobs';
import checkout from '../functions/create-payment-link-checkout.mjs';
import {clientSiteStore,clientCommerceStore,commerceKey} from './client-store.mjs';
import {readBuyerReceipt} from './buyer-receipt-access.mjs';
function fixture(t){
 globalThis.netlifyBlobsContext=Buffer.from(JSON.stringify({siteID:'fixture',token:'fixture',deployID:'fixture'})).toString('base64');
 const env={STRIPE_SECRET_KEY:'sk_test_fixture',URL:'https://fixture.example.invalid',CONTEXT:'deploy-preview'};
 globalThis.Netlify={env:{get:name=>env[name]||''}};
 t.after(()=>{delete globalThis.Netlify;delete globalThis.netlifyBlobsContext});
 const rows=new Map();let etag=0,merchant=0,sessions=0,successUrl='';const proto=Object.getPrototypeOf(getStore('fixture'));
 t.mock.method(proto,'get',async function(key){return structuredClone(rows.get(this.name+'/'+key)?.data??null)});
 t.mock.method(proto,'getWithMetadata',async function(key){return structuredClone(rows.get(this.name+'/'+key)??null)});
 t.mock.method(proto,'setJSON',async function(key,data,options={}){const full=this.name+'/'+key,old=rows.get(full);if(options.onlyIfNew&&old||options.onlyIfMatch&&old?.etag!==options.onlyIfMatch)return {modified:false};rows.set(full,{data:structuredClone(data),etag:String(++etag)});return {modified:true}});
 t.mock.method(proto,'list',async function({prefix}){return {blobs:[...rows.keys()].filter(key=>key.startsWith(this.name+'/'+prefix)).map(key=>({key:key.slice(this.name.length+1)}))}});
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  assert(String(url).startsWith('https://api.stripe.com/'),'No other outbound request is allowed');
  if(String(url).includes('/v1/accounts/')){merchant++;assert(options.signal);return Response.json({id:'acct_fixture',charges_enabled:true,capabilities:{card_payments:'active'}})}
  assert.equal(url,'https://api.stripe.com/v1/checkout/sessions');sessions++;successUrl=options.body.get('success_url');assert.equal(options.headers['Stripe-Account'],'acct_fixture');return Response.json({id:'cs_fixture',url:'https://checkout.stripe.com/fixture'})
 });
 const site={siteId:'tenant-fixture',slug:'fixture-shop',status:'active',revision:1,business:{name:'Synthetic shop',locations:[]},catalog:[],settings:{locale:'en'},paymentRules:{methods:{stripe:true},stripeConnectedAccountId:'acct_fixture'},servicePlan:{subscriptionStatus:'active'}};
 const link={siteId:site.siteId,paymentLinkId:'plink-fixture',token:'synthetic-public-token',title:'Synthetic payment',amount:1200,active:true,createdAt:'2026-11-01T00:00:00Z'};
 const request=()=>new Request('https://fixture.example.invalid/.netlify/functions/create-payment-link-checkout',{method:'POST',headers:{Origin:'https://fixture.example.invalid','Content-Type':'application/json','Idempotency-Key':'a'.repeat(64)},body:JSON.stringify({slug:site.slug,token:link.token,checkoutAttemptId:'a'.repeat(64),customer:{name:'Synthetic buyer',email:'buyer@example.invalid'},paymentProvider:'stripe'})});
 return {site,link,request,counts:()=>({merchant,sessions}),url:()=>new URL(successUrl),prepare:async()=>{await clientSiteStore().setJSON(`sites/${site.siteId}.json`,site);await clientSiteStore().setJSON(`slugs/${site.slug}.json`,{siteId:site.siteId});await clientCommerceStore().setJSON(`${site.siteId}/v3/payment-links/${link.paymentLinkId}.json`,link)}};
}
test('payment-link checkout uses shared merchant verification and replays one stable receipt-capable attempt',async t=>{
 const f=fixture(t);await f.prepare();let response=await checkout(f.request());assert.equal(response.status,200,await response.clone().text());const first=await response.json();response=await checkout(f.request());assert.equal(response.status,200);assert.deepEqual(await response.json(),first);assert.deepEqual(f.counts(),{merchant:1,sessions:1});
 const token=f.url().searchParams.get('receipt');assert.match(token,/^[A-Za-z0-9_-]{32}$/);assert.equal((await readBuyerReceipt(token,{slug:f.site.slug})).status,'pending');
 await assert.rejects(readBuyerReceipt('x'.repeat(32),{slug:f.site.slug}),{status:404});
 const store=clientCommerceStore(),key=commerceKey(f.site.siteId,'transactions',first.transactionId),record=await store.get(key,{type:'json'});
 await store.setJSON(key,{...record,paymentStatus:'paid',receiptId:'receipt-fixture'});
 await store.setJSON(`${f.site.siteId}/v3/receipts/receipt-fixture.json`,{siteId:f.site.siteId,receiptId:'receipt-fixture',transactionId:first.transactionId,customer:record.customer,paymentStatus:'paid',total:record.amountTotal,items:record.items});
 const receipt=await readBuyerReceipt(token,{slug:f.site.slug});assert.equal(receipt.status,'ready');assert.equal(receipt.receipt.paymentStatus,'paid');assert.equal(receipt.receipt.customer.email,'');await assert.rejects(readBuyerReceipt(token,{slug:'other-shop'}),{status:404});
});
