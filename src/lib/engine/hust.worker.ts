/// <reference lib="webworker" />
// HUST-OBC 学术大库匹配 Worker：
// 读取 public/hust/templates.bin（128×128 距离变换索引），
// 在主线程外完成 Chamfer + 双向覆盖率 Top-K。
import { visualFeatures, featureLines, guessCategory } from './features'
import type { Mask, GrayImage } from './binary'
import type { VisualFeatures } from '../types'

interface TemplateRef {
  id: string
  label: string
  dist: Uint8Array
}

const SIZE = 128
const TOP_N = 5
const THRESHOLD = 58
const HUST_SOURCE = 'HUST-OBC 学术模板 · CC BY-NC 4.0'

let refs: TemplateRef[] = []
let readyCount = 0

async function loadIndex(preloaded?: ArrayBuffer): Promise<void> {
  if (!preloaded) throw new Error('缺少模板索引数据（应由主线程先下载再转移）')
  const buf = new Uint8Array(preloaded)
  if (!buf.length) throw new Error('模板索引为空')
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const magic = String.fromCharCode(buf[0], buf[1], buf[2], buf[3])
  if (magic !== 'YQOB') throw new Error('模板索引格式不正确')
  const version = view.getUint16(4, true)
  if (version !== 1) throw new Error(`不支持的模板索引版本：${version}`)
  const size = buf[6]
  if (size !== SIZE) throw new Error(`模板索引尺寸异常：${size}`)
  const count = view.getUint32(7, true)
  let offset = 11
  const decoder = new TextDecoder()
  refs = []
  for (let i = 0; i < count; i++) {
    const idLen = view.getUint16(offset, true)
    offset += 2
    const id = decoder.decode(buf.subarray(offset, offset + idLen))
    offset += idLen
    const labelLen = view.getUint16(offset, true)
    offset += 2
    const label = decoder.decode(buf.subarray(offset, offset + labelLen))
    offset += labelLen
    const dist = buf.subarray(offset, offset + size * size)
    offset += size * size
    refs.push({ id, label, dist })
  }
  readyCount = refs.length
  postMessage({ type: 'ready', count: readyCount, size, bytes: buf.byteLength })
}

function distanceTransform(mask: Uint8Array, size: number): Float64Array {
  const dist = new Float64Array(size * size).fill(1e9)
  const queue: number[] = []
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) {
      dist[i] = 0
      queue.push(i)
    }
  }
  let head = 0
  while (head < queue.length) {
    const p = queue[head++]
    const x = p % size
    const nd = dist[p] + 1
    const ns: number[] = []
    if (p - size >= 0) ns.push(p - size)
    if (p + size < size * size) ns.push(p + size)
    if (x > 0) ns.push(p - 1)
    if (x < size - 1) ns.push(p + 1)
    for (const n of ns) {
      if (dist[n] > nd) {
        dist[n] = nd
        queue.push(n)
      }
    }
  }
  return dist
}

function pairScore(query: Uint8Array, qDist: Float64Array, ref: TemplateRef) {
  const { dist } = ref
  let qInk = 0
  let rInk = 0
  let qNear = 0
  let rNear = 0
  let qDSum = 0
  let rDSum = 0
  for (let p = 0; p < query.length; p++) {
    if (query[p]) {
      qInk++
      const d = dist[p]
      if (d <= 2) qNear++
      qDSum += d
    }
    if (dist[p] === 0) {
      rInk++
      const qd = qDist[p]
      if (qd <= 2) rNear++
      rDSum += qd
    }
  }
  if (!qInk || !rInk) {
    return { score: 0, chamfer: null, chamferForward: null, chamferBackward: null, coverage: 0, coverageForward: 0, coverageBackward: 0 }
  }
  const covForward = (qNear / qInk) * 100
  const covBackward = (rNear / rInk) * 100
  const cov = (covForward + covBackward) / 2
  const dForward = qDSum / qInk
  const dBack = rDSum / rInk
  const cham = (dForward + dBack) / 2
  const distScore = Math.max(0, 100 * (1 - cham / 10))
  return {
    score: Number((0.5 * distScore + 0.5 * cov).toFixed(1)),
    chamfer: Number(cham.toFixed(3)),
    chamferForward: Number(dForward.toFixed(3)),
    chamferBackward: Number(dBack.toFixed(3)),
    coverage: Number(cov.toFixed(1)),
    coverageForward: Number(covForward.toFixed(1)),
    coverageBackward: Number(covBackward.toFixed(1))
  }
}

function match(query: Uint8Array) {
  const qDist = distanceTransform(query, SIZE)
  const scored = refs
    .map((ref) => ({ ref, det: pairScore(query, qDist, ref) }))
    .sort((a, b) => b.det.score - a.det.score)
  const candidates = scored.slice(0, TOP_N).map((item, rank) => ({
    rank: rank + 1,
    glyphId: `hust-dec:${item.ref.id}`,
    categoryId: item.ref.id,
    modern: item.ref.label || item.ref.id,
    pinyin: '',
    meaning: 'HUST-OBC 已释字形样本（学术资料，无本地释义）',
    category: '已释 · HUST-OBC',
    score: item.det.score,
    chamfer: item.det.chamfer,
    chamferForward: item.det.chamferForward,
    chamferBackward: item.det.chamferBackward,
    coverage: item.det.coverage,
    coverageForward: item.det.coverageForward,
    coverageBackward: item.det.coverageBackward,
    reason: '',
    source: HUST_SOURCE,
    template: 'dist'
  }))
  const confident = Boolean(candidates.length) && candidates[0].score >= THRESHOLD
  return { candidates, confident }
}

self.onmessage = async (ev: MessageEvent<{ type: string; mask?: Mask; gray?: GrayImage; buffer?: ArrayBuffer }>) => {
  const msg = ev.data
  try {
    if (msg.type === 'init') {
      if (!readyCount) await loadIndex(msg.buffer)
      return
    }
    if (msg.type === 'recognize' && msg.mask) {
      const started = performance.now()
      const mask = msg.mask
      const feats: VisualFeatures = visualFeatures({ w: mask.w, h: mask.h, data: new Uint8Array(mask.data) })
      const { candidates, confident } = match(mask.data)
      const [aiCategory, aiHint] = guessCategory(feats)
      postMessage({
        type: 'result',
        durationMs: Number((performance.now() - started).toFixed(1)),
        confident,
        candidates,
        features: feats,
        aiCategory,
        aiHint,
        aiFeatureLines: featureLines(feats),
        librarySize: refs.length,
        threshold: THRESHOLD
      })
      return
    }
    postMessage({ type: 'error', message: `未知请求：${msg.type}` })
  } catch (e) {
    postMessage({ type: 'error', message: e instanceof Error ? e.message : String(e) })
  }
}
