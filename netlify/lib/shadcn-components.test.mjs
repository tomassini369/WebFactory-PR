import test from 'node:test';
import assert from 'node:assert/strict';
import {planShadcnComponents,parseComponentNames} from './shadcn-components.mjs';
import {createShadcnGitHub} from './shadcn-github.mjs';
const item=(name,extra={})=>({name,type:'registry:ui',files:[{path:`registry/new-york-v4/ui/${name}.tsx`,type:'registry:ui',content:'import {cn} from "cn"\nimport {cva} from "class-variance-authority"\nexport const Example = () => null;'}],...extra});
const catalog=rows=>({item:async name=>{if(!rows[name])throw Error('Missing fixture');return rows[name]}});
test('Component plan resolves transitive source, adapts cn and finds omitted npm imports',async()=>{
 const plan=await planShadcnComponents(['button'],{catalog:catalog({button:item('button',{registryDependencies:['label'],dependencies:['radix-ui']}),label:item('label',{registryDependencies:['button']})})});
 assert.deepEqual(plan.resolvedComponents,['button','label']);assert.equal(plan.files.length,2);assert.match(plan.files[0].content,/@\/lib\/utils/);assert(plan.dependencies.includes('radix-ui'));assert(plan.dependencies.includes('class-variance-authority'));assert(plan.files.every(file=>file.path.startsWith('src/components/ui/')));
});
test('Planner rejects paths, external registries, packages, unsafe metadata and unsupported blocks',async()=>{
 assert.throws(()=>parseComponentNames(['button; rm -rf']));assert.throws(()=>parseComponentNames([]));
 for(const bad of [{registryDependencies:['https://evil.invalid/x']},{dependencies:['pkg@https://evil.invalid']},{envVars:{SECRET:'bad'}},{css:{body:{display:'none'}}},{type:'registry:block'},{files:[{path:'../../netlify/functions/escape.mjs',type:'registry:ui',content:'bad'}]},{files:[{path:'registry/new-york-v4/ui/button.tsx',type:'registry:ui',content:'import fs from "node:fs"'}]}])await assert.rejects(planShadcnComponents(['button'],{catalog:catalog({button:item('button',bad)})}));
});
test('Planner bounds aggregate changes and rejects colliding files',async()=>{
 await assert.rejects(planShadcnComponents(['button'],{catalog:catalog({button:item('button',{files:[{path:'registry/new-york-v4/ui/button.tsx',type:'registry:ui',content:'x'.repeat(500001)}]})})}),{status:413});
 await assert.rejects(planShadcnComponents(['button','card'],{catalog:catalog({button:item('button'),card:item('card',{files:[{path:'registry/new-york-v4/ui/button.tsx',type:'registry:ui',content:'different'}]})})}),{status:409});
});
const requestId='76827e44-405b-4001-8b1c-9a33b69036bb';
test('Missing server credential returns an honest GitHub handoff without mutating anything',async()=>{
 const bridge=createShadcnGitHub({getToken:()=>'',planner:async()=>({}),fetchImpl:()=>{throw Error('No network allowed')}});
 const result=await bridge.add({requestId,components:['button']});assert.equal(result.status,'github_connection_required');assert.equal(result.productionPublished,false);assert(!result.previewUrl);await assert.rejects(bridge.status({requestId}),{status:409});
});
test('GitHub dispatcher uses fixed repository/main, only server credential and safe inputs',async()=>{
 const calls=[];
 const bridge=createShadcnGitHub({getToken:()=>'server-only-token',planner:async()=>({}),fetchImpl:async(url,options)=>{
  calls.push({url,options});assert(url.startsWith('https://api.github.com/repos/tomassini369/WebFactory-PR/'));assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,'Bearer server-only-token');
  if(options.method==='POST')return new Response(null,{status:204});return Response.json(url.includes('/pulls?')?[]:{workflow_runs:[]});
 }});
 const result=await bridge.add({requestId,components:['input','button']});assert.equal(result.status,'queued');assert.equal(calls.length,3);
 assert.deepEqual(JSON.parse(calls[2].options.body),{ref:'main',inputs:{components:'button,input',request_id:requestId}});
 await assert.rejects(bridge.add({requestId:'../main',components:['button']}),{status:400});assert.equal(calls.length,3);
});
test('Existing request returns verified PR status and never redispatches; upstream errors are redacted',async()=>{
 let posts=0;
 const bridge=createShadcnGitHub({getToken:()=>'private-token',planner:async()=>({}),fetchImpl:async(url,options)=>{if(options.method==='POST')posts++;return Response.json(url.includes('/pulls?')?[{number:101,state:'open'}]:{workflow_runs:[]});}});
 const result=await bridge.add({requestId,components:['button']});assert.equal(result.status,'pull_request_created');assert.equal(result.previewStatus,'pending_verification');assert.match(result.previewUrl,/deploy-preview-101/);assert.equal(posts,0);
 const failed=createShadcnGitHub({getToken:()=>'private-token',planner:async()=>({}),fetchImpl:async()=>new Response('private-token',{status:403})});await assert.rejects(failed.add({requestId,components:['button']}),error=>error.status===409&&!error.message.includes('private-token'));
});
