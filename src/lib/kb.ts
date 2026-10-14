import data from '../data/glyphs.json'
import type { Glyph } from './types'

const raw = data as unknown as { count: number; glyphs: Glyph[] }
export const GLYPHS: Glyph[] = raw.glyphs
export const GLYPH_COUNT = raw.count

const byIdMap = new Map(GLYPHS.map((g) => [g.id, g]))
const byModernMap = new Map(GLYPHS.map((g) => [g.modern, g]))

export function byId(id: string): Glyph | undefined {
  return byIdMap.get(id)
}

export function byModern(modern: string): Glyph | undefined {
  return byModernMap.get(modern)
}

export function searchGlyphs(query: string): Glyph[] {
  const q = (query || '').trim().toLowerCase()
  if (!q) return GLYPHS
  return GLYPHS.filter((g) =>
    [g.id, g.modern, g.pinyin, g.meaning, g.category, g.displayGroup]
      .join(' ')
      .toLowerCase()
      .includes(q)
  )
}

export const GROUPS = ['数字', '自然', '动物', '人体', '器物', '建筑', '方位·指事']

export function glyphsOfGroup(group: string): Glyph[] {
  if (!group || group === '全部') return GLYPHS
  return GLYPHS.filter((g) => g.displayGroup === group)
}

export const SAMPLE_IDS = ['ri', 'niu', 'xiang', 'ma', 'yu', 'long']

export const SOURCES: { title: string; role: string; kind: string }[] = [
  { title: '《甲骨文编》', role: '甲骨文字形检索与字形校核参考', kind: '工具书' },
  { title: '《说文解字》', role: '六书结构与本义参考', kind: '典籍' },
  { title: '《汉字源流字典》', role: '字形演变脉络参考', kind: '工具书' },
  { title: '既有 69 字矢量字形库', role: '本网页内置甲骨字形数据', kind: '本地数据' }
]

// 字形演变阶段定义与装配已迁移到 src/lib/evolution.ts（历史图版来自 EVOBC）。
// 这里保留原导出名，页面无需改动调用点。
export { STAGE_DEFS, evolutionFor } from './evolution'

export const RELATED: Record<string, string[]> = {
  shou: ['you', 'zhi'],
  you: ['shou', 'zhi'],
  nv: ['mu'],
  mu: ['nv'],
  da: ['li', 'tian2', 'ren'],
  li: ['da', 'tian2'],
  shi: ['mi3'],
  mi3: ['shi'],
  qian: ['ge'],
  ge: ['qian'],
  niu: ['yang'],
  yang: ['niu'],
  ri: ['yue', 'xing', 'tian'],
  yue: ['ri', 'xi'],
  ma: ['xiang', 'lu', 'quan3'],
  xiang: ['ma', 'lu'],
  ren: ['da', 'nv', 'zi'],
  zi: ['ren']
}

export function relatedOf(id: string): Glyph[] {
  return (RELATED[id] || []).map(byId).filter((g): g is Glyph => Boolean(g))
}

const modernId = (modern: string): string => byModern(modern)?.id || ''

export interface KnowledgeTopic {
  key: string
  label: string
  summary: string
  glyphModern: string[]
  note: string
}

export const KNOWLEDGE_TOPICS: KnowledgeTopic[] = [
  {
    key: 'shang',
    label: '商代',
    summary: '甲骨文主要出土于河南安阳殷墟，是刻写在龟甲兽骨上的商代晚期文字，也是研究商代社会最重要的材料之一。',
    glyphModern: ['王', '天', '人', '大'],
    note: '通识性介绍；本平台仅展示已释字形与工具书来源，不作逐片考释。'
  },
  {
    key: 'jisi',
    label: '祭祀',
    summary: '大量甲骨刻辞与占卜、祭祀活动有关。本字库中直接相关字形资料暂缺，相关通识介绍待结合卜辞研究资料继续整理。',
    glyphModern: [],
    note: '祭祀内容整理中：不把规划中的字库资料写成已收录。'
  },
  {
    key: 'war',
    label: '战争',
    summary: '甲骨文中的戈、弓、矢、车等字形记录了兵器和战争相关事物，可观察商代军事活动留下的文字证据。',
    glyphModern: ['戈', '弓', '矢', '车', '王'],
    note: '字义依据本地字库释义与构形说明整理。'
  },
  {
    key: 'farm',
    label: '农业',
    summary: '田、禾、米、木等字形与农业生产及农作物相关，反映了农耕生活是商代社会的重要面向。',
    glyphModern: ['田', '禾', '米', '木'],
    note: '字义依据本地字库释义与构形说明整理。'
  },
  {
    key: 'animal',
    label: '动物',
    summary: '牛羊马犬鱼鸟象龙鹿龟等象形字，是认识商代人观察自然、为动物造字的重要窗口。',
    glyphModern: ['牛', '羊', '马', '犬', '鱼', '鸟', '象', '龙', '鹿', '龟'],
    note: '字形均来自本地 69 字矢量库。'
  },
  {
    key: 'sky',
    label: '天象',
    summary: '日、月、星、云、雨、电等字形与天象观察有关，部分与干支纪日、农业节律相连。',
    glyphModern: ['日', '月', '星', '云', '雨', '电', '水', '川'],
    note: '字义依据本地字库释义与构形说明整理。'
  },
  {
    key: 'people',
    label: '人物',
    summary: '人、大、立、王、子、女、母等字形记录了人的体态、身份与亲属关系。',
    glyphModern: ['人', '大', '立', '王', '子', '女', '母', '男'],
    note: '字义依据本地字库释义与构形说明整理。'
  },
  {
    key: 'place',
    label: '地名',
    summary: '本地字库暂缺可作为地名考释示例的甲骨字形，相关内容待接入更完整资料后补充。',
    glyphModern: [],
    note: '资料待补充，不伪造地名考释。'
  },
  {
    key: 'artifact',
    label: '器物',
    summary: '刀、戈、弓、矢、车、舟、门、玉、贝等字形与商代器物、工具和交易媒介密切相关。',
    glyphModern: ['刀', '戈', '弓', '矢', '车', '舟', '门', '玉', '贝'],
    note: '字义依据本地字库释义与构形说明整理。'
  }
]

export function topicGlyphs(topic: KnowledgeTopic): Glyph[] {
  return topic.glyphModern.map(byModern).filter((g): g is Glyph => Boolean(g))
}

export interface EngineStatus {
  engine: string
  engineAvailable: boolean
  librarySize: number
  threshold: number
  visionModel: { available: false; detail: string }
  browser: boolean
}

export const ENGINE_NAME = '传统字形匹配引擎（Chamfer + 双向覆盖率，浏览器本地运行）'
