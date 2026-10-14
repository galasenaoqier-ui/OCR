import { describe, expect, it, beforeAll } from 'vitest'
import { GLYPHS } from '../kb'
import { browserEngine } from './engine'

describe('浏览器本地识别引擎', () => {
  beforeAll(async () => {
    await browserEngine.ready()
  }, 120000)

  it('69 个字形逐一自识：Top-1 命中且高置信', async () => {
    for (const glyph of GLYPHS) {
      const res = await browserEngine.sampleRecognition(glyph.id)
      expect(res.top1?.glyphId, `${glyph.modern} 应命中自己`).toBe(glyph.id)
      expect(res.confident, `${glyph.modern} 应高置信`).toBe(true)
      expect(res.evidence.coverage).toBeGreaterThanOrEqual(60)
      expect(res.steps.length).toBeGreaterThanOrEqual(6)
    }
  }, 120000)

  it('代表样例马/日/牛的相似度保持高位', async () => {
    const ma = await browserEngine.sampleRecognition('ma')
    const ri = await browserEngine.sampleRecognition('ri')
    const niu = await browserEngine.sampleRecognition('niu')
    expect(ma.top1!.score).toBeGreaterThanOrEqual(95)
    expect(ri.top1!.score).toBeGreaterThanOrEqual(95)
    expect(niu.top1!.score).toBeGreaterThanOrEqual(95)
  }, 30000)

  it('空白输入不产生确定结论', async () => {
    await expect(
      browserEngine.recognize({ kind: 'strokes', mode: 'draw', strokes: [] })
    ).rejects.toThrow('未检测到笔画')
  })
})
