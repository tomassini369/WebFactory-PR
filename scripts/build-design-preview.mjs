// A separate preview bundle uses the existing visual-review identity adapter.
// Production never compiles or ships that adapter or the sample portal.
import { build } from 'vite'
import { rm } from 'node:fs/promises'

if (process.env.CONTEXT === 'production') {
  await rm(new URL('../dist/design-preview/', import.meta.url), { recursive: true, force: true })
} else if (process.env.CONTEXT === 'deploy-preview' || process.env.WF_DESIGN_PREVIEW === '1') {
  await build({
    configFile: new URL('../preview.config.ts', import.meta.url).pathname,
    base: '/design-preview/portal/',
    build: { outDir: 'dist/design-preview/portal' },
  })
  console.log('Built isolated sample portal at /design-preview/portal/preview.html')
}
