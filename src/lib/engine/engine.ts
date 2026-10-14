import { GLYPHS, byId } from '../kb'
import type {
  Candidate,
  EvidenceChain,
  Glyph,
  InputMode,
  RecognitionResult,
  StepItem
} from '../types'
import { countInk, preprocessGray, strokesToMask, type GrayImage, type Mask } from './binary'
import { featureLines, guessCategory, visualFeatures } from './features'
import { buildRefs, recognizeMask, type RefGlyph } from './matcher'
import { ENGINE_SOURCE } from './matcher'

const STEP_TITLES: [string, string][] = [
  ['图像预处理', '去噪 · 二值化 · 归一化'],
  ['字形检测', '分析笔画与结构'],
  ['字库检索', '匹配参考字形'],
  ['候选排序', '计算 Top-K 结果'],
  ['AI 辅助分析', '生成解释'],
  ['生成识别报告', '证据链与释读报告']
]

function nowIso(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

function makeCandidate(c: Candidate & { reason?: string }): Candidate {
  return { ...c, reason: c.reason || '' }
}

function reasonFor(c: Candidate, hint: string): string {
  return `结构相似度 ${c.score.toFixed(1)}%；属于${c.category}，${hint}；参考字形：${c.modern}（${c.pinyin}）`
}

function summarySentence(candidates: Candidate[], confident: boolean): string {
  if (!candidates.length) return '当前字形未能提取到有效笔画。'
  const top = candidates[0]
  if (confident) {
    return `综合判断：当前字形与已释甲骨文“${top.modern}”具有较高相似度（相似度 ${top.score.toFixed(1)}%）。`
  }
  const others = candidates.slice(1, 3).map((c) => c.modern).join('、') || '若干字形'
  return `综合判断：当前字形未达高置信阈值，AI 认为其与“${top.modern}”等字形（如${others}）结构相近，可作为释读方向，但需要结合辞例与工具书进一步考证。`
}

export interface RecognitionInputBase {
  mode: InputMode
  thumbUrl?: string
}

export type RecognitionInput =
  | (RecognitionInputBase & { kind: 'strokes'; strokes: number[][][] })
  | (RecognitionInputBase & { kind: 'gray'; gray: GrayImage })

export class BrowserEngine {
  readonly name = ENGINE_SOURCE
  readonly librarySize = GLYPHS.length
  readonly threshold = 58
  private refs: RefGlyph[] | null = null
  private readyPromise: Promise<void>

  constructor() {
    this.readyPromise = this.buildRefsAsync()
  }

  private async buildRefsAsync(): Promise<void> {
    const all: RefGlyph[] = []
    const glyphs = [...GLYPHS]
    for (let i = 0; i < glyphs.length; i++) {
      // 每批释放主线程，避免首屏卡顿
      if (i % 6 === 0) await new Promise<void>((resolve) => setTimeout(resolve, 0))
      const refs = buildRefs([glyphs[i]])
      all.push(refs[0])
    }
    this.refs = all
  }

  async ready(): Promise<void> {
    await this.readyPromise
  }

  status() {
    return {
      engine: this.name,
      engineAvailable: true,
      librarySize: this.librarySize,
      threshold: this.threshold,
      visionModel: {
        available: false,
        detail: '本模式为精品矢量字形传统匹配；ResNet-50 本地 ONNX 模型已作为独立“学术模型”模式接入。'
      },
      browser: true
    }
  }

  async recognize(input: RecognitionInput): Promise<RecognitionResult> {
    await this.ready()
    const started = performance.now()
    const steps: StepItem[] = []
    const tick = (idx: number, title: string, detail: string) =>
      steps.push({ index: idx, title, detail, elapsedMs: Number((performance.now() - started).toFixed(1)), status: 'done' })

    tick(1, ...STEP_TITLES[0])
    let mask: Mask
    if (input.kind === 'gray') {
      const prepared = preprocessGray(input.gray)
      if (!countInk(prepared)) throw new Error('未检测到笔画，请上传包含清晰笔画的图片。')
      mask = prepared
    } else {
      const prepared = strokesToMask(input.strokes)
      if (!countInk(prepared)) throw new Error('未检测到笔画，请先在画板书写。')
      mask = prepared
    }

    tick(2, ...STEP_TITLES[1])
    const feats = visualFeatures(mask)
    tick(3, ...STEP_TITLES[2])
    const { candidates: ranked, confident } = recognizeMask(mask, this.refs!, this.threshold ? 5 : 5, this.threshold)
    tick(4, ...STEP_TITLES[3])
    const [aiCategory, aiHint] = guessCategory(feats)
    const aiFeatureLines = featureLines(feats)
    const candidates: Candidate[] = ranked.map((c) =>
      makeCandidate({
        ...c,
        rank: c.rank,
        reason: reasonFor(c as Candidate, aiHint)
      })
    )
    tick(5, ...STEP_TITLES[4])
    const top1 = candidates[0]
    const glyph = top1 ? byId(top1.glyphId) : undefined
    const features = {
      symmetry: feats.symmetry,
      density: feats.density,
      topRatio: feats.topRatio,
      hLines: feats.hLines,
      vLines: feats.vLines,
      bboxAspect: feats.bboxAspect,
      componentCount: feats.componentCount
    }
    const libText = top1
      ? `与参考字库中的多个“${top1.modern}”字形存在较高视觉相似度（当前字库每字收录 1 个标准参考字形；扩容后可显示多个参考字形匹配数量）。`
      : '未能与参考字库建立有效匹配。'
    const evidence: EvidenceChain = {
      chamfer: top1?.chamfer ?? null,
      chamferForward: top1?.chamferForward ?? null,
      chamferBackward: top1?.chamferBackward ?? null,
      coverage: top1?.coverage ?? null,
      coverageForward: top1?.coverageForward ?? null,
      coverageBackward: top1?.coverageBackward ?? null,
      features,
      libraryMatched: libText,
      summary: summarySentence(candidates, confident)
    }
    const durationMs = Number((performance.now() - started).toFixed(1))
    tick(6, ...STEP_TITLES[5])

    return {
      ts: nowIso(),
      inputMode: input.mode,
      confident,
      resultTitle: confident ? 'AI 识别结果' : '未能高置信识别',
      statusText: confident ? '高置信度' : '需要进一步考证',
      statusTone: confident ? 'high' : 'low',
      top1,
      candidates,
      glyph,
      aiCategory,
      aiHint,
      aiFeatureLines,
      evidence,
      steps,
      disclaimer: confident
        ? '说明：以上为 AI 识别结果，供学习与文化展示参考；最终释读请结合《甲骨文编》《殷墟甲骨刻辞类纂》等工具书及甲骨片辞例综合考证。'
        : '⚠️ 以上仅为 AI 辅助分析，不代表古文字学意义上的正式释读。请结合专业工具书、甲骨片出处及相关辞例进一步考证。',
      engineName: this.name,
      durationMs,
      threshold: this.threshold,
      librarySize: this.librarySize,
      inputThumb: input.thumbUrl,
      source: 'local'
    }
  }

  async sampleRecognition(glyphId: string, thumbUrl?: string): Promise<RecognitionResult> {
    const glyph = byId(glyphId)
    if (!glyph) throw new Error('未知示例字形')
    return this.recognize({ kind: 'strokes', mode: 'sample', strokes: glyph.strokes, thumbUrl })
  }
}

export const browserEngine = new BrowserEngine()

export function engineStatus() {
  return browserEngine.status()
}

export function glyphStructure(glyph: Glyph) {
  const polys = glyph.strokes.map((poly) =>
    poly.map(([x, y]) => ({ x, y }))
  )
  let maxX = 0
  let maxY = 0
  let minX = 1
  let minY = 1
  let closedCount = 0
  for (const poly of polys) {
    const first = poly[0]
    const last = poly[poly.length - 1]
    if (first && last && Math.hypot(first.x - last.x, first.y - last.y) < 0.08) closedCount++
    for (const p of poly) {
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
    }
  }
  const cw = Math.max(0.001, maxX - minX)
  const ch = Math.max(0.001, maxY - minY)
  return {
    strokeCount: glyph.strokes.length,
    closedStrokes: closedCount,
    aspect: Number((cw / ch).toFixed(2)),
    compactness: Number(((polyLength(glyph) / Math.max(cw, ch))).toFixed(2))
  }
}

function polyLength(glyph: Glyph): number {
  let len = 0
  for (const poly of glyph.strokes) {
    for (let i = 1; i < poly.length; i++) {
      len += Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1])
    }
  }
  return len
}
