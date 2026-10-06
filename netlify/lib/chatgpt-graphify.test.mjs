import test from 'node:test';
import assert from 'node:assert/strict';
import {graphifyAvailable,graphifyProjectPath,queryGraphContext,shouldUseGraphify} from './chatgpt-graphify.mjs';

function envFixture(t,values={}){
 const prior=globalThis.Netlify;
 globalThis.Netlify={env:{get:name=>values[name]||''}};
 t.after(()=>{if(prior===undefined)delete globalThis.Netlify;else globalThis.Netlify=prior;});
}

test('Graphify stays disabled unless endpoint and private API key are configured',t=>{
 envFixture(t,{GRAPHIFY_MCP_URL:'https://graph.example/mcp'});
 assert.equal(graphifyAvailable({platform:true}),false);
});
test('Tenant graph path is server-derived from the authorized site id',t=>{
 envFixture(t,{GRAPHIFY_MCP_URL:'https://graph.example/mcp',GRAPHIFY_API_KEY:'secret',GRAPHIFY_TENANT_PROJECT_ROOT:'/graphs/tenants/'});
 assert.equal(graphifyAvailable({platform:false}),true);
 assert.equal(graphifyProjectPath({siteId:'nova-fade-studio'}),'/graphs/tenants/nova-fade-studio');
 assert.throws(()=>graphifyProjectPath({siteId:'../platform'}));
});
test('Insecure remote Graphify endpoints are not exposed',t=>{
 envFixture(t,{GRAPHIFY_MCP_URL:'http://graph.example/mcp',GRAPHIFY_API_KEY:'secret',GRAPHIFY_TENANT_PROJECT_ROOT:'/graphs'});
 assert.equal(graphifyAvailable({platform:false}),false);
});
test('Simple CRUD questions skip Graphify to avoid extra work',async t=>{
 envFixture(t,{GRAPHIFY_MCP_URL:'https://graph.example/mcp',GRAPHIFY_API_KEY:'secret',GRAPHIFY_TENANT_PROJECT_ROOT:'/graphs'});
 assert.equal(shouldUseGraphify('Change haircut price to 22'),false);
 const prior=globalThis.fetch;
 globalThis.fetch=async()=>{throw Error('network should not be called')};
 t.after(()=>{globalThis.fetch=prior});
 const out=await queryGraphContext({question:'Change haircut price to 22',siteId:'tenant-a'});
 assert.equal(out.used,false);
});
test('Complex tenant graph query performs MCP handshake and fixes project_path server-side',async t=>{
 envFixture(t,{GRAPHIFY_MCP_URL:'https://graph.example/mcp',GRAPHIFY_API_KEY:'secret',GRAPHIFY_TENANT_PROJECT_ROOT:'/graphs/tenants'});
 const calls=[];
 const prior=globalThis.fetch;
 globalThis.fetch=async(_url,options)=>{
  const body=JSON.parse(options.body);calls.push({body,headers:options.headers});
  if(body.method==='initialize')return new Response(JSON.stringify({jsonrpc:'2.0',id:1,result:{serverInfo:{name:'graphify'}}}),{status:200,headers:{'mcp-session-id':'session-1'}});
  if(body.method==='notifications/initialized')return new Response('',{status:202});
  return new Response(JSON.stringify({jsonrpc:'2.0',id:2,result:{content:[{type:'text',text:'Booking -> Calendar'}]}}),{status:200});
 };
 t.after(()=>{globalThis.fetch=prior});
 const out=await queryGraphContext({question:'Analyze why booking and calendar synchronization conflict',siteId:'tenant-a',depth:3,tokenBudget:900});
 assert.equal(out.used,true);
 assert.equal(out.scope,'tenant-context');
 assert.equal(calls.length,3);
 assert.equal(calls[2].body.params.name,'query_graph');
 assert.equal(calls[2].body.params.arguments.project_path,'/graphs/tenants/tenant-a');
 assert.equal(calls[2].body.params.arguments.token_budget,900);
 assert.equal(calls[0].headers.Authorization,'Bearer secret');
 assert.equal(calls[2].headers['mcp-session-id'],'session-1');
});
test('Platform graph can use the configured project path and larger bounded budget',async t=>{
 envFixture(t,{GRAPHIFY_MCP_URL:'https://graph.example/mcp',GRAPHIFY_API_KEY:'secret',GRAPHIFY_PLATFORM_PROJECT_PATH:'/graphs/webfactory'});
 const calls=[];const prior=globalThis.fetch;
 globalThis.fetch=async(_url,options)=>{
  const body=JSON.parse(options.body);calls.push(body);
  if(body.method==='initialize')return new Response(JSON.stringify({jsonrpc:'2.0',id:1,result:{serverInfo:{name:'graphify'}}}),{status:200,headers:{'mcp-session-id':'s'}});
  if(body.method==='notifications/initialized')return new Response('',{status:202});
  return new Response(JSON.stringify({jsonrpc:'2.0',id:2,result:{content:[{type:'text',text:'MCP -> OAuth'}]}}),{status:200});
 };
 t.after(()=>{globalThis.fetch=prior});
 const out=await queryGraphContext({question:'Analyze the architecture impact between MCP and OAuth changes',platform:true,tokenBudget:9999});
 assert.equal(out.used,true);
 assert.equal(out.tokenBudget,1600);
 assert.equal(calls[2].params.arguments.project_path,'/graphs/webfactory');
});
