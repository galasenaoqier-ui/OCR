// AI 识甲示例字形浏览器 QA：配合 Edge remote debugging 使用。
const PORT = process.env.EVO_CDP_PORT || '9225'
const BASE = `http://127.0.0.1:${PORT}`
const SITE = 'http://localhost:4173/recognize'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getTarget() {
  const list = await fetch(`${BASE}/json/list`).then((r) => r.json())
  return list.find((t) => t.type === 'page') || list[0]
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    const pending = new Map()
    let id = 0
    ws.onopen = () =>
      resolve({
        send(method, params = {}) {
          return new Promise((res, rej) => {
            const msgId = ++id
            pending.set(msgId, { res, rej })
            ws.send(JSON.stringify({ id: msgId, method, params }))
          })
        },
        close: () => ws.close()
      })
    ws.onerror = (e) => reject(e)
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id)
        pending.delete(msg.id)
        if (msg.error) p.rej(new Error(msg.error.message))
        else p.res(msg.result)
      }
    }
  })
}

async function evalJs(cdp, expression) {
  const out = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true
  })
  if (out.exceptionDetails) throw new Error(out.exceptionDetails.text || 'eval failed')
  return out.result?.value
}

async function waitFor(cdp, expr, timeoutMs = 120000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    let v = null
    try {
      v = await evalJs(cdp, expr)
    } catch {
      v = null
    }
    if (v) return v
    await sleep(1500)
  }
  throw new Error('timeout waiting: ' + expr)
}

async function clickSample(cdp, ch) {
  const r = await evalJs(
    cdp,
    `(() => {
      const cards = [...document.querySelectorAll('button')].filter((b) => {
        const t = b.innerText.replace(/\\s+/g, '')
        return t.length > 1 && t.startsWith(${JSON.stringify(ch)}) && /^[a-zA-Z]/.test(t.slice(1));
      });
      if (!cards.length) return { ok: false, found: [] };
      cards[0].click();
      return { ok: true, count: cards.length };
    })()`
  )
  if (!r.ok) throw new Error('sample not found ' + ch)
  await sleep(300)
}

async function runOne(cdp, ch) {
  await evalJs(cdp, `(() => { const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes('重新识别') || x.innerText.includes('开始识别')); if (b && b.innerText.includes('重新识别')) b.click(); return true })()`)
  await sleep(500)
  await clickSample(cdp, ch)
  await evalJs(
    cdp,
    `(() => { const b = [...document.querySelectorAll('button')].find(x => x.innerText.trim() === '开始识别' && !x.disabled); if (b) b.click(); return Boolean(b) })()`
  )
  await waitFor(
    cdp,
    `document.body.innerText.includes('AI 候选 Top-K') || document.body.innerText.includes('需要进一步考证')`,
    25000
  )
  await sleep(1500)
  const info = await evalJs(
    cdp,
    `(() => {
      const rows = [...document.querySelectorAll('button')]
        .filter((b) => b.innerText.includes('%') && b.innerText.length < 90)
        .map((b) => b.innerText.replace(/\\n+/g, ' | ').trim());
      const body = document.body.innerText;
      return {
        input: ${JSON.stringify(ch)},
        candidates: rows.slice(0, 5),
        lowConf: body.includes('需要进一步考证'),
        highConf: body.includes('高置信度'),
        sampleRegion: body.includes('点击示例字形')
      };
    })()`
  )
  console.log(JSON.stringify(info))
  return info
}

async function runUpload(cdp, label, fileUrl) {
  await evalJs(cdp, `(() => { const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes('重新识别')); if (b) b.click(); return true })()`)
  await sleep(500)
  await evalJs(cdp, `(() => { const b = [...document.querySelectorAll('button')].find(x => x.innerText.trim() === '上传图片'); if (b) b.click(); return true })()`)
  await sleep(500)
  const setFile = await evalJs(
    cdp,
    `(async () => {
      const inp = document.querySelector('input[type=file]');
      if (!inp) return { ok: false };
      const r = await fetch(${JSON.stringify(fileUrl)});
      const buf = await r.arrayBuffer();
      const f = new File([buf], 'sample.png', { type: 'image/png' });
      const dt = new DataTransfer();
      dt.items.add(f);
      inp.files = dt.files;
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true };
    })()`
  )
  if (!setFile.ok) throw new Error('file input missing')
  await waitFor(cdp, `document.body.innerText.includes('重新选择图片')`, 10000)
  await evalJs(
    cdp,
    `(() => { const b = [...document.querySelectorAll('button')].find(x => x.innerText.trim() === '开始识别' && !x.disabled); if (b) b.click(); return Boolean(b) })()`
  )
  await waitFor(
    cdp,
    `document.body.innerText.includes('AI 候选 Top-K') || document.body.innerText.includes('需要进一步考证')`,
    25000
  )
  await sleep(1200)
  const info = await evalJs(
    cdp,
    `(() => {
      const rows = [...document.querySelectorAll('button')]
        .filter((b) => b.innerText.includes('%') && b.innerText.length < 90)
        .map((b) => b.innerText.replace(/\\n+/g, ' | ').trim());
      return { input: ${JSON.stringify(label)}, file: ${JSON.stringify(fileUrl)}, candidates: rows.slice(0, 5) };
    })()`
  )
  console.log(JSON.stringify(info))
}

const target = await getTarget()
const cdp = await connect(target.webSocketDebuggerUrl)
await cdp.send('Page.enable')
await cdp.send('Runtime.enable')
await cdp.send('Page.navigate', { url: SITE })
await waitFor(cdp, `Boolean(document.body && (document.body.innerText.includes('ResNet-50 模型已就绪') || document.body.innerText.includes('模型加载失败')))`, 120000)
console.log('model status ready, starting samples...')
for (const ch of ['日', '牛', '象', '马', '鱼', '龙']) {
  try {
    await runOne(cdp, ch)
  } catch (err) {
    console.log(JSON.stringify({ input: ch, error: err.message }))
  }
}
await runUpload(cdp, '马（HUST 1601 馬）', '/hust/deciphered/1601/s0.png')
await runUpload(cdp, '牛（HUST 1047）', '/hust/deciphered/1047/s0.png')
cdp.close()
console.log('QA done')
