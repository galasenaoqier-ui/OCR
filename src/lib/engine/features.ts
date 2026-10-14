import type { Mask } from './binary'
import type { VisualFeatures } from '../types'

function countComponents(mask: Mask): number {
  const { w, h, data } = mask
  const seen = new Uint8Array(w * h)
  let n = 0
  const queue: number[] = []
  for (let start = 0; start < w * h; start++) {
    if (!data[start] || seen[start]) continue
    n++
    seen[start] = 1
    queue.length = 0
    queue.push(start)
    while (queue.length) {
      const p = queue.pop()!
      const x = p % w
      const neighbors = [
        p - w >= 0 ? p - w : -1,
        p + w < w * h ? p + w : -1,
        x > 0 ? p - 1 : -1,
        x < w - 1 ? p + 1 : -1
      ]
      for (const nb of neighbors) {
        if (nb >= 0 && data[nb] && !seen[nb]) {
          seen[nb] = 1
          queue.push(nb)
        }
      }
    }
  }
  return n
}

export function visualFeatures(mask: Mask): VisualFeatures {
  const { w, h, data } = mask
  let left = 0
  let right = 0
  let top = 0
  let bottom = 0
  let minX = w
  let maxX = -1
  let minY = h
  let maxY = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!data[y * w + x]) continue
      if (x < w / 2) left++
      else right++
      if (y < h / 2) top++
      else bottom++
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (maxX < 0) {
    return { symmetry: 0, density: 0, topRatio: 0.5, hLines: 0, vLines: 0, bboxAspect: 1, componentCount: 0 }
  }
  const rowsum = new Array(h).fill(0)
  const colsum = new Array(w).fill(0)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[y * w + x]) {
        rowsum[y]++
        colsum[x]++
      }
    }
  }
  let hLines = 0
  let vLines = 0
  for (const v of rowsum) if (v > w * 0.5) hLines++
  for (const v of colsum) if (v > h * 0.5) vLines++
  const symmetry = Number((1 - Math.abs(left - right) / Math.max(left + right, 1)).toFixed(3))
  const density = Number(((left + right) / (w * h)).toFixed(4))
  const topRatio = Number((top / Math.max(top + bottom, 1)).toFixed(3))
  const bw = maxX - minX + 1
  const bh = maxY - minY + 1
  return {
    symmetry,
    density,
    topRatio,
    hLines,
    vLines,
    bboxAspect: Number((bw / Math.max(bh, 1)).toFixed(3)),
    componentCount: countComponents(mask)
  }
}

export function featureLines(f: VisualFeatures): string[] {
  const lines: string[] = []
  if (f.symmetry >= 0.8) lines.push('左右对称性较高')
  else if (f.symmetry <= 0.55) lines.push('左右不对称，走向性明显')
  else lines.push('对称性一般')
  if (f.topRatio > 0.58) lines.push('上部结构较突出')
  else if (f.topRatio < 0.42) lines.push('重心偏下')
  lines.push(
    f.density >= 0.25 && f.density <= 0.6
      ? '笔画密度中等'
      : f.density < 0.25
        ? '笔画疏朗'
        : '笔画较密'
  )
  if (f.hLines >= 1 && f.vLines >= 1) lines.push('存在纵横交叉框架结构')
  else if (f.vLines >= 1) lines.push('存在明显纵向笔画')
  if (f.componentCount >= 2) lines.push(`检测到 ${f.componentCount} 个主要部件/连通区域`)
  return lines
}

export function guessCategory(f: VisualFeatures): [string, string] {
  const sym = f.symmetry
  const top = f.topRatio
  const d = f.density
  if (sym > 0.82 && top > 0.55 && d < 0.5) {
    return ['动物（兽面/头部）', '可能是动物类象形字，牛、羊、鹿、犬等兽类头部或全身象形']
  }
  if (sym > 0.8 && d < 0.55) {
    return ['自然/器物（对称象形）', '可能与日月山川、器物等对称象形字有关']
  }
  if (f.vLines >= 2 && f.hLines >= 2) {
    return ['器物/建筑（框架结构）', '框架结构多为车、门、田、宫等器物或建筑字']
  }
  if (top > 0.6) {
    return ['动物/植物（上部突出）', '上部突出多为植物或动物头部结构']
  }
  return ['人形/流动形', '多为人体或水流象形字（人、大、女、水等）']
}
