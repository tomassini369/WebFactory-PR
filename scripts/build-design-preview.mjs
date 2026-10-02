// A separate preview bundle uses the existing visual-review identity adapter.
// Production never compiles or ships that adapter or the sample portal.
import { build } from 'vite'
import { readFile, writeFile, rm } from 'node:fs/promises'

if (process.env.CONTEXT === 'production') {
  await rm(new URL('../dist/design-preview/', import.meta.url), { recursive: true, force: true })
} else if (process.env.CONTEXT === 'deploy-preview' || process.env.WF_DESIGN_PREVIEW === '1') {
  await build({
    configFile: new URL('../preview.config.ts', import.meta.url).pathname,
    base: '/design-preview/portal/',
    build: { outDir: 'dist/design-preview/portal' },
  })
  await build({
    configFile: new URL('../home-preview.config.ts', import.meta.url).pathname,
    base: '/design-preview/home/',
    define: { __WF_PREVIEW_REVIEW__: 'false' },
    build: { outDir: 'dist/design-preview/home' },
  })
  const pages = {
    home: await readFile('dist/design-preview/home/home-preview.html', 'utf8'),
    portal: await readFile('dist/design-preview/portal/preview.html', 'utf8'),
  }
  await writeFile('dist/design-preview/review.js', `const pages=${JSON.stringify(pages)};\n${await readFile('preview/review.js', 'utf8')}`)
  await writeFile('dist/design-preview/index.html', await readFile('preview/review.html', 'utf8'))
  console.log('Built isolated sample portal at /design-preview/portal/preview.html')
}
