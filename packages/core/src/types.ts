export type InputMode = 'sample' | 'draw' | 'image'
export type RecognitionSource = 'local' | 'academic-model' | 'external-api' | 'hybrid'

export interface Point { x: number; y: number }

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
  strokes: number[][][]
}

export interface Candidate {
  rank: number
  glyphId: string
  modern: string
  pinyin: string
  meaning: string
  category: string
  score: number
  reason: string
  source: string
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
  disclaimer: string
  engineName: string
  durationMs: number
  threshold: number
  librarySize: number
  inputThumb?: string
  source?: RecognitionSource
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

export interface ResearchRecord {
  id: string
  createdAt: string
  thumbUrl?: string
  glyphId: string
  featuresText: string
  candidates: Candidate[]
  confidence: number
  status: string
  note: string
  historyId: string
}
