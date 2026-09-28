import sharp from 'sharp'
import { copyFile, mkdir } from 'node:fs/promises'

const source = 'assets/webfactory-pr-logo.png'
const outputDir = 'assets'
const background = { r: 6, g: 19, b: 41, alpha: 1 }

await mkdir(outputDir, { recursive: true })

async function makeIcon(cleanLogo, size, filename, safeScale = 1) {
  const innerWidth = Math.round(size * safeScale)
  const innerHeight = Math.round(size * safeScale)

  const logo = await sharp(cleanLogo)
    .resize(innerWidth, innerHeight, {
      fit: 'cover',
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

// Use the supplied square WF mark as-is for standard app icons. The maskable
// variant adds navy safe area so Android's icon mask won't crop the artwork.
const cleanLogo = source

await Promise.all([
  copyFile(source, 'assets/webfactory-pr-logo-dark.png'),
  makeIcon(cleanLogo, 180, 'apple-touch-icon-clean.png'),
  makeIcon(cleanLogo, 192, 'icon-clean-192.png'),
  makeIcon(cleanLogo, 512, 'icon-clean-512.png'),
  makeIcon(cleanLogo, 512, 'icon-clean-maskable-512.png', 0.78),
])

console.log('Generated WebFactory PR app icons from the supplied WF mark.')
