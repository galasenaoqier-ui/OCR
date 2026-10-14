import { glyphById, glyphs } from '@yinqi/core'
import { recognitionEngine } from './recognition'

describe('mobile recognition adapter', () => {
  it('returns an explicit fallback result before native ONNX is verified', async () => {
    expect(glyphs).toHaveLength(69)
    const glyph = glyphById('ri')
    expect(glyph).toBeDefined()
    const result = await recognitionEngine.recognize({ kind: 'sample', glyph: glyph! })
    expect(result.source).toBe('local')
    expect(result.statusTone).toBe('low')
    expect(result.disclaimer).toContain('辅助匹配')
    expect(recognitionEngine.status().state).toBe('fallback')
  })
})
