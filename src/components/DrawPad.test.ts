import { describe, expect, it } from 'vitest'
import { normalizeLocalPoint } from './DrawPad'

describe('手写画板坐标归一化', () => {
  it('使用画布局部坐标，不重复扣除页面偏移', () => {
    expect(normalizeLocalPoint({ x: 100, y: 80 }, 400, 320)).toEqual({ x: 0.25, y: 0.25 })
  })

  it('在窄屏尺寸下保持比例并限制在有效范围', () => {
    expect(normalizeLocalPoint({ x: 160, y: 160 }, 320, 320)).toEqual({ x: 0.5, y: 0.5 })
    expect(normalizeLocalPoint({ x: -10, y: 400 }, 320, 320)).toEqual({ x: 0, y: 1 })
  })
})
