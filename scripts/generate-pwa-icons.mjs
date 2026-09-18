import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const source = 'assets/webfactory-pr-logo.png'
const outputDir = 'assets'
const background = { r: 255, g: 255, b: 255, alpha: 1 }

await mkdir(outputDir, { recursive: true })

async function makeIcon(size, filename, safeScale = 0.84) {
  const innerWidth = Math.round(size * safeScale)
  const innerHeight = Math.round(size * safeScale)

  const logo = await sharp(source)
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

await Promise.all([
  makeIcon(180, 'apple-touch-icon.png', 0.86),
  makeIcon(192, 'icon-192.png', 0.86),
  makeIcon(512, 'icon-512.png', 0.86),
  makeIcon(512, 'icon-maskable-512.png', 0.68),
])

console.log('Generated WebFactoryPR PWA icons from the official logo.')
