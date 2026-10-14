// HUST-OBC 学术字库只读数据层（由 scripts/import-hust-obc.mjs 生成）。
// 与 src/lib/kb.ts（69 字本地矢量字库）互相独立；本地字库不改动。
import raw from '../data/hust/index.json'
import type { Glyph } from './types'
import { byId, byModern, GLYPHS } from './kb'

export type CorpusKind = 'hust-dec' | 'hust-undec' | 'hust-gxd'

export interface HustSample {
  id: string
  file: string
  source: string
}

const publicBase = import.meta.env.BASE_URL || './'

export function corpusAssetUrl(file: string): string {
  return file.startsWith('/') ? `${publicBase}${file.slice(1)}` : file
}

export interface CorpusEntry {
  id: string
  corpus: CorpusKind
  categoryId: string
  sourceGroup?: string
  label: string
  labels: string[]
  localGlyphId: string
  deciphered: boolean
  reliable?: boolean
  imageCount: number
  sampleCount: number
  samples: HustSample[]
  sourceMix: Record<string, number>
  templateQuality: 'selected' | 'estimated' | null
  template: {
    density?: number
    aspect?: number
    components?: number
    source?: string
  } | null
}

interface HustIndexShape {
  corpus: string
  version: number
  license: string
  licenseUrl: string
  attribution: {
    authors: string
    venue: string
    doi: string
    repo: string
    figshare: string
  }
  generatedAt: string
  stats: {
    deciphered: { rootCategories: number; labels: number; imageFiles: number }
    undeciphered: { leafCategories: number; imageFiles: number; sourceGroups: string[] }
    gxd1390: { categories: number; imageFiles: number }
    localMapped: number
  }
  entries: CorpusEntry[]
}

const data = raw as unknown as HustIndexShape

export const HUST_INDEX = data
export const HUST_ENTRIES: CorpusEntry[] = data.entries
export const HUST_DEC: CorpusEntry[] = HUST_ENTRIES.filter((e) => e.corpus === 'hust-dec')
export const HUST_UNDEC: CorpusEntry[] = HUST_ENTRIES.filter((e) => e.corpus === 'hust-undec')
export const HUST_GXD: CorpusEntry[] = HUST_ENTRIES.filter((e) => e.corpus === 'hust-gxd')

const byEntryId = new Map(HUST_ENTRIES.map((e) => [e.id, e]))
const byDecCategory = new Map(HUST_DEC.map((e) => [e.categoryId, e]))

export function hustEntryById(id: string): CorpusEntry | undefined {
  if (id.startsWith('hust-dec:')) return byDecCategory.get(id.slice('hust-dec:'.length))
  if (id.startsWith('hust-undec:')) return byEntryId.get(id.slice('hust-undec:'.length))
  if (id.startsWith('hust-gxd:')) return byEntryId.get(id.slice('hust-gxd:'.length))
  return byEntryId.get(id)
}

export function corpusIdOf(entry: CorpusEntry): string {
  return `${entry.corpus}:${entry.categoryId}`
}

export function entryForCorpusId(id: string): CorpusEntry | undefined {
  return hustEntryById(id)
}

export function sourceFullName(code: string): string {
  const names: Record<string, string> = {
    H: 'HWOBC 数据库',
    Y: '殷契文渊',
    L: '甲骨文六位数字编码',
    X: '新甲骨文编',
    G: '国学大师网站',
    '?': '来源待核'
  }
  return names[code] || code || '来源待核'
}

export function sourceMixText(entry: CorpusEntry): string {
  return Object.entries(entry.sourceMix || {})
    .map(([code, n]) => `${sourceFullName(code)} ${n}`)
    .join(' · ')
}

export function localGlyphForEntry(entry: CorpusEntry | undefined): Glyph | undefined {
  if (!entry) return undefined
  if (entry.localGlyphId) return byId(entry.localGlyphId)
  if (entry.label && GLYPHS.some((g) => g.modern === entry.label)) return byModern(entry.label)
  return undefined
}

export function displayLabel(entry: CorpusEntry | undefined, fallback = '未释字形'): string {
  if (!entry) return fallback
  if (entry.corpus === 'hust-dec') {
    const primary = entry.label || entry.categoryId
    return entry.labels.length > 1 ? `${primary}（${entry.labels.length} 个来源标注）` : primary
  }
  if (entry.corpus === 'hust-gxd') return entry.label || `待复核 · ${entry.categoryId}`
  return `未释 · ${entry.categoryId}`
}

export function searchHust(query: string, decipheredOnly = false, includeGxd = false): CorpusEntry[] {
  const q = (query || '').trim().toLowerCase()
  let base = decipheredOnly
    ? HUST_DEC
    : [...HUST_DEC, ...HUST_UNDEC, ...(includeGxd ? HUST_GXD : [])]
  if (!q) return base
  return base.filter((e) => {
    const hay = [
      e.id,
      e.categoryId,
      e.sourceGroup || '',
      e.label,
      ...e.labels,
      e.localGlyphId,
      localGlyphForEntry(e)?.pinyin || ''
    ]
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
}

export function sampleImage(entry: CorpusEntry | undefined): string {
  if (!entry || !entry.samples.length) return ''
  return entry.samples[0].file
}

export function corpusSourceNote(entry: CorpusEntry): string {
  if (!entry) return ''
  if (entry.corpus === 'hust-dec') {
    return `公开学术字形样本 · HUST-OBC（${entry.labels.length ? entry.labels.join('/') : entry.categoryId}）`
  }
  if (entry.corpus === 'hust-undec') return '未释·待考证 · HUST-OBC 未释目录（仅类别号，无释读）'
  return '待复核来源 · HUST-OBC GuoXueDaShi_1390（可信度未确认，仅供研究参考）'
}

export function totalCuratedCount() {
  return GLYPHS.length
}

export function corpusStats() {
  return data.stats
}
