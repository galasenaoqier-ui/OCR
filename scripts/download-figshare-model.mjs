// 一次性下载 HUST-OBC 官方 ResNet-50 权重（通过 headless Chrome 绕过 Figshare WAF）。
// 用法：node scripts/download-figshare-model.mjs [输出目录]
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Users/lenovo/AppData/Local/Google/Chrome/Application/chrome.exe'
const SHARE_URL = 'https://figshare.com/s/4149c5c7f52e0f99e366'
const PORT = 9341
const outDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve('C:/Users/lenovo/OneDrive/Desktop/新文科/oracle_app/datasets/hust-obc-repo/Validation')
fs.mkdirSync(outDir, { recursive: true })
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'yq-model-dl-'))
const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  'about:blank'
], { stdio: 'ignore', windowsHide: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function target() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
      const page = list.find((t) => t.type === 'page')
      if (page) return page
    } catch {}
    await sleep(250)
  }
  throw new Error('Chrome CDP 未就绪')
}

class CDP {
  constructor(url) {
    this.ws = new WebSocket(url)
    this.id = 0
    this.pending = new Map()
    this.opened = new Promise((resolve, reject) => {
      this.ws.onopen = resolve
      this.ws.onerror = reject
    })
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(String(ev.data))
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id)
        this.pending.delete(msg.id)
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)
      }
    }
  }
  async send(method, params = {}) {
    await this.opened
    const id = ++this.id
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text)
    return r.result.value
  }
  close() { this.ws.close() }
}

async function main() {
  const page = await target()
  const cdp = new CDP(page.webSocketDebuggerUrl)
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: outDir })
  console.log('打开 Figshare 分享页（等待 WAF/页面就绪）…')
  await cdp.send('Page.navigate', { url: SHARE_URL })
  await sleep(18000)
  const href = await cdp.eval(`document.querySelector('a[href*="/ndownloader/"]')?.href || ''`)
  if (!href) throw new Error('未找到下载链接')
  console.log('下载地址：', href)
  await cdp.send('Page.navigate', { url: href })
  const t0 = Date.now()
  for (;;) {
    const files = fs.readdirSync(outDir).filter((f) => f.endsWith('.pth'))
    const pending = fs.readdirSync(outDir).filter((f) => f.includes('crdownload') || f.includes('.download'))
    if (files.length) {
      const full = path.join(outDir, files[0])
      const size = fs.statSync(full).size
      if (!pending.length || size === 0) {
        console.log(`完成：${files[0]} ${Math.round(size / 1024 / 1024)} MB，用时 ${Math.round((Date.now() - t0) / 1000)}s`)
        break
      }
    }
    if (Date.now() - t0 > 15 * 60_000) throw new Error('下载超时')
    await sleep(3000)
  }
  cdp.close()
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => chrome.kill())
