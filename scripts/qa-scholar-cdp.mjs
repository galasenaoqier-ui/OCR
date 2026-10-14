// 数字史官视觉/结构 QA：截图 /digital-human，检查横向溢出与控制台错误。
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const PORT = process.env.EVO_CDP_PORT || '9230'
const BASE = process.env.EVO_BASE || 'http://localhost:4184'
const OUT = path.resolve('docs/qa')
fs.mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function target() {
  const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json())
  return list.find((t) => t.type === 'page') || list[0]
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    let id = 0
    const pending = new Map()
    ws.onopen = () =>
      resolve({
        send(method, params = {}) {
          return new Promise((res, rej) => {
            const mid = ++id
            pending.set(mid, { res, rej })
            ws.send(JSON.stringify({ id: mid, method, params }))
          })
        },
        close: () => ws.close()
      })
    ws.onerror = reject
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id)
        pending.delete(msg.id)
        msg.error ? p.rej(new Error(msg.error.message)) : p.res(msg.result)
      }
    }
  })
}

const t = await target()
const cdp = await connect(t.webSocketDebuggerUrl)
await cdp.send('Page.enable')
await cdp.send('Runtime.enable')
await cdp.send('Log.enable')

// 直接轮询 Log.entryAdded 不便于在简单封装里订阅，改为检查页面内 window 记录。
await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
  source: `window.__qaErrors=[];window.addEventListener('error',e=>window.__qaErrors.push(String(e.message||e.error)));`
})

for (const [label, width, height] of [
  ['1440', 1440, 900],
  ['1024', 1024, 768],
  ['375', 375, 812]
]) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 500
  })
  await cdp.send('Page.navigate', { url: `${BASE}/digital-human?from=recognize&glyph=ma&modern=马&score=96.8` })
  await sleep(width < 500 ? 2200 : 2800)
  const info = await cdp.send('Runtime.evaluate', {
    expression: `(() => { let api = null; try { api = { has: !!window.speechSynthesis, zh: (window.speechSynthesis?.getVoices?.() || []).filter(v => /^zh/i.test(v.lang)).length, total: (window.speechSynthesis?.getVoices?.() || []).length }; } catch (e) { api = { err: String(e && e.message || e) }; } return { scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, avatar: !!document.querySelector('svg[aria-label*="贞人"]'), voice: document.body.innerText.includes('语音') ? '有语音控件' : '无语音控件', preset: document.body.innerText.includes('纪录片'), ambient: document.body.innerText.includes('环境底噪') ? '有底噪开关' : '无底噪开关', api, errs: window.__qaErrors || [] }; })()`,
    returnByValue: true
  })
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' })
  const file = path.join(OUT, `scholar-${label}.png`)
  fs.writeFileSync(file, Buffer.from(shot.data, 'base64'))
  console.log(label, JSON.stringify(info.result.value))
  const { data } = await sharp(file).raw().toBuffer({ resolveWithObject: true })
  const total = data.length / 4
  const dark = data.filter((_, i) => i % 4 === 0 && data[i] < 90).length
  console.log('  像素占比', total, '深色', ((dark / total) * 100).toFixed(1) + '%')
}

cdp.close()
console.log('QA 截图输出:', OUT)

// 可选：交互级语音状态检查（CHECK_SPEECH=1）
if (process.env.CHECK_SPEECH === '1') {
  const c2 = await connect((await target()).webSocketDebuggerUrl)
  await c2.send('Page.enable')
  await c2.send('Runtime.enable')
  await c2.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `(() => { try { const s = window.speechSynthesis; if (!s) return; window.__speakLog = []; const orig = s.speak.bind(s); s.speak = (u) => { try { window.__speakLog.push(String(u && u.text || '').slice(0, 18)); } catch (e) {} try { orig(u); } catch (e) {} }; } catch (e) {} })()`
  })
  await c2.send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false
  })
  await c2.send('Page.navigate', { url: `${BASE}/digital-human` })
  await sleep(1800)
  const click = await c2.send('Runtime.evaluate', {
    expression: `(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('开启语音讲解')); if (!b) return { ok: false, reason: 'button not found' }; b.click(); return { ok: true, disabled: b.disabled }; })()`,
    returnByValue: true
  })
  await sleep(700)
  const state = await c2.send('Runtime.evaluate', {
    expression: `({ speaking: document.body.innerText.includes('正在朗读讲解'), autoOn: document.body.innerText.includes('语音讲解开'), speakLog: window.__speakLog || [] })`,
    returnByValue: true
  })
  // 自动朗读：等首条欢迎语结束后，点一个推荐问题，验证新回答自动进入朗读。
  await sleep(5200)
  const questionClick = await c2.send('Runtime.evaluate', {
    expression: `(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('为什么')); if (!b) return { ok: false }; b.click(); return { ok: true }; })()`,
    returnByValue: true
  })
  await sleep(6800)
  const after = await c2.send('Runtime.evaluate', {
    expression: `({ errs: window.__qaErrors || [], autoOn: document.body.innerText.includes('语音讲解开'), speakLog: window.__speakLog || [] })`,
    returnByValue: true
  })
  console.log('语音交互:', JSON.stringify({ click: click.result.value, state: state.result.value, question: questionClick.result.value, after: after.result.value }))
  c2.close()
}
