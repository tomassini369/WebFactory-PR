import assert from 'node:assert/strict'
import { preview } from 'vite'
import { chromium, webkit } from 'playwright'
import { selectPortalSection } from './qa-workspace-navigation.mjs'
import { commercialCapabilities, employeeSiteView, canAccessCommerce, employeeCommerceRecord } from '../netlify/lib/commercial-access.mjs'
import { kitchenOrderPatch, normalizeKitchenDisplays } from '../netlify/lib/kitchen-display.mjs'

const port = Number(process.env.QA_PORT || 5326)
const origin = process.env.QA_ORIGIN || `http://127.0.0.1:${port}`
const server = process.env.QA_ORIGIN ? null : await preview({ preview: { host: '127.0.0.1', port, strictPort: true } })
const useWebKit = process.env.QA_ENGINE === 'webkit'
const browser = await (useWebKit ? webkit : chromium).launch(useWebKit ? {} : {
  ...(process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {}), args: ['--no-sandbox'],
})
const widths = (process.env.QA_WIDTHS || '320,375,390,430,768,1024,1440').split(',').map(Number)
try {
  for (const width of widths) {
    for (const [theme, lang] of [['light', 'es'], ['dark', 'en']]) {
      const es = lang === 'es'
      const role = width === 375 ? 'employee' : 'owner'
      const user = { id:'qa-cook',email:'cook@example.invalid',mfa:{required:false} }
      const membership = { role, email:user.email, permissions:{kitchen:true}, locationIds:['one'] }
      const context = await browser.newContext({ viewport:{width,height:860}, serviceWorkers:'block', reducedMotion:'reduce', hasTouch:width<768 })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.addInitScript(value => localStorage.setItem('webfactory-theme-v2', value), theme)
      const site = {
        siteId:'kitchen-qa', slug:'kitchen-qa', revision:1, status:'published',
        business:{name:'Kitchen QA',category:'Restaurant',locations:[{id:'one',name:'Arecibo'},{id:'two',name:'San Juan'}]},
        settings:{locale:lang,timezone:'America/Puerto_Rico'}, catalog:[{id:'pizza',type:'product',name:'Pizza',price:12}],
        employees:[], hours:{}, design:{primary:'#0B1529',secondary:'#3C86F6'}, paymentRules:{}, features:{},
        servicePlan:{subscriptionStatus:'complimentary',billingModel:'complimentary'},
      }
      const now = new Date().toISOString()
      const ticket = {siteId:site.siteId,transactionId:'paid-pos',kind:'order',queueNumber:'POS-01',source:'pos',locationId:'one',paidAt:now,createdAt:now,status:'completed',paymentStatus:'paid_in_person',kitchenStatus:'received',items:[{id:'pizza',name:'Pizza',quantity:2}],customer:{name:'Test diner'}}
      const orders = [ticket, {...ticket,transactionId:'due',queueNumber:'DUE-01',paymentStatus:'due'},
        {...ticket,transactionId:'another-branch',queueNumber:'SJ-01',locationId:'two',channel:'kiosk',source:''}]
      let reads = 0
      await page.route('**/.netlify/functions/**', async route => {
        const request = route.request()
        const url = new URL(request.url())
        const endpoint = url.pathname.split('/').at(-1)
        let body = {ok:true}
        if (endpoint === 'portal-session') body = {ok:true,user}
        if (endpoint === 'portal-profile') body = {ok:true,profile:{language:lang,theme},hasPhoto:false,revision:0}
        if (endpoint === 'dashboard-appearance') body = {ok:true,prefs:{},hasCustom:false}
        if (endpoint === 'client-admin') {
          if (request.method() === 'PATCH') {
            assert.equal(role, 'owner')
            const input = request.postDataJSON()
            assert.equal(input.section, 'kitchenDisplays')
            assert.equal(input.siteId, site.siteId)
            assert.equal(input.revision, site.revision)
            site.kitchenDisplays = normalizeKitchenDisplays(input.value, site)
            site.revision++
          }
          body = url.searchParams.has('siteId') || request.method() === 'PATCH'
            ? {ok:true,site:employeeSiteView(site,membership),membership:{...membership,capabilities:commercialCapabilities(membership)}}
            : {ok:true,sites:[{siteId:site.siteId,slug:site.slug,businessName:site.business.name}]}
        }
        if (endpoint === 'client-commerce-admin') {
          if (request.method() === 'POST') {
            const input = request.postDataJSON()
            assert.equal(input.siteId, site.siteId)
            assert.equal(input.transactionId, ticket.transactionId)
            assert.equal(input.action, 'kitchen_status')
            Object.assign(ticket,kitchenOrderPatch(ticket,input,site.settings.timezone))
            body = {ok:true,record:ticket}
          } else {
            reads++
            body = {ok:true,bookings:[],orders:orders.filter(order=>canAccessCommerce(site,membership,order)).map(order=>employeeCommerceRecord(order,membership))}
          }
        }
        await route.fulfill({json:body})
      })
      await page.goto(origin + '/client-admin')
      await page.locator('.gd-client-dashboard').waitFor()
      await page.locator('.portal-language').getByRole('button',{name:lang.toUpperCase(),exact:true}).click()
      await selectPortalSection(page,es?'Preparar órdenes':'Prepare orders')
      const panel = page.locator('[data-training="kitchen"]')
      const card = panel.locator('[data-kitchen-order="paid-pos"]')
      await card.waitFor()
      assert.equal(await panel.locator('[data-kitchen-order="due"]').count(),0)
      if (role === 'employee') {
        assert.equal(await panel.locator('[data-kitchen-order="another-branch"]').count(),0)
        assert.equal(await panel.locator('.kds-settings').count(),0)
      }
      await card.getByRole('button',{name:es?'Pausar':'Pause',exact:true}).click()
      await panel.locator('[data-status="on_hold"] [data-kitchen-order="paid-pos"]').waitFor()
      await card.getByRole('button',{name:es?'Preparando':'Preparing',exact:true}).click()
      await panel.locator('[data-status="preparing"] [data-kitchen-order="paid-pos"]').waitFor()
      await card.getByText(es?'Opciones de orden':'Order options',{exact:true}).click()
      await card.getByRole('button',{name:'+15 min',exact:true}).click()
      await card.locator('.kds-eta').waitFor()
      await card.getByLabel(es?'Hora manual':'Custom time').fill('15:37')
      await card.getByRole('button',{name:es?'Guardar hora':'Save time',exact:true}).click()
      await card.locator('.kds-eta').getByText('15:37',{exact:true}).waitFor()
      await panel.getByRole('button',{name:es?'Vista de lista':'List view',exact:true}).click()
      await panel.locator('.kds-list').waitFor()
      const previousReads = reads
      const refresh = page.waitForResponse(response => response.url().includes('client-commerce-admin') && response.request().method() === 'GET')
      await panel.getByRole('button',{name:es?'Actualizar órdenes':'Refresh orders',exact:true}).click()
      await refresh
      assert(reads > previousReads)
      if (role === 'owner') {
        await panel.getByText(es?'Administrar estaciones':'Manage stations',{exact:true}).click()
        await panel.getByRole('button',{name:es?'Nueva estación':'New station',exact:true}).click()
        await panel.getByLabel(es?'Nombre de estación':'Station name').fill('Pizza QA')
        await panel.locator('summary').filter({hasText:es?'Origen de la orden':'Order source'}).click()
        await panel.getByLabel(es?'Cajero':'Cashier',{exact:true}).check()
        await panel.getByRole('button',{name:es?'Guardar estación':'Save station',exact:true}).click()
        await panel.getByText(es?'Configuración guardada.':'Settings saved.',{exact:true}).waitFor()
        assert.equal(await panel.locator('[data-kitchen-order="another-branch"]').count(),0)
      }
      await panel.getByRole('button',{name:es?'Ampliar tarjeta':'Expand card',exact:true}).click()
      await panel.getByRole('button',{name:es?'Cerrar tarjeta ampliada':'Close expanded card',exact:true}).waitFor()
      assert(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth + 1))
      assert(await panel.evaluate(element=>element.scrollWidth<=element.clientWidth+1))
      await page.keyboard.press('Escape')
      assert.deepEqual(errors,[])
      console.log(`PASS ${width}px ${theme} ${lang} ${role}`)
      await context.close()
    }
  }
} finally {
  await browser.close()
  if (server) await new Promise(resolve=>server.httpServer.close(resolve))
}
