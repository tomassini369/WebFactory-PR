import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const distDir = new URL('../dist/', import.meta.url)
const source = await readFile(new URL('index.html', distDir), 'utf8')

const adminShells = [
  {
    route: 'webfactory-admin',
    manifest: '/manifest-webfactory-admin.webmanifest',
  },
  {
    route: 'client-admin',
    manifest: '/manifest-client-admin.webmanifest',
  },
]

function replaceRequired(html, search, replacement) {
  if (!html.includes(search)) {
    throw new Error(`Unable to generate admin PWA shell: missing ${search}`)
  }

  return html.replace(search, replacement)
}

function makeAdminShell(manifest) {
  let html = source

  html = replaceRequired(
    html,
    '<meta id="application-name" name="application-name" content="WebFactoryPR" />',
    '<meta id="application-name" name="application-name" content="Admin/Log In" />',
  )
  html = replaceRequired(
    html,
    '<meta id="apple-mobile-web-app-title" name="apple-mobile-web-app-title" content="WebFactoryPR" />',
    '<meta id="apple-mobile-web-app-title" name="apple-mobile-web-app-title" content="Admin/Log In" />',
  )
  html = replaceRequired(
    html,
    '<link id="app-manifest" rel="manifest" href="/manifest.webmanifest" />',
    `<link id="app-manifest" rel="manifest" href="${manifest}" />`,
  )
  html = replaceRequired(
    html,
    '<link id="apple-touch-icon" rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-clean.png" />',
    '<link id="apple-touch-icon" rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-clean.png?v=5" />',
  )
  html = replaceRequired(
    html,
    '<link id="app-icon" rel="icon" type="image/png" sizes="192x192" href="/icon-clean-192.png" />',
    '<link id="app-icon" rel="icon" type="image/png" sizes="192x192" href="/icon-clean-192.png?v=5" />',
  )

  return html
}

for (const { route, manifest } of adminShells) {
  const outputDir = join(distDir.pathname, route)
  await mkdir(outputDir, { recursive: true })
  await writeFile(join(outputDir, 'index.html'), makeAdminShell(manifest), 'utf8')
}
