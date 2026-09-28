import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const source = 'assets/webfactory-pr-logo.png'
const appIconSource = 'assets/webfactory-pr-app-icon.jpeg'
const outputDir = 'assets'
const logoBackground = { r: 255, g: 255, b: 255, alpha: 1 }
const appBackground = { r: 6, g: 19, b: 41, alpha: 1 }

await mkdir(outputDir, { recursive: true })

async function makeLogoIcon(cleanLogo, size, filename, safeScale = 0.68) {
  const innerWidth = Math.round(size * safeScale)
  const innerHeight = Math.round(size * safeScale)

  const logo = await sharp(cleanLogo)
    .resize(innerWidth, innerHeight, {
      fit: 'contain',
      withoutEnlargement: false,
      background: logoBackground,
    })
    .png()
    .toBuffer()

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: logoBackground,
    },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(`${outputDir}/${filename}`)
}

async function makeAppMarkIcon(size, filename, safeScale = 1) {
  if (safeScale === 1) {
    await sharp(appIconSource)
      .resize(size, size, { fit: 'cover' })
      .png({ compressionLevel: 9 })
      .toFile(`${outputDir}/${filename}`)
    return
  }

  const innerSize = Math.round(size * safeScale)
  const mark = await sharp(appIconSource)
    .resize(innerSize, innerSize, { fit: 'contain' })
    .png()
    .toBuffer()

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: appBackground,
    },
  })
    .composite([{ input: mark, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(`${outputDir}/${filename}`)
}

const platformLogo = source

await Promise.all([
  makeLogoIcon(platformLogo, 192, 'icon-clean-192.png', 0.68),
  makeLogoIcon(platformLogo, 512, 'icon-clean-512.png', 0.68),
  makeLogoIcon(platformLogo, 512, 'icon-clean-maskable-512.png', 0.56),
  sharp(appIconSource).resize(180, 180, { fit: 'cover' }).png({ compressionLevel: 9 }).toFile(`${outputDir}/apple-touch-icon-clean.png`),
  makeAppMarkIcon(192, 'mobile-app-icon-192.png'),
  makeAppMarkIcon(512, 'mobile-app-icon-512.png'),
  makeAppMarkIcon(512, 'mobile-app-icon-maskable-512.png', 0.78),
])

console.log('Generated separate WebFactory platform and mobile app icons.')
