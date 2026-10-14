export type Point = [number, number]

export interface Glyph {
  id: string
  modern: string
  pinyin: string
  meaning: string
  category: string
  displayGroup: string
  note: string
  known: boolean
  sample: boolean
  strokes: Point[][]
}

export type InputMode = 'sample' | 'draw' | 'image'
export type RecognitionSource = 'local' | 'academic-model' | 'external-api' | 'hybrid'

export interface Candidate {
  rank: number
  glyphId: string
  modern: string
  pinyin: string
  meaning: string
  category: string
  score: number
  chamfer: number | null
  chamferForward: number | null
  chamferBackward: number | null
  coverage: number | null
  coverageForward: number | null
  coverageBackward: number | null
  reason: string
  source: string
}

export interface VisualFeatures {
  symmetry: number
  density: number
  topRatio: number
  hLines: number
  vLines: number
  bboxAspect: number
  componentCount: number
}

export interface EvidenceChain {
  chamfer: number | null
  chamferForward: number | null
  chamferBackward: number | null
  coverage: number | null
  coverageForward: number | null
  coverageBackward: number | null
  features: VisualFeatures
  libraryMatched: string
  summary: string
}

export interface StepItem {
  index: number
  title: string
  detail: string
  elapsedMs: number
  status: 'pending' | 'running' | 'done'
}

export interface RecognitionResult {
  ts: string
  inputMode: InputMode
  confident: boolean
  resultTitle: string
  statusText: string
  statusTone: 'high' | 'low' | 'unknown'
  top1?: Candidate
  candidates: Candidate[]
  glyph?: Glyph
  aiCategory: string
  aiHint: string
  aiFeatureLines: string[]
  evidence: EvidenceChain
  steps: StepItem[]
  disclaimer: string
  engineName: string
  durationMs: number
  threshold: number
  librarySize: number
  inputThumb?: string
  source?: RecognitionSource
  external?: {
    provider: string
    requestMs: number
    rawText?: string
  }
}

export interface HistoryRecord {
  id: string
  ts: string
  inputMode: InputMode
  thumbUrl?: string
  top1Id: string
  top1Modern: string
  top1Score: number
  confident: boolean
  candidates: Candidate[]
  engineName: string
  feedback: '' | 'correct' | 'wrong' | 'uncertain'
  researchId: string
}

export type ResearchStatus =
  | '待分析'
  | 'AI辅助分析'
  | '待人工确认'
  | '已确认'
  | '暂无结论'

export interface ResearchRecord {
  id: string
  createdAt: string
  thumbUrl?: string
  glyphId: string
  featuresText: string
  candidates: Candidate[]
  confidence: number
  status: ResearchStatus
  note: string
  historyId: string
}

export interface PracticeStats {
  testCount: number
  feedbackCorrect: number
  feedbackWrong: number
  feedbackUncertain: number
  researchCount: number
}

export type StageStatus = 'vector' | 'image' | 'font' | 'missing'

export interface StageImage {
  src: string
  alt: string
  categoryId: string
  /** EVOBC 原字形标签（如“馬”），用于诚实标注图版来源字形。 */
  sourceLabel: string
  note?: string
}

export interface EvolutionStage {
  key: 'oracle' | 'jinwen' | 'xiaozhuan' | 'lishu' | 'kaishu' | 'today'
  label: string
  status: StageStatus
  hint: string
  images?: StageImage[]
  /** 图版来源数据集名，如 EVOBC。 */
  sourceKey?: string
}
