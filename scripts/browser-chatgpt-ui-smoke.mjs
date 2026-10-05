import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:5181';
let browser,server;
try {
 server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5181','--strictPort'],{stdio:'ignore'});
 for(let i=0;i<80;i++){try{if((await fetch(origin)).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch();const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(origin+'/chatgpt',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html><body><div id="root"></div><script type="module">
 import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
 import ChatgptControlPage from '/src/ChatgptControlPage.tsx';import {ThemeProvider} from '/src/theme.tsx';
 import '/src/styles.css';import '/src/theme.css';import '/src/interactions.css';import '/src/theme-accessibility.css';
 function App(){const[lang,setLang]=useState('en');return React.createElement(ThemeProvider,null,React.createElement(ChatgptControlPage,{lang,setLang}))}
 createRoot(document.getElementById('root')).render(React.createElement(App));</script></body></html>`}));
 let status=200;
 const state={email:'qa@example.invalid',platformAdmin:false,sites:[{siteId:'qa',name:'QA business'}],grants:[{id:'qa-grant',siteId:'qa',platform:false,revoked:false,expiresAt:Date.now()+3600000,scopes:['webfactory.read','webfactory.execute']}],proposals:[],proposal:{id:'qa-proposal',businessName:'QA business',operation:'update_catalog',description:'QA proposal',status:'pending',input:{},expiresAt:Date.now()+3600000,requiresChatConfirmation:false}};
 await page.route(origin+'/.netlify/functions/chatgpt-control',route=>{assert.equal(route.request().method(),'GET','Read-only regression must not alter permissions');return route.fulfill({status,contentType:'application/json',body:JSON.stringify(status===200?state:{message:status===401?'Authentication required.':'Unable to complete request.'})})});
 for(const width of [390,1280]){
  status=200;await page.setViewportSize({width,height:844});await page.goto(origin+'/chatgpt');
  await page.getByRole('heading',{name:'Your connections',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Apply change',exact:true}).count(),0);
  await page.getByText('Review and execute this proposal from ChatGPT according to your connection permissions. Return to the chat to continue.',{exact:true}).waitFor();
  for(let i=0;i<2;i++){
   assert.equal(await page.locator('.wf-theme-toggle').count(),1);assert.equal(await page.locator('.wf-theme-toggle.floating').count(),0);
   await page.locator('.wf-theme-toggle').click();
  }
  status=503;await page.getByRole('button',{name:'ES',exact:true}).click();await page.getByRole('alert').waitFor();
  assert.equal(await page.getByRole('heading',{name:'Tus conexiones',exact:true}).count(),0,'Failed refresh must hide stale connections');
  status=401;await page.getByRole('button',{name:'Volver a verificar',exact:true}).click();
  await page.getByText('Inicia sesión y completa la verificación de seguridad en tu portal; después regresa a esta página.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'EN',exact:true}).click();
  await page.getByText('Sign in and complete security verification in your portal, then return to this page.',{exact:true}).waitFor();
  console.log('ChatGPT approval boundary, stale permissions, translations and single theme control:',width);
 }
 assert.deepEqual(errors,[]);
}finally{await browser?.close();server?.kill()}
