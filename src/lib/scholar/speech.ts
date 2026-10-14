/**
 * 数字史官 · 纪录片口播语音层
 *
 * - 默认预设：沉稳自然男声优先、本机男声兜底，语速 0.90、音高 0.95；
 * - 文本按标点与长句自动断句，在句末/逗号/强制断句处插入克制停顿；
 * - 只维护一条片段队列，暂停/继续/停止同时作用于正在朗读与段间等待；
 * - 语音能力以浏览器/系统实际提供为准；可替换 Provider 以接外部 TTS。
 */

export const DOCUMENTARY_PRESET = {
  id: 'documentary-solemn-male',
  label: '纪录片 · 沉稳男声',
  rate: 0.9,
  pitch: 0.95
} as const

export interface VoiceInfo {
  voiceURI: string
  name: string
  lang: string
  localService: boolean
}

export interface NarrationCallbacks {
  onStart?: () => void
  onEnd?: () => void
  onPause?: () => void
  onResume?: () => void
  onError?: (error: unknown) => void
  /** 每个朗读片段真正开始发声时触发（供头像口型使用）。 */
  onSegmentStart?: () => void
  /** 每个朗读片段结束、进入停顿/下一段前触发。 */
  onSegmentEnd?: () => void
}

export interface SpeakOptions {
  voiceURI?: string
  rate?: number
  pitch?: number
  callbacks?: NarrationCallbacks
}

export interface NarrationSession {
  pause: () => void
  resume: () => void
  cancel: () => void
}

export interface NarrationProvider {
  id: string
  name: string
  supported(): boolean
  /** 当前可用的中文音色（可能为空）。 */
  listVoices(): VoiceInfo[]
  /** 可选：注册“音色列表变化”监听，返回取消订阅函数。 */
  onVoicesChanged?(listener: (voices: VoiceInfo[]) => void): () => void
  /** 朗读一段文本（内部按句切分排队）；不支持或无可用语音时返回 null。 */
  speak(text: string, options?: SpeakOptions): NarrationSession | null
  stopAll(): void
}

export interface NarrationSegment {
  text: string
  /** 本段结束后到下一段开始前的停顿（最后一段固定忽略）。 */
  gapMs: number
}

type VoiceLike = Pick<SpeechSynthesisVoice, 'voiceURI' | 'name' | 'lang' | 'localService'>

export const MALE_ZH_VOICE =
  /kangkang|yunyang|yunjian|yunxi|yunxia|yuntai|yunfeng|yunhao|云扬|云健|云希|云阳|康康|男/i

const NATURAL_VOICE = /online|natural/i
const ZH_PRIORITY =
  /huihui|yaoyao|xiaoxiao|xiaoyi|xiaoxuan|yunxi|yunyang|xiaochen|tingting|xiaomei/i

const END_MARKS = new Set(['。', '！', '？', '…', '!', '?'])
const SOFT_MARKS = new Set(['，', '、', '；', '：', ',', ';', ':'])
const BREAK_HINTS = /[而并以在为其因此所以和但或的与将则之从向由对为于]/

const SEGMENT_SOFT_GAP = 360
const SEGMENT_END_GAP = 650
const SEGMENT_FORCE_GAP = 480
const SOFT_MIN_CHARS = 10
const FORCE_MAX_CHARS = 28

export function speechSupported(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.speechSynthesis !== 'undefined' &&
      window.speechSynthesis !== null
    )
  } catch {
    return false
  }
}

export function isMaleVoiceName(name: string): boolean {
  return MALE_ZH_VOICE.test(name)
}

export function isNaturalVoiceName(name: string): boolean {
  return NATURAL_VOICE.test(name)
}

export function listZhVoices(voices: ReadonlyArray<VoiceLike>): VoiceInfo[] {
  return voices
    .filter((v) => /^zh(-|_|$)/i.test(v.lang || ''))
    .map((v) => ({
      voiceURI: v.voiceURI,
      name: v.name,
      lang: v.lang,
      localService: Boolean(v.localService)
    }))
    .sort((a, b) => {
      // 列表本身仍按 本机优先 → 常见音色 → zh-CN 排序，供音色下拉展示。
      if (a.localService !== b.localService) return a.localService ? -1 : 1
      const ap = ZH_PRIORITY.test(a.name) ? 1 : 0
      const bp = ZH_PRIORITY.test(b.name) ? 1 : 0
      if (ap !== bp) return bp - ap
      const acn = /^zh[-_]?cn$/i.test(a.lang) ? 1 : 0
      const bcn = /^zh[-_]?cn$/i.test(b.lang) ? 1 : 0
      if (acn !== bcn) return bcn - acn
      return a.name.localeCompare(b.name, 'zh-CN')
    })
}

