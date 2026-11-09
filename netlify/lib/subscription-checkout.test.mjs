import test from 'node:test';
import assert from 'node:assert/strict';
import {subscriptionCheckout} from './subscription-checkout.mjs';
function fixture(){
 const rows=new Map(),calls=[],sessions=new Map();let lose=false,failSave=false;
 const store={get:async key=>structuredClone(rows.get(key)),setJSON:async(key,value)=>{if(failSave&&value.sessionId){failSave=false;throw Error('lost storage response')}rows.set(key,structuredClone(value))}};
 const stripe={checkout:{sessions:{create:async(parameters,options)=>{calls.push(structuredClone({parameters,options}));const key=options.idempotencyKey;if(!sessions.has(key))sessions.set(key,{id:`cs_${sessions.size}`,url:'https://checkout.stripe.com/c/pay/fixture',status:'open'});if(lose){lose=false;throw Error('lost provider response')}return sessions.get(key)},retrieve:async id=>[...sessions.values()].find(s=>s.id===id),expire:async id=>{[...sessions.values()].find(s=>s.id===id).status='expired'}}}};
 const args={store,stripe,siteId:'tenant_a',interval:'monthly',price:'price_month',base:'https://preview.example.invalid',integrationIdentifier:()=>`random_${Math.random()}`,clock:()=>100000,consent:{acceptedBy:'owner@example.invalid',version:'v1'}};
 return {rows,calls,sessions,args,lose:()=>{lose=true},failSave:()=>{failSave=true}};
}
test('lost Stripe response retries identical persisted parameters and idempotency identity',async()=>{
 const f=fixture();f.lose();await assert.rejects(subscriptionCheckout(f.args),/lost provider/);
 const r=await subscriptionCheckout({...f.args,consent:{...f.args.consent,acceptedBy:'changed@example.invalid'}});
 assert.equal(r.id,'cs_0');assert.equal(f.sessions.size,1);assert.deepEqual(f.calls[0],f.calls[1]);
 assert.equal(f.calls[1].parameters.customer_email,'owner@example.invalid');
});
test('successful provider creation followed by storage failure recovers original checkout',async()=>{
 const f=fixture();f.failSave();await assert.rejects(subscriptionCheckout(f.args),/lost storage/);
 await subscriptionCheckout(f.args);assert.equal(f.sessions.size,1);assert.deepEqual(f.calls[0],f.calls[1]);
});
test('switching interval resolves and expires uncertain old checkout before creating another',async()=>{
 const f=fixture();f.lose();await assert.rejects(subscriptionCheckout(f.args));
 const r=await subscriptionCheckout({...f.args,interval:'annual',price:'price_annual'});
 assert.equal(r.id,'cs_1');assert.equal([...f.sessions.values()][0].status,'expired');assert.equal(f.calls.length,3);
});
test('completed checkout cannot be duplicated and unknown recovery beyond idempotency window fails closed',async()=>{
 const f=fixture();await subscriptionCheckout(f.args);[...f.sessions.values()][0].status='complete';
 await assert.rejects(subscriptionCheckout(f.args),{status:409});assert.equal(f.calls.length,1);
 const g=fixture();g.lose();await assert.rejects(subscriptionCheckout(g.args));
 await assert.rejects(subscriptionCheckout({...g.args,clock:()=>100000+24*3600000}),{status:503});assert.equal(g.calls.length,1);
});
