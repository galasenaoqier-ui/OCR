// 纯 TypeScript 图像/掩码工具：用于 69 字参考字形与上传、手写输入的预处理，
// 口径对齐桌面端 recognizer.py（二值化 → 去噪 → 包围盒保比例归一化 → 膨胀）。

export interface Mask {
  w: number
  h: number
  data: Uint8Array
}

export interface GrayImage {
  w: number
  h: number
  data: Uint8ClampedArray
}

export function createMask(w: number, h: number): Mask {
  return { w, h, data: new Uint8Array(w * h) }
}

function fillCircle(mask: Mask, cx: number, cy: number, r: number) {
  const { w, h, data } = mask
  const x0 = Math.max(0, Math.floor(cx - r))
  const x1 = Math.min(w - 1, Math.ceil(cx + r))
  const y0 = Math.max(0, Math.floor(cy - r))
  const y1 = Math.min(h - 1, Math.ceil(cy + r))
  const r2 = r * r
  for (let y = y0; y <= y1; y++) {
    const dy = y - cy
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx
      if (dx * dx + dy * dy <= r2) data[y * w + x] = 1
    }
  }
}

export function strokesToRawMask(
  strokes: number[][][],
  size: number,
  lineWidth = Math.max(4, Math.round(0.022 * size))
): Mask {
  const mask = createMask(size, size)
  const r = Math.max(2, lineWidth / 2)
  for (const poly of strokes) {
    if (poly.length === 1) {
      fillCircle(mask, poly[0][0] * size, poly[0][1] * size, r)
      continue
    }
    for (let s = 0; s < poly.length - 1; s++) {
      const [x0, y0] = poly[s]
      const [x1, y1] = poly[s + 1]
      const px0 = x0 * size
      const py0 = y0 * size
      const px1 = x1 * size
      const py1 = y1 * size
      const len = Math.max(1, Math.hypot(px1 - px0, py1 - py0))
      const steps = Math.ceil(len / Math.max(1, r * 0.55))
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        fillCircle(mask, px0 + (px1 - px0) * t, py0 + (py1 - py0) * t, r)
      }
    }
  }
  return mask
}

function dilate(mask: Mask): Mask {
  const { w, h, data } = mask
  const out = createMask(w, h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[y * w + x]) {
        out.data[y * w + x] = 1
        if (x > 0) out.data[y * w + x - 1] = 1
        if (x < w - 1) out.data[y * w + x + 1] = 1
        if (y > 0) out.data[(y - 1) * w + x] = 1
        if (y < h - 1) out.data[(y + 1) * w + x] = 1
      }
    }
  }
  return out
}

export function maskToGray(mask: Mask): GrayImage {
  const data = new Uint8ClampedArray(mask.w * mask.h)
  for (let i = 0; i < data.length; i++) data[i] = mask.data[i] ? 0 : 255
  return { w: mask.w, h: mask.h, data }
}

export function fitSquare(src: Mask, size: number): Mask {
  let minX = src.w
  let minY = src.h
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      if (src.data[y * src.w + x]) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return createMask(size, size)
  const ch = maxY - minY + 1
  const cw = maxX - minX + 1
  const pad = Math.max(3, Math.round(0.05 * Math.max(ch, cw)))
  const y0 = Math.max(0, minY - pad)
  const y1 = Math.min(src.h - 1, maxY + pad)
  const x0 = Math.max(0, minX - pad)
  const x1 = Math.min(src.w - 1, maxX + pad)
  const cropW = x1 - x0 + 1
  const cropH = y1 - y0 + 1
  const scale = size / Math.max(cropW, cropH)
  const nw = Math.max(1, Math.round(cropW * scale))
  const nh = Math.max(1, Math.round(cropH * scale))
  const out = createMask(size, size)
  const ox = Math.floor((size - nw) / 2)
  const oy = Math.floor((size - nh) / 2)
  for (let y = 0; y < nh; y++) {
    const sy = y0 + Math.min(cropH - 1, Math.floor((y + 0.5) * (cropH / nh)))
    for (let x = 0; x < nw; x++) {
      const sx = x0 + Math.min(cropW - 1, Math.floor((x + 0.5) * (cropW / nw)))
      if (src.data[sy * src.w + sx]) out.data[(oy + y) * size + (ox + x)] = 1
    }
  }
  return dilate(out)
}

export function strokesToMask(strokes: number[][][], size = 128): Mask {
  // 对齐 strokes_to_mask：先高分辨率渲染再进入统一的 fitSquare 流程
  const raw = strokesToRawMask(strokes, Math.max(512, size * 4))
  return fitSquare(raw, size)
}

