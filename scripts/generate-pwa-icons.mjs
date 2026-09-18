import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const source = 'assets/webfactory-pr-logo.png'
const outputDir = 'assets'
const background = { r: 255, g: 255, b: 255, alpha: 1 }

await mkdir(outputDir, { recursive: true })

async function cleanOfficialLogo() {
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info
  const flaggedRows = new Array(height).fill(false)

  // Detect large solid black horizontal bands only near the top/bottom.
  // This preserves the real black WF lettering and WebFactory typography.
  for (let y = 0; y < height; y += 1) {
    const normalizedY = y / height
    if (normalizedY > 0.38 && normalizedY < 0.62) continue

    let nearBlack = 0
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * channels
      const r = data[offset]
      const g = data[offset + 1]
      const b = data[offset + 2]
      const a = data[offset + 3]
      if (a > 220 && r < 24 && g < 24 && b < 24) nearBlack += 1
    }

    if (nearBlack / width > 0.5) flaggedRows[y] = true
  }

  const groups = []
  let start = null
  for (let y = 0; y <= height; y += 1) {
    const active = y < height && flaggedRows[y]
    if (active && start === null) start = y
    if (!active && start !== null) {
      if (y - start >= Math.max(8, Math.round(height * 0.015))) groups.push([start, y - 1])
      start = null
    }
  }

  for (const [from, to] of groups) {
    for (let y = from; y <= to; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * channels
        data[offset] = 255
        data[offset + 1] = 255
        data[offset + 2] = 255
        data[offset + 3] = 255
      }
    }
  }

  return sharp(data, { raw: info })
    .png()
    .trim({ background: '#ffffff', threshold: 12 })
    .toBuffer()
}

async function makeIcon(cleanLogo, size, filename, safeScale = 0.68) {
  const innerWidth = Math.round(size * safeScale)
  const innerHeight = Math.round(size * safeScale)

  const logo = await sharp(cleanLogo)
    .resize(innerWidth, innerHeight, {
      fit: 'contain',
      withoutEnlargement: false,
    })
    .png()
    .toBuffer()

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(`${outputDir}/${filename}`)
}

const cleanLogo = await cleanOfficialLogo()

await Promise.all([
  makeIcon(cleanLogo, 180, 'apple-touch-icon-clean.png', 0.68),
  makeIcon(cleanLogo, 192, 'icon-clean-192.png', 0.68),
  makeIcon(cleanLogo, 512, 'icon-clean-512.png', 0.68),
  makeIcon(cleanLogo, 512, 'icon-clean-maskable-512.png', 0.56),
])

console.log('Generated clean WebFactoryPR icons from the official logo.')
