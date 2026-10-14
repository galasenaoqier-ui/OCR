import type { GrayImage } from './engine/binary'

export function readFileAsGray(file: File): Promise<GrayImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight))
      const w = Math.max(1, Math.round(img.naturalWidth * scale))
      const h = Math.max(1, Math.round(img.naturalHeight * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      const { data } = ctx.getImageData(0, 0, w, h)
      const gray = new Uint8ClampedArray(w * h)
      for (let i = 0; i < data.length; i += 4) {
        // Rec.601 亮度，与 PIL convert("L") 视觉一致
        gray[i / 4] = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114)
      }
      URL.revokeObjectURL(url)
      resolve({ w, h, data: gray })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片读取失败'))
    }
    img.src = url
  })
}

export function fileToDataUrl(file: File, maxSide = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(img.width * scale))
        canvas.height = Math.max(1, Math.round(img.height * scale))
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = () => reject(new Error('图片预览生成失败'))
      img.src = String(reader.result)
    }
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.readAsDataURL(file)
  })
}

/** 为上传图片生成 ≤320px 缩略图 Blob；无法解码时返回 undefined（回退到原图）。 */
export function fileToThumbBlob(file: File, maxSide = 320): Promise<Blob | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      try {
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
        const w = Math.max(1, Math.round(img.naturalWidth * scale))
        const h = Math.max(1, Math.round(img.naturalHeight * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url)
            resolve(blob || undefined)
          },
          'image/png'
        )
      } catch {
        URL.revokeObjectURL(url)
        resolve(undefined)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(undefined)
    }
    img.src = url
  })
}

export function strokesToDataUrl(strokes: { x: number; y: number }[][]): string {
  const paths = strokes
    .filter((s) => s.length >= 2)
    .map(
      (s) =>
        `<path d="${s.map((p, i) => `${i ? 'L' : 'M'}${(p.x * 100).toFixed(1)},${(p.y * 100).toFixed(1)}`).join(' ')}"/>`
    )
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="#2B211A" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">${paths.join('')}</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function sampleGlyphDataUrl(): string {
  return ''
}
