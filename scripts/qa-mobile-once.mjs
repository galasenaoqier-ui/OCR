import fs from 'node:fs'

const port = process.env.EVO_CDP_PORT || '9227'
const list = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json())
const target = list.find((t) => t.type === 'page') || list[0]
const ws = new WebSocket(target.webSocketDebuggerUrl)
let id = 0
const pending = new Map()
ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  const item = pending.get(message.id)
  if (!item) return
  pending.delete(message.id)
  message.error ? item.reject(new Error(message.error.message)) : item.resolve(message.result)
}
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const requestId = ++id
  pending.set(requestId, { resolve, reject })
  ws.send(JSON.stringify({ id: requestId, method, params }))
})
await new Promise((resolve) => { ws.onopen = resolve })
await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true })
await send('Page.navigate', { url: 'http://127.0.0.1:4173/' })
await new Promise((resolve) => setTimeout(resolve, 1600))
const shot = await send('Page.captureScreenshot', { format: 'png' })
fs.writeFileSync('docs/qa/mobile-home-375.png', Buffer.from(shot.data, 'base64'))
const info = await send('Runtime.evaluate', {
  expression: `(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, bottomNav: Boolean(document.querySelector('.mobile-bottom-nav')), navBottom: document.querySelector('.mobile-bottom-nav')?.getBoundingClientRect().bottom, viewportBottom: window.innerHeight }))()`,
  returnByValue: true
})
console.log(JSON.stringify(info.result.value))
ws.close()
