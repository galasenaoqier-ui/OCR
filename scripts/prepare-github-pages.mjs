import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')

// HashRouter handles client-side routes, while 404.html keeps GitHub Pages
// friendly when a host or crawler requests a deep path directly.
await fs.copyFile(path.join(dist, 'index.html'), path.join(dist, '404.html'))
await fs.writeFile(path.join(dist, '.nojekyll'), '', 'utf8')

// Keep public assets available at the project-site path on GitHub Pages.

console.log('GitHub Pages artifacts prepared: dist/404.html, dist/.nojekyll')
