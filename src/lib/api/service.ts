import { byId, GLYPHS } from '../kb'
import type { Candidate, InputMode, RecognitionResult } from '../types'
import { countInk, maskToGray, preprocessGray, strokesToMask, type GrayImage } from '../engine/binary'
import { featureLines, guessCategory, visualFeatures } from '../engine/features'

export interface RecognitionInput {
  kind: 'strokes' | 'gray'
  mode: InputMode
  strokes?: number[][][]
  gray?: GrayImage
  thumbUrl?: string
}

export interface RecognitionService {
  name: string
  ready(): Promise<void>
  recognize(input: RecognitionInput): Promise<RecognitionResult>
  status(): { engine: string; engineAvailable: boolean; librarySize: number; threshold: number; visionModel: { available: boolean; detail: string }; browser: boolean }
}

export type ExternalApiErrorCode = 'missing-token' | 'unauthorized' | 'http' | 'timeout' | 'network' | 'empty' | 'invalid-response'

export class ExternalApiError extends Error {
  constructor(readonly code: ExternalApiErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ExternalApiError'
  }
}

interface BaiduWord { words?: string; probability?: { average?: number } }
export interface BaiduOcrResponse { error_code?: number; error_msg?: string; words_result?: BaiduWord[] }

const DIRECT_ENDPOINT = 'https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic'
const ENGINE_NAME = '百度智能云通用文字识别 OCR'

function inputMask(input: RecognitionInput) {
  if (input.kind === 'gray' && input.gray) return preprocessGray(input.gray)
  if (input.kind === 'strokes' && input.strokes) return strokesToMask(input.strokes)
  throw new ExternalApiError('invalid-response', '外部识别输入不完整')
}

function grayToBase64(gray: GrayImage): string {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, gray.w)
  canvas.height = Math.max(1, gray.h)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ExternalApiError('invalid-response', '无法生成外部识别图片')
  const image = ctx.createImageData(canvas.width, canvas.height)
  for (let i = 0; i < gray.data.length; i++) {
    const v = gray.data[i]
    image.data[i * 4] = v
    image.data[i * 4 + 1] = v
    image.data[i * 4 + 2] = v
    image.data[i * 4 + 3] = 255
  }
  ctx.putImageData(image, 0, 0)
  return canvas.toDataURL('image/png').split(',')[1]
}

export function baiduCandidatesFromResponse(payload: BaiduOcrResponse): { candidates: Candidate[]; rawText: string } {
  if (payload.error_code) {
    const unauthorized = payload.error_code === 110 || payload.error_code === 111
    throw new ExternalApiError(unauthorized ? 'unauthorized' : 'http', unauthorized ? 'Access Token 无效或已过期' : `百度 OCR 错误：${payload.error_msg || payload.error_code}`)
  }
  if (!Array.isArray(payload.words_result)) throw new ExternalApiError('invalid-response', '百度 OCR 返回格式无法解析')
  const rawText = payload.words_result.map((item) => item.words?.trim() || '').filter(Boolean).join('')
  const chars = [...new Set(Array.from(rawText.replace(/\s/g, '')))].slice(0, 5)
  if (!chars.length) throw new ExternalApiError('empty', '百度 OCR 未返回有效文字')
  const candidates = chars.map((modern, index): Candidate => {
    const glyph = GLYPHS.find((item) => item.modern === modern)
    const word = payload.words_result?.find((item) => item.words?.includes(modern))
    const probability = word?.probability?.average
    const score = typeof probability === 'number' ? Math.min(85, Math.max(1, probability * 100)) : 55
    return {
      rank: index + 1,
      glyphId: glyph?.id || `external:${encodeURIComponent(modern)}`,
      modern,
      pinyin: glyph?.pinyin || '',
      meaning: glyph?.meaning || '百度 OCR 文本候选（尚未映射到本地甲骨文字库）',
      category: glyph?.category || '外部 OCR 候选',
      score: Number(score.toFixed(1)),
      chamfer: null, chamferForward: null, chamferBackward: null,
      coverage: null, coverageForward: null, coverageBackward: null,
      reason: `百度 OCR 返回字符“${modern}”；普通文字 OCR 结果仅作辅助参考。`,
      source: ENGINE_NAME
    }
  })
  return { candidates, rawText }
}

export class HttpAdapter implements RecognitionService {
  readonly name = ENGINE_NAME

  constructor(
    private readonly accessToken: string,
    private readonly endpoint = import.meta.env.VITE_EXTERNAL_RECOGNITION_ENDPOINT || DIRECT_ENDPOINT,
    private readonly timeoutMs = 15_000
  ) {}

  async ready(): Promise<void> {
    if (!this.accessToken.trim()) throw new ExternalApiError('missing-token', '未配置百度 Access Token')
  }

