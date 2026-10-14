// 我的甲骨库 QA：上传两张 HUST 图、编辑字段、搜索、删除、一键识别。
const PORT = process.env.EVO_CDP_PORT || '9228'
const BASE = `http://127.0.0.1:${PORT}`
const SITE = 'http://localhost:4173/my-library'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function target() {
  const list = await fetch(`${BASE}/json/list`).then((r) => r.json())
  return list.find((t) => t.type === 'page' && t.url.startsWith('http://localhost:4173')) || list.find((t) => t.type === 'page') || list[0]
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

async function wait(cdp, expr, ms = 30000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    try {
      if (await evalJs(cdp, expr)) return
    } catch {}
    await sleep(1200)
  }
  throw new Error('timeout: ' + expr)
}

async function setInput(cdp, placeholder, value) {
  return evalJs(
    cdp,
    `(() => {
      const el = [...document.querySelectorAll('input')].find(x => x.placeholder && x.placeholder.includes(${JSON.stringify(placeholder)}));
      if (!el) return false;
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      set.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`
  )
}

async function upload(cdp, url, name) {
  const r = await evalJs(
    cdp,
    `(async () => {
      const inp = document.querySelector('input[type=file]');
      if (!inp) return { ok: false };
      const blob = await (await fetch(${JSON.stringify(url)})).blob();
      const f = new File([blob], ${JSON.stringify(name)}, { type: 'image/png' });
      const dt = new DataTransfer();
      dt.items.add(f);
      inp.files = dt.files;
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true };
    })()`
  )
  if (!r.ok) throw new Error('file input missing')
}

const t = await target()
const cdp = await connect(t.webSocketDebuggerUrl)
await cdp.send('Page.enable')
await cdp.send('Runtime.enable')
await cdp.send('Page.navigate', { url: SITE })
await wait(cdp, `document.body.innerText.includes('我的甲骨库')`)
await evalJs(cdp, `indexedDB.deleteDatabase('yinqi-uploads')`)
await sleep(800)
await cdp.send('Page.navigate', { url: SITE })
await wait(cdp, `document.body.innerText.includes('我的甲骨库')`)

await upload(cdp, '/hust/deciphered/0773/s0.png', 'my0773.png')
await wait(cdp, `document.body.innerText.includes('已导入 1 张')`, 20000)
await sleep(500)
await upload(cdp, '/hust/deciphered/1047/s0.png', 'my1047.png')
await sleep(2500)
const debugMsg = await evalJs(cdp, `document.body.innerText.split('\\n').filter(x=>x.includes('已导入')||x.includes('跳过')||x.includes('本地数据库')).slice(0,3)`)
console.log(JSON.stringify({ uploadMessages: debugMsg, cards: await evalJs(cdp, `document.querySelectorAll('button[title="编辑"]').length`) }))
const count = await evalJs(cdp, `document.querySelectorAll('button[title="编辑"]').length`)
console.log(JSON.stringify({ afterUploadCards: count }))

await evalJs(cdp, `(() => { const b=document.querySelector('button[title="编辑"]'); if(b)b.click(); return Boolean(b) })()`)
await sleep(500)
await setInput(cdp, '如：T001、本馆编号', 'T-0773')
await setInput(cdp, '如：日（可留空）', '日')
await evalJs(cdp, `(() => { const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='保存字段'); if(b)b.click(); return Boolean(b) })()`)
await wait(cdp, `document.body.innerText.includes('字段已保存')`)
await evalJs(cdp, `(() => { const b=document.querySelector('button[aria-label="关闭"]'); if(b)b.click(); return true })()`)
await setInput(cdp, '搜索编号 / 现代字 / 来源 / 备注 / 文件名', '日')
await sleep(500)
const searchCount = await evalJs(cdp, `document.querySelectorAll('button[title="编辑"]').length`)
console.log(JSON.stringify({ afterSearch日: searchCount }))

const clicked = await evalJs(cdp, `(() => { const a=[...document.querySelectorAll('a')].find(x=>(x.getAttribute('href')||'').startsWith('/recognize?upload=')); if(!a)return {ok:false,all:[...document.querySelectorAll('a')].map(x=>({t:x.innerText.trim(),h:x.getAttribute('href')})).slice(0,8)}; const href=a.getAttribute('href'); a.click(); return {ok:true,href}; })()`)
console.log(JSON.stringify({ clicked }))
if (!clicked.ok) throw new Error('recognize link not found')
await wait(cdp, `location.pathname === '/recognize'`, 10000)
await wait(cdp, `document.body.innerText.includes('重新选择图片') || document.body.innerText.includes('上传甲骨拓片')`, 20000)
await wait(cdp, `document.body.innerText.includes('ResNet-50 模型已就绪') || document.body.innerText.includes('模型加载失败')`, 120000)
await evalJs(cdp, `(() => { const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='开始识别'&&!x.disabled); if(b)b.click(); return Boolean(b) })()`)
await wait(cdp, `document.body.innerText.includes('AI 候选 Top-K') || document.body.innerText.includes('需要进一步考证')`, 30000)
await sleep(1200)
const rows = await evalJs(
  cdp,
  `[...document.querySelectorAll('button')].filter(b=>b.innerText.includes('%')&&b.innerText.length<90).map(b=>b.innerText.replace(/\\n+/g,' | ').trim()).slice(0,3)`
)
console.log(JSON.stringify({ recognizeRows: rows }))

await cdp.send('Page.navigate', { url: SITE })
await wait(cdp, `document.body.innerText.includes('我的甲骨库')`)
await sleep(1000)
await evalJs(cdp, `window.confirm = () => true`)
await evalJs(cdp, `(() => { const a=[...document.querySelectorAll('button[title="编辑"]')][1]; if(a)a.click(); return Boolean(a) })()`)
await sleep(500)
await evalJs(cdp, `(() => { const b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes('删除本条')); if(b)b.click(); return Boolean(b) })()`)
await wait(cdp, `document.body.innerText.includes('字段已保存') === false && document.querySelectorAll('button[title="编辑"]').length === 1`)
console.log(JSON.stringify({ afterDeleteCards: await evalJs(cdp, `document.querySelectorAll('button[title="编辑"]').length`) }))
cdp.close()
console.log('done')
