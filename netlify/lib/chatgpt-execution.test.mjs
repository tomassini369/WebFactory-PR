import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {getStore} from '@netlify/blobs';
import {clientOAuthStore,clientSiteStore,getClientSite} from './client-store.mjs';
import {authorizeGrant,parseOperation,safeOutput,redesignSite} from './chatgpt-operations.mjs';
import {revokeExecute,key} from './chatgpt-oauth.mjs';
import {prepareProposal,executeProposal,proposalKey} from './chatgpt-proposals.mjs';
import {serveMcp} from './chatgpt-mcp.mjs';
import {confirmExecutableProposal,executeConfirmedProposal,cancelExecutableProposal,getExecutableProposal} from './chatgpt-execution.mjs';
function fixture(t){
 globalThis.netlifyBlobsContext=Buffer.from(JSON.stringify({siteID:'test',token:'test',deployID:'test'})).toString('base64');
 globalThis.Netlify={env:{get:()=>''}};
 t.after(()=>{delete globalThis.Netlify;delete globalThis.netlifyBlobsContext});
 const rows=new Map(),proto=Object.getPrototypeOf(getStore('test'));let revision=0;
 t.mock.method(proto,'get',async function(k){return structuredClone(rows.get(this.name+'/'+k)?.data||null)});
 t.mock.method(proto,'getWithMetadata',async function(k){return structuredClone(rows.get(this.name+'/'+k)||null)});
 t.mock.method(proto,'setJSON',async function(k,data,o={}){const id=this.name+'/'+k,old=rows.get(id);if(o.onlyIfNew&&old||o.onlyIfMatch&&old?.etag!==o.onlyIfMatch)return {modified:false};rows.set(id,{data:structuredClone(data),etag:String(++revision)});return {modified:true}});
 t.mock.method(proto,'list',function({prefix='',paginate=false}={}){const page={blobs:[...rows.keys()].filter(k=>k.startsWith(this.name+'/'+prefix)).map(k=>({key:k.slice(this.name.length+1)}))};return paginate?(async function*(){yield page})():Promise.resolve(page)});
 t.mock.method(globalThis,'fetch',async()=>{throw Error('Unexpected network request')});
 const user={id:'owner-a',email:'owner-a@example.invalid'},site={siteId:'tenant-a',slug:'a',revision:1,status:'active',business:{name:'Original',description:'Original description'},design:{style:'Modern',primary:'#112233',secondary:'#445566'},features:{products:true},members:[{email:user.email,role:'owner'}],catalog:[{id:'p1',name:'Existing',price:30}],employees:[{id:'e1',name:'Existing'}],servicePlan:{subscriptionStatus:'active'},googleCalendar:{connected:true},businessEmail:{connected:true}};
 const grant={id:crypto.randomUUID(),userId:user.id,email:user.email,siteId:site.siteId,platform:false,scopes:['webfactory.read','webfactory.propose'],expiresAt:Date.now()+86400000};
 const prepare=async()=>{await clientSiteStore().setJSON('sites/tenant-a.json',site);await clientOAuthStore().setJSON(key('grants',grant.id),grant)};
 return {site,user,grant,prepare};
}

