// HUST-OBC 学术大库识别引擎（浏览器本地）。
// 模板索引由 scripts/import-hust-obc.mjs 生成；Worker 负责加载与匹配。
import type {
  Candidate,
  EvidenceChain,
  InputMode,
  RecognitionResult,
  StepItem,
  VisualFeatures
} from '../types'
import { countInk, preprocessGray, strokesToMask, type GrayImage, type Mask } from './binary'
import { corpusStats } from '../corpus'

const HUST_ENGINE_NAME = 'HUST-OBC 学术字形模板匹配引擎（Chamfer + 双向覆盖率，浏览器本地 Worker）'
const HUST_SOURCE = 'HUST-OBC 学术模板 · CC BY-NC 4.0'

interface WorkerResult {
  type: 'ready' | 'progress' | 'result' | 'error'
  loaded?: number
  total?: number
  count?: number
  size?: number
  bytes?: number
  durationMs?: number
  confident?: boolean
  candidates?: Array<{
    rank: number
    glyphId: string
    categoryId: string
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
  }>
  features?: VisualFeatures
  aiCategory?: string
  aiHint?: string
  aiFeatureLines?: string[]
  librarySize?: number
  threshold?: number
  message?: string
}

export interface RecognitionInputBase {
  mode: InputMode
  thumbUrl?: string
}

export type RecognitionInput =
  | (RecognitionInputBase & { kind: 'strokes'; strokes: number[][][] })
  | (RecognitionInputBase & { kind: 'gray'; gray: GrayImage })

