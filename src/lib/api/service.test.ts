import { describe, expect, it } from 'vitest'
import { ExternalApiError, baiduCandidatesFromResponse, mergeExternalResult } from './service'
import type { RecognitionResult } from '../types'

describe('Baidu OCR adapter helpers', () => {
  it('maps text and keeps unmapped OCR output low confidence', () => {
    const result = baiduCandidatesFromResponse({ words_result: [{ words: '马', probability: { average: 0.99 } }, { words: '未知' }] })
    expect(result.rawText).toBe('马未知')
    expect(result.candidates[0].modern).toBe('马')
    expect(result.candidates[0].score).toBeLessThanOrEqual(85)
    expect(result.candidates[1].glyphId.startsWith('external:')).toBe(true)
  })

  it('classifies token, empty and malformed responses', () => {
    expect(() => baiduCandidatesFromResponse({ error_code: 110, error_msg: 'Access token invalid' })).toThrowError(ExternalApiError)
    expect(() => baiduCandidatesFromResponse({ words_result: [] })).toThrow('未返回有效文字')
    expect(() => baiduCandidatesFromResponse({})).toThrow('返回格式无法解析')
  })

  it('merges external and local candidates without claiming certainty on disagreement', () => {
    const base = { ts: '', inputMode: 'draw' as const, confident: true, resultTitle: '', statusText: '高置信度', statusTone: 'high' as const, candidates: [{ rank: 1, glyphId: 'ma', modern: '马', pinyin: '', meaning: '', category: '', score: 90, chamfer: null, chamferForward: null, chamferBackward: null, coverage: null, coverageForward: null, coverageBackward: null, reason: '', source: 'local' }], aiCategory: '', aiHint: '', aiFeatureLines: [], evidence: { chamfer: null, chamferForward: null, chamferBackward: null, coverage: null, coverageForward: null, coverageBackward: null, features: { symmetry: 0, density: 0, topRatio: .5, hLines: 0, vLines: 0, bboxAspect: 1, componentCount: 1 }, libraryMatched: '', summary: '' }, steps: [], disclaimer: '', engineName: '', durationMs: 0, threshold: 58, librarySize: 1 } satisfies RecognitionResult
    const external = { ...base, top1: { ...base.candidates[0], modern: '鱼', glyphId: 'yu', source: '百度' }, candidates: [{ ...base.candidates[0], modern: '鱼', glyphId: 'yu', source: '百度', score: 80 }], external: { provider: '百度', requestMs: 1 }, source: 'external-api' as const }
    const merged = mergeExternalResult(external, base)
    expect(merged.source).toBe('hybrid')
    expect(merged.confident).toBe(false)
    expect(merged.resultTitle).toContain('分歧')
  })
})
