// EVOBC 字形演变图版数据层（由 scripts/import-evo.mjs 生成）。
// 只负责“历史阶段图版”的装配；69 字矢量、HUST-OBC 样本仍分别来自 kb / corpus。
import data from '../data/evolution.json'
import type { EvolutionStage, Glyph, StageImage } from './types'

type HistKey = 'jinwen' | 'xiaozhuan' | 'lishu'
const HIST_KEYS: HistKey[] = ['jinwen', 'xiaozhuan', 'lishu']

export interface EvoFile {
  src: string
  categoryId: string
  sourceLabel: string
  note?: string
}

export interface EvoStageAssets {
  files: EvoFile[]
}

export interface EvoLabelEntry {
  categoryIds: string[]
  evobcLabels: string[]
  match: 'exact' | 'alias'
  stages: Partial<Record<HistKey, EvoStageAssets>>
}

interface EvoSourceMeta {
  key: string
  title: string
  authors: string
  year: number
  arxiv: string
  doi: string
  repo: string
  download: string
  license: string
  licenseUrl: string
  note: string
}

interface EvoStats {
  entryCount: number
  localLabels: number
  localFullStages: number
  localPartial: number
  hustLinkedEntries: number
  hustDirectLabels: number
  stageImages: Record<HistKey, number>
  totalFiles: number
  totalBytes: number
  generatedMs: number
}

interface EvoJsonShape {
  version: number
  generatedAt: string
  sources: EvoSourceMeta[]
  stats: EvoStats
  entries: Record<string, EvoLabelEntry>
}

const raw = data as unknown as EvoJsonShape
const publicBase = import.meta.env.BASE_URL || './'

export const EVO_EMPTY_HINT: Record<HistKey, string> = {
  jinwen: '该字暂无匹配到可查证的 EVOBC 金文图版，平台不凭空补形。',
  xiaozhuan: '该字暂无匹配到可查证的 EVOBC 篆书（小篆系）图版，平台不凭空补形。',
  lishu: '该字暂无匹配到可查证的 EVOBC 隶书图版，平台不凭空补形。'
}

/** 六个阶段的静态骨架；金文/小篆/隶书在运行时按数据覆盖为 image 或保留 missing。 */
export const STAGE_DEFS: EvolutionStage[] = [
  {
    key: 'oracle',
    label: '甲骨文',
    status: 'vector',
    hint: '本地矢量字形（程序按通行字形渲染，展示用）。'
  },
  {
    key: 'jinwen',
    label: '金文',
    status: 'missing',
    hint: EVO_EMPTY_HINT.jinwen
  },
  {
    key: 'xiaozhuan',
    label: '小篆',
    status: 'missing',
    hint: EVO_EMPTY_HINT.xiaozhuan
  },
  {
    key: 'lishu',
    label: '隶书',
    status: 'missing',
    hint: EVO_EMPTY_HINT.lishu
  },
  {
    key: 'kaishu',
    label: '楷书',
    status: 'font',
    hint: '现代楷体字形（字体呈现，非出土字形资料）。'
  },
  {
    key: 'today',
    label: '今天',
    status: 'font',
    hint: '现代规范字形（字体呈现，非出土字形资料）。'
  }
]

export interface TimelineItem {
  stage: EvolutionStage
  modern: string
}

export function evoEntryForLabel(label: string): EvoLabelEntry | undefined {
  if (!label) return undefined
  return raw.entries[label.normalize('NFC')]
}

export function evoHasLabel(label: string): boolean {
  const entry = evoEntryForLabel(label)
  return Boolean(entry && HIST_KEYS.some((k) => entry.stages[k]?.files.length))
}

function copyStage(stage: EvolutionStage): EvolutionStage {
  return { ...stage, images: stage.images ? [...stage.images] : undefined }
}

