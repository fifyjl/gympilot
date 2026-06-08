import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const distDir = join(root, 'dist')
const indexPath = join(distDir, 'index.html')

if (!existsSync(indexPath)) {
  throw new Error('dist/index.html was not found. Run vite build first.')
}

let html = readFileSync(indexPath, 'utf8')

html = html.replace(
  /<link rel="stylesheet" crossorigin href="([^"]+)">/g,
  (_match, href) => {
    const assetPath = resolveDistPath(href)
    const css = readFileSync(assetPath, 'utf8')
    return `<style>${css}</style>`
  },
)

html = html.replace(
  /<script type="module" crossorigin src="([^"]+)"><\/script>/g,
  (_match, src) => {
    const assetPath = resolveDistPath(src)
    const js = readFileSync(assetPath, 'utf8')
    return `<script type="module">${js}</script>`
  },
)

writeFileSync(indexPath, html)

function resolveDistPath(publicPath) {
  const normalized = publicPath
    .replace(/^\/gympilot\//, '')
    .replace(/^\//, '')
  return join(distDir, normalized)
}
