/**
 * 数字史官 · 极淡风声底噪（Web Audio，程序化生成）
 *
 * - 无任何外部音频素材：棕色噪声 + 低通滤波 + 缓慢起伏，模拟“古简风声”；
 * - 输出音量约 0.02–0.04（远低于人声）；
 * - 停止时 800ms 淡出；AudioContext 必须在用户手势内创建/恢复。
 */

interface WindGenerator {
  output: GainNode
  source: AudioBufferSourceNode
  lfo: OscillatorNode
  nodes: AudioNode[]
  token: number
}

let context: AudioContext | null = null
let master: GainNode | null = null
let current: WindGenerator | null = null
let tokenSeq = 0

function audioContextCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null
  const AnyWindow = window as unknown as {
    AudioContext?: typeof AudioContext
    webkitAudioContext?: typeof AudioContext
  }
  return AnyWindow.AudioContext || AnyWindow.webkitAudioContext || null
}

export function windSupported(): boolean {
  return audioContextCtor() !== null
}

function ensureContext(): AudioContext | null {
  if (!windSupported()) return null
  const Ctor = audioContextCtor()
  if (!Ctor) return null
  if (!context) {
    try {
      context = new Ctor()
      master = context.createGain()
      master.gain.value = 1
      master.connect(context.destination)
    } catch {
      context = null
      master = null
      return null
    }
  }
  if (context.state === 'suspended') {
    void context.resume().catch(() => undefined)
  }
  return context
}

function buildWindBuffer(ctx: AudioContext): AudioBuffer {
  const seconds = 5
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < data.length; i += 1) {
    const white = Math.random() * 2 - 1
    // 棕噪近似：低频更强，天然像风声底噪。
    last = (last + 0.018 * white) / 1.018
    data[i] = last * 7.5
  }
  return buffer
}

/** 开始极淡风声；不可用或已开启时返回 false。 */
export function startWind(): boolean {
  const ctx = ensureContext()
  if (!ctx || !master) return false
  if (current) return true

  const token = ++tokenSeq
  try {
    const output = ctx.createGain()
    output.gain.value = 0
    const source = ctx.createBufferSource()
    source.buffer = buildWindBuffer(ctx)
    source.loop = true

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 220
    filter.Q.value = 0.55

    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.09
    const lfoDepth = ctx.createGain()
    lfoDepth.gain.value = 0.007
    lfo.connect(lfoDepth)
    lfoDepth.connect(output.gain)

    source.connect(filter)
    filter.connect(output)
    output.connect(master)

    const now = ctx.currentTime
    output.gain.setValueAtTime(0, now)
    output.gain.linearRampToValueAtTime(0.028, now + 0.7)

    source.start(now)
    lfo.start(now)

    current = {
      output,
      source,
      lfo,
      nodes: [source, filter, output, lfo, lfoDepth],
      token
    }
  } catch {
    return false
  }
  return true
}

/** 停止风声（800ms 淡出）；不可用或未开启时无副作用。 */
export function stopWind(): void {
  if (!context || !current) return
  const gen = current
  const ctx = context
  current = null
  const now = ctx.currentTime
  gen.output.gain.cancelScheduledValues(now)
  gen.output.gain.setValueAtTime(gen.output.gain.value, now)
  gen.output.gain.linearRampToValueAtTime(0.0001, now + 0.8)
  try {
    gen.source.stop(now + 0.9)
    gen.lfo.stop(now + 0.9)
  } catch {
    // 已停止的节点忽略
  }
  setTimeout(() => {
    if (gen.nodes.length) gen.nodes.forEach((n) => n.disconnect())
  }, 1000)
}

/** 页面卸载时立即清理（不留后台音轨）。 */
export function disposeWind(): void {
  if (current) {
    const gen = current
    current = null
    tokenSeq += 1
    try {
      gen.source.stop()
      gen.lfo.stop()
    } catch {
      // 忽略
    }
    gen.nodes.forEach((n) => {
      try {
        n.disconnect()
      } catch {
        // 忽略
      }
    })
  }
  if (context && context.state !== 'closed') {
    void context.close().catch(() => undefined)
  }
  context = null
  master = null
}
