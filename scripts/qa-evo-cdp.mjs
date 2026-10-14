// 可选浏览器 QA：配合 `msedge --headless --remote-debugging-port=9223` 使用。
// 依次打开 /character/ma、/evolution、HUST 0773，点击金文/篆书/隶书节点并回读图版 DOM。
const PORT = process.env.EVO_CDP_PORT || '9223'
const BASE = `http://127.0.0.1:${PORT}`

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function evalJs(cdp, expression) {
  const out = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true
  })
  if (out.exceptionDetails) throw new Error(out.exceptionDetails.text || 'eval failed')
  return out.result?.value
}

async function clickStage(cdp, label) {
  return evalJs(
    cdp,
    `(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes(${JSON.stringify(label)}));
      if (!btn) return { ok: false, label: ${JSON.stringify(label)} };
      btn.click();
      return { ok: true };
    })()`
  )
}

async function inspect(cdp, url, stageLabel) {
  await cdp.send('Page.navigate', { url })
  await sleep(2400)
  await clickStage(cdp, stageLabel)
  await sleep(900)
  const info = await evalJs(
    cdp,
    `(() => ({
      title: document.title,
      hasText: document.body.innerText.includes('EVOBC'),
      bodyLen: document.body.innerText.length,
      evoImages: [...document.querySelectorAll('img[src^="/evo/"]')].map((i) => i.getAttribute('src')),
      selectedText: [...document.querySelectorAll('button')].find((b) => b.textContent.includes(${JSON.stringify(stageLabel)}))?.textContent || '',
      panelText: [...document.querySelectorAll('p')].map((p) => p.innerText).filter((t) => t.includes('EVOBC')).slice(0, 1)
    }))()`
  )
  console.log(url, JSON.stringify(info))
  return info
}

const target = await getTarget()
const cdp = await connect(target.webSocketDebuggerUrl)
await cdp.send('Page.enable')
await cdp.send('Runtime.enable')

for (const [url, stage] of [
  ['http://localhost:4180/character/ma', '金文'],
  ['http://localhost:4180/character/ma', '小篆'],
  ['http://localhost:4180/character/ma', '隶书'],
  ['http://localhost:4180/evolution', '隶书'],
  ['http://localhost:4180/hust/hust-dec%3A0773', '金文'],
  ['http://localhost:4180/hust/hust-dec%3A0773', '小篆']
]) {
  await inspect(cdp, url, stage)
}

console.log('--- 视口冒烟 ---')
for (const width of [1440, 768, 375]) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height: width >= 768 ? 900 : 812,
    deviceScaleFactor: 1,
    mobile: false
  })
  await cdp.send('Page.navigate', { url: 'http://localhost:4180/character/ma' })
  await sleep(1800)
  await clickStage(cdp, '金文')
  await sleep(700)
  const info = await evalJs(
    cdp,
    `(() => {
      const img = document.querySelector('img[src^="/evo/"]');
      return {
        viewport: [innerWidth, innerHeight],
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        imgLoaded: Boolean(img && img.complete && img.naturalWidth > 0),
        naturalSize: img ? [img.naturalWidth, img.naturalHeight] : null
      };
    })()`
  )
  console.log(`${width}px`, JSON.stringify(info))
}

cdp.close()
console.log('QA 完成')
