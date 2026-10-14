// 主题视觉 QA：对主要页面截图，输出到 docs/qa 并统计明暗比例。
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const PORT = process.env.EVO_CDP_PORT || '9230'
const OUT = path.resolve('docs/qa')
fs.mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function target() {
  const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json())
  return list.find((t) => t.type === 'page' && t.url.startsWith('http://localhost:4173')) || list.find((t) => t.type === 'page')
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
await cdp.send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false
})

for (const route of ['/', '/about', '/library', '/character/ma', '/data', '/my-library']) {
  await cdp.send('Page.navigate', { url: `http://localhost:4173${route}` })
  await sleep(route === '/character/ma' ? 2500 : 1800)
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' })
  const file = path.join(OUT, `theme-${route.replace(/[^a-z0-9]/gi, '_') || 'home'}.png`)
  fs.writeFileSync(file, Buffer.from(shot.data, 'base64'))
  const info = await sharp(file).raw().toBuffer({ resolveWithObject: true })
  const px = info.data
  const total = px.length / 4
  const top = Math.floor(info.info.height * 0.22)
  let topDark = 0
  let allDark = 0
  for (let y = 0; y < info.info.height; y++) {
    for (let x = 0; x < info.info.width; x++) {
      const i = (y * info.info.width + x) * 4
      const lum = (px[i] + px[i + 1] + px[i + 2]) / 3
      if (lum < 70) allDark++
      if (y < top && lum < 70) topDark++
    }
  }
  console.log(
    JSON.stringify({
      route,
      file: path.basename(file),
      darkRatio: Number(((allDark / total) * 100).toFixed(1)),
      topDarkRatio: Number(((topDark / (top * info.info.width)) * 100).toFixed(1)),
      width: info.info.width,
      height: info.info.height
    })
  )
}

console.log('--- responsive overflow ---')
for (const width of [768, 375]) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height: width >= 600 ? 900 : 812,
    deviceScaleFactor: 1,
    mobile: width < 600
  })
  for (const route of ['/', '/library', '/my-library', '/character/ma', '/data']) {
    await cdp.send('Page.navigate', { url: `http://localhost:4173${route}` })
    await sleep(1500)
    const info = await cdp.send('Runtime.evaluate', {
      expression: `({ overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, bodyLen: document.body ? document.body.innerText.length : 0, hasHome: document.body ? document.body.innerText.includes('殷契拾文') : false })`,
      returnByValue: true
    })
    console.log(JSON.stringify({ width, route, ...info.result.value }))
  }
}
cdp.close()
console.log('done')