/** 自动选声评分：自然男声 > 本机男声 > 其它男声 > 本机女声 > 其它。 */
function documentaryRank(v: Pick<VoiceInfo, 'name' | 'localService'>): number {
  const male = isMaleVoiceName(v.name)
  if (male) {
    if (isNaturalVoiceName(v.name)) return 6
    return v.localService ? 5 : 4
  }
  return v.localService ? 2 : 1
}

export function pickVoice(
  voices: ReadonlyArray<VoiceInfo>,
  preferredURI?: string
): VoiceInfo | undefined {
  if (!voices.length) return undefined
  if (preferredURI) {
    const preferred = voices.find((v) => v.voiceURI === preferredURI)
    if (preferred) return preferred
  }
  return voices[0]
}

/** 纪录片预设自动选声：自然男声（Yunyang/Yunjian/Yunxi 等）优先，其次本机男声。 */
export function pickDocumentaryVoice(
  voices: ReadonlyArray<VoiceInfo>,
  preferredURI?: string
): VoiceInfo | undefined {
  if (!voices.length) return undefined
  if (preferredURI) {
    const preferred = voices.find((v) => v.voiceURI === preferredURI)
    if (preferred) return preferred
  }
  return [...voices].sort((a, b) => {
    const diff = documentaryRank(b) - documentaryRank(a)
    if (diff !== 0) return diff
    if (a.localService !== b.localService) return a.localService ? -1 : 1
    return a.name.localeCompare(b.name, 'zh-CN')
  })[0]
}

/** 自然男声失败后的本机兜底：优先本机男声，其次任意本机语音。 */
export function pickLocalFallback(
  voices: ReadonlyArray<VoiceInfo>,
  primary?: VoiceInfo
): VoiceInfo | undefined {
  const rest = voices.filter((v) => v.voiceURI !== primary?.voiceURI)
  if (!rest.length) return undefined
  return (
    rest.find((v) => v.localService && isMaleVoiceName(v.name)) ??
    rest.find((v) => v.localService) ??
    rest[0]
  )
}

function textLengthWithoutMarks(text: string): number {
  return text.replace(/[\s。！？…，、；：!?,;:]/g, '').length
}

function splitLongClause(clause: string): NarrationSegment[] {
  const out: NarrationSegment[] = []
  let start = 0
  while (start < clause.length) {
    const remaining = clause.length - start
    if (remaining <= FORCE_MAX_CHARS) {
      out.push({ text: clause.slice(start), gapMs: 0 })
      break
    }
    const windowLen = Math.min(FORCE_MAX_CHARS, remaining)
    const low = start + Math.floor(windowLen * 0.4)
    const high = Math.min(start + Math.ceil(windowLen * 0.8), clause.length - 1)
    let found = -1
    let bestDist = Number.POSITIVE_INFINITY
    for (let i = low; i <= high; i += 1) {
      if (BREAK_HINTS.test(clause[i] ?? '')) {
        const dist = Math.abs(i - (start + Math.floor(windowLen * 0.55)))
        if (dist < bestDist) {
          bestDist = dist
          found = i
        }
      }
    }
    let end: number
    if (found >= 0) {
      end = found
    } else {
      end = Math.max(start + 1, Math.min(clause.length, start + Math.floor(windowLen * 0.55)))
    }
    if (end <= start) end = start + 1
    out.push({ text: clause.slice(start, end), gapMs: SEGMENT_FORCE_GAP })
    start = end
  }
  return out
}

/**
 * 长句自动断句：
 * 句末停顿 650ms；逗号类停顿 360ms（短句不切碎，避免“祭祀、占卜”式顿读）；
 * 超过 28 个有效汉字且无标点的长句在语义点附近强制断句（480ms）。
 * 片段文本拼接后与输入原文完全一致。
 */