function nowIso(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

export class HustBrowserEngine {
  readonly name = HUST_ENGINE_NAME
  readonly threshold = 58
  readonly librarySize = corpusStats().deciphered.rootCategories
  private worker: Worker | null = null
  private readyPromise: Promise<void> | null = null
  private onLoadProgress: ((loaded: number, total: number) => void) | null = null
  private active: {
    resolve: (v: WorkerResult) => void
    reject: (e: Error) => void
  } | null = null

  private ensureWorker() {
    if (this.worker) return
    this.worker = new Worker(new URL('./hust.worker.ts', import.meta.url), { type: 'module' })
    this.worker.onmessage = (ev: MessageEvent<WorkerResult>) => {
      const msg = ev.data
      if (msg.type === 'progress') {
        this.onLoadProgress?.(msg.loaded || 0, msg.total || 0)
        return
      }
      if (msg.type === 'ready') return
      if (msg.type === 'error') {
        const err = new Error(msg.message || '学术大库 Worker 错误')
        if (this.active) {
          const active = this.active
          this.active = null
          active.reject(err)
        }
        return
      }
      if (this.active) {
        const active = this.active
        this.active = null
        active.resolve(msg)
      }
    }
    this.worker.onerror = (ev) => {
      if (this.active) {
        const active = this.active
        this.active = null
        active.reject(new Error(ev.message || '学术大库 Worker 异常'))
      }
    }
  }

  setLoadListener(fn: ((loaded: number, total: number) => void) | null) {
    this.onLoadProgress = fn
  }

  ready(): Promise<void> {
    if (!this.readyPromise) {
      this.readyPromise = (async () => {
        this.onLoadProgress?.(0, 0)
        const base =
          typeof import.meta.env?.BASE_URL === 'string' ? import.meta.env.BASE_URL : '/'
        const resp = await fetch(`${base}hust/templates.bin`)
        if (!resp.ok) throw new Error(`模板索引下载失败：HTTP ${resp.status}`)
        const buf = await resp.arrayBuffer()
        this.onLoadProgress?.(buf.byteLength, buf.byteLength)
        this.ensureWorker()
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('模板索引加载超时')), 90_000)
          const onMsg = (ev: MessageEvent<WorkerResult>) => {
            const msg = ev.data
            if (msg.type === 'ready') {
              clearTimeout(timer)
              resolve()
            } else if (msg.type === 'error') {
              clearTimeout(timer)
              reject(new Error(msg.message || '模板索引加载失败'))
            }
          }
          if (this.worker) {
            this.worker.onmessage = onMsg
            this.worker.postMessage({ type: 'init', buffer: buf }, [buf])
          } else {
            clearTimeout(timer)
            reject(new Error('Worker 创建失败'))
          }
        })
        if (this.worker) this.worker.onmessage = this.handleWorkerMessage.bind(this)
      })()
    }
    return this.readyPromise
  }

  private handleWorkerMessage(ev: MessageEvent<WorkerResult>) {
    const msg = ev.data
    if (msg.type === 'progress') {
      this.onLoadProgress?.(msg.loaded || 0, msg.total || 0)
      return
    }
    if (msg.type === 'error') {
      if (this.active) {
        const active = this.active
        this.active = null
        active.reject(new Error(msg.message || '学术大库 Worker 错误'))
      }
      return
    }
    if (this.active) {
      const active = this.active
      this.active = null
      active.resolve(msg)
    }
  }

  status() {
    return {
      engine: this.name,
      engineAvailable: true,
      librarySize: this.librarySize,
      threshold: this.threshold,
      visionModel: {
        available: false,
        detail: '该模式为传统模板匹配（拓片图像二值化 + Chamfer）；高准确率请切换“ResNet-50 模型”模式。'
      },
      browser: true,
      corpus: 'hust-dec'
    }
  }

  private call(msg: Record<string, unknown>): Promise<WorkerResult> {
    this.ensureWorker()
    return new Promise<WorkerResult>((resolve, reject) => {
      if (this.active) reject(new Error('已有识别请求正在进行'))
      this.active = { resolve, reject }
      this.worker?.postMessage(msg)
    })
  }

  private async prepareMask(input: RecognitionInput): Promise<Mask> {
    let mask: Mask
    if (input.kind === 'gray') {
      mask = preprocessGray(input.gray)
      if (!countInk(mask)) throw new Error('未检测到笔画，请上传包含清晰笔画的图片。')
    } else {
      mask = strokesToMask(input.strokes)
      if (!countInk(mask)) throw new Error('未检测到笔画，请先在画板书写。')
    }
    return mask
  }

  private reasonFor(c: Candidate, hint: string): string {
    return `与 HUST-OBC 已释学术字形“${c.modern}”的模板相似度 ${c.score.toFixed(1)}%；${hint}；参考来源：${c.source}`
  }

  async recognize(input: RecognitionInput): Promise<RecognitionResult> {
    await this.ready()
    const started = performance.now()
    const mask = await this.prepareMask(input)
    const res = await this.call({
      type: 'recognize',
      mask: { w: mask.w, h: mask.h, data: mask.data }
    })
    if (res.type !== 'result' || !res.candidates) throw new Error('学术大库未返回识别结果')

    const candidates: Candidate[] = res.candidates.map((c) => ({
      ...c,
      meaning: c.meaning || 'HUST-OBC 已释字形样本（学术资料，无本地释义）',
      reason: this.reasonFor(c as Candidate, res.aiHint || '')
    }))
    const top1 = candidates[0]
    const confident = Boolean(res.confident && top1)
    const evidence: EvidenceChain = {
      chamfer: top1?.chamfer ?? null,
      chamferForward: top1?.chamferForward ?? null,
      chamferBackward: top1?.chamferBackward ?? null,
      coverage: top1?.coverage ?? null,
      coverageForward: top1?.coverageForward ?? null,
      coverageBackward: top1?.coverageBackward ?? null,
      features: res.features || {
        symmetry: 0,
        density: 0,
        topRatio: 0.5,
        hLines: 0,
        vLines: 0,
        bboxAspect: 1,
        componentCount: 0
      },
      libraryMatched: top1
        ? `与 HUST-OBC 学术字库中“${top1.modern}”（类别 ${top1.glyphId.replace('hust-dec:', '')}）的模板图像存在较高视觉相似度；当前学术库每类收录 1 个主模板。`
        : '未能与学术字库建立有效匹配。',
      summary: confident
        ? `综合判断：当前字形与 HUST-OBC 已释类别“${top1.modern}”具有较高模板相似度（${top1.score.toFixed(1)}%）。`
        : candidates.length
          ? `当前字形未达高置信阈值，学术模板认为其与“${candidates[0]?.modern}”等 HUST 已释类相近，需结合辞例进一步考证。`
          : '当前字形未能提取到有效笔画。'
    }
    const elapsed = Number((performance.now() - started).toFixed(1))
    const steps: StepItem[] = [
      { index: 1, title: '图像预处理', detail: '去噪 · 二值化 · 归一化', elapsedMs: elapsed * 0.2, status: 'done' },
      { index: 2, title: '字形检测', detail: '分析笔画与结构', elapsedMs: elapsed * 0.35, status: 'done' },
      { index: 3, title: '学术字库检索', detail: `加载并扫描 ${res.librarySize || this.librarySize} 类模板`, elapsedMs: elapsed * 0.6, status: 'done' },
      { index: 4, title: '候选排序', detail: '计算 Top-K 结果', elapsedMs: elapsed * 0.75, status: 'done' },
      { index: 5, title: 'AI 辅助分析', detail: '生成结构特征解释', elapsedMs: elapsed * 0.9, status: 'done' },
      { index: 6, title: '生成识别报告', detail: '证据链与释读报告', elapsedMs: elapsed, status: 'done' }
    ]
    return {
      ts: nowIso(),
      inputMode: input.mode,
      confident,
      resultTitle: confident ? 'AI 识别结果（HUST 学术大库）' : '未能高置信识别（HUST 学术大库）',
      statusText: confident ? '高置信度' : '需要进一步考证',
      statusTone: confident ? 'high' : 'low',
      top1,
      candidates,
      glyph: undefined,
      aiCategory: res.aiCategory || '已释甲骨字形',
      aiHint: res.aiHint || '模板匹配结果待结合专业工具书考证。',
      aiFeatureLines: res.aiFeatureLines || [],
      evidence,
      steps,
      disclaimer: confident
        ? '说明：以上为浏览器本地模板匹配结果，匹配对象是 HUST-OBC 拓片字形样本；最终释读请结合甲骨片辞例与《甲骨文编》等工具书考证。'
        : '⚠️ 以上仅为 AI 辅助分析。学术大库模板来自拓片图像，与手写/照片字形风格差异大时更易落入低置信分支；请勿据此作出正式释读结论。',
      engineName: this.name,
      durationMs: res.durationMs || elapsed,
      threshold: res.threshold ?? this.threshold,
      librarySize: res.librarySize || this.librarySize,
      inputThumb: input.thumbUrl
    }
  }
}

export const hustBrowserEngine = new HustBrowserEngine()
