import { describe, expect, it } from 'vitest'
import { ModelLoadError, classifyModelError, validateModelResponse } from './modelEngine'

describe('model loading diagnostics', () => {
  it('classifies runtime failures into useful messages', () => {
    expect(classifyModelError(new Error('WebAssembly.instantiate failed')).code).toBe('wasm-init')
    expect(classifyModelError(new Error('out of memory')).code).toBe('memory')
    expect(classifyModelError(new Error('invalid model protobuf')).code).toBe('model-incompatible')
  })

  it('rejects HTTP failures, short responses and HTML fallbacks', () => {
    expect(() => validateModelResponse(404, false, 'text/html', new ArrayBuffer(0))).toThrow('HTTP 404')
    expect(() => validateModelResponse(200, true, 'application/octet-stream', new ArrayBuffer(8))).toThrow('不完整')
    const html = new TextEncoder().encode('<!doctype html><html></html>')
    const padded = new Uint8Array(1024 * 1024 + 1)
    padded.set(html)
    expect(() => validateModelResponse(200, true, 'text/html', padded.buffer)).toThrow('网页内容')
  })

  it('preserves already classified errors', () => {
    const error = new ModelLoadError('timeout', '模型初始化超时')
    expect(classifyModelError(error)).toBe(error)
  })
})
