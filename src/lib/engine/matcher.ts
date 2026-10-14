import { GLYPHS } from '../kb'
import type { Candidate, Glyph } from '../types'
import { strokesToMask, type Mask } from './binary'

export interface RefGlyph {
  glyph: Glyph
  mask: Mask
  dist: Float64Array
}

export function distanceTransform(mask: Mask): Float64Array {
  const { w, h, data } = mask
  const size = w * h
  const dist = new Float64Array(size).fill(1e9)
  const queue: number[] = []
  for (let i = 0; i < size; i++) {
    if (data[i]) {
      dist[i] = 0
      queue.push(i)
    }
  }
  let head = 0
  while (head < queue.length) {
    const p = queue[head++]
    const x = p % w
    const nd = dist[p] + 1
    const candidates = [
      p - w >= 0 ? p - w : -1,
      p + w < size ? p + w : -1,
      x > 0 ? p - 1 : -1,
      x < w - 1 ? p + 1 : -1
    ]
    for (const n of candidates) {
      if (n >= 0 && dist[n] > nd) {
        dist[n] = nd
        queue.push(n)
      }
    }
  }
  return dist
}

export function buildRefs(glyphs: Glyph[] = GLYPHS, chunk?: () => Promise<void>): RefGlyph[] {
  const refs: RefGlyph[] = []
  for (const glyph of glyphs) {
    const mask = strokesToMask(glyph.strokes)
    refs.push({ glyph, mask, dist: distanceTransform(mask) })
  }
  return refs
}

export function pairDetails(query: Mask, ref: Mask, refDist: Float64Array, queryDist?: Float64Array) {
  const qd = queryDist || distanceTransform(query)
  const { w } = query
  let qInk = 0
  let rInk = 0
  let qNearSum = 0
  let rNearSum = 0
  let qDistSum = 0
  let rDistSum = 0
  for (let y = 0; y < query.h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x
      if (query.data[p]) {
        qInk++
        qNearSum += refDist[p] <= 2 ? 1 : 0
        qDistSum += refDist[p]
      }
      if (ref.data[p]) {
        rInk++
        rNearSum += qd[p] <= 2 ? 1 : 0
        rDistSum += qd[p]
      }
    }
  }
  if (!qInk || !rInk) {
    return {
      score: 0,
      chamferForward: null,
      chamferBackward: null,
      chamfer: null,
      coverageForward: 0,
      coverageBackward: 0,
      coverage: 0
    }
  }
  const covForward = (qNearSum / qInk) * 100
  const covBackward = (rNearSum / rInk) * 100
  const cov = (covForward + covBackward) / 2
  const dForward = qDistSum / qInk
  const dBack = rDistSum / rInk
  const cham = (dForward + dBack) / 2
  const distScore = Math.max(0, 100 * (1 - cham / 10))
  const score = Number((0.5 * distScore + 0.5 * cov).toFixed(1))
  return {
    score,
    chamferForward: Number(dForward.toFixed(3)),
    chamferBackward: Number(dBack.toFixed(3)),
    chamfer: Number(cham.toFixed(3)),
    coverageForward: Number(covForward.toFixed(1)),
    coverageBackward: Number(covBackward.toFixed(1)),
    coverage: Number(cov.toFixed(1))
  }
}

export interface RankedCandidate extends Candidate {
  chamferForward: number | null
  chamferBackward: number | null
  coverageForward: number | null
  coverageBackward: number | null
}

export function recognizeMask(
  query: Mask,
  refs: RefGlyph[],
  topN = 5,
  threshold = 58
): { candidates: RankedCandidate[]; confident: boolean } {
  const qd = distanceTransform(query)
  const scored: { glyph: Glyph; det: ReturnType<typeof pairDetails> }[] = []
  for (const ref of refs) {
    const det = pairDetails(query, ref.mask, ref.dist, qd)
    if (det.score > 0) scored.push({ glyph: ref.glyph, det })
  }
  scored.sort((a, b) => b.det.score - a.det.score)
  const candidates = scored.slice(0, topN).map((item, idx) => {
    const g = item.glyph
    return {
      rank: idx + 1,
      glyphId: g.id,
      modern: g.modern,
      pinyin: g.pinyin,
      meaning: g.meaning,
      category: g.category,
      score: item.det.score,
      chamfer: item.det.chamfer,
      chamferForward: item.det.chamferForward,
      chamferBackward: item.det.chamferBackward,
      coverage: item.det.coverage,
      coverageForward: item.det.coverageForward,
      coverageBackward: item.det.coverageBackward,
      reason: '',
      source: ENGINE_SOURCE
    } as RankedCandidate
  })
  const confident = Boolean(candidates.length) && candidates[0].score >= threshold
  return { candidates, confident }
}

export const ENGINE_SOURCE = '传统字形匹配引擎（Chamfer + 双向覆盖率，浏览器本地运行）'