export function splitNarrationText(raw: string): NarrationSegment[] {
  const text = (raw || '').trim()
  if (!text) return []
  const segments: NarrationSegment[] = []
  let buffer = ''

  const flush = (gapMs: number) => {
    if (!buffer) return
    if (textLengthWithoutMarks(buffer) > FORCE_MAX_CHARS) {
      const pieces = splitLongClause(buffer)
      if (pieces.length) {
        pieces[pieces.length - 1] = { ...pieces[pieces.length - 1], gapMs }
        segments.push(...pieces)
      }
    } else {
      segments.push({ text: buffer, gapMs })
    }
    buffer = ''
  }

  for (const ch of text) {
    buffer += ch
    if (END_MARKS.has(ch)) {
      flush(SEGMENT_END_GAP)
      continue
    }
    if (SOFT_MARKS.has(ch) && textLengthWithoutMarks(buffer) >= SOFT_MIN_CHARS) {
      flush(SEGMENT_SOFT_GAP)
    }
  }

  if (buffer) {
    if (textLengthWithoutMarks(buffer) > FORCE_MAX_CHARS) {
      const pieces = splitLongClause(buffer)
      if (pieces.length) {
        pieces[pieces.length - 1] = { ...pieces[pieces.length - 1], gapMs: 0 }
        segments.push(...pieces)
      }
    } else {
      segments.push({ text: buffer, gapMs: 0 })
    }
  }

  return segments
}

function getBrowserSpeech(): SpeechSynthesis | null {
  if (!speechSupported()) return null
  return window.speechSynthesis
}

function getBrowserVoice(voice: VoiceInfo): SpeechSynthesisVoice | null {
  const synth = getBrowserSpeech()
  if (!synth) return null
  return (
    synth.getVoices().find((v) => v.voiceURI === voice.voiceURI) ??
    synth.getVoices().find((v) => v.lang === voice.lang) ??
    null
  )
}

let activeNarration: SegmentedNarration | null = null

class SegmentedNarration implements NarrationSession {
  private segments: NarrationSegment[]
  private synth: SpeechSynthesis
  private voice: VoiceInfo
  private fallbackVoice: VoiceInfo | undefined
  private options: SpeakOptions
  private callbacks: NarrationCallbacks

  private index = 0
  private started = false
  private stopped = false
  private paused = false
  private retried = false
  private retrying = false
  private gapTimer: ReturnType<typeof setTimeout> | null = null
  private gapStartedAt = 0
  private gapDuration = 0
  private remainingGap = 0

  constructor(
    synth: SpeechSynthesis,
    segments: NarrationSegment[],
    voice: VoiceInfo,
    fallbackVoice: VoiceInfo | undefined,
    options: SpeakOptions
  ) {
    this.synth = synth
    this.segments = segments
    this.voice = voice
    this.fallbackVoice = fallbackVoice
    this.options = options
    this.callbacks = options.callbacks || {}
  }

  private finish() {
    if (this.stopped) return
    this.stopped = true
    this.clearGap()
    if (activeNarration === this) activeNarration = null
    this.callbacks.onEnd?.()
  }

  private clearGap() {
    if (this.gapTimer !== null) {
      clearTimeout(this.gapTimer)
      this.gapTimer = null
    }
    this.gapStartedAt = 0
    this.gapDuration = 0
    this.remainingGap = 0
  }

  private scheduleGap(durationMs: number) {
    this.clearGap()
    if (durationMs <= 0) {
      this.playNext()
      return
    }
    this.gapDuration = durationMs
    this.gapStartedAt = Date.now()
    this.gapTimer = setTimeout(() => {
      this.gapTimer = null
      this.playNext()
    }, durationMs)
  }

