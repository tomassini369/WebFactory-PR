// Anonymous read-only network audit. Never logs request bodies, query values,
// cookie values, storage values, credentials or responses containing user data.
import {chromium} from 'playwright';
const origin=process.argv[2];
if(!/^https:\/\/[^/]+$/.test(origin||''))throw Error('Pass one HTTPS origin');
const defaultPaths=['/','/crear','/cuenta','/privacy','/terms','/refund-policy','/copyright','/client-admin/','/webfactory-admin/','/builder','/kiosk','/customer-display','/sites/faro-norte-preview'];
const paths=process.argv.slice(3).length?process.argv.slice(3):defaultPaths;
if(paths.some(path=>!/^\/[a-z0-9/-]*$/i.test(path)))throw Error('Pass public route paths without query strings');
const proxyUrl=process.env.HTTPS_PROXY||process.env.https_proxy;
const proxy=proxyUrl?new URL(proxyUrl):null;
const browser=await chromium.launch({headless:true,executablePath:process.env.QA_CHROMIUM_PATH||undefined,args:['--no-sandbox'],...(proxy?{proxy:{server:proxy.origin,...(proxy.username?{username:decodeURIComponent(proxy.username),password:decodeURIComponent(proxy.password)}:{})}}:{})});
const report={origin,checkedAt:new Date().toISOString(),authenticated:false,physicalDevice:false,rows:[]};
try{
 for(const width of [390,1440])for(const path of paths){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage();
  const requests=new Map(),failures=new Set();
  page.on('request',r=>{const u=new URL(r.url());if(!['http:','https:'].includes(u.protocol))return;const key=u.origin+' '+r.resourceType();requests.set(key,(requests.get(key)||0)+1)});
  page.on('requestfailed',r=>{try{failures.add(new URL(r.url()).origin)}catch{}});
  let status=null,error=null;
  try{status=(await page.goto(origin+path,{waitUntil:'networkidle',timeout:30000}))?.status();await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await page.waitForTimeout(1200)}catch(e){error=e.message.match(/net::[A-Z_]+/)?.[0]||e.name}
  const storage=await page.evaluate(()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage)})).catch(()=>null);
  const cookies=(await context.cookies()).map(({name,domain,httpOnly,secure,sameSite,expires})=>({name,domain,httpOnly,secure,sameSite,persistent:expires>0}));
  process.stderr.write(`${width} ${path}: ${status||error}\n`);
  report.rows.push({width,path,status,error,requests:[...requests].map(([category,count])=>({category,count})),failedOrigins:[...failures],storageKeys:storage,cookies});
  await context.close();
 }
 console.log(JSON.stringify(report,null,2));if(report.rows.some(row=>row.error))process.exitCode=1;
}finally{await browser.close()}
