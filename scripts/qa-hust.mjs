// 临时 QA：用本机 Chrome headless + CDP 验证 HUST 字库切换与学术大库识别。
// 用法：node scripts/qa-hust.mjs（需要 yinqi_platform/dist 已由 vite preview 在 4180 端口提供）
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Users/lenovo/AppData/Local/Google/Chrome/Application/chrome.exe'
const PORT = 9337
const BASE = 'http://localhost:4173'
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'yq-cdp-'))

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

async function waitTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
      const list = await res.json()
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
    this.events = []
    this.opened = new Promise((resolve, reject) => {
      this.ws.onopen = resolve
      this.ws.onerror = reject
    })
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(String(ev.data))
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id)
        this.pending.delete(msg.id)
        if (msg.error) reject(new Error(msg.error.message))
        else resolve(msg.result)
      }
      if (msg.method) this.events.push({ method: msg.method, params: msg.params })
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
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text || 'evaluate failed')
    return r.result.value
  }
  async goto(url) {
    await this.send('Page.navigate', { url })
    for (let i = 0; i < 60; i++) {
      const state = await this.eval('document.readyState + "|" + location.pathname')
      if (state && state.startsWith('complete')) break
      await sleep(200)
    }
    await sleep(1200)
  }
  async clickText(selector, text) {
    const ok = await this.eval(`(() => {
      const el = [...document.querySelectorAll(${JSON.stringify(selector)})]
        .find((b) => b.textContent && b.textContent.includes(${JSON.stringify(text)}))
      if (!el) return false
      el.click()
      return true
    })()`)
    return ok
  }
  close() {
    this.ws.close()
  }
}

async function main() {
  const target = await waitTarget()
  const cdp = new CDP(target.webSocketDebuggerUrl)
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')

  const results = {}
  if (process.argv.includes('status')) {
    await cdp.goto(`${BASE}/status`)
    const clicked = await cdp.clickText('button', '开始 HUST 抽样自检')
    const t0 = Date.now()
    let body = ''
    while (Date.now() - t0 < 100_000) {
      body = await cdp.eval('document.body.innerText')
      if (body.includes('抽样完成') || body.includes('加载失败：')) break
      await sleep(1500)
    }
    results.status = {
      clicked,
      snippet: body.replace(/\s+/g, ' ').slice(-500),
      card: (() => {
        const at = body.indexOf('学术库模板自检')
        return at >= 0 ? body.slice(at, Math.min(body.length, at + 700)).replace(/\s+/g, ' ') : ''
      })()
    }
    console.log(JSON.stringify(results, null, 2))
    cdp.close()
    return
  }

  if (process.argv.includes('model')) {
    await cdp.goto(`${BASE}/recognize`)
    await cdp.clickText('button', '上传图片')
    await sleep(400)
    await cdp.send('DOM.enable')
    const doc = await cdp.send('DOM.getDocument', { depth: -1 })
    const input = await cdp.send('DOM.querySelector', {
      nodeId: doc.root.nodeId,
      selector: 'input[type=file]'
    })
    const sampleFile = path.resolve('C:/Users/lenovo/OneDrive/Desktop/新文科/yinqi_platform/public/hust/deciphered/0773/s0.png')
    if (!input.nodeId) throw new Error('未找到文件输入框')
    await cdp.send('DOM.setFileInputFiles', { files: [sampleFile], nodeId: input.nodeId })
    await sleep(1500)
    for (let i = 0; i < 90; i++) {
      const ready = await cdp.eval(`document.body.innerText.includes('ResNet-50 模型已就绪')`)
      if (ready) break
      await sleep(1000)
    }
    const clicked = await cdp.eval(`(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('开始识别'))
      if (!btn || btn.disabled) return false
      btn.click()
      return true
    })()`)
    if (!clicked) throw new Error('开始识别按钮未就绪')
    const t0 = Date.now()
    let body = ''
    while (Date.now() - t0 < 90_000) {
      body = await cdp.eval('document.body.innerText')
      if (body.includes('AI 识别结果') || body.includes('低置信识别') || body.includes('识别失败')) break
      await sleep(1500)
    }
    results.model = {
      snippet: body.replace(/\s+/g, ' ').slice(-700),
      noModeButtons: !(await cdp.eval(`document.body.innerText.includes('精品 69 字库') || document.body.innerText.includes('HUST 学术大库')`)),
      resources: await cdp.eval(`performance.getEntriesByType('resource').filter((e) => e.name.includes('resnet50') || e.name.includes('ort-wasm')).map((e) => ({ name: e.name.split('/').pop(), duration: Math.round(e.duration), size: e.transferSize }))`)
    }
    console.log(JSON.stringify(results, null, 2))
    cdp.close()
    return
  }

  await cdp.goto(`${BASE}/library`)
  const localCards = await cdp.eval(`document.querySelectorAll('a[href^="/character/"]').length`)
  const tabClicked = await cdp.clickText('button', 'HUST 已释')
  await sleep(1200)
  const hustCards = await cdp.eval(`document.querySelectorAll('a[href*="/hust/"]').length`)
  const hustHeader = await cdp.eval(`document.body.innerText.includes('HUST 已释学术字形')`)
  results.library = { localCards, tabClicked, hustCards, hustHeader }

  const firstHref = await cdp.eval(`document.querySelector('a[href*="/hust/"]')?.getAttribute('href') || ''`)
  if (firstHref) {
    await cdp.goto(`${BASE}${firstHref}`)
    results.detail = {
      dataSource: await cdp.eval(`document.body.innerText.includes('数据来源')`),
      sourceNote: await cdp.eval(`document.body.innerText.includes('公开学术字形样本')`)
    }
  }

  await cdp.goto(`${BASE}/recognize`)
  results.mainFetchTest = await cdp.eval(`Promise.race([
    fetch('/hust/templates.bin').then((r) => r.arrayBuffer().then((b) => 'ok-' + b.byteLength)),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 9000))
  ]).then((v) => String(v)).catch((e) => 'err-' + e.message)`)
  const hustle = await cdp.clickText('button', 'HUST 学术大库')
  await sleep(300)
  const started = await cdp.clickText('button', '开始识别')
  const t0 = Date.now()
  let doneText = ''
  while (Date.now() - t0 < 25_000) {
    const inner = await cdp.eval('document.body.innerText')
    if (inner.includes('AI 识别结果') || inner.includes('未能高置信识别') || inner.includes('未能提取到有效笔画')) {
      doneText = inner.slice(0, 600)
      break
    }
    await sleep(1000)
  }
  if (!doneText) {
    const inner = await cdp.eval('document.body.innerText')
    doneText = inner.slice(0, 900)
  }
  results.recognize = {
    hustle,
    started,
    finished: doneText.length > 0,
    snippet: doneText.replace(/\s+/g, ' ').slice(0, 320),
    templateRequests: await cdp.eval(`performance.getEntriesByType('resource').filter((e) => e.name.includes('templates.bin')).map((e) => ({ name: e.name, duration: Math.round(e.duration), size: e.transferSize }))`),
    hasProgressText: await cdp.eval(`document.body.innerText.includes('下载学术模板索引')`),
    runningPanel: await cdp.eval(`document.body.innerText.includes('正在分析')`),
    events: cdp.events.slice(-28).map((e) => ({
      method: e.method,
      text:
        e.params?.exceptionDetails?.exception?.description ||
        e.params?.args?.map?.((a) => a.value || a.description || '').join(' ') ||
        e.params?.entry?.text ||
        ''
    })).filter((e) => e.text)
  }

  console.log(JSON.stringify(results, null, 2))
  cdp.close()
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => {
    chrome.kill()
  })
