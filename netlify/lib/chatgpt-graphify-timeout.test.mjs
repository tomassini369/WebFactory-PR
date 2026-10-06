import test from 'node:test';
import assert from 'node:assert/strict';
import {graphifyRequestTimeoutMs} from './chatgpt-graphify.mjs';

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
