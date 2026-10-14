import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  browserNarrationProvider,
  DOCUMENTARY_PRESET,
  isMaleVoiceName,
  listZhVoices,
  pickDocumentaryVoice,
  pickLocalFallback,
  speechSupported,
  splitNarrationText
} from './speech'

const femaleLocal = {
  voiceURI: 'zh-cn-huihui',
  name: 'Microsoft Huihui - Chinese (Simplified, PRC)',
  lang: 'zh-CN',
  localService: true
}

const maleLocal = {
  voiceURI: 'zh-cn-kangkang',
  name: 'Microsoft Kangkang - Chinese (Simplified, PRC)',
  lang: 'zh-CN',
  localService: true
}

const maleNatural = {
  voiceURI: 'zh-cn-yunyang',
  name: 'Microsoft Yunyang Online (Natural) - Chinese (Mainland)',
  lang: 'zh-CN',
  localService: false
}

const zhTw = {
  voiceURI: 'zh-tw-mei',
  name: 'Microsoft Mei - Chinese (Traditional, Taiwan)',
  lang: 'zh-TW',
  localService: true
}

const enUs = {
  voiceURI: 'en-us',
  name: 'Microsoft Aria - English (United States)',
  lang: 'en-US',
  localService: true
}

interface FakeUtteranceInstance {
  text: string
  lang: string
  voice: SpeechSynthesisVoice | null
  rate: number
  pitch: number
  onstart: (() => void) | null
  onend: (() => void) | null
  onpause: (() => void) | null
  onresume: (() => void) | null
  onerror: ((e: unknown) => void) | null
}

function fakeSynth(
  voices: Array<typeof femaleLocal | typeof maleLocal | typeof maleNatural | typeof zhTw | typeof enUs>
) {
  const utterances: FakeUtteranceInstance[] = []
  const speak = vi.fn()
  const cancel = vi.fn()
  const pause = vi.fn()
  const resume = vi.fn()

  class FakeUtterance implements FakeUtteranceInstance {
    text = ''
    lang = ''
    voice: SpeechSynthesisVoice | null = null
    rate = 1
    pitch = 1
    onstart: (() => void) | null = null
    onend: (() => void) | null = null
    onpause: (() => void) | null = null
    onresume: (() => void) | null = null
    onerror: ((e: unknown) => void) | null = null
    constructor(text: string) {
      this.text = text
    }
  }

  const synth = {
    getVoices: () => voices,
    speak: (u: FakeUtteranceInstance) => {
      speak()
      utterances.push(u)
    },
    cancel,
    pause,
    resume,
    addEventListener: () => undefined,
    removeEventListener: () => undefined
  } as unknown as SpeechSynthesis

  return { synth, utterances, FakeUtterance, speak, cancel, pause, resume }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  browserNarrationProvider.stopAll()
})

describe('纪录片男声预设', () => {
  it('预设为 0.90 语速与沉稳男声', () => {
    expect(DOCUMENTARY_PRESET.rate).toBe(0.9)
    expect(DOCUMENTARY_PRESET.pitch).toBe(0.95)
    expect(isMaleVoiceName('Microsoft Kangkang')).toBe(true)
    expect(isMaleVoiceName('Microsoft Yunyang')).toBe(true)
    expect(isMaleVoiceName('Microsoft Huihui')).toBe(false)
  })

  it('自动选声优先自然男声，其次本机男声，无男声时回退中文音色', () => {
    expect(pickDocumentaryVoice([femaleLocal, maleLocal, maleNatural])?.name).toContain('Yunyang')
    expect(pickDocumentaryVoice([femaleLocal, maleLocal])?.name).toContain('Kangkang')
    expect(pickDocumentaryVoice([femaleLocal, zhTw])?.name).toContain('Huihui')
    expect(pickDocumentaryVoice([zhTw], 'zh-tw-mei')?.name).toContain('Mei')
    expect(pickDocumentaryVoice([])).toBeUndefined()
  })

  it('自然男声的兜底选择优先本机男声 Kangkang', () => {
    expect(pickLocalFallback([femaleLocal, maleLocal], maleNatural)?.name).toContain('Kangkang')
    expect(pickLocalFallback([femaleLocal], maleNatural)?.name).toContain('Huihui')
    expect(pickLocalFallback([maleNatural], maleNatural)).toBeUndefined()
  })

  it('listZhVoices 只保留中文语音', () => {
    const zh = listZhVoices([femaleLocal, enUs])
    expect(zh).toHaveLength(1)
    expect(zh[0].voiceURI).toBe(femaleLocal.voiceURI)
  })

  it('speechSupported 在无浏览器环境安全返回 false', () => {
    expect(speechSupported()).toBe(false)
  })
})

