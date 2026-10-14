import { describe, expect, it } from 'vitest'
import { GLYPHS } from './kb'
import {
  evoHasLabel,
  evoStats,
  evolutionFor,
  evolutionForHustLabel
} from './evolution'

describe('EVOBC 字形演变数据层', () => {
  it('本地 69 字均能生成六阶段时间轴，且标签可查', () => {
    const stats = evoStats()
    expect(stats.entryCount).toBeGreaterThan(1000)
    for (const glyph of GLYPHS) {
      const items = evolutionFor(glyph)
      expect(items).toHaveLength(6)
      expect(items.map((i) => i.stage.key)).toEqual([
        'oracle',
        'jinwen',
        'xiaozhuan',
        'lishu',
        'kaishu',
        'today'
      ])
      expect(evoHasLabel(glyph.modern.normalize('NFC'))).toBe(true)
    }
  })

  it('马 通过简->正映射获得金文/篆书/隶书图版，米 缺金文但保留篆书', () => {
    const ma = evolutionFor(GLYPHS.find((g) => g.id === 'ma'))
    const hist = Object.fromEntries(
      ['jinwen', 'xiaozhuan', 'lishu'].map((k) => [
        k,
        ma.find((i) => i.stage.key === k)?.stage
      ])
    )
    expect(hist.jinwen?.status).toBe('image')
    expect(hist.xiaozhuan?.status).toBe('image')
    expect(hist.lishu?.status).toBe('image')
    expect(hist.jinwen?.sourceKey).toBe('EVOBC')
    expect(hist.jinwen?.images?.[0]?.src).toMatch(/^\/evo\/jinwen\//)

    const mi = evolutionFor(GLYPHS.find((g) => g.id === 'mi3'))
    const miHist = Object.fromEntries(
      ['jinwen', 'xiaozhuan', 'lishu'].map((k) => [
        k,
        mi.find((i) => i.stage.key === k)?.stage
      ])
    )
    expect(miHist.jinwen?.status).toBe('missing')
    expect(miHist.xiaozhuan?.status).toBe('image')
  })

  it('HUST 0773/日 通过释读标签联动得到完整时间轴', () => {
    const items = evolutionForHustLabel('日', {
      oracleFile: '/hust/deciphered/0773/s0.png',
      oracleSourceLabel: '日'
    })
    expect(items[0].stage.status).toBe('image')
    expect(items[0].stage.sourceKey).toBe('HUST-OBC')
    expect(items[1].stage.status).toBe('image')
    expect(items[2].stage.status).toBe('image')
    expect(items[5].stage.status).toBe('font')
  })
})
