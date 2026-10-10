import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'

const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:5188'
const server = process.env.PREVIEW_URL ? null : spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5188', '--strictPort'], { stdio: 'ignore' })
const launchOptions = process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox', '--single-process'] } : {}
try {
  for (let i = 0; i < 80; i++) { try { if ((await fetch(origin)).ok) break } catch {} await new Promise(r => setTimeout(r, 100)) }
  for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
    for (const theme of ['dark', 'light']) for (const lang of ['en', 'es']) {
      const browser = await chromium.launch(launchOptions)
      try {
        const page = await browser.newPage({ viewport: { width, height: 900 } })
        const errors = []
        page.on('pageerror', error => errors.push(error.message))
        await page.addInitScript(t => localStorage.setItem('webfactory-theme-v2', t), theme)
        await page.goto(origin)
        if (lang === 'es') await page.getByRole('button', { name: 'ES', exact: true }).click()
        await page.waitForFunction(() => getComputedStyle(document.querySelector('.wf-hero-copy .wf-actions')).opacity === '1')
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}: page overflow`)
        // Phase-2 anti-slop visual structure must survive all locales/themes.
        assert.equal(await page.locator('.wf-platform article').count(), 5, `${width}: capabilities present`)
        assert.equal(await page.locator('.wf-how article').count(), 3, `${width}: steps present`)
        const craft = await page.locator('.wf-platform article').first().evaluate(el => ({
          height: el.getBoundingClientRect().height,
          layout: getComputedStyle(el).display,
        }))
        assert(craft.height >= 95, `${width}: feature card readable`)
        assert(craft.layout === 'grid' || craft.layout === 'flex', `${width}: feature layout`)
        const price = await page.locator('.wf-price').evaluate(el => ({
          width: el.getBoundingClientRect().width,
          parentWidth: el.parentElement?.getBoundingClientRect().width || 0,
        }))
        assert(price.width > 0 && price.width <= price.parentWidth, `${width}: price card containment`)
        const controls = await page.locator('.wf-h-actions button,.wf-h-login').evaluateAll(elements => elements.map(el => {
          const r = el.getBoundingClientRect(); return { x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height }
        }).filter(r => r.width && r.height))
        for (const r of controls) { assert(r.width >= 44 && r.height >= 44, `${width}: touch target`); assert(r.x >= 0 && r.right <= width, `${width}: clipped control`) }
        for (let i = 0; i < controls.length; i++) for (let j = i + 1; j < controls.length; j++) {
          const a = controls[i], b = controls[j]
          assert(!(a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y), `${width}: overlapping controls`)
        }
        const menu = page.locator('.wf-h-menu')
        if (await menu.isVisible()) await menu.click()
        await page.locator('#wf-main-nav a[href="#faq"]').click()
        await page.waitForFunction(() => { const r = document.querySelector('#faq').getBoundingClientRect(); return r.top >= document.querySelector('.wf-h-header').getBoundingClientRect().bottom && r.top < innerHeight })
        await page.locator('#faq summary').first().click()
        assert(await page.locator('#faq details').first().getAttribute('open') !== null)
        for (let i = 0; i < 5; i++) {
          await page.locator('.wf-tour-step').nth(i).evaluate(el => el.scrollIntoView({ behavior:'instant', block:'center' }))
          await page.waitForFunction(index => document.querySelectorAll('.wf-tour-step')[index].getAttribute('aria-current') === 'step', i)
        }
        if (width < 768) assert.equal(await page.locator('.wf-tour-step').last().evaluate(el => getComputedStyle(el).minHeight), '0px')
        await page.getByRole('tab').nth(0).click()
        await page.locator('.wf-demo-product button').click()
        assert.match(await page.locator('.wf-demo-total').innerText(), /29/)
        for (let i = 1; i < 4; i++) { await page.getByRole('tab').nth(i).click(); assert.equal(await page.getByRole('tab').nth(i).getAttribute('aria-selected'), 'true') }
        assert.deepEqual(errors, [])
        console.log(`Home verified: ${width}px, ${theme}, ${lang}`)
      } finally { await browser.close() }
    }
  }
} finally { server?.kill() }