function grayscaleToBin(gray: GrayImage): Mask {
  const { w, h, data } = gray
    const mask = createMask(w, h)
  // 扫描边缘通常是纸张/背景，比全图众数更稳定（全图可能被大字形或说明文字占据）。
  const border: number[] = []
  const edge = Math.max(1, Math.round(Math.min(w, h) * 0.04))
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (x < edge || y < edge || x >= w - edge || y >= h - edge) border.push(data[y * w + x])
  }
  border.sort((a, b) => a - b)
  const bg = border[Math.floor(border.length * 0.5)] ?? 255
  let amin = 255
  let amax = 0
  for (const v of data) { amin = Math.min(amin, v); amax = Math.max(amax, v) }
  const contrast = amax - amin
  const threshold = bg >= 128
    ? bg - Math.max(12, contrast * 0.34)
    : bg + Math.max(12, contrast * 0.34)
  for (let i = 0; i < data.length; i++) {
    if (bg >= 128 ? data[i] < threshold : data[i] > threshold) mask.data[i] = 1
  }
  return mask
}

function connectedComponents(mask: Mask): { ys: number[]; xs: number[] }[] {
  const { w, h, data } = mask
  const seen = new Uint8Array(w * h)
  const comps: { ys: number[]; xs: number[] }[] = []
  const queue: number[] = []
  for (let start = 0; start < w * h; start++) {
    if (!data[start] || seen[start]) continue
    seen[start] = 1
    queue.length = 0
    queue.push(start)
    const ys: number[] = []
    const xs: number[] = []
    while (queue.length) {
      const p = queue.pop()!
      const y = Math.floor(p / w)
      const x = p % w
      ys.push(y)
      xs.push(x)
      const neighbors = [
        p - w >= 0 ? p - w : -1,
        p + w < w * h ? p + w : -1,
        x > 0 ? p - 1 : -1,
        x < w - 1 ? p + 1 : -1
      ]
      for (const n of neighbors) {
        if (n >= 0 && data[n] && !seen[n]) {
          seen[n] = 1
          queue.push(n)
        }
      }
    }
    comps.push({ ys, xs })
  }
  return comps
}

export function normalizeBinary(bin: Mask, size = 128): Mask {
  const comps = connectedComponents(bin)
  if (!comps.length) return createMask(size, size)
  let total = 0
  for (const c of comps) total += c.ys.length
  const thr = Math.max(8, Math.round(total * 0.005))
  const kept = comps.filter((c) => c.ys.length >= thr)
  const merged = createMask(bin.w, bin.h)
  for (const c of kept.length ? kept : [comps[0]]) {
    for (let i = 0; i < c.ys.length; i++) merged.data[c.ys[i] * bin.w + c.xs[i]] = 1
  }
  return fitSquare(merged, size)
}

export function preprocessGray(gray: GrayImage, size = 128): Mask {
  if (!gray.w || !gray.h || !gray.data.length) return createMask(size, size)
  const bin = grayscaleToBin(gray)
  return normalizeBinary(bin, size)
}

export function strokesToPreprocessedMask(
  strokes: number[][][],
  canvasW = 512,
  canvasH = 512,
  lineWidth?: number
): Mask {
  // 与桌面端“画板 → PIL 图 → preprocess_image”同一条输入链路
  const { w, h } = { w: canvasW, h: canvasH }
  const bgGray: GrayImage = {
    w,
    h,
    data: new Uint8ClampedArray(w * h).fill(255)
  }
  const ink = strokesToRawMaskAt(strokes, w, h, lineWidth || Math.max(4, Math.round(0.022 * Math.min(w, h))))
  for (let i = 0; i < bgGray.data.length; i++) if (ink.data[i]) bgGray.data[i] = 0
  return preprocessGray(bgGray)
}

function strokesToRawMaskAt(
  strokes: number[][][],
  w: number,
  h: number,
  lineWidth: number
): Mask {
  const mask = createMask(w, h)
  const r = Math.max(2, lineWidth / 2)
  for (const poly of strokes) {
    for (let s = 0; s < poly.length - 1; s++) {
      const [x0, y0] = poly[s]
      const [x1, y1] = poly[s + 1]
      const len = Math.max(1, Math.hypot(x1 - x0, y1 - y0))
      const steps = Math.ceil(len / Math.max(1, r * 0.5))
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        fillCircle(mask, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r)
      }
    }
  }
  return mask
}

export function downscaleTo128(mask: Mask): Mask {
  return fitSquare(mask, 128)
}

export function countInk(mask: Mask): number {
  let n = 0
  for (const v of mask.data) if (v) n++
  return n
}
