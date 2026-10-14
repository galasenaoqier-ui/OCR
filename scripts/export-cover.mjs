// 生成并导出答辩封面版式：HTML/SVG + PNG（本机 Edge headless）。
// 用法：npm run cover:export
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const outDir = path.join(root, 'docs', 'competition')
fs.mkdirSync(outDir, { recursive: true })

const glyphs = JSON.parse(
  fs.readFileSync(path.join(root, 'src', 'data', 'glyphs.json'), 'utf8')
).glyphs
const byId = new Map(glyphs.map((g) => [g.id, g]))
const ma = byId.get('ma')
const ri = byId.get('ri')

function glyphPath(strokes) {
  return strokes
    .map((poly) => `M${poly.map(([x, y]) => `${(x * 100).toFixed(2)},${(y * 100).toFixed(2)}`).join('L')}`)
    .join(' ')
}

const maPath = ma ? glyphPath(ma.strokes) : ''
const riPath = ri ? glyphPath(ri.strokes) : ''

const css = `
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#171614; font-family:"Microsoft YaHei","微软雅黑",sans-serif; }
  .cover { position:relative; overflow:hidden; background:#F4F0E6; color:#171614; }
  .cover::before { content:""; position:absolute; inset:0; opacity:.55;
    background:repeating-linear-gradient(0deg, rgba(23,22,20,.018) 0, rgba(23,22,20,.018) 1px, transparent 1px, transparent 3px);
    pointer-events:none; }
  .brand { display:flex; align-items:center; gap:12px; }
  .brand-mark { display:flex; width:46px; height:46px; align-items:center; justify-content:center;
    background:#171614; color:#F4F0E6; border-radius:12px; font-family:KaiTi,"STKaiti","楷体",serif; font-size:27px; }
  .brand-name { font-family:KaiTi,"STKaiti","楷体",serif; font-size:23px; letter-spacing:.08em; }
  .brand-sub { color:#8B7355; font-size:11px; letter-spacing:.28em; margin-top:3px; }
  .eyebrow { color:#8B7355; font-size:12px; letter-spacing:.3em; }
  .title { font-family:KaiTi,"STKaiti","楷体",serif; color:#171614; }
  .line-gold { height:1px; background:linear-gradient(90deg,#B49765,transparent); }
  .slogan { border-left:2px solid #B49765; color:#5B5145; }
  .stat { display:flex; flex-direction:column; }
  .stat b { font-family:KaiTi,"STKaiti","楷体",serif; font-size:42px; font-weight:400; }
  .stat span { color:#8B7355; font-size:11px; letter-spacing:.16em; margin-top:6px; }
  .corner { position:absolute; width:92px; height:92px; border-color:#B49765; opacity:.55; }
  .scan { position:relative; border-radius:18px; border:1px solid rgba(139,115,85,.45); background:#E9E0CD; }
  .ai-tag { position:absolute; top:24px; right:24px; border:1px solid #B49765; background:rgba(251,248,240,.86); padding:10px 12px; line-height:1.45; }
  .ai-tag small { font-size:10px; letter-spacing:.16em; }
  .ai-tag .char { font-family:KaiTi,"STKaiti","楷体",serif; font-size:34px; display:block; }
  .honesty { color:#8B7355; font-size:11px; letter-spacing:.08em; }
`

