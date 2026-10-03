import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
execFileSync(process.execPath,['scripts/preview-emails.mjs'],{stdio:'inherit'});
const directory=resolve('.email-preview');
const pages=(await readdir(directory)).filter(file=>file.endsWith('.html')&&file!=='index.html');
const browser=await chromium.launch();
try{
  const page=await browser.newPage();
  // Verification cannot send, fetch remote images, or call platform APIs.
  await page.route('http**/*',route=>route.abort());
  for(const width of [390,1280]){
    await page.setViewportSize({width,height:900});
    for(const file of pages){
      await page.goto(pathToFileURL(resolve(directory,file)).href);
      assert.equal(await page.locator('h1').count(),1,`${file}: title`);
      assert(await page.locator('h1').innerText(),`${file}: empty title`);
      const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert(dimensions.scroll<=dimensions.width,`${file}: horizontal overflow at ${width}px`);
      assert.equal(await page.locator('script').count(),0,`${file}: email contains script`);
    }
    console.log(`Email previews passed: ${pages.length} at ${width}px`);
  }
}finally{await browser.close()}
