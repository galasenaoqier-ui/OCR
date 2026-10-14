import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import QRCode from 'qrcode'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = path.join(root, 'public', 'qr')

function getArg(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const url = getArg('--url') || process.env.H5_URL || 'http://localhost:4173/'
if (!/^https?:\/\//i.test(url)) {
  console.error(`Invalid URL: ${url}`)
  process.exit(1)
}

await fs.mkdir(publicDir, { recursive: true })
const options = {
  errorCorrectionLevel: 'H',
  margin: 3,
  width: 900,
  color: { dark: '#211F1A', light: '#FFFFFF' }
}
await QRCode.toFile(path.join(publicDir, 'yinqi-h5.png'), url, { ...options, type: 'png' })
await QRCode.toFile(path.join(publicDir, 'yinqi-h5.svg'), url, { ...options, type: 'svg' })
await fs.writeFile(path.join(publicDir, 'yinqi-h5-url.txt'), `${url}\n`, 'utf8')
console.log(`QR URL: ${url}`)
console.log(`PNG: ${path.join(publicDir, 'yinqi-h5.png')}`)
console.log(`SVG: ${path.join(publicDir, 'yinqi-h5.svg')}`)
