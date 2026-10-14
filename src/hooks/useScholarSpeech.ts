import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_NARRATION_PROVIDER,
  DOCUMENTARY_PRESET,
  type NarrationProvider,
  type NarrationSession,
  type VoiceInfo
} from '../lib/scholar/speech'

const VOICE_PREF_KEY = 'yinqi.scholar.voiceURI'

export type ScholarVoiceStatus =
  | 'idle'
  | 'speaking'
  | 'paused'
  | 'no-voice'
  | 'unsupported'

export interface UseScholarSpeechResult {
  supported: boolean
  status: ScholarVoiceStatus
  voices: VoiceInfo[]
  voiceURI: string
  setVoiceURI: (uri: string) => void
  refreshVoices: () => void
  speak: (
    text: string,
    callbacks?: {
      onStart?: () => void
      onEnd?: () => void
      onError?: () => void
      onSegmentStart?: () => void
      onSegmentEnd?: () => void
    }
  ) => boolean
  pause: () => void
  resume: () => void
  stop: () => void
}

function readStoredVoiceURI(): string {
  try {
    return window.localStorage.getItem(VOICE_PREF_KEY) || ''
  } catch {
    return ''
  }
}

export function useScholarSpeech(
  provider: NarrationProvider = DEFAULT_NARRATION_PROVIDER
): UseScholarSpeechResult {
  const supported = useMemo(() => provider.supported(), [provider])
  const [voices, setVoices] = useState<VoiceInfo[]>([])
  const [voiceURI, setVoiceURIState] = useState<string>(() => {
    try {
      return window.localStorage.getItem(VOICE_PREF_KEY) || ''
    } catch {
      return ''
    }
  })
  const [status, setStatus] = useState<ScholarVoiceStatus>(() =>
    supported ? 'idle' : 'unsupported'
  )

  const voiceURIRef = useRef(voiceURI)
  const sessionRef = useRef<NarrationSession | null>(null)
  const statusRef = useRef(status)
  statusRef.current = status

  const applyVoices = useCallback(
    (list: VoiceInfo[]) => {
      setVoices(list)
      if (!supported) return
      if (list.length === 0) {
        setStatus((prev) => (prev === 'unsupported' ? prev : 'no-voice'))
        return
      }
      setStatus((prev) => (prev === 'no-voice' || prev === 'unsupported' ? 'idle' : prev))
      // 若保存的音色已不存在则回退到“自动”。
      if (voiceURIRef.current && !list.some((v) => v.voiceURI === voiceURIRef.current)) {
        voiceURIRef.current = ''
        setVoiceURIState('')
        try {
          window.localStorage.removeItem(VOICE_PREF_KEY)
        } catch {
          // 隐私模式等场景忽略
        }
      }
    },
    [supported]
  )

  const refreshVoices = useCallback(() => {
    if (!supported) return
    applyVoices(provider.listVoices())
  }, [supported, provider, applyVoices])

  useEffect(() => {
    if (!supported) {
      setStatus('unsupported')
      return undefined
    }
    refreshVoices()
    const unsubscribe = provider.onVoicesChanged?.(applyVoices)
    return () => {
      unsubscribe?.()
      provider.stopAll()
      sessionRef.current = null
    }
  }, [supported, provider, refreshVoices, applyVoices])

  const setVoiceURI = useCallback((uri: string) => {
    voiceURIRef.current = uri
    setVoiceURIState(uri)
    try {
      if (uri) window.localStorage.setItem(VOICE_PREF_KEY, uri)
      else window.localStorage.removeItem(VOICE_PREF_KEY)
    } catch {
      // 忽略存储不可用
    }
  }, [])

  const markIdle = useCallback(() => {
    setStatus((prev) => {
      if (prev === 'unsupported') return prev
      return 'idle'
    })
  }, [])

  const speak = useCallback<UseScholarSpeechResult['speak']>(
    (text, callbacks) => {
      if (!supported || statusRef.current === 'no-voice') return false
      const session = provider.speak(text, {
        voiceURI: voiceURIRef.current || undefined,
        rate: DOCUMENTARY_PRESET.rate,
        pitch: DOCUMENTARY_PRESET.pitch,
        callbacks: {
          onStart: () => {
            setStatus('speaking')
            callbacks?.onStart?.()
          },
          onSegmentStart: callbacks?.onSegmentStart,
          onSegmentEnd: callbacks?.onSegmentEnd,
          onEnd: () => {
            if (sessionRef.current === session) sessionRef.current = null
            markIdle()
            callbacks?.onEnd?.()
          },
          onPause: () => setStatus('paused'),
          onResume: () => setStatus('speaking'),
          onError: () => {
            if (sessionRef.current === session) sessionRef.current = null
            markIdle()
            callbacks?.onError?.()
          }
        }
      })
      if (!session) {
        markIdle()
        return false
      }
      sessionRef.current = session
      return true
    },
    [supported, provider, markIdle]
  )

  const pause = useCallback(() => {
    sessionRef.current?.pause()
    setStatus('paused')
  }, [])

  const resume = useCallback(() => {
    sessionRef.current?.resume()
    setStatus('speaking')
  }, [])

  const stop = useCallback(() => {
    sessionRef.current?.cancel()
    sessionRef.current = null
    markIdle()
  }, [markIdle])

  return {
    supported,
    status,
    voices,
    voiceURI,
    setVoiceURI,
    refreshVoices,
    speak,
    pause,
    resume,
    stop
  }
}

export { readStoredVoiceURI, VOICE_PREF_KEY }
