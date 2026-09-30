// Production builds must not ship the visual review assets (reference video, mockup and screenshots).
import { rm } from 'node:fs/promises'

if (process.env.CONTEXT === 'production') {
  await rm(new URL('../dist/preview-review', import.meta.url), { recursive: true, force: true })
  console.log('Removed preview-only review assets from the production build.')
}