function baseHead() {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>${css}</style></head><body>`
}

// ---------- 16:9 ----------
const wide = `
${baseHead()}
<div class="cover" style="width:1600px;height:900px;padding:64px 86px;">
  <div class="corner" style="top:30px;right:30px;border-top:2px solid;border-right:2px solid;"></div>
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <div class="brand"><div class="brand-mark">殷</div><div><div class="brand-name">殷契拾文</div><div class="brand-sub">甲骨文拓片智能识别与检索</div></div></div>
    <div class="eyebrow" style="text-align:right;">大学生新文科实践创新大赛<br/>数字人文 · 历史文化 · AI 辅助古文字</div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 540px;align-items:center;gap:64px;margin-top:74px;">
    <div>
      <div class="eyebrow">AI ORACLE BONE INSCRIPTION PLATFORM</div>
      <h1 class="title" style="font-size:104px;line-height:1.12;margin-top:22px;">殷契拾文</h1>
      <h2 class="title" style="font-size:38px;color:#8B7355;font-weight:400;margin-top:20px;">AI 甲骨文智能识别与文化阐释平台</h2>
      <div class="slogan" style="padding:16px 20px;margin-top:34px;">
        <div style="font-size:24px;color:#171614;">让三千年前的文字，再次被看见。</div>
        <div style="font-size:13px;color:#8B7355;margin-top:8px;">识别 → 释读 → 溯源 → 理解 → 探索 → 研究</div>
      </div>
      <div style="display:flex;gap:56px;margin-top:48px;">
        <div class="stat"><b>69+</b><span>常见甲骨字形</span></div>
        <div class="stat"><b>Top-K</b><span>候选识别</span></div>
        <div class="stat"><b>AI+人文</b><span>辅助释读</span></div>
      </div>
    </div>
    <div class="scan" style="padding:36px 30px 24px;">
      <div style="display:flex;justify-content:space-between;color:#8B7355;font-size:11px;letter-spacing:.2em;padding:0 8px 14px;">
        <span>殷墟甲骨 · 数字档案</span><span>NO. YQ-0042</span>
      </div>
      <div style="display:flex;justify-content:center;align-items:center;height:410px;">
        <svg viewBox="-2 -2 104 104" width="410" height="410" fill="none">
          <g stroke="#332A22" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" opacity=".86">
            <path d="${maPath}"/>
          </g>
        </svg>
        <div class="ai-tag"><small>AI DETECTED</small><span class="char">马</span><small>96.8% · HIGH</small></div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin-top:16px;padding:0 8px;">
        <span style="font-family:KaiTi,serif;font-size:20px;">甲骨文 → 马</span>
        <div class="line-gold" style="flex:1;"></div>
        <span class="honesty">示例 · 本地字形渲染</span>
      </div>
    </div>
  </div>
  <div style="position:absolute;left:86px;right:86px;bottom:38px;display:flex;justify-content:space-between;align-items:flex-end;">
    <div>
      <div style="color:#8B7355;font-size:12px;letter-spacing:.2em;">技术赋能人文 · 人文解释技术</div>
      <div class="honesty" style="margin-top:8px;">识别结果仅供研究与学习参考 · 缺失字形阶段与未采集实践数据不虚构</div>
    </div>
    <div class="title" style="font-size:20px;">2026</div>
  </div>
</div>
</body></html>`

// ---------- A4 ----------
const a4 = `
${baseHead()}
<div class="cover" style="width:794px;height:1123px;padding:70px 62px;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;">
    <div class="brand"><div class="brand-mark">殷</div><div><div class="brand-name">殷契拾文</div><div class="brand-sub">甲骨文拓片智能识别与检索</div></div></div>
    <div class="eyebrow" style="text-align:right;line-height:1.8;">大学生新文科实践创新大赛<br/>数字人文方向</div>
  </div>
  <div style="text-align:center;margin-top:74px;">
    <div class="eyebrow">AI ORACLE BONE INSCRIPTION PLATFORM</div>
    <h1 class="title" style="font-size:92px;margin-top:20px;">殷契拾文</h1>
    <h2 class="title" style="font-size:28px;color:#8B7355;font-weight:400;margin-top:16px;">AI 甲骨文智能识别与文化阐释平台</h2>
  </div>
  <div class="scan" style="margin:56px auto 0;width:360px;height:360px;padding:24px;">
    <svg viewBox="-2 -2 104 104" width="100%" height="100%" fill="none">
      <g stroke="#332A22" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" opacity=".86"><path d="${maPath}"/></g>
    </svg>
  </div>
  <div style="text-align:center;margin-top:40px;">
    <div class="title" style="font-size:30px;">让三千年前的文字，再次被看见。</div>
    <div style="color:#8B7355;font-size:13px;letter-spacing:.12em;margin-top:12px;">识别 · 释读 · 溯源 · 理解 · 探索 · 研究</div>
  </div>
  <div style="display:flex;justify-content:space-between;border-top:1px solid rgba(180,151,101,.6);margin-top:54px;padding-top:24px;">
    <div class="stat"><b>69+</b><span>常见甲骨字形</span></div>
    <div class="stat"><b>Top-K</b><span>候选识别</span></div>
    <div class="stat"><b>AI+人文</b><span>辅助释读</span></div>
    <div class="stat"><b>本地</b><span>浏览器识别引擎</span></div>
  </div>
  <div class="honesty" style="position:absolute;left:62px;right:62px;bottom:46px;border-top:1px solid rgba(139,115,85,.4);padding-top:14px;line-height:1.8;">
    技术赋能人文，人文解释技术。识别结果仅供研究与学习参考，不代表正式古文字释读；未释字形进入研究档案，等待人工与专家验证。
  </div>
</div>
</body></html>`

fs.writeFileSync(path.join(outDir, 'cover-16x9.html'), wide, 'utf8')
fs.writeFileSync(path.join(outDir, 'cover-a4.html'), a4, 'utf8')
console.log('封面 HTML 已生成：docs/competition/')

const edgeCandidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
]
const edge = edgeCandidates.find((p) => fs.existsSync(p))
if (!edge) {
  console.log('未找到 Edge/Chrome，跳过 PNG 导出。')
  process.exit(0)
}

const shots = [
  ['cover-16x9.html', 'cover-16x9.png', '1600,900'],
  ['cover-a4.html', 'cover-a4.png', '794,1123']
]
for (const [html, png, size] of shots) {
  const fileUrl = 'file:///' + path.join(outDir, html).replace(/\\/g, '/')
  const target = path.join(outDir, png)
  const r = spawnSync(
    edge,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      `--user-data-dir=${path.join(outDir, '.edge-profile')}`,
      `--window-size=${size}`,
      `--screenshot=${target}`,
      fileUrl
    ],
    { encoding: 'utf8', timeout: 30000 }
  )
  if (fs.existsSync(target)) console.log(`已导出 PNG：docs/competition/${png}`)
  else console.log(`PNG 导出失败：${html}`, r.stderr || '')
}
