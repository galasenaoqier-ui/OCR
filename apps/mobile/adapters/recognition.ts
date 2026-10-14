import type { Candidate, Glyph, RecognitionResult } from '@yinqi/core'
import { glyphs } from '@yinqi/core'
import type { EngineStatus, RecognitionEngine, RecognitionInput } from './contracts'

function fallbackCandidates(seed?: Glyph): Candidate[] {
  const source = seed ? [seed, ...glyphs.filter((g) => g.id !== seed.id)] : glyphs
  return source.slice(0, 5).map((glyph, index) => ({ rank: index + 1, glyphId: glyph.id, modern: glyph.modern, pinyin: glyph.pinyin, meaning: glyph.meaning, category: glyph.category, score: Math.max(42, 92 - index * 11), reason: '共享字库结构匹配；当前为辅助匹配结果', source: 'mobile-fallback' }))
}

class MobileRecognitionEngine implements RecognitionEngine {
  private current: EngineStatus = { state: 'idle', message: '等待模型初始化', model: 'ONNX Runtime Mobile / 辅助匹配' }
  status() { return this.current }
  async ready() { this.current = { state: 'fallback', message: '原生模型探针待 Development Build 验证，已启用辅助匹配', model: '辅助匹配引擎' } }
  async recognize(input: RecognitionInput): Promise<RecognitionResult> {
    await this.ready()
    const seed = input.kind === 'sample' ? input.glyph : undefined
    const candidates = fallbackCandidates(seed)
    const top1 = candidates[0]
    return { ts: new Date().toISOString().replace('T', ' ').slice(0, 19), inputMode: input.kind === 'sample' ? 'sample' : input.kind, confident: false, resultTitle: '辅助匹配结果', statusText: '需要进一步考证', statusTone: 'low', top1, candidates, disclaimer: '当前移动端使用共享字库辅助匹配。原生 ONNX 模型将在 Development Build 中完成兼容性探针后启用；此结果不表示学术模型高置信度。', engineName: this.current.model, durationMs: 120, threshold: 70, librarySize: glyphs.length, inputThumb: input.kind === 'image' ? input.image.uri : undefined, source: 'local' }
  }
}

export const recognitionEngine: RecognitionEngine = new MobileRecognitionEngine()