function stageImages(
  stageKey: HistKey,
  label: string,
  entry: EvoLabelEntry | undefined
): StageImage[] | undefined {
  const files = entry?.stages[stageKey]?.files
  if (!entry || !files?.length) return undefined
  const labels = entry.evobcLabels
  return files.map((f) => ({
    src: f.src.startsWith('/') ? `${publicBase}${f.src.slice(1)}` : f.src,
    categoryId: f.categoryId,
    sourceLabel: (labels && labels.length ? labels.join(' / ') : '') || f.sourceLabel || label,
    alt: `${label} · ${stageKey === 'jinwen' ? '金文' : stageKey === 'xiaozhuan' ? '篆书（小篆系）' : '隶书'} · EVOBC 图版`,
    note: f.note
  }))
}

function attachHistory(stage: EvolutionStage, label: string, entry?: EvoLabelEntry): EvolutionStage {
  const key = stage.key as HistKey
  if (!HIST_KEYS.includes(key)) return copyStage(stage)
  const images = stageImages(key, label, entry)
  if (!images) return copyStage(stage)
  const n = images.length
  return {
    ...copyStage(stage),
    status: 'image',
    sourceKey: 'EVOBC',
    images,
    hint: `${label} 的${stage.label}图版：${n} 张来自 EVOBC 公开学术字形数据集（CC BY-NC-SA 4.0），按来源原样整理，非专家逐字复核。`
  }
}

/** 本地 69 字字形演变（原 kb.evolutionFor 语义，签名不变）。 */
export function evolutionFor(glyph?: Glyph): TimelineItem[] {
  if (!glyph) return STAGE_DEFS.map((stage) => ({ stage: copyStage(stage), modern: '' }))
  const entry = evoEntryForLabel(glyph.modern)
  return STAGE_DEFS.map((stage) => ({
    stage: attachHistory(stage, glyph.modern, entry),
    modern: glyph.modern
  }))
}

export interface HustTimelineOptions {
  /** HUST 类别甲骨阶段示例图；通常传 entry.samples[0].file。 */
  oracleFile?: string
  oracleSourceLabel?: string
}

/**
 * HUST 学术字形详情页使用的演变时间轴：
 * 甲骨阶段为该类别 HUST-OBC 拓片样本，金文/篆书/隶书由释读标签精确匹配 EVOBC。
 */
export function evolutionForHustLabel(
  label: string,
  opts: HustTimelineOptions = {}
): TimelineItem[] {
  const entry = evoEntryForLabel(label)
  const oracle: EvolutionStage = opts.oracleFile
    ? {
        key: 'oracle',
        label: '甲骨文',
        status: 'image',
        sourceKey: 'HUST-OBC',
        images: [
          {
            src: opts.oracleFile.startsWith('/') ? `${publicBase}${opts.oracleFile.slice(1)}` : opts.oracleFile,
            alt: `${label} · 甲骨文 · HUST-OBC 拓片样本`,
            categoryId: '',
            sourceLabel: opts.oracleSourceLabel || 'HUST-OBC'
          }
        ],
        hint: '甲骨阶段：该类别 HUST-OBC 公开拓片样本（非本地矢量字形）。'
      }
    : {
        key: 'oracle',
        label: '甲骨文',
        status: 'missing',
        hint: '该 HUST 类别暂无示例图可展示。'
      }
  const middle: EvolutionStage[] = HIST_KEYS.map((key) => {
    const def = STAGE_DEFS.find((s) => s.key === key) as EvolutionStage
    return attachHistory(def, label, entry)
  })
  const tail: EvolutionStage[] = [
    { ...STAGE_DEFS[4], images: undefined },
    { ...STAGE_DEFS[5], images: undefined }
  ]
  return [oracle, ...middle, ...tail].map((stage) => ({ stage, modern: label }))
}

export function evoStats(): EvoStats {
  return raw.stats
}

export function evoSource(): EvoSourceMeta | undefined {
  return raw.sources.find((s) => s.key === 'EVOBC')
}

export function evoDataVersion(): number {
  return raw.version
}

export function evoGeneratedAt(): string {
  return raw.generatedAt
}