async function setup(t,{platform=false,operation='update_catalog',input}={}){
 const f=fixture(t);f.grant.scopes.push('webfactory.execute');
 if(platform){f.grant.platform=true;f.grant.siteId='';f.user.roles=['admin'];}
 await f.prepare();
 const p=await prepareProposal(f.grant,f.user,{operation,siteId:f.site.siteId,input:input||{value:f.site.catalog.map(x=>({...x,price:40}))},requestId:crypto.randomUUID()},'https://webfactorypr.com');
 return {...f,p};
}
test('Execution requires Execute and server-recorded confirmation; owner-bound and connection-bound',async t=>{
 const f=await setup(t);
 await assert.rejects(executeConfirmedProposal(f.p.id,f.user,f.grant),{status:409});
 await assert.rejects(getExecutableProposal(f.p.id,{...f.user,id:'thief'},f.grant),{status:404});
 await assert.rejects(getExecutableProposal(f.p.id,f.user,{...f.grant,id:crypto.randomUUID()}),{status:404});
 await assert.rejects(confirmExecutableProposal(f.p.id,f.user,'yes'),{status:400});
 await revokeExecute(clientOAuthStore(),f.grant.id);
 await assert.rejects(executeConfirmedProposal(f.p.id,f.user,f.grant),{status:403});
});
test('Owner execution reads back actual price, writes sanitized receipt and rejects double execution',async t=>{
 const f=await setup(t);assert.equal(f.p.currentState.catalog[0].price,30);assert.equal(f.p.proposedState.catalog[0].price,40);
 await confirmExecutableProposal(f.p.id,f.user,'CONFIRM');
 const attempts=await Promise.allSettled([executeConfirmedProposal(f.p.id,f.user,f.grant),executeConfirmedProposal(f.p.id,f.user,f.grant)]);
 assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);
 const result=attempts.find(x=>x.status==='fulfilled').value;
 assert.equal(result.verified,true);assert.equal(result.status,'executed');assert.equal(result.receipt.after.catalog[0].price,40);
 assert.equal((await getClientSite(f.site.siteId)).catalog[0].price,40);
 const audit=await clientOAuthStore().get('chatgpt/audit/'+result.auditId+'.json');assert.equal(audit.source,'chatgpt-mcp');assert.equal(audit.success,true);
 await assert.rejects(executeConfirmedProposal(f.p.id,f.user,f.grant),{status:409});
});
test('Platform administrator execution records platform-admin action explicitly',async t=>{
 const f=await setup(t,{platform:true});await confirmExecutableProposal(f.p.id,f.user,'CONFIRM');
 const r=await executeConfirmedProposal(f.p.id,f.user,f.grant);assert.equal(r.verified,true);assert.equal(r.receipt.actorType,'platform-admin action');
});
test('Expired proposal fails closed and records expired state',async t=>{
 const f=await setup(t),store=clientOAuthStore(),k=proposalKey(f.p.id),p=await store.get(k);
 await store.setJSON(k,{...p,expiresAt:Date.now()-1});await assert.rejects(executeConfirmedProposal(p.id,f.user,f.grant),{status:409});assert.equal((await store.get(k)).status,'expired');
});
test('Manipulated siteId and payload fail without changing business',async t=>{
 const f=await setup(t),store=clientOAuthStore(),k=proposalKey(f.p.id),p=await store.get(k);
 await store.setJSON(k,{...p,siteId:'tenant-b'});await assert.rejects(confirmExecutableProposal(p.id,f.user,'CONFIRM'),{status:403});
 await store.setJSON(k,{...p,input:{value:[{id:'p1',price:9999}]}});await assert.rejects(confirmExecutableProposal(p.id,f.user,'CONFIRM'),{status:409});
 assert.equal((await getClientSite(f.site.siteId)).catalog[0].price,30);
});
test('Concurrent business edit invalidates confirmed proposal',async t=>{
 const f=await setup(t);await confirmExecutableProposal(f.p.id,f.user,'CONFIRM');
 await clientSiteStore().setJSON('sites/tenant-a.json',{...f.site,revision:2});await assert.rejects(executeConfirmedProposal(f.p.id,f.user,f.grant),{status:409});
});
test('Catalog deletion requires reinforced confirmation and can be cancelled',async t=>{
 const f=await setup(t,{input:{value:[]}});assert.equal(f.p.requiredConfirmation,'CONFIRM DELETION');
 await assert.rejects(confirmExecutableProposal(f.p.id,f.user,'CONFIRM'),{status:400});
 await confirmExecutableProposal(f.p.id,f.user,'CONFIRM DELETION');await cancelExecutableProposal(f.p.id,f.user,f.grant);
 await assert.rejects(executeConfirmedProposal(f.p.id,f.user,f.grant),{status:409});assert.equal((await getClientSite(f.site.siteId)).catalog.length,1);
});
test('Revoking Execute leaves read and propose usable and invalidates confirmed execution',async t=>{
 const f=await setup(t);await confirmExecutableProposal(f.p.id,f.user,'CONFIRM');await revokeExecute(clientOAuthStore(),f.grant.id);
 const grant=await clientOAuthStore().get(key('grants',f.grant.id));assert.deepEqual(grant.scopes,['webfactory.read','webfactory.propose']);
 await authorizeGrant(grant,f.user,'tenant-a');await prepareProposal(grant,f.user,{operation:'update_catalog',input:{value:f.site.catalog},requestId:crypto.randomUUID()},'https://webfactorypr.com');
 await assert.rejects(executeConfirmedProposal(f.p.id,f.user,f.grant),{status:403});
});
test('HTTP success without correct read-after-write is not success and is audited',async t=>{
 const f=await setup(t);await confirmExecutableProposal(f.p.id,f.user,'CONFIRM');
 const proto=Object.getPrototypeOf(clientSiteStore()),original=proto.setJSON;
 t.mock.method(proto,'setJSON',async function(k,data,o){if(k==='sites/tenant-a.json'&&data.revision===2)return {modified:true};return original.call(this,k,data,o)});
 const r=await executeConfirmedProposal(f.p.id,f.user,f.grant);assert.equal(r.verified,false);assert.equal(r.ok,false);assert.equal(r.status,'failed');assert.ok(r.auditId);
 await assert.rejects(executeConfirmedProposal(f.p.id,f.user,f.grant),{status:409});
});

