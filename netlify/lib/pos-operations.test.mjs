import test from 'node:test';
import assert from 'node:assert/strict';
import { posOperations, posCapabilities } from './pos-capabilities.mjs';
import { configurePosOperations, readPosOperations, requireCashierPos } from './pos-operations.mjs';
import { kioskConfigKey } from './kiosk.mjs';
import { commerceKey } from './client-store.mjs';
import { kioskFixture } from '../../scripts/fixtures/kiosk-fixture.mjs';
import { createPosSettingsHandler } from '../functions/client-pos-settings.mjs';
import { createPosSaleHandler } from '../functions/client-pos-sale.mjs';
import { createIdempotentPosSaleHandler } from '../functions/client-pos-sale-idempotent.mjs';
import { createPosCheckoutHandler } from '../functions/client-pos-checkout.mjs';
import { createTerminalPaymentIntentHandler } from '../functions/client-terminal-payment-intent.mjs';
import { createTerminalConnectionTokenHandler } from '../functions/client-terminal-connection-token.mjs';
import { createCustomerDisplayHandler } from '../functions/client-customer-display.mjs';
const defaults=posOperations();
const request=(input,origin='https://pos.example.invalid')=>new Request('https://pos.example.invalid/api'+(input?'':'?siteId=kiosk-qa'),{method:input?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json'},...(input?{body:JSON.stringify(input)}:{})});
function fixture(){
 const f=kioskFixture();f.store.delete=async key=>f.rows.delete(key);
 let role='owner',email='owner@example.invalid';
 const authorize=async(id)=>{if(id!==f.site.siteId)throw Object.assign(Error('Denied'),{status:403});return {site:f.site,user:{id:'actor-fixture',email},membership:{role}}};
 const handler=createPosSettingsHandler({authorize,getStore:()=>f.store,clock:()=>1234567});
 return {...f,kioskHandler:f.handler,authorize,handler,setMember:(nextRole,nextEmail=email)=>{role=nextRole;email=nextEmail}};
}
test('default modules preserve existing cashier/display and infer capabilities from actual category/catalog',()=>{
 assert.deepEqual(defaults,{cashierEnabled:true,displayEnabled:true,profile:'auto',revision:0});
 for(const [category,profile] of [['Restaurante','restaurant'],['Cafetería','restaurant'],['Barbería','barber'],['Salón de belleza','salon'],['Taller automotriz','workshop'],['Retail','retail'],['Unknown','general']]){
  const caps=posCapabilities({business:{category},catalog:[{type:'product',active:true,trackInventory:true},{type:'service',requiresAppointment:true}],employees:[{active:true}]});
  assert.equal(caps.profile,profile);assert(caps.products&&caps.services&&caps.appointments&&caps.inventory);assert.equal(caps.kitchen,profile==='restaurant');assert.equal(caps.professionals,['barber','salon'].includes(profile));
 }
 const empty=posCapabilities({business:{name:'Restaurant in the name',category:'Retail'},catalog:[{type:'service',active:false,requiresAppointment:true}]});assert.equal(empty.profile,'retail');assert.equal(empty.appointments,false);assert.equal(empty.services,false);assert.equal(empty.kitchen,false);
 const manual=posCapabilities({business:{category:'Retail'}},{...defaults,profile:'restaurant'});assert.equal(manual.profile,'restaurant');assert.equal(manual.kitchen,false,'presentation override cannot pretend checkout has restaurant settlement');
 assert.equal(posCapabilities({design:{templateCategory:'Barbershop'}}).profile,'barber');
});
test('settings writes require real same-tenant owner membership and never leak private records',async()=>{
 const f=fixture();f.site.members[0].salary=99999;
 let response=await f.handler(request());assert.equal(response.status,200);const body=await response.json();assert.equal(body.canManage,true);assert(!JSON.stringify(body).includes('salary'));assert(!JSON.stringify(body).includes('owner@example.invalid'));
 for(const role of ['cashier','employee','admin']){f.setMember(role);assert.equal((await f.handler(request({siteId:f.site.siteId,...defaults,cashierEnabled:false}))).status,403);}
 f.setMember('owner','outsider@example.invalid');assert.equal((await f.handler(request({siteId:f.site.siteId,...defaults,cashierEnabled:false}))).status,403);
 f.setMember('owner','owner@example.invalid');assert.equal((await f.handler(request({siteId:'tenant-other',...defaults,cashierEnabled:false}))).status,403);assert.equal(f.rows.size,0);
 f.setMember('owner');f.site.members[0].role='owner';response=await f.handler(request({siteId:f.site.siteId,...defaults,profile:'barber',employeeId:'arbitrary',amountTotal:1}));assert.equal(response.status,200);const saved=f.rows.get(kioskConfigKey(f.site.siteId)).data;assert.equal(saved.operations.revision,1);assert.equal(saved.operations.events[0].at,1234567);assert.equal(saved.operations.events[0].actor,'actor-fixture');assert.equal(saved.employeeId,undefined);assert.equal(saved.enabled,false);
});
test('concurrent administrators cannot overwrite settings; kiosk pairing/configuration survive operation changes',async()=>{
 const f=fixture(),paired=await f.paired();
 const result=await Promise.all([configurePosOperations(f.store,f.site.siteId,{...defaults,profile:'barber'},'admin-a',1),configurePosOperations(f.store,f.site.siteId,{...defaults,profile:'retail'},'admin-b',2)].map(p=>p.then(x=>({value:x})).catch(e=>({error:e}))));
 assert.equal(result.filter(r=>r.value).length,1);assert.equal(result.filter(r=>r.error?.status===409).length,1);
 const config=f.rows.get(kioskConfigKey(f.site.siteId)).data;assert.equal(config.enabled,true);assert.equal(config.devices.length,1);assert.equal(config.devices[0].id,paired.id);assert.equal(config.operations.events.length,1);
 assert.equal((await f.kioskHandler(f.request(null,paired.cookie))).status,200);
 await f.admin('configure',{enabled:false});assert.equal((await readPosOperations(f.site.siteId,f.store)).revision,1);assert.equal(f.rows.get(kioskConfigKey(f.site.siteId)).data.operations.events.length,1);
 const current=await readPosOperations(f.site.siteId,f.store);await configurePosOperations(f.store,f.site.siteId,current,'same',3);assert.equal((await readPosOperations(f.site.siteId,f.store)).revision,1,'unchanged save is not another audit event');
});
test('validation rejects CSRF, malformed/oversized JSON, invalid booleans/profile/revision and fails closed without CAS',async()=>{
 const f=fixture();assert.equal((await f.handler(request({siteId:f.site.siteId,...defaults,profile:'retail'},'https://foreign.invalid'))).status,403);
 for(const patch of [{cashierEnabled:'false'},{displayEnabled:0},{profile:'constructor'},{revision:-1},{revision:0.5}])assert.equal((await f.handler(request({siteId:f.site.siteId,...defaults,...patch}))).status,400);
 assert.equal((await f.handler(new Request('https://pos.example.invalid/api',{method:'POST',headers:{Origin:'https://pos.example.invalid'},body:'{'}))).status,400);
 assert.equal((await f.handler(request({siteId:f.site.siteId,...defaults,padding:'x'.repeat(2001)}))).status,413);
 assert.equal((await f.handler(new Request('https://pos.example.invalid/api',{method:'DELETE'}))).status,405);
 const unsafe={getWithMetadata:async()=>({data:{}}),setJSON:async()=>{throw Error('Must not write')}};await assert.rejects(configurePosOperations(unsafe,f.site.siteId,{...defaults,profile:'retail'},'admin',1),{status:503});
 await assert.rejects(requireCashierPos('tenant',{get:async()=>({operations:{cashierEnabled:'false'}})}),{status:503});
 assert.equal(f.rows.size,0);
});
test('disabled cashier blocks every new sale, Stripe checkout and Terminal entry point before providers or inventory',async()=>{
 const f=fixture();await configurePosOperations(f.store,f.site.siteId,{...defaults,cashierEnabled:false},'owner',1);
 const factories=[createPosSaleHandler,createIdempotentPosSaleHandler,createPosCheckoutHandler,createTerminalPaymentIntentHandler,createTerminalConnectionTokenHandler];
 for(const factory of factories){let called=false;const handler=factory({authorize:f.authorize,getStore:()=>f.store,performSale:async()=>{called=true;throw Error('Must not sell')}});const response=await handler(request({siteId:f.site.siteId,saleAttemptId:'attempt-fixture',items:[{id:'product',quantity:1}],paymentConfirmed:true,operations:{cashierEnabled:true}}));assert.equal(response.status,403);assert.match((await response.json()).message,/disabled/);assert.equal(called,false);}
 assert.equal(f.rows.size,1,'no inventory, sale or financial markers written');
 const denied=createPosCheckoutHandler({authorize:async()=>{throw Object.assign(Error('Authentication required'),{status:401})},getStore:()=>{throw Error('Must not read storage')}});assert.equal((await denied(request({siteId:f.site.siteId}))).status,401);
});
test('completed identical sale remains recoverable while cashier is disabled; changed replays are rejected',async()=>{
 const f=fixture(),payload={siteId:f.site.siteId,saleAttemptId:'attempt-existing',items:[{id:'product',quantity:1}],paymentMethod:'cash'};let calls=0;
 const handler=createIdempotentPosSaleHandler({authorize:f.authorize,getStore:()=>f.store,performSale:async()=>{calls++;return Response.json({ok:true,receiptId:'r-fixture',record:{transactionId:'t-fixture'}})}});
 assert.equal((await handler(request(payload))).status,200);await configurePosOperations(f.store,f.site.siteId,{...defaults,cashierEnabled:false},'owner',1);
 const recovered=await handler(request(payload));assert.equal(recovered.status,200);assert.equal((await recovered.json()).receiptId,'r-fixture');assert.equal(calls,1);assert.equal((await handler(request({...payload,items:[{id:'product',quantity:2}]}))).status,409);
 assert.equal(f.rows.get(commerceKey(f.site.siteId,'pos-attempts','attempt-existing')).data.status,'completed');
});
test('display flag blocks pairing, read and sync; explicit revocation remains available and kiosk stays independent',async()=>{
 const f=fixture(),display=createCustomerDisplayHandler({authorize:f.authorize,getStore:()=>f.store,getSite:async()=>f.site,clock:()=>1000});
 const created=await (await display(request({siteId:f.site.siteId,action:'create'}))).json(),[id,token]=new URL(created.pairUrl).hash.slice(6).split('.');
 const paired=await display(request({action:'pair',id,token}));assert.equal(paired.status,200);const cookie=paired.headers.get('set-cookie').split(';')[0];
 await configurePosOperations(f.store,f.site.siteId,{...defaults,displayEnabled:false},'owner',1);
 for(const input of [{siteId:f.site.siteId,action:'create'},{action:'pair',id,token},{siteId:f.site.siteId,action:'sync',id,sequence:1,items:[]}])assert.equal((await display(request(input))).status,403);
 assert.equal((await display(new Request('https://pos.example.invalid/api',{headers:{Cookie:cookie}}))).status,403);
 assert.equal((await display(request({siteId:f.site.siteId,action:'revoke',id}))).status,200);
 const kiosk=await f.paired();assert.equal((await f.kioskHandler(f.request(null,kiosk.cookie))).status,200);assert.equal((await readPosOperations(f.site.siteId,f.store)).displayEnabled,false);
});
