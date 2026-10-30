import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,readdirSync} from 'node:fs'
import {createPracticeRuntime} from '../src/training/practice-runtime.mjs'
import {palettes,defaults,tokens,contrast,saveDesign,readDesign} from '../src/next/design.ts'
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)}
test('17 presets have legible text, button ink and focus in both modes',()=>{assert.equal(Object.keys(palettes).length,17);for(const palette of Object.keys(palettes))for(const mode of ['dark','light']){const t=tokens({...defaults,palette,mode});for(const surface of ['--nx-bg','--nx-surface','--nx-raised']){assert(contrast(t['--nx-text'],t[surface])>=4.5,palette+' '+mode+' text');assert(contrast(t['--nx-muted'],t[surface])>=4.5,palette+' '+mode+' muted')}assert(contrast(t['--nx-accent'],t['--nx-accent-ink'])>=4.5);assert(contrast(t['--nx-focus'],t['--nx-surface'])>=3)}})
test('unsafe custom background is toned to preserve text readability',()=>{for(const mode of ['dark','light']){const t=tokens({...defaults,mode,background:mode==='dark'?'#ffffff':'#000000'});assert(contrast(t['--nx-text'],t['--nx-bg'])>=4.5)}})
test('studio saves readback revision and rejects stale editor',()=>{memory.clear();const first=readDesign();const next=saveDesign({...first.value,palette:'Aurora'},first.revision);assert.equal(readDesign().value.palette,'Aurora');assert.throws(()=>saveDesign(defaults,first.revision),/CONFLICT/);assert.equal(readDesign().revision,next.revision)})
test('unavailable storage does not acknowledge success',()=>{const original=localStorage.setItem;localStorage.setItem=()=>{throw Error('QuotaExceeded')};assert.throws(()=>saveDesign(defaults,readDesign().revision),/QuotaExceeded/);localStorage.setItem=original})
test('practice rejects external providers, foreign tenant and unknown operations without network fallback',async()=>{const r=createPracticeRuntime({role:'owner',capabilities:['overview','catalog','pos','collect']});for(const url of ['https://webfactorypr.com/.netlify/functions/client-admin','https://api.stripe.com/v1/charges','/.netlify/functions/client-admin?siteId=someone-else','/.netlify/functions/google-calendar'])assert.equal((await r.fetch(url)).status,403)})
test('employee fixture cannot acquire owner administration by changing frontend role',async()=>{const r=createPracticeRuntime({role:'employee',capabilities:['catalog']});const res=await r.fetch('/.netlify/functions/client-admin',{method:'PATCH',body:JSON.stringify({section:'catalog',siteId:r.siteId,value:[]})});assert.equal(res.status,403)})
test('POS totals and idempotency are driven by fixture response, not animation',async()=>{const r=createPracticeRuntime({role:'owner',capabilities:['pos','collect']});const body={siteId:r.siteId,items:[{id:'practice-product',quantity:2}],paymentMethod:'cash',saleAttemptId:'next-sample-attempt'};const a=await r.fetch('/.netlify/functions/client-pos-sale-idempotent',{method:'POST',body:JSON.stringify(body)});assert.equal(a.status,200);const first=await a.json();const b=await(await r.fetch('/.netlify/functions/client-pos-sale-idempotent',{method:'POST',body:JSON.stringify(body)})).json();assert.equal(first.receiptId,b.receiptId);assert.equal(r.snapshot().receipts.length,1);assert.equal(r.snapshot().receipts[0].total,2676)})
test('deployment cannot include production functions, previews seeding or provider network',()=>{const config=readFileSync('netlify.toml','utf8');assert(config.includes('experimental/empty-functions'));assert(!config.includes('plugins/preview-barber'));assert(config.includes("connect-src 'none'"));assert(!readdirSync('experimental/empty-functions').some(f=>f.endsWith('.mjs')));assert(readFileSync('scripts/build-next.mjs','utf8').includes('process.env.SITE_ID!==id'))})
test('15 concrete font binaries and preserved OFL notices match recorded hashes',async()=>{const {createHash}=await import('node:crypto');const rows=JSON.parse(readFileSync('docs/next/fonts.json','utf8'));assert.equal(rows.length,15);for(const r of rows){assert.equal(r.license,'OFL-1.1');assert(r.spanishEnglishGlyphsVerified);assert.equal(createHash('sha256').update(readFileSync('assets'+r.file)).digest('hex'),r.woff2Sha256);const notice=readFileSync('docs/next/font-licenses/'+r.slug+'-OFL.txt');assert(notice.includes('SIL OPEN FONT LICENSE Version 1.1'));assert.equal(createHash('sha256').update(notice).digest('hex'),r.licenseSha256)}})

// A manual directory/ZIP deploy does not read netlify.toml. Its output needs
// the same CDN policy and hash-navigation contract as a Git-connected build.
test('manual deploy retains security rules, blocked APIs, unknown-path rejection and notices', async()=>{
 const {mkdtempSync,rmSync}=await import('node:fs')
 const {tmpdir}=await import('node:os')
 const {join}=await import('node:path')
 const {writeNextDeployArtifacts}=await import('./next-deploy-artifacts.mjs')
 const out=mkdtempSync(join(tmpdir(),'wf-next-deploy-'))
 try {
  writeNextDeployArtifacts(out)
  const headers=readFileSync(join(out,'_headers'),'utf8')
  assert(headers.includes("connect-src 'none'"))
  assert(headers.includes("form-action 'none'"))
  assert(headers.includes('X-Robots-Tag: noindex, nofollow, noarchive'))
  assert.equal(readFileSync(join(out,'_redirects'),'utf8'),'/* /blocked.json 404\n')
  const rows=JSON.parse(readFileSync(join(out,'next/licenses/fonts.json'),'utf8'))
  assert.equal(rows.length,15)
  for(const row of rows)assert.equal(readFileSync(join(out,'next/licenses',row.slug+'-OFL.txt'),'utf8'),readFileSync('docs/next/font-licenses/'+row.slug+'-OFL.txt','utf8'))
  assert(readFileSync(join(out,'next/licenses/animejs-MIT.txt'),'utf8').includes('MIT'))
 } finally {rmSync(out,{recursive:true,force:true})}
})
