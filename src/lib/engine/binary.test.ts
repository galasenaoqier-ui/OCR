import { describe, expect, it } from 'vitest'
import { countInk, preprocessGray, type GrayImage } from './binary'

function image(w: number, h: number, bg: number, ink: number): GrayImage {
  const data = new Uint8ClampedArray(w * h).fill(bg)
  for (let y = 8; y < h - 8; y++) data[y * w + Math.floor(w / 2)] = ink
  for (let x = 8; x < w - 8; x++) data[Math.floor(h / 2) * w + x] = ink
  return { w, h, data }
}

describe('甲骨字形图像预处理', () => {
  it('识别白底黑字与黑底白字', () => {
    expect(countInk(preprocessGray(image(64, 64, 245, 25)))).toBeGreaterThan(0)
    expect(countInk(preprocessGray(image(64, 64, 15, 235)))).toBeGreaterThan(0)
  })

  it('空白图不产生字形', () => {
    const blank: GrayImage = { w: 64, h: 64, data: new Uint8ClampedArray(64 * 64).fill(220) }
    expect(countInk(preprocessGray(blank))).toBe(0)
  })

  it('少量边缘噪声不会淹没主字形', () => {
    const gray = image(64, 64, 240, 35)
    gray.data[1] = 0
    gray.data[62] = 0
    expect(countInk(preprocessGray(gray))).toBeGreaterThan(50)
  })
})