  async recognize(input: RecognitionInput): Promise<RecognitionResult> {
    await this.ready()
    const started = performance.now()
    const mask = inputMask(input)
    if (countInk(mask) < 8) throw new ExternalApiError('empty', '未检测到清晰字形')
    const form = new URLSearchParams({ image: grayToBase64(maskToGray(mask)) })
    const url = new URL(this.endpoint, window.location.origin)
    url.searchParams.set('access_token', this.accessToken.trim())
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)
    let response: Response
    try {
      response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form, signal: controller.signal })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw new ExternalApiError('timeout', '外部服务响应超时', { cause: error })
      throw new ExternalApiError('network', '百度 OCR 网络请求失败或被浏览器 CORS 阻止', { cause: error })
    } finally {
      clearTimeout(timeoutId)
    }
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new ExternalApiError('unauthorized', 'Access Token 无效或无权限')
      throw new ExternalApiError('http', `百度 OCR 请求失败（HTTP ${response.status}）`)
    }
    let payload: BaiduOcrResponse
    try { payload = await response.json() as BaiduOcrResponse }
    catch (error) { throw new ExternalApiError('invalid-response', '百度 OCR 返回格式无法解析', { cause: error }) }
    const { candidates, rawText } = baiduCandidatesFromResponse(payload)
    const features = visualFeatures(mask)
    const [aiCategory, aiHint] = guessCategory(features)
    const elapsed = Number((performance.now() - started).toFixed(1))
    return {
      ts: new Date().toISOString().replace('T', ' ').slice(0, 19), inputMode: input.mode,
      confident: false, resultTitle: '外部 OCR 辅助结果', statusText: '需要进一步考证', statusTone: 'low',
      top1: candidates[0], candidates, glyph: candidates[0] ? byId(candidates[0].glyphId) : undefined,
      aiCategory, aiHint, aiFeatureLines: featureLines(features),
      evidence: { chamfer: null, chamferForward: null, chamferBackward: null, coverage: null, coverageForward: null, coverageBackward: null, features, libraryMatched: `百度 OCR 返回文本“${rawText}”，等待与本地结构匹配结果交叉验证。`, summary: '外部普通文字 OCR 结果不能单独作为甲骨文确定释读。' },
      steps: [], disclaimer: '百度通用文字 OCR 结果仅作为外部辅助候选，不代表古文字学意义上的正式释读。',
      engineName: this.name, durationMs: elapsed, threshold: 70, librarySize: 0, inputThumb: input.thumbUrl,
      source: 'external-api', external: { provider: '百度智能云 OCR', requestMs: elapsed, rawText }
    }
  }

  status() {
    const configured = Boolean(this.accessToken.trim())
    return { engine: this.name, engineAvailable: configured, librarySize: 0, threshold: 70, visionModel: { available: configured, detail: configured ? '百度通用文字识别 OCR 已配置' : '未配置百度 Access Token' }, browser: true }
  }
}

export function mergeExternalResult(external: RecognitionResult, local: RecognitionResult): RecognitionResult {
  const merged = new Map<string, Candidate>()
  for (const candidate of local.candidates) merged.set(candidate.modern, { ...candidate, score: candidate.score * 0.55 })
  for (const candidate of external.candidates) {
    const previous = merged.get(candidate.modern)
    if (previous) previous.score += candidate.score * 0.45
    else merged.set(candidate.modern, { ...candidate, score: candidate.score * 0.45 })
  }
  const candidates = [...merged.values()].sort((a, b) => b.score - a.score).slice(0, 5).map((candidate, index) => ({ ...candidate, rank: index + 1, score: Number(candidate.score.toFixed(1)) }))
  const top1 = candidates[0]
  const agree = Boolean(external.top1 && local.top1 && external.top1.modern === local.top1.modern)
  const confident = Boolean(agree && top1 && top1.score >= 70)
  return {
    ...local, top1, candidates, confident, statusText: confident ? '高置信度' : '需要进一步考证', statusTone: confident ? 'high' : 'low',
    resultTitle: agree ? '识别结果（外部 OCR 与本地结构一致）' : '识别结果（外部 OCR 与本地结构存在分歧）',
    engineName: '百度 OCR + 本地结构匹配', source: 'hybrid', external: external.external,
    evidence: { ...local.evidence, libraryMatched: top1 ? `外部 OCR 与本地结构融合后将“${top1.modern}”列为最高候选（${top1.score.toFixed(1)}%）。` : local.evidence.libraryMatched },
    disclaimer: agree ? '百度 OCR 与本地结构匹配结果一致；融合结果仍仅供研究与学习参考。' : '百度 OCR 与本地结构匹配存在分歧；当前 Top-K 仅供参考，不代表正式释读。'
  }
}
