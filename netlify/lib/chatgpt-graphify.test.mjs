import test from 'node:test';
import assert from 'node:assert/strict';
import {graphifyAvailable,graphifyProjectPath,queryGraphContext,shouldUseGraphify} from './chatgpt-graphify.mjs';

function envFixture(t,values={}){
 const prior=globalThis.Netlify;
 globalThis.Netlify={env:{get:name=>values[name]||''}};
 t.after(()=>{if(prior===undefined)delete globalThis.Netlify;else globalThis.Netlify=prior;});
}

test('Platform Graphify is available through the built-in HTTPS OAuth proxy',t=>{
 envFixture(t,{});
 assert.equal(graphifyAvailable({platform:true}),true);
});
test('Tenant Graphify stays fail-closed until explicitly enabled with a tenant graph root',t=>{
 envFixture(t,{GRAPHIFY_TENANT_PROJECT_ROOT:'/graphs/tenants/'});
 assert.equal(graphifyAvailable({platform:false}),false);
 globalThis.Netlify.env.get=name=>({GRAPHIFY_TENANT_PROJECT_ROOT:'/graphs/tenants/',GRAPHIFY_TENANT_CONTEXT_ENABLED:'true'})[name]||'';
 assert.equal(graphifyAvailable({platform:false}),true);
 assert.equal(graphifyProjectPath({siteId:'nova-fade-studio'}),'/graphs/tenants/nova-fade-studio');
 assert.throws(()=>graphifyProjectPath({siteId:'../platform'}));
});
test('Insecure remote Graphify endpoint overrides are not exposed',t=>{
 envFixture(t,{GRAPHIFY_MCP_URL:'http://graph.example/mcp'});
 assert.equal(graphifyAvailable({platform:true}),false);
});
test('Simple CRUD questions skip Graphify and do not require delegated OAuth',async t=>{
 envFixture(t,{});
 assert.equal(shouldUseGraphify('Change haircut price to 22'),false);
 const prior=globalThis.fetch;
 globalThis.fetch=async()=>{throw Error('network should not be called')};
 t.after(()=>{globalThis.fetch=prior});
 const out=await queryGraphContext({question:'Change haircut price to 22',platform:true});
 assert.equal(out.used,false);
});
test('Complex tenant graph query delegates OAuth and fixes project_path server-side',async t=>{
 envFixture(t,{GRAPHIFY_MCP_URL:'https://graph.example/mcp',GRAPHIFY_TENANT_PROJECT_ROOT:'/graphs/tenants',GRAPHIFY_TENANT_CONTEXT_ENABLED:'true'});
 const calls=[];
 const prior=globalThis.fetch;
 globalThis.fetch=async(_url,options)=>{
  const body=JSON.parse(options.body);calls.push({body,headers:options.headers});
  if(body.method==='initialize')return new Response(JSON.stringify({jsonrpc:'2.0',id:1,result:{serverInfo:{name:'graphify'}}}),{status:200,headers:{'mcp-session-id':'session-1'}});
  if(body.method==='notifications/initialized')return new Response('',{status:202});
  return new Response(JSON.stringify({jsonrpc:'2.0',id:2,result:{content:[{type:'text',text:'Booking -> Calendar'}]}}),{status:200});
 };
 t.after(()=>{globalThis.fetch=prior});
 const out=await queryGraphContext({question:'Analyze why booking and calendar synchronization conflict',siteId:'tenant-a',depth:3,tokenBudget:900,authorization:'Bearer delegated-token'});
 assert.equal(out.used,true);
 assert.equal(out.scope,'tenant-context');
 assert.equal(calls.length,3);
 assert.equal(calls[2].body.params.name,'query_graph');
 assert.equal(calls[2].body.params.arguments.project_path,'/graphs/tenants/tenant-a');
 assert.equal(calls[2].body.params.arguments.token_budget,900);
 assert.equal(calls[0].headers.Authorization,'Bearer delegated-token');
 assert.equal(calls[2].headers.Authorization,'Bearer delegated-token');
 assert.equal(calls[2].headers['mcp-session-id'],'session-1');
});
test('Platform graph delegates OAuth, uses default graph and bounds output budget',async t=>{
 envFixture(t,{GRAPHIFY_MCP_URL:'https://graph.example/mcp'});
 const calls=[];const prior=globalThis.fetch;
 globalThis.fetch=async(_url,options)=>{
  const body=JSON.parse(options.body);calls.push({body,headers:options.headers});
  if(body.method==='initialize')return new Response(JSON.stringify({jsonrpc:'2.0',id:1,result:{serverInfo:{name:'graphify'}}}),{status:200,headers:{'mcp-session-id':'s'}});
  if(body.method==='notifications/initialized')return new Response('',{status:202});
  return new Response(JSON.stringify({jsonrpc:'2.0',id:2,result:{content:[{type:'text',text:'MCP -> OAuth'}]}}),{status:200});
 };
 t.after(()=>{globalThis.fetch=prior});
 const out=await queryGraphContext({question:'Analyze the architecture impact between MCP and OAuth changes',platform:true,tokenBudget:9999,authorization:'Bearer platform-token'});
 assert.equal(out.used,true);
 assert.equal(out.tokenBudget,1600);
 assert.ok(!('project_path' in calls[2].body.params.arguments));
 assert.equal(calls[2].headers.Authorization,'Bearer platform-token');
});
test('Complex graph query rejects missing delegated OAuth before any network call',async t=>{
 envFixture(t,{});
 const prior=globalThis.fetch;let called=false;
 globalThis.fetch=async()=>{called=true;throw Error('unexpected')};
 t.after(()=>{globalThis.fetch=prior});
 await assert.rejects(queryGraphContext({question:'Analyze architecture dependencies between OAuth and MCP',platform:true}),{status:401});
 assert.equal(called,false);
});
