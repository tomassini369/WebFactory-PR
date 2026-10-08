import test from 'node:test';
import assert from 'node:assert/strict';
import {callDesignTool,designProviderStatus} from './chatgpt-design-tools.mjs';

function envFixture(t,values={}){
 const prior=globalThis.Netlify;
 globalThis.Netlify={env:{get:name=>values[name]||''}};
 t.after(()=>{if(prior===undefined)delete globalThis.Netlify;else globalThis.Netlify=prior;});
}

test('design provider status never exposes secret values',t=>{
 envFixture(t,{STITCH_API_KEY:'stitch-secret-value',API_KEY_21ST:'21st-secret-value'});
 const status=designProviderStatus();
 assert.equal(status.stitch.configured,true);
 assert.equal(status['21st'].configured,true);
 assert(!JSON.stringify(status).includes('secret-value'));
 assert(status.stitch.readTools.includes('list_projects'));
 assert(status['21st'].writeTools.includes('generate'));
});

test('design providers fail closed when credentials are missing',async t=>{
 envFixture(t,{});
 await assert.rejects(callDesignTool({provider:'stitch',toolName:'list_projects'}),{status:503});
 await assert.rejects(callDesignTool({provider:'21st',toolName:'search',args:{query:'hero'}}),{status:503});
});

test('Stitch gateway uses fixed endpoint and server-side API key without forwarding arbitrary credentials',async t=>{
 envFixture(t,{STITCH_API_KEY:'stitch-test-key'});
 const prior=globalThis.fetch;
 const calls=[];
 globalThis.fetch=async(url,options)=>{
  calls.push({url,options});
  const body=JSON.parse(options.body);
  if(body.method==='initialize')return new Response(JSON.stringify({jsonrpc:'2.0',id:1,result:{protocolVersion:'2025-06-18',serverInfo:{name:'stitch'}}}),{status:200,headers:{'mcp-session-id':'session-a'}});
  if(body.method==='notifications/initialized')return new Response('',{status:202});
  return new Response(JSON.stringify({jsonrpc:'2.0',id:2,result:{content:[{type:'text',text:'projects'}]}}),{status:200});
 };
 t.after(()=>{globalThis.fetch=prior;});
 const result=await callDesignTool({provider:'stitch',toolName:'list_projects',args:{}});
 assert.equal(calls.length,3);
 assert(calls.every(call=>call.url==='https://stitch.googleapis.com/mcp'));
 assert(calls.every(call=>call.options.headers['X-Goog-Api-Key']==='stitch-test-key'));
 assert.equal(calls[2].options.headers['mcp-session-id'],'session-a');
 assert(!JSON.stringify(result).includes('stitch-test-key'));
});

test('21st gateway supports SSE responses and uses x-api-key only server-side',async t=>{
 envFixture(t,{API_KEY_21ST:'21st-test-key'});
 const prior=globalThis.fetch;
 let count=0;
 globalThis.fetch=async(url,options)=>{
  count++;
  const body=JSON.parse(options.body);
  assert.equal(url,'https://21st.dev/api/mcp');
  assert.equal(options.headers['x-api-key'],'21st-test-key');
  if(body.method==='initialize')return new Response('data: '+JSON.stringify({jsonrpc:'2.0',id:1,result:{protocolVersion:'2025-06-18',serverInfo:{name:'21st'}}})+'\n\n',{status:200,headers:{'mcp-session-id':'session-21'}});
  if(body.method==='notifications/initialized')return new Response('',{status:202});
  return new Response('event: message\ndata: '+JSON.stringify({jsonrpc:'2.0',id:2,result:{content:[{type:'text',text:'component result'}]}})+'\n\n',{status:200});
 };
 t.after(()=>{globalThis.fetch=prior;});
 const result=await callDesignTool({provider:'21st',toolName:'search',args:{query:'premium hero'}});
 assert.equal(count,3);
 assert.equal(result.content[0].text,'component result');
});

test('design gateway rejects unapproved tools and credential or endpoint injection before network',async t=>{
 envFixture(t,{STITCH_API_KEY:'stitch-test-key',API_KEY_21ST:'21st-test-key'});
 const prior=globalThis.fetch;
 let calls=0;
 globalThis.fetch=async()=>{calls++;throw Error('unexpected');};
 t.after(()=>{globalThis.fetch=prior;});
 await assert.rejects(callDesignTool({provider:'stitch',toolName:'delete_project',args:{}}),{status:403});
 await assert.rejects(callDesignTool({provider:'21st',toolName:'search',args:{endpoint:'https://evil.invalid'}}),{status:400});
 await assert.rejects(callDesignTool({provider:'21st',toolName:'search',args:{apiKey:'stolen'}}),{status:400});
 assert.equal(calls,0);
});


test('gateway sends negotiated MCP version and selects its response among SSE notifications',async t=>{
 envFixture(t,{API_KEY_21ST:'fake-test-key'});
 const prior=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{
  const body=JSON.parse(options.body);
  assert.equal(options.headers.Authorization,undefined);
  assert.equal(options.redirect,'error');
  assert.equal(options.credentials,'omit');
  if(body.method==='initialize')return Response.json({jsonrpc:'2.0',id:1,result:{protocolVersion:'2025-03-26'}});
  assert.equal(options.headers['MCP-Protocol-Version'],'2025-03-26');
  if(body.method==='notifications/initialized')return new Response(null,{status:202});
  return new Response('data: {"jsonrpc":"2.0","id":2,\ndata: "result":{"content":[{"type":"text","text":"usage"}]}}\n\ndata: {"jsonrpc":"2.0","method":"notifications/message"}\n\n');
 };
 t.after(()=>{globalThis.fetch=prior;});
 assert.equal((await callDesignTool({provider:'21st',toolName:'get_usage'})).content[0].text,'usage');
});

test('gateway fails closed for mismatched replies, invalid initialization and provider errors',async t=>{
 envFixture(t,{STITCH_API_KEY:'fake-test-key'});
 const prior=globalThis.fetch;
 t.after(()=>{globalThis.fetch=prior;});
 for(const reply of [
  {jsonrpc:'2.0',id:3,result:{}},
  {jsonrpc:'2.0',id:1,result:{}},
  {jsonrpc:'2.0',id:1,error:{message:'fake-test-key'}}
 ]){
  globalThis.fetch=async()=>Response.json(reply);
  await assert.rejects(callDesignTool({provider:'stitch',toolName:'list_projects'}),e=>e.status===502&&!e.message.includes('fake-test-key'));
 }
 globalThis.fetch=async(url,options)=>{
  const body=JSON.parse(options.body);
  if(body.method==='initialize')return Response.json({jsonrpc:'2.0',id:1,result:{protocolVersion:'2025-06-18'}});
  if(body.method==='notifications/initialized')return new Response(null,{status:202});
  return Response.json({jsonrpc:'2.0',id:2,result:{isError:true,content:[{type:'text',text:'fake-test-key'}]}});
 };
 await assert.rejects(callDesignTool({provider:'stitch',toolName:'list_projects'}),e=>e.status===502&&!e.message.includes('fake-test-key'));
});
