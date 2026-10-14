const PORT = process.env.EVO_CDP_PORT || '9229'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function target() {
  const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json())
  return list.find((t) => t.type === 'page' && t.url.startsWith('http://localhost:4173')) || list.find((t) => t.type === 'page') || list[0]
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
const r = await cdp.send('Runtime.evaluate', {
  expression: `({ url: location.href, links: [...document.querySelectorAll('a')].map(a=>({t:a.innerText.trim().slice(0,14), h:a.getAttribute('href')})).filter(x=>x.t.includes('识别')||x.h.includes('recognize')).slice(0,10) })`,
  returnByValue: true
})
console.log(JSON.stringify(r.result.value))
cdp.close()
