import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import process from 'node:process'
import readline from 'node:readline'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const bundledCloudflared = path.join(root, 'tools', process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared')
async function fileExists(file) {
  try {
    await fs.access(file)
    return true
  } catch {
    return false
  }
}
const cloudflaredCommand = (await fileExists(bundledCloudflared)) ? bundledCloudflared : 'cloudflared'
// Windows exposes npm as a .cmd shim; spawning it without a shell yields EINVAL.
// Keep shell usage scoped to this known executable rather than interpolating user input.
const previewOptions = { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' }
const tunnelOptions = { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], shell: false }
const preview = spawn(npmCommand, ['run', 'h5:preview'], previewOptions)
const tunnel = spawn(cloudflaredCommand, ['tunnel', '--url', 'http://127.0.0.1:4173'], tunnelOptions)
let settled = false

function output(line) {
  process.stdout.write(`[h5-share] ${line}\n`)
}

async function finish(url) {
  if (settled) return
  settled = true
  const qr = spawn(npmCommand, ['run', 'h5:qr', '--', '--url', `${url}/`], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' })
  await new Promise((resolve) => qr.once('exit', resolve))
  output(`手机扫码地址：${url}/`)
  output('二维码已写入 public/qr/yinqi-h5.png 和 public/qr/yinqi-h5.svg')
  output('保持此窗口运行，关闭隧道后临时地址将失效。')
}

function inspect(line) {
  const match = line.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i)
  if (match) void finish(match[0])
}

for (const stream of [tunnel.stdout, tunnel.stderr]) {
  readline.createInterface({ input: stream }).on('line', (line) => {
    output(line)
    inspect(line)
  })
}

tunnel.on('error', (error) => {
  console.error('无法启动 cloudflared。请先安装并将 cloudflared 加入 PATH。')
  console.error(error.message)
  preview.kill()
  process.exitCode = 1
})
tunnel.on('exit', (code) => {
  if (!settled && code !== 0) {
    console.error('Cloudflare Quick Tunnel 启动失败。请安装 cloudflared 并将其加入 PATH：')
    console.error('https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/')
    preview.kill()
    process.exitCode = code || 1
  }
})

function stop() {
  preview.kill()
  tunnel.kill()
}
process.on('SIGINT', () => { stop(); process.exit(0) })
process.on('SIGTERM', () => { stop(); process.exit(0) })
