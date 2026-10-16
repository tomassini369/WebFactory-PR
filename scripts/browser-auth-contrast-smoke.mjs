import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {preview} from 'vite'
import {chromium,webkit} from 'playwright'
const port=Number(process.env.QA_PORT||5306),isWebKit=process.env.QA_ENGINE==='webkit',engine=isWebKit?'webkit':'chromium'
const server=await preview({preview:{host:'127.0.0.1',port,strictPort:true}}),origin=process.env.QA_ORIGIN||`http://127.0.0.1:${port}`
const browser=await(isWebKit?webkit:chromium).launch(isWebKit?(process.env.QA_WEBKIT_PATH?{executablePath:process.env.QA_WEBKIT_PATH}:{}):{...(process.env.QA_CHROMIUM_PATH?{executablePath:process.env.QA_CHROMIUM_PATH}:{}),args:['--no-sandbox'],...(process.env.QA_ORIGIN&&process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})})
const output='/tmp/webfactory-auth-contrast';await mkdir(output,{recursive:true});let activePage
async function contrast(page,label){
 const result=await page.locator('main').evaluate(root=>{
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d')
  const rgba=value=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=value;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].map((v,i)=>i===3?v/255:v)}
  const over=(a,b)=>[...a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3])),1],lum=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0)
  const ratio=(a,b)=>{const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
  const background=node=>{const ancestors=[];for(let el=node;el;el=el.parentElement)ancestors.push(el);return ancestors.reverse().reduce((color,el)=>over(rgba(getComputedStyle(el).backgroundColor),color),[255,255,255,1])}
  const rows=[]
  for(const node of root.querySelectorAll('*')){
   const style=getComputedStyle(node)
   if(!node.getClientRects().length||style.visibility==='hidden'||node.closest('[aria-hidden=true]'))continue
   const own=[...node.childNodes].filter(child=>child.nodeType===Node.TEXT_NODE).map(child=>child.textContent.trim()).filter(Boolean).join(' ')
   const label=own||(node.matches('input:not([type=checkbox])')?node.value:'');if(!label)continue
   const bg=background(node),fg=over(rgba(style.webkitTextFillColor||style.color),bg)
   // The existing hover filter brightens the final painted text and fill together.
   const brightness=Number(style.filter.match(/^brightness\(([\d.]+)\)$/)?.[1]||1)
   const brighten=rgb=>rgb.map((v,i)=>i<3?Math.min(255,v*brightness):v)
   rows.push({label:label.slice(0,80),node:node.tagName+'.'+node.className,foreground:fg,background:bg,ratio:ratio(brighten(fg),brighten(bg))})
  }
  return rows
 })
 assert(result.length>5,label+' must inspect rendered text')
 assert.deepEqual(result.filter(row=>row.ratio<4.5),[],label+' text contrast must be at least 4.5:1, including disabled MFA labels')
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' must not overflow')
}
try{
 for(const path of (process.env.QA_AUTH_PATHS||'/client-admin,/webfactory-admin').split(','))for(const width of (process.env.QA_WIDTHS||'320,375,390,430,768,1024,1440').split(',').map(Number))for(const theme of (process.env.QA_THEMES||'light,dark').split(','))for(const lang of (process.env.QA_LANGS||'es,en').split(',')){
  const es=lang==='es',context=await browser.newContext({viewport:{width,height:width===320?650:900},reducedMotion:'reduce',serviceWorkers:'block',...(isWebKit?{hasTouch:true}:{})}),page=await context.newPage();activePage=page
  let signedIn=false,enrolled=false;const errors=[],unexpected=[],securityActions=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message))
  await page.addInitScript(theme=>{if(window===top)localStorage.setItem('webfactory-theme-v2',theme)},theme)
  const applicationFrame=request=>{try{for(let frame=request.frame();frame&&frame!==page.mainFrame();frame=frame.parentFrame()){const url=frame.url();if(/^https?:/.test(url)&&new URL(url).origin!==new URL(origin).origin)return false}return true}catch{return true}}
  await page.route('**/*',async route=>{const req=route.request();if(!applicationFrame(req))return route.continue();if(!['GET','HEAD'].includes(req.method())&&!new URL(req.url()).pathname.startsWith('/.netlify/functions/')){unexpected.push(req.url());return route.abort()}return route.continue()})
  await page.route('**/.netlify/functions/**',async route=>{
   const req=route.request();if(!applicationFrame(req))return route.continue();const name=new URL(req.url()).pathname.split('/').at(-1)
   if(name==='webfactory-admin-overview'&&req.method()==='GET')return route.fulfill({status:403,json:{ok:false,message:'Fixture MFA verification required'}})
   if(name==='client-admin'&&req.method()==='GET')return route.fulfill({json:{ok:true,sites:[]}})
   if(!['portal-session','portal-login','portal-mfa'].includes(name)){unexpected.push(name);return route.fulfill({status:403,json:{ok:false,message:'Fixture-only authentication QA'}})}
   if(name==='portal-login'){assert.equal(req.postDataJSON().email,'contrast@example.invalid');assert.equal(req.postDataJSON().password,'fixture-only');signedIn=true}
   if(name==='portal-mfa'){
    const action=req.postDataJSON().action;securityActions.push(action)
    if(action==='totp-setup')return route.fulfill({json:{ok:true,secret:'DEMO-NOT-A-REAL-KEY',qr:'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Ctext y="50"%3EDEMO%3C/text%3E%3C/svg%3E',challengeId:'fixture-only',expiresAt:Date.now()+300000}})
    if(action==='totp-cancel')return route.fulfill({json:{ok:true}})
    if(action==='totp-confirm'||action==='totp-verify')return route.fulfill({status:400,json:{ok:false,message:es?'Código de ejemplo no válido.':'Sample code is invalid.'}})
    unexpected.push('mfa:'+action);return route.fulfill({status:403,json:{ok:false,message:'Real security changes are forbidden'}})
   }
   const user=signedIn?{id:'auth-contrast-fixture',email:'contrast@example.invalid',user_metadata:{},app_metadata:{roles:['admin']},mfa:{required:true,verified:false,enrolled,policyRequired:true,authenticatorAvailable:true,authenticatorEnrolled:enrolled,credentials:enrolled?[{id:'fixture-passkey',label:'Sample passkey'}]:[],recoveryCodesRemaining:2}}:null
   return route.fulfill({json:{ok:true,user}})
  })
  await page.goto(origin+path);await page.locator('input[type=email]').waitFor();await page.locator('.portal-language').getByRole('button',{name:lang.toUpperCase(),exact:true}).click()
  await page.locator('input[type=email]').fill('contrast@example.invalid');await page.locator('input[autocomplete=current-password]').fill('fixture-only')
  await contrast(page,'Password login');const submit=page.locator('form>button');await submit.hover();await contrast(page,'Login hover');await submit.click();await page.locator('.mfa-panel').waitFor()
  // This transition loads the password form CSS first, reproducing the white-on-white secondary button.
  const setup=page.getByRole('button',{name:es?'Configurar Authenticator':'Set up Authenticator',exact:true});await setup.waitFor();await contrast(page,'Enrollment after password login');await setup.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');assert.equal(await setup.evaluate(el=>el===document.activeElement),true);assert.notEqual(await setup.evaluate(el=>getComputedStyle(el).outlineStyle),'none')
  await setup.click();const setupPanel=page.locator('.mfa-authenticator-setup');await setupPanel.waitFor();await contrast(page,'Authenticator setup disabled button')
  const code=setupPanel.locator('input[autocomplete=one-time-code]');await code.fill('123456');await contrast(page,'Authenticator setup entered code');await setupPanel.getByRole('button',{name:es?'Activar Authenticator':'Activate Authenticator',exact:true}).click();await page.locator('.mfa-panel>[role=alert]').waitFor();await contrast(page,'Authenticator setup error')
  await setupPanel.getByRole('button',{name:es?'Cancelar':'Cancel',exact:true}).click();await setup.waitFor()
  // Directly restored MFA also needs to work without depending on the password CSS loading order.
  enrolled=true;await page.reload();await page.locator('.mfa-panel').waitFor();await page.locator('.portal-language').getByRole('button',{name:lang.toUpperCase(),exact:true}).click()
  await page.getByRole('button',{name:es?'Verificar passkey':'Verify passkey',exact:true}).waitFor();await contrast(page,'Restored MFA, passkey and recovery')
  await page.locator('input[autocomplete=one-time-code]').fill('123456');await page.locator('.wf-theme-toggle').click();await contrast(page,'MFA theme switch');assert.equal(await page.locator('input[autocomplete=one-time-code]').inputValue(),'123456');await page.locator('.wf-theme-toggle').click()
  if([390,1440].includes(width))await page.screenshot({path:`${output}/${path.slice(1)}-${width}-${theme}-${lang}-${engine}.png`})
  assert.deepEqual(unexpected,[],'No unmocked writes or real authentication calls');assert.deepEqual(errors,[],'No uncaught page errors');assert.deepEqual(securityActions,['totp-setup','totp-confirm','totp-cancel'])
  console.log('PASS password → MFA, secondary labels, disabled/code/error states, restored passkey/recovery, theme and isolation',path,width,theme,lang,engine);await context.close()
 }
} catch(error){if(activePage&&!activePage.isClosed())await activePage.screenshot({path:output+'/failure-'+engine+'.png'}).catch(()=>{});throw error}
finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve))}
