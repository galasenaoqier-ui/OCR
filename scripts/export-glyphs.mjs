// 一次性把 oracle_app/oracle_db.py 中的 69 个矢量字形安全导出为 glyphs.json。
// oracle_db.py 是一个“纯字面量 + 函数定义”的模块，正文没有 import / 表达式副作用，
// 因此可以剥离注释、把 Python 字面量小变换为 JS 后交给 vm 求值，不手工复制数据。
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const sourcePath = path.resolve(root, '..', 'oracle_app', 'oracle_db.py')
const outPath = path.join(root, 'src', 'data', 'glyphs.json')

const text = fs.readFileSync(sourcePath, 'utf8')
const startMark = '_GLYPHS = ['
const endMark = '\n]\n\ndef get_glyph_list'
const start = text.indexOf(startMark)
const end = text.indexOf(endMark, start)
if (start < 0 || end < 0) {
  throw new Error('oracle_db.py 中未找到 _GLYPHS 列表')
}

let body = text.slice(start + startMark.length - 1, end + 2) // 保留首尾 [ ]（end 指向 ] 前的换行）
body = body
  .split('\n')
  .filter((line) => line.trim() !== '' && !line.trim().startsWith('#'))
  .join('\n')
  .replace(/\bTrue\b/g, 'true')
  .replace(/\bFalse\b/g, 'false')
  // 列表体中出现的括号均为坐标元组，直接转为数组字面量
  .replace(/\(([^()]*?),([^()]*?)\)/g, '[$1,$2]')

const sandbox = {}
vm.createContext(sandbox)
const value = vm.runInContext(`(${body})`, sandbox, { timeout: 5000 })
if (!Array.isArray(value)) throw new Error('解析结果不是数组')

const modernGroup = {
  // 六类展示分组 + 第七类“方位·指事”，覆盖全部 69 字且不重叠
  数字: ['一','二','三','四','五','六','七','八','九','十','百','千'],
  自然: ['日','月','山','水','火','云','雨','电','星','川','井','泉','木','禾','米','生'],
  动物: ['牛','羊','马','犬','鱼','鸟','象','龙','鹿','龟'],
  人体: ['人','大','立','天','王','口','目','手','又','止','心','子','女','母','男'],
  器物: ['刀','戈','弓','矢','车','舟','玉','田','贝'],
  建筑: ['门','宫','高','家'],
  '方位·指事': ['上','下','中']
}
const groupByModern = new Map()
for (const [group, list] of Object.entries(modernGroup)) {
  for (const modern of list) groupByModern.set(modern, group)
}

const samples = ['日', '牛', '象', '马', '鱼', '龙']
const glyphs = value.map((g) => {
  if (!g || !Array.isArray(g.strokes)) throw new Error(`字形 ${g && g.id} 缺少 strokes`)
  const group = groupByModern.get(g.modern)
  if (!group) throw new Error(`字形 ${g.modern}(${g.id}) 未纳入展示分组`)
  return {
    id: String(g.id),
    modern: g.modern,
    pinyin: String(g.pinyin),
    meaning: String(g.meaning),
    category: String(g.category),
    displayGroup: group,
    note: String(g.note || ''),
    known: g.known !== false,
    sample: samples.includes(g.modern),
    strokes: g.strokes.map((poly) =>
      poly.map(([x, y]) => [Math.round(x * 1e6) / 1e6, Math.round(y * 1e6) / 1e6])
    )
  }
})

if (glyphs.length !== 69) {
  throw new Error(`导出数量异常：期望 69，实际 ${glyphs.length}`)
}

const out = {
  source: 'oracle_app/oracle_db.py（只读引用，不修改桌面端数据）',
  exportedAt: new Date().toISOString(),
  count: glyphs.length,
  glyphs
}
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8')
console.log(`已导出 ${glyphs.length} 字 → ${path.relative(root, outPath)}`)
