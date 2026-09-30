// Restore byte-identical media from binary chunks; no decoding or compression.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const source = new URL('../media-source/', import.meta.url)
const target = new URL('../assets/media/', import.meta.url)
const manifest = JSON.parse(await readFile(new URL('manifest.json', source), 'utf8'))
await mkdir(target, { recursive: true })
for (const file of manifest) {
  const data = Buffer.concat(await Promise.all(file.parts.map(part => readFile(new URL(part, source)))))
  if (data.length !== file.size || createHash('sha256').update(data).digest('hex') !== file.sha256) {
    throw new Error(`Original hero media integrity check failed: ${file.name}`)
  }
  await writeFile(new URL(file.name, target), data)
  console.log(`Restored original hero media: ${file.name} (${data.length} bytes, SHA-256 verified)`)
}
