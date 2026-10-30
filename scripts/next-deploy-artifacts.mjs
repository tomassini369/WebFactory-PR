import {readFileSync, writeFileSync, mkdirSync, cpSync} from 'node:fs'
import {join} from 'node:path'

// Hash navigation needs no SPA fallback; unknown paths return a static 404.
// Derive manual-upload files from the same policy used by Git-connected builds.
// Unsupported configuration fails closed instead of silently dropping protection.
export function writeNextDeployArtifacts(outDir) {
  const config = readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8')
  const headers = config.match(/\[headers\.values\]([\s\S]*?)(?=\[\[redirects\]\])/)
  if (!headers || !config.includes('for = "/*"')) throw Error('Unsupported Next headers configuration')
  const lines = headers[1].trim().split('\n').map(line => {
    const match = line.trim().match(/^([\w-]+) = "([^"\n]*)"$/)
    if (!match) throw Error('Unsupported Next header: ' + line)
    return `  ${match[1]}: ${match[2]}`
  })
  const redirects = [...config.matchAll(/\[\[redirects\]\]([\s\S]*?)(?=\[\[|$)/g)].map(([,block]) => {
    const from = block.match(/from = "([^"\n]+)"/)?.[1]
    const to = block.match(/to = "([^"\n]+)"/)?.[1]
    const status = block.match(/status = (\d+)/)?.[1]
    if (!from || !to || !status) throw Error('Unsupported Next redirect')
    return `${from} ${to} ${status}${/force = true/.test(block) ? '!' : ''}`
  })
  if (redirects.length !== 1 || redirects[0] !== '/* /blocked.json 404' || !lines.some(line => line.includes("connect-src 'none'"))) throw Error('Incomplete Next deployment policy')
  mkdirSync(outDir, {recursive:true})
  writeFileSync(join(outDir, '_headers'), '/*\n' + lines.join('\n') + '\n')
  writeFileSync(join(outDir, '_redirects'), redirects.join('\n') + '\n')
  // Font notices must travel with the distributed font binaries.
  mkdirSync(join(outDir, 'next', 'licenses'), {recursive:true})
  const rows = JSON.parse(readFileSync(new URL('../docs/next/fonts.json', import.meta.url), 'utf8'))
  for (const row of rows) cpSync(new URL(`../docs/next/font-licenses/${row.slug}-OFL.txt`, import.meta.url), join(outDir, 'next', 'licenses', row.slug + '-OFL.txt'))
  cpSync(new URL('../docs/next/fonts.json', import.meta.url), join(outDir, 'next', 'licenses', 'fonts.json'))
  cpSync(new URL('../docs/next/animejs-MIT.txt', import.meta.url), join(outDir, 'next', 'licenses', 'animejs-MIT.txt'))
}