test('MCP Execute exposes direct writers, applies normal changes immediately and confirms deletion only in chat',async t=>{
 const f=fixture(t);f.grant.scopes=['webfactory.read','webfactory.execute'];await f.prepare();
 const rpc=async(name,args)=>{
  const response=await serveMcp(new Request('https://webfactorypr.com/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})}),f.grant,f.user,{});
  return response.json();
 };
 const listed=await serveMcp(new Request('https://webfactorypr.com/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list',params:{}})}),f.grant,f.user,{});
 const tools=(await listed.json()).result.tools.map(x=>x.name);
 assert.ok(tools.includes('wf_update_catalog'));assert.ok(tools.includes('wf_confirm_action'));assert.ok(!tools.includes('wf_execute_change'));assert.ok(!tools.some(x=>x.startsWith('wf_prepare_')));
 const direct=await rpc('wf_update_catalog',{requestId:crypto.randomUUID(),input:{value:f.site.catalog.map(x=>({...x,price:40}))}});
 assert.ok(!direct.error&&!direct.result.isError);const directBody=JSON.parse(direct.result.content[0].text);assert.equal(directBody.verified,true);assert.equal((await getClientSite(f.site.siteId)).catalog[0].price,40);
 const sensitive=await rpc('wf_update_catalog',{requestId:crypto.randomUUID(),input:{value:[]}});
 assert.ok(!sensitive.error&&!sensitive.result.isError);const pending=JSON.parse(sensitive.result.content[0].text);assert.equal(pending.status,'confirmation_required');assert.equal(pending.requiredConfirmation,'CONFIRM DELETION');assert.equal((await getClientSite(f.site.siteId)).catalog.length,1);
 const denied=await rpc('wf_confirm_action',{confirmationId:pending.confirmationId,confirmationText:'yes'});assert.equal(denied.result.isError,true);assert.equal((await getClientSite(f.site.siteId)).catalog.length,1);
 const done=await rpc('wf_confirm_action',{confirmationId:pending.confirmationId,confirmationText:'CONFIRM DELETION'});assert.ok(!done.error&&!done.result.isError);assert.equal(JSON.parse(done.result.content[0].text).verified,true);assert.equal((await getClientSite(f.site.siteId)).catalog.length,0);
});
