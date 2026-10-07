import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
const s=await createServer({server:{port:5194,host:'127.0.0.1'}});await s.listen()
const b=await chromium.launch(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH,args:['--single-process','--no-sandbox']}:undefined);const p=await b.newPage()
try{
await p.goto('http://127.0.0.1:5194/templates/northline-barber');await p.locator('.template-hero').waitFor()
await p.evaluate(async()=>{const {default:React}=await import('/node_modules/.vite/deps/react.js');const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js');const {createRoot}=ReactDOM;const {default:Store}=await import('/src/ClientStorefront.tsx');document.querySelector('#root').style.display='none';const el=document.createElement('div');document.body.append(el);createRoot(el).render(React.createElement(Store,{slug:'qa',previewLanguage:'es',previewSite:{siteId:'preview',slug:'qa',business:{name:'QA',category:'Barber'},design:{templateSlug:'northline-barber'},features:{services:true,bookings:true},catalog:[1,2,3].map(n=>({id:'s'+n,type:'service',name:'Service '+n,description:'',price:20,inventory:null,requiresAppointment:true,duration:30,imageUrl:''})),employees:[1,2,3].map(n=>({id:'e'+n,name:'Employee '+n,role:'Professional',serviceIds:['s3',...(n<3?['s2']:[]),...(n===1?['s1']:[])]})),hours:{},paymentRules:{},settings:{}}}))})
await p.locator('.template-hero-actions .template-solid:visible').click()
const modal=p.locator('.cs-booking');const selectors=modal.locator('select')
for(const n of [1,2,3]){await selectors.nth(0).selectOption('s'+n);assert.equal(await selectors.nth(1).locator('option').count(),n+1);for(let e=1;e<=n;e++)await selectors.nth(1).selectOption('e'+e)}
console.log('PASS: shared Builder/storefront renderer supports 1, 2 and 3 eligible employees and service switching')
}finally{await b.close();await s.close()}