describe('长句自动断句', () => {
  it('按句号/逗号切分且拼接与原文一致', () => {
    const text = '这个字是“马”。在甲骨文中，它通过描绘马的形态来表现意思，并保留早期造字特征。'
    const segments = splitNarrationText(text)
    expect(segments.length).toBeGreaterThanOrEqual(3)
    expect(segments.map((s) => s.text).join('')).toBe(text)
    expect(segments[0].gapMs).toBe(650)
    expect(segments[1].gapMs).toBe(360)
    expect(segments[2].gapMs).toBe(650)
  })

  it('短并列顿号不切碎，避免“祭祀、占卜”式顿读', () => {
    const text = '祭祀、占卜、战争、农业与商代生活息息相关。'
    const segments = splitNarrationText(text)
    expect(segments.map((s) => s.text).join('')).toBe(text)
    expect(segments.length).toBeLessThanOrEqual(2)
  })

  it('超长无标点句子强制断句并附加 480ms 停顿', () => {
    const text = '这是一个没有标点的非常长的甲骨文知识讲解句子用来验证强制断句逻辑是否能够正常工作'
    const segments = splitNarrationText(text)
    expect(segments.length).toBeGreaterThan(1)
    expect(segments.map((s) => s.text).join('')).toBe(text)
    expect(segments.slice(0, -1).every((s) => s.gapMs === 480)).toBe(true)
  })

  it('带句号的超长句也会在句中强制断句，句号停顿保留在末段', () => {
    const text =
      '这个讲解内容非常长且中间没有使用任何标点符号用来验证即使句子以句号结束时仍然应该在中途自然停顿以保证纪录片口播的沉稳节奏。'
    const segments = splitNarrationText(text)
    expect(segments.length).toBeGreaterThan(1)
    expect(segments.map((s) => s.text).join('')).toBe(text)
    expect(segments[segments.length - 1].gapMs).toBe(650)
  })
})

describe('片段队列朗读', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('以 0.90×/0.95 播放、按句停顿并在整条结束时回调一次', async () => {
    const fake = fakeSynth([femaleLocal, maleLocal, maleNatural])
    vi.stubGlobal('window', { speechSynthesis: fake.synth })
    vi.stubGlobal('SpeechSynthesisUtterance', fake.FakeUtterance)

    const onStart = vi.fn()
    const onEnd = vi.fn()
    const session = browserNarrationProvider.speak('第一句话。第二句话。', {
      voiceURI: '',
      callbacks: { onStart, onEnd }
    })

    expect(session).not.toBeNull()
    expect(fake.utterances).toHaveLength(1)
    expect(fake.utterances[0].voice?.voiceURI).toBe(maleNatural.voiceURI)
    expect(fake.utterances[0].rate).toBe(0.9)
    expect(fake.utterances[0].pitch).toBe(0.95)

    fake.utterances[0].onstart?.()
    expect(onStart).toHaveBeenCalledTimes(1)

    fake.utterances[0].onend?.()
    expect(fake.utterances).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(649)
    expect(fake.utterances).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(2)
    expect(fake.utterances).toHaveLength(2)

    fake.utterances[1].onstart?.()
    fake.utterances[1].onend?.()
    expect(onStart).toHaveBeenCalledTimes(1)
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('暂停/继续覆盖段间等待：暂停记录剩余停顿，继续后继续计时', async () => {
    const fake = fakeSynth([maleLocal, maleNatural])
    vi.stubGlobal('window', { speechSynthesis: fake.synth })
    vi.stubGlobal('SpeechSynthesisUtterance', fake.FakeUtterance)

    const onPause = vi.fn()
    const onResume = vi.fn()
    const session = browserNarrationProvider.speak('第一句话。第二句话。', {
      callbacks: { onPause, onResume }
    })
    expect(session).not.toBeNull()

    fake.utterances[0].onend?.()
    await vi.advanceTimersByTimeAsync(250)
    session?.pause()
    expect(onPause).toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000)
    expect(fake.utterances).toHaveLength(1)

    session?.resume()
    expect(onResume).toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(399)
    expect(fake.utterances).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(2)
    expect(fake.utterances).toHaveLength(2)
    fake.utterances[1].onend?.()
  })

  it('停止后不再继续产生新片段', async () => {
    const fake = fakeSynth([maleLocal])
    vi.stubGlobal('window', { speechSynthesis: fake.synth })
    vi.stubGlobal('SpeechSynthesisUtterance', fake.FakeUtterance)

    const session = browserNarrationProvider.speak('第一句话。第二句话。')
    fake.utterances[0].onend?.()
    session?.cancel()
    await vi.advanceTimersByTimeAsync(3000)
    expect(fake.utterances).toHaveLength(1)
  })

  it('自然男声失败时自动重试一次本机男声', async () => {
    const fake = fakeSynth([femaleLocal, maleLocal, maleNatural])
    vi.stubGlobal('window', { speechSynthesis: fake.synth })
    vi.stubGlobal('SpeechSynthesisUtterance', fake.FakeUtterance)

    const onStart = vi.fn()
    const session = browserNarrationProvider.speak(
      '这一句话用于验证自然男声失败后的本机重试。',
      { callbacks: { onStart } }
    )
    expect(fake.utterances).toHaveLength(1)
    expect(fake.utterances[0].voice?.voiceURI).toBe(maleNatural.voiceURI)

    fake.utterances[0].onerror?.({ error: 'network' })
    await vi.advanceTimersByTimeAsync(0)
    expect(fake.utterances).toHaveLength(2)
    expect(fake.utterances[1].voice?.voiceURI).toBe(maleLocal.voiceURI)
    expect(session).not.toBeNull()
    fake.utterances[1].onstart?.()
    expect(onStart).toHaveBeenCalledTimes(1)
    fake.utterances[1].onend?.()
  })

  it('无中文音色时不朗读', () => {
    const fake = fakeSynth([enUs])
    vi.stubGlobal('window', { speechSynthesis: fake.synth })
    vi.stubGlobal('SpeechSynthesisUtterance', fake.FakeUtterance)
    expect(browserNarrationProvider.speak('测试')).toBeNull()
    expect(fake.speak).not.toHaveBeenCalled()
  })
})
