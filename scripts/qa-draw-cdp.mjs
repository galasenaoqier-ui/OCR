// 手写识别 QA：用真实鼠标事件在画板上“按字形矢量轨迹书写”，再执行模型识别。
import fs from 'node:fs'
import path from 'node:path'

const PORT = process.env.EVO_CDP_PORT || '9227'
const BASE = `http://127.0.0.1:${PORT}`
const SITE = 'http://localhost:4173/recognize'
const glyphs = JSON.parse(
  fs.readFileSync(path.resolve('src/data/glyphs.json'), 'utf8')
).glyphs
const samples = ['ri', 'niu', 'xiang', 'ma', 'yu', 'long'].map((id) => glyphs.find((g) => g.id === id))
const ONLY = process.env.EVO_DRAW_ONLY
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function target() {
  const list = await fetch(`${BASE}/json/list`).then((r) => r.json())
  return list.find((t) => t.type === 'page') || list[0]
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    const pending = new Map()
    let id = 0
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

async function evalJs(cdp, expression) {
  const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text)
  return r.result?.value
}

async function wait(cdp, expr, ms = 120000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    try {
      if (await evalJs(cdp, expr)) return
    } catch {}
    await sleep(1500)
  }
  throw new Error('timeout')
}

async function drawGlyph(cdp, strokes) {
  const rect = await evalJs(
    cdp,
    `(() => { const c = document.querySelector('canvas'); if(!c) return null; const r = c.getBoundingClientRect(); return { left:r.left, top:r.top, width:r.width, height:r.height }; })()`
  )
  if (!rect) throw new Error('canvas not found')
  for (const poly of strokes) {
    if (poly.length < 2) continue
    const step = Math.max(1, Math.round(poly.length / 60))
    const pts = poly.filter((_, i) => i % step === 0 || i === poly.length - 1)
    const first = pts[0]
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: rect.left + first[0] * rect.width,
      y: rect.top + first[1] * rect.height,
      button: 'left',
      buttons: 1,
      clickCount: 1
    })
    await sleep(40)
    for (const p of pts.slice(1)) {
      await cdp.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: rect.left + p[0] * rect.width,
        y: rect.top + p[1] * rect.height,
        button: 'left',
        buttons: 1
      })
      await sleep(40)
    }
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: rect.left + pts[pts.length - 1][0] * rect.width,
      y: rect.top + pts[pts.length - 1][1] * rect.height,
      button: 'left',
      buttons: 0,
      clickCount: 1
    })
    await sleep(60)
  }
}

async function clickText(cdp, text, exact = false) {
  return evalJs(
    cdp,
    `(() => { const b=[...document.querySelectorAll('button')].find(x => x.innerText.trim()===${JSON.stringify(text)} || (${!exact} && x.innerText.includes(${JSON.stringify(text)}))); if(!b)return false; b.click(); return true; })()`
  )
}

async function runOne(cdp, g) {
  await clickText(cdp, '清空', true)
  await sleep(300)
  await drawGlyph(cdp, g.strokes)
  await sleep(800)
  const pre = await evalJs(
    cdp,
    `(() => {
      const c = document.querySelector('canvas');
      let dark = 0;
      try { const ctx = c.getContext('2d'); const d = ctx.getImageData(0, 0, c.width, c.height).data; for (let i = 0; i < d.length; i += 4) if (d[i] < 120) dark++; } catch {}
      const btn = [...document.querySelectorAll('button')].find(x => x.innerText.trim() === '开始识别');
      const m = document.body.innerText.match(/手写 · (\d+) 笔/);
      return { dark, startExists: Boolean(btn), startDisabled: btn ? btn.disabled : null, strokes: m ? Number(m[1]) : null };
    })()`
  )
  console.log('pre', JSON.stringify({ modern: g.modern, ...pre }))
  await evalJs(
    cdp,
    `(() => { const b=[...document.querySelectorAll('button')].find(x => x.innerText.trim()==='开始识别' && !x.disabled); if(b)b.click(); return Boolean(b) })()`
  )
  await wait(cdp, `document.body.innerText.includes('AI 候选 Top-K') || document.body.innerText.includes('需要进一步考证')`, 30000)
  await sleep(1200)
  const info = await evalJs(
    cdp,
    `(() => ({ rows: [...document.querySelectorAll('button')].filter(b=>b.innerText.includes('%')&&b.innerText.length<90).map(b=>b.innerText.replace(/\\n+/g,' | ').trim()).slice(0,5) }))()`
  )
  console.log(JSON.stringify({ modern: g.modern, ...info }))
}

const t = await target()
const cdp = await connect(t.webSocketDebuggerUrl)
await cdp.send('Page.enable')
await cdp.send('Runtime.enable')
await cdp.send('Page.navigate', { url: SITE })
await wait(cdp, `Boolean(document.body && (document.body.innerText.includes('ResNet-50 模型已就绪') || document.body.innerText.includes('模型加载失败')))`)
console.log('model ready')
await clickText(cdp, '手写输入', true)
const pool = ONLY ? glyphs.filter((g) => g.modern === ONLY) : samples
for (const g of pool) {
  try {
    await runOne(cdp, g)
  } catch (e) {
    console.log(JSON.stringify({ modern: g?.modern, error: e.message }))
  }
}
cdp.close()
console.log('done')
