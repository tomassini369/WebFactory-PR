import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const source = 'assets/webfactory-pr-logo.png'
const outputDir = 'assets'
const background = { r: 255, g: 255, b: 255, alpha: 1 }

await mkdir(outputDir, { recursive: true })

async function makeIcon(cleanLogo, size, filename, safeScale = 0.68) {
  const innerWidth = Math.round(size * safeScale)
  const innerHeight = Math.round(size * safeScale)

  const logo = await sharp(cleanLogo)
    .resize(innerWidth, innerHeight, {
      fit: 'contain',
      withoutEnlargement: false,
      background,
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

// Use the verified official source directly. It already has a clean white
// background, so no pixel replacement or trimming is needed.
const cleanLogo = source

await Promise.all([
  makeIcon(cleanLogo, 180, 'apple-touch-icon-clean.png', 0.68),
  makeIcon(cleanLogo, 192, 'icon-clean-192.png', 0.68),
  makeIcon(cleanLogo, 512, 'icon-clean-512.png', 0.68),
  makeIcon(cleanLogo, 512, 'icon-clean-maskable-512.png', 0.56),
])

console.log('Generated clean WebFactoryPR icons from the official logo.')
