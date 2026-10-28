import { renderBusinessQr } from '../lib/business-qr-image.mjs'
import { errorResponse, requirePlatformAdmin, requireSiteAccess } from '../lib/client-auth.mjs'
import { clientAssetStore, getClientSite } from '../lib/client-store.mjs'
import { publicBaseUrl } from '../lib/platform-utils.mjs'

function safeColor(value, fallback) {
  const color = String(value || '').trim()
  return /^#[0-9a-f]{6}$/i.test(color) ? color.slice(1) : fallback
}

function luminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi)?.map(part => parseInt(part, 16) / 255) || [0, 0, 0]
  const rgb = channels.map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
  return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2]
}

async function platformLogo() {
  const response = await fetch(`${publicBaseUrl()}/webfactory-pr-logo.png`)
  if (!response.ok) return ''
  const type = response.headers.get('content-type') || 'image/png'
  const data = Buffer.from(await response.arrayBuffer())
  return data.length <= 1_000_000 ? `data:${type};base64,${data.toString('base64')}` : ''
}

async function businessLogo(site) {
  const key = site.business?.logoAssetKey
  if (!key || !key.startsWith(`sites/${site.siteId}/`)) return ''
  const [data, metadata] = await Promise.all([
    clientAssetStore().get(key, { type: 'arrayBuffer' }),
    clientAssetStore().getMetadata(key),
  ])
  const type = metadata?.metadata?.contentType || ''
  if (!data || !['image/png', 'image/jpeg', 'image/webp'].includes(type)) return ''
  const bytes = Buffer.from(data)
  return bytes.length <= 1_000_000 ? `data:${type};base64,${bytes.toString('base64')}` : ''
}

export function createBusinessQrHandler(deps = {}) {
 const access = deps.siteAccess || requireSiteAccess
 const admin = deps.platformAccess || requirePlatformAdmin
 const loadSite = deps.getSite || getClientSite
 const render = deps.render || renderBusinessQr
 return async (req) => {
  try {
    if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })
    const url = new URL(req.url)
    const siteId = (url.searchParams.get('siteId') || '').trim()
    const platform = url.searchParams.get('platform') === '1'

    let site = null
    let target = `${url.origin}/`
    let ink = '0b1529'
    let logo = ''

    if (platform) {
      await admin()
      logo = await platformLogo().catch(() => '')
    } else {
      if (!siteId) throw Object.assign(new Error('Business is required.'), { status: 400 })
      site = await loadSite(siteId)
      if (!site) throw Object.assign(new Error('Business not found.'), { status: 404 })
      try {
        await access(siteId)
      } catch (accessError) {
        if (Number(accessError?.status) !== 403) throw accessError
        await admin()
      }
      target = `${url.origin}/sites/${encodeURIComponent(site.slug)}`
      const primary = safeColor(site.design?.primary, '0b1529')
      const secondary = safeColor(site.design?.secondary, '3c86f6')
      ink = luminance(primary) <= .20 ? primary : luminance(secondary) <= .20 ? secondary : '0b1529'
      logo = await businessLogo(site).catch(() => '')
    }

    const bytes = await render({target, ink, logo})
    const slug = site?.slug || 'webfactory-pr'
    return new Response(bytes, { headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `inline; filename="${slug}-qr.png"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    } })
  } catch (error) {
    return errorResponse(error)
  }
 }
}
export default createBusinessQrHandler()
