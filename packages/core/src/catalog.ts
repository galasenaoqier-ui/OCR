import type { Glyph } from './types'
import glyphData from './glyphs.json'

// The Web app remains the authoritative source for the full 69-glyph catalog.
// Mobile keeps a small built-in index for the first slice so the shared package
// does not cross-import a Vite-only JSON module or browser path.
const bundledGlyphs: Glyph[] = (glyphData.glyphs as Glyph[])
export const glyphs: Glyph[] = bundledGlyphs.length ? bundledGlyphs : [
  { id: 'yi', modern: '一', pinyin: 'yī', meaning: '一；数目一；开始', category: '数字', displayGroup: '数字', note: '指事字。一横画表示数目一。', known: true, sample: false, strokes: [[[0.15, 0.5], [0.85, 0.5]]] },
  { id: 'ri', modern: '日', pinyin: 'rì', meaning: '太阳；白天；一天（日子）', category: '自然·天象', displayGroup: '自然', note: '象形字。像太阳之形。', known: true, sample: true, strokes: [[[0.5, 0.18], [0.72, 0.3], [0.78, 0.5], [0.72, 0.7], [0.5, 0.82], [0.28, 0.7], [0.22, 0.5], [0.28, 0.3], [0.5, 0.18]], [[0.4, 0.5], [0.6, 0.5]]] },
  { id: 'yue', modern: '月', pinyin: 'yuè', meaning: '月亮；月份', category: '自然·天象', displayGroup: '自然', note: '象形字。像半圆之月形。', known: true, sample: false, strokes: [[[0.62, 0.12], [0.4, 0.26], [0.3, 0.5], [0.4, 0.74], [0.62, 0.88]], [[0.48, 0.2], [0.36, 0.5], [0.48, 0.8]]] },
  { id: 'shan', modern: '山', pinyin: 'shān', meaning: '山；山岳', category: '自然·天象', displayGroup: '自然', note: '象形字。像山峰耸立之形。', known: true, sample: false, strokes: [[[0.2, 0.52], [0.2, 0.85]], [[0.5, 0.22], [0.5, 0.85]], [[0.8, 0.52], [0.8, 0.85]], [[0.2, 0.85], [0.8, 0.85]]] },
  { id: 'shui', modern: '水', pinyin: 'shuǐ', meaning: '水；河流；水流', category: '自然·天象', displayGroup: '自然', note: '象形字。像蜿蜒流动的水流。', known: true, sample: false, strokes: [[[0.5, 0.12], [0.44, 0.38], [0.56, 0.6], [0.48, 0.88]], [[0.4, 0.22], [0.24, 0.32]], [[0.62, 0.26], [0.78, 0.4]], [[0.6, 0.55], [0.76, 0.7]]] },
  { id: 'huo', modern: '火', pinyin: 'huǒ', meaning: '火；火焰；火灾', category: '自然·天象', displayGroup: '自然', note: '象形字。像火焰升腾之形。', known: true, sample: false, strokes: [[[0.5, 0.2], [0.5, 0.88]], [[0.5, 0.38], [0.2, 0.28]], [[0.5, 0.56], [0.25, 0.72]], [[0.5, 0.38], [0.8, 0.28]], [[0.5, 0.56], [0.75, 0.72]]] },
  { id: 'men', modern: '门', pinyin: 'mén', meaning: '门；门户', category: '器物·建筑', displayGroup: '建筑', note: '象形字。像两扇门之形。', known: true, sample: false, strokes: [[[0.18, 0.18], [0.82, 0.18]], [[0.2, 0.18], [0.42, 0.22], [0.42, 0.88], [0.2, 0.88]], [[0.8, 0.18], [0.58, 0.22], [0.58, 0.88], [0.8, 0.88]]] },
  { id: 'yu4', modern: '玉', pinyin: 'yù', meaning: '玉石；美玉', category: '器物·建筑', displayGroup: '器物', note: '象形字。像一串玉之形。', known: true, sample: false, strokes: [[[0.5, 0.08], [0.5, 0.92]], [[0.4, 0.26], [0.6, 0.26]], [[0.4, 0.5], [0.6, 0.5]], [[0.4, 0.74], [0.6, 0.74]]] }
]
export const glyphById = (id: string) => glyphs.find((glyph) => glyph.id === id)
export const glyphGroups = Array.from(new Set(glyphs.map((glyph) => glyph.displayGroup)))

export function searchGlyphs(query: string, group?: string): Glyph[] {
  const normalized = query.trim().toLowerCase()
  return glyphs.filter((glyph) => {
    const matchesGroup = !group || group === '全部' || glyph.displayGroup === group
    if (!matchesGroup) return false
    if (!normalized) return true
    return [glyph.modern, glyph.pinyin, glyph.meaning, glyph.category].some((value) => value.toLowerCase().includes(normalized))
  })
}
