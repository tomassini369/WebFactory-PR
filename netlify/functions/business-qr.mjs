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

export default async (req) => {
  try {
    if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })
    const url = new URL(req.url)
    const siteId = (url.searchParams.get('siteId') || '').trim()
    const platform = url.searchParams.get('platform') === '1'

    let site = null
    let target = `${publicBaseUrl()}/`
    let name = 'WebFactory PR'
    let accent = '3c86f6'
    let ink = '0b1529'
    let logo = ''

    if (platform) {
      await requirePlatformAdmin()
      logo = await platformLogo()
    } else {
      if (!siteId) throw Object.assign(new Error('Business is required.'), { status: 400 })
      site = await getClientSite(siteId)
      if (!site) throw Object.assign(new Error('Business not found.'), { status: 404 })
      try {
        await requireSiteAccess(siteId)
      } catch (accessError) {
        if (Number(accessError?.status) !== 403) throw accessError
        await requirePlatformAdmin()
      }
      target = `${publicBaseUrl()}/sites/${encodeURIComponent(site.slug)}`
      name = site.business?.name || site.business?.nameEn || site.business?.nameEs || site.slug
      const primary = safeColor(site.design?.primary, '0b1529')
      const secondary = safeColor(site.design?.secondary, '3c86f6')
      ink = luminance(primary) <= .20 ? primary : luminance(secondary) <= .20 ? secondary : '0b1529'
      accent = secondary
      logo = await businessLogo(site)
    }

    const payload = {
      text: target,
      size: 900,
      format: 'png',
      margin: 2,
      dark: ink,
      light: 'ffffff',
      finderColor: accent,
      dotStyle: 'rounded',
      finderStyle: 'rounded',
      finderDotStyle: 'rounded',
      ecLevel: logo ? 'H' : 'Q',
      ...(logo ? { centerImageUrl: logo, centerImageSizeRatio: .22 } : {}),
      caption: name,
      captionFontSize: 28,
      captionFontColor: ink,
    }
    const response = await fetch('https://quickchart.io/qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) throw new Error('QR image could not be generated.')
    const bytes = await response.arrayBuffer()
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