  private playNext() {
    if (this.stopped) return
    if (this.index >= this.segments.length) {
      this.finish()
      return
    }
    const segment = this.segments[this.index]
    if (!segment.text.trim()) {
      this.index += 1
      this.scheduleGap(segment.gapMs)
      return
    }
    try {
      const utterance = new SpeechSynthesisUtterance(segment.text)
      const browserVoice = getBrowserVoice(this.voice)
      if (browserVoice) utterance.voice = browserVoice
      utterance.lang = browserVoice?.lang || this.voice.lang || 'zh-CN'
      utterance.rate = this.options.rate ?? DOCUMENTARY_PRESET.rate
      utterance.pitch = this.options.pitch ?? DOCUMENTARY_PRESET.pitch

      utterance.onstart = () => {
        if (this.stopped) return
        if (!this.started) {
          this.started = true
          this.callbacks.onStart?.()
        }
        this.callbacks.onSegmentStart?.()
      }
      utterance.onend = () => {
        if (this.stopped) return
        this.callbacks.onSegmentEnd?.()
        this.index += 1
        if (this.index >= this.segments.length) {
          this.finish()
          return
        }
        this.scheduleGap(segment.gapMs)
      }
      utterance.onpause = () => {
        if (!this.stopped) this.callbacks.onPause?.()
      }
      utterance.onresume = () => {
        if (!this.stopped) this.callbacks.onResume?.()
      }
      utterance.onerror = (event) => {
        if (this.stopped || this.retrying) return
        const errName = String((event as SpeechSynthesisErrorEvent).error || event)
        // 自然音色不可用（离线/网络失败）时自动重试一次本机男声。
        if (
          !this.retried &&
          this.fallbackVoice &&
          !this.voice.localService &&
          (errName === 'network' || errName === 'not-allowed' || errName === 'synthesis-failed')
        ) {
          this.retried = true
          this.retrying = true
          this.index = 0
          this.started = false
          this.voice = this.fallbackVoice
          this.clearGap()
          this.synth.cancel()
          setTimeout(() => {
            this.retrying = false
            this.playNext()
          }, 0)
          return
        }
        this.terminalError(event)
      }
      this.synth.speak(utterance)
    } catch (error) {
      this.terminalError(error)
    }
  }

  private terminalError(error: unknown) {
    if (this.stopped) return
    this.stopped = true
    this.clearGap()
    if (activeNarration === this) activeNarration = null
    this.callbacks.onError?.(error)
  }

  start() {
    if (this.segments.length) this.playNext()
    else this.finish()
  }

  pause() {
    if (this.stopped || this.paused) return
    this.paused = true
    if (this.gapTimer !== null) {
      const elapsed = Date.now() - this.gapStartedAt
      const remaining = Math.max(0, this.gapDuration - elapsed)
      this.clearGap()
      this.remainingGap = remaining
      this.callbacks.onPause?.()
      return
    }
    this.synth.pause()
    this.callbacks.onPause?.()
  }

  resume() {
    if (this.stopped || !this.paused) return
    this.paused = false
    if (this.remainingGap > 0) {
      const wait = this.remainingGap
      this.remainingGap = 0
      this.scheduleGap(wait)
    } else {
      this.synth.resume()
    }
    this.callbacks.onResume?.()
  }

  cancel() {
    if (this.stopped) return
    this.stopped = true
    this.clearGap()
    try {
      this.synth.cancel()
    } catch {
      // 忽略取消异常
    }
    if (activeNarration === this) activeNarration = null
  }
}

export const browserNarrationProvider: NarrationProvider = {
  id: 'web-speech-documentary-zh',
  name: '浏览器系统中文语音（纪录片预设）',
  supported: speechSupported,

  listVoices() {
    const synth = getBrowserSpeech()
    if (!synth) return []
    try {
      return listZhVoices(synth.getVoices())
    } catch {
      return []
    }
  },

  onVoicesChanged(listener) {
    const synth = getBrowserSpeech()
    if (!synth) return () => undefined
    const handler = () => listener(browserNarrationProvider.listVoices())
    synth.addEventListener('voiceschanged', handler)
    return () => synth.removeEventListener('voiceschanged', handler)
  },

  speak(text, options = {}) {
    const synth = getBrowserSpeech()
    const trimmed = (text || '').trim()
    if (!synth || !trimmed) return null

    const available = browserNarrationProvider.listVoices()
    const voice = pickDocumentaryVoice(available, options.voiceURI)
    if (!voice) return null
    const fallbackVoice = pickLocalFallback(available, voice)
    const segments = splitNarrationText(trimmed)
    if (!segments.length) return null

    activeNarration?.cancel()
    const narration = new SegmentedNarration(synth, segments, voice, fallbackVoice, options)
    activeNarration = narration
    narration.start()
    return narration
  },

  stopAll() {
    activeNarration?.cancel()
    activeNarration = null
    const synth = getBrowserSpeech()
    if (!synth) return
    try {
      synth.cancel()
    } catch {
      // 忽略清理时的异常
    }
  }
}

export const DEFAULT_NARRATION_PROVIDER: NarrationProvider = browserNarrationProvider
