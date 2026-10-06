import test from 'node:test';
import assert from 'node:assert/strict';
import {graphifyRequestTimeoutMs,queryGraphContext} from './chatgpt-graphify.mjs';

function envFixture(t,values={}){
 const prior=globalThis.Netlify;
 globalThis.Netlify={env:{get:name=>values[name]||''}};
 t.after(()=>{if(prior===undefined)delete globalThis.Netlify;else globalThis.Netlify=prior;});
}

test('Graphify timeout defaults to 25 seconds for Render cold starts',t=>{
 envFixture(t,{});
 assert.equal(graphifyRequestTimeoutMs(),25000);
});

test('Graphify timeout override remains bounded',t=>{
 envFixture(t,{GRAPHIFY_MCP_TIMEOUT_MS:'40000'});
 assert.equal(graphifyRequestTimeoutMs(),30000);
 globalThis.Netlify.env.get=name=>name==='GRAPHIFY_MCP_TIMEOUT_MS'?'2000':'';
 assert.equal(graphifyRequestTimeoutMs(),5000);
});


test('Graphify retries transient cold-start failures within one request budget',async t=>{
 envFixture(t,{GRAPHIFY_MCP_URL:'https://graph.example/mcp',GRAPHIFY_MCP_TIMEOUT_MS:'10000'});
 const priorFetch=globalThis.fetch;
 const priorTimeout=globalThis.setTimeout;
 let calls=0;
 globalThis.setTimeout=(fn,ms,...args)=>priorTimeout(fn,Math.min(ms,1),...args);
 globalThis.fetch=async(_url,options)=>{
  const body=JSON.parse(options.body);
  calls+=1;
  if(calls<=2)return new Response('warming',{status:503});
  if(body.method==='initialize')return new Response(JSON.stringify({jsonrpc:'2.0',id:1,result:{serverInfo:{name:'graphify'}}}),{status:200,headers:{'mcp-session-id':'cold-start-ok'}});
  if(body.method==='notifications/initialized')return new Response('',{status:202});
  return new Response(JSON.stringify({jsonrpc:'2.0',id:2,result:{content:[{type:'text',text:'Builder -> Bookings'}]}}),{status:200});
 };
 t.after(()=>{globalThis.fetch=priorFetch;globalThis.setTimeout=priorTimeout;});
 const out=await queryGraphContext({
  question:'Analyze architecture impact between Builder and Bookings',
  platform:true,
  authorization:'Bearer platform-token'
 });
 assert.equal(out.used,true);
 assert.equal(out.context,'Builder -> Bookings');
 assert.ok(calls>=5);
});
