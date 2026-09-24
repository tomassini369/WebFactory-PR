import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

const source = fileURLToPath(new URL('../assets/webfactory-pr-logo.png', import.meta.url))
const output = fileURLToPath(new URL('../assets/webfactory-pr-logo-dark.png', import.meta.url))

const { data, info } = await sharp(source)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

const pixels = Buffer.from(data)

for (let i = 0; i < pixels.length; i += info.channels) {
  const r = pixels[i]
  const g = pixels[i + 1]
  const b = pixels[i + 2]
  const a = pixels[i + 3]

  if (a === 0) continue

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const chroma = max - min
  const luminance = (0.2126 * r) + (0.7152 * g) + (0.0722 * b)

  // Keep WebFactory's saturated blue/cyan brand pixels exactly as they are.
  // Recolor only the dark neutral/navy wordmark pixels so they remain readable
  // against the dark interface, matching the PayIt-style light/dark behavior.
  const brandBlue =
    max > 70 &&
    chroma > 25 &&
    b > r + 20 &&
    b > g + 8

  const brandCyan =
    max > 95 &&
    chroma > 35 &&
    g > r + 18 &&
    b > r + 12

  const clearlyColored = max > 105 && chroma > 48
  const shouldBecomeWhite = luminance < 155 && !brandBlue && !brandCyan && !clearlyColored

  if (shouldBecomeWhite) {
    pixels[i] = 255
    pixels[i + 1] = 255
    pixels[i + 2] = 255
  }
}

await sharp(pixels, {
  raw: {
    width: info.width,
    height: info.height,
    channels: info.channels,
  },
})
  .png({ compressionLevel: 9 })
  .toFile(output)

console.log('Generated adaptive dark logo:', output)
