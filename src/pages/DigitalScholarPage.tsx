import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  FileText,
  MessageSquare,
  Pause,
  Play,
  RotateCcw,
  Square,
  Volume2,
  VolumeX,
  Wind
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { GlyphShape } from '../components/GlyphShape'
import OracleEdgeField from '../components/OracleEdgeField'
import ScholarAvatar from '../components/ScholarAvatar'
import { PageShell, Panel, Tag } from '../components/ui'
import { useScholarSpeech } from '../hooks/useScholarSpeech'
import { byId, byModern } from '../lib/kb'
import { disposeWind, startWind, stopWind, windSupported } from '../lib/scholar/ambience'
import { DOCUMENTARY_PRESET } from '../lib/scholar/speech'
import {
  DEFAULT_PROVIDER,
  introForGlyph,
  recommendedQuestions,
  relationChainFor,
  scholarLinksFor,
  welcomeAnswer,
  type ScholarAnswer,
  type ScholarContext,
  type ScholarMode
} from '../lib/scholar/engine'

interface ChatMsg {
  id: string
  role: 'scholar' | 'user'
  text: string
  sources: string[]
  links: { label: string; to: string }[]
  disclaimer: string
}

function answerToMsg(answer: ScholarAnswer, id: string, role: 'scholar' = 'scholar'): ChatMsg {
  return {
    id,
    role,
    text: answer.text,
    sources: answer.sources,
    links: answer.links,
    disclaimer: answer.disclaimer
  }
}

export default function DigitalScholarPage() {
  const [params] = useSearchParams()
  const glyphId = params.get('glyph') || ''
  const from = (params.get('from') as ScholarContext['from']) || 'direct'
  const scoreRaw = Number(params.get('score'))
  const glyph = byId(glyphId) || (params.get('modern') ? byModern(params.get('modern') || '') : undefined)
  const score = Number.isFinite(scoreRaw) ? scoreRaw : undefined

  const [mode, setMode] = useState<ScholarMode>('learn')
  const [messages, setMessages] = useState<ChatMsg[]>(() => [answerToMsg(welcomeAnswer('learn'), 'welcome')])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [playing, setPlaying] = useState(true)
  const [typingId, setTypingId] = useState('')
  const [chars, setChars] = useState(0)
  const [raw, setRaw] = useState(false)
  const [autoVoice, setAutoVoice] = useState(false)
  const [ambientOn, setAmbientOn] = useState(true)
  const [readingMsgId, setReadingMsgId] = useState('')
  const [segmentSpeaking, setSegmentSpeaking] = useState(false)

  const nextId = useRef(2)
  const introDone = useRef(false)
  const autoVoiceRef = useRef(false)
  const ambientOnRef = useRef(true)
  const readMessageRef = useRef<(msg: ChatMsg) => void>(() => undefined)
  const windAvailable = windSupported()

  const {
    supported: voiceSupported,
    status: voiceStatus,
    voices,
    voiceURI,
    setVoiceURI,
    speak,
    pause: pauseVoice,
    resume: resumeVoice,
    stop: stopVoice
  } = useScholarSpeech()

  const topicText = useMemo(() => {
    if (!glyph) return '甲骨文通识'
    return `甲骨文 · ${glyph.modern}`
  }, [glyph])

  const voiceSpeaking = voiceStatus === 'speaking'
  const voicePaused = voiceStatus === 'paused'
  const noZhVoice = voiceSupported && voices.length === 0

  useEffect(() => {
    ambientOnRef.current = ambientOn
  }, [ambientOn])

  // 离开数字史官页时关闭并释放音频资源，避免后台残留音轨。
  useEffect(() => () => disposeWind(), [])

  const readMessage = useCallback(
    (msg: ChatMsg) => {
      if (!msg || msg.role !== 'scholar' || !msg.text) return
      // 朗读前清掉旧会话，保证同时只有一条语音。
      stopVoice()
      if (ambientOnRef.current && windAvailable) startWind()
      const started = speak(msg.text, {
        onStart: () => setReadingMsgId(msg.id),
        onSegmentStart: () => setSegmentSpeaking(true),
        onSegmentEnd: () => setSegmentSpeaking(false),
        onEnd: () => {
          stopWind()
          setSegmentSpeaking(false)
          setReadingMsgId((cur) => (cur === msg.id ? '' : cur))
        },
        onError: () => {
          stopWind()
          setSegmentSpeaking(false)
          setReadingMsgId((cur) => (cur === msg.id ? '' : cur))
        }
      })
      if (started) setReadingMsgId(msg.id)
    },
    [speak, stopVoice, windAvailable]
  )

  useEffect(() => {
    autoVoiceRef.current = autoVoice
  }, [autoVoice])

  useEffect(() => {
    readMessageRef.current = readMessage
  }, [readMessage])

  function stopCurrentVoice() {
    stopVoice()
    stopWind()
    setSegmentSpeaking(false)
    setReadingMsgId('')
  }

  function toggleAmbient() {
    const next = !ambientOn
    setAmbientOn(next)
    if (next) {
      // 若正在朗读，则立即补上风声；否则等下一次朗读时再起风。
      if (readingMsgId && (voiceSpeaking || voicePaused) && windAvailable) startWind()
    } else {
      stopWind()
    }
  }

  const pushScholar = useCallback((answer: ScholarAnswer) => {
    const id = `s-${nextId.current++}`
    setBusy(true)
    setTimeout(() => {
      setMessages((prev) => [...prev, answerToMsg(answer, id)])
      setBusy(false)
      setRaw(false)
      setTypingId(id)
      setChars(0)
      setPlaying(true)
    }, 700)
  }, [])

  useEffect(() => {
    if (!glyph || from !== 'recognize' || introDone.current) return
    introDone.current = true
    pushScholar(introForGlyph(glyph, score, mode))
  }, [glyph, from, score, mode, pushScholar])

  const current = messages.find((m) => m.id === typingId)
  useEffect(() => {
    if (!playing || !current) return
    if (chars >= current.text.length) {
      const finished = current
      setTypingId('')
      setChars(0)
      // 自动朗读：只在“语音讲解”已开启时朗读刚打完的这条讲解。
      if (autoVoiceRef.current && finished.role === 'scholar') {
        readMessageRef.current(finished)
      }
      return
    }
    const timer = setTimeout(() => setChars((c) => Math.min(c + 2, current.text.length)), 24)
    return () => clearTimeout(timer)
  }, [chars, playing, current])

  function toggleAutoVoice() {
    const next = !autoVoice
    setAutoVoice(next)
    if (!next) {
      stopCurrentVoice()
      return
    }
    // 立即朗读当前已经完整显示的最近一条史官讲解（用户点击即为发声授权）。
    const lastCompleted = [...messages]
      .reverse()
      .find((m) => m.role === 'scholar' && (raw || m.id !== typingId))
    if (lastCompleted) readMessage(lastCompleted)
  }

  function send(question: string) {
    const q = question.trim()
    if (!q || busy) return
    stopCurrentVoice()
    setMessages((prev) => [...prev, { id: `u-${nextId.current++}`, role: 'user', text: q, sources: [], links: [], disclaimer: '' }])
    setInput('')
    const ctx: ScholarContext = { glyphId: glyph?.id, modern: glyph?.modern, score, from, mode }
    void (async () => {
      const answer = await DEFAULT_PROVIDER.ask(ctx, q)
      pushScholar(answer)
    })()
  }

  function switchMode(next: ScholarMode) {
    if (next === mode) return
    stopCurrentVoice()
    setMode(next)
    if (glyph) pushScholar(introForGlyph(glyph, score, next))
  }

  function replay() {
    const last = [...messages].reverse().find((m) => m.role === 'scholar')
    if (!last) return
    stopCurrentVoice()
    setRaw(false)
    setTypingId(last.id)
    setChars(0)
    setPlaying(true)
  }

  const relation = glyph ? relationChainFor(glyph) : ['甲骨文', '商代']

  const statusText = busy
    ? '数字史官正在整理相关知识…'
    : typingId
      ? '数字史官正在讲解'
      : voiceSpeaking && readingMsgId && segmentSpeaking
        ? '正在朗读讲解…'
        : voiceSpeaking && readingMsgId
          ? '句间停顿…'
        : voicePaused && readingMsgId
          ? '已暂停朗读'
          : '殷契灵境 · 数字史官'

  const statusDot = busy || typingId || (voiceSpeaking && readingMsgId)
    ? 'bg-seal'
    : voicePaused && readingMsgId
      ? 'bg-amber'
      : 'bg-jade/70'

  return (
    <PageShell
      eyebrow="殷契灵境"
      title="数字史官"
      lead="让甲骨文从“被识别”走向“被理解”：一位以本地字库、字形演变与商代知识为基础的博物馆导览数字史官。所有讲解均为本地知识引擎生成，可选用浏览器系统中文语音朗读，请以专业文献为准。"
      wide
    >
      <div className="relative overflow-hidden rounded-2xl border border-line bg-paperLight px-5 py-6 shadow-card md:px-7">
        <OracleEdgeField />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-muted">
              <BookOpen className="h-3.5 w-3.5" /> 模式切换
            </div>
            <div className="mt-2 flex gap-2">
              {(['learn', 'research'] as ScholarMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`rounded-lg px-4 py-2 text-xs transition ${
                    mode === m ? 'bg-bronzeDark text-bone shadow-card' : 'border border-line bg-paper text-inkSoft hover:border-bronze'
                  }`}
                >
                  {m === 'learn' ? '学习模式' : '研究模式'}
                </button>
              ))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted">当前话题</div>
            <div className="font-song text-lg text-ink">{topicText}</div>
            {score !== undefined ? (
              <Tag tone="gold">识别置信度 {score.toFixed(1)}%</Tag>
            ) : (
              <Tag tone="neutral">通用导览</Tag>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[290px_minmax(0,1fr)_350px]">
        {/* 左：当前甲骨文 */}
        <Panel className="p-5 xl:sticky xl:top-24">
          <div className="flex items-center justify-between">
            <h2 className="font-song text-xl text-ink">当前甲骨文</h2>
            {glyph ? <Tag tone="neutral">{glyph.category}</Tag> : null}
          </div>
          {glyph ? (
            <>
              <div className="paper-grain mt-5 flex aspect-square items-center justify-center rounded-xl border border-line bg-parchment p-5">
                <GlyphShape glyph={glyph} className="h-full w-full text-bronzeDark" strokeWidth={4.5} />
              </div>
              <div className="mt-5 space-y-2 text-xs leading-6">
                <div className="flex justify-between border-b border-line/70 pb-2">
                  <span className="text-muted">现代汉字</span>
                  <span className="font-song text-2xl leading-none text-ink">{glyph.modern}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">拼音</span>
                  <span className="text-ink">{glyph.pinyin}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted">字义</span>
                  <span className="text-right text-ink">{glyph.meaning}</span>
                </div>
                {score !== undefined ? (
                  <div className="flex justify-between">
                    <span className="text-muted">识别</span>
                    <span className="font-song text-bronze">{score.toFixed(1)}%</span>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-bronze/35 bg-bone/45 px-4 py-8 text-center text-xs leading-6 text-muted">
              从「AI识甲」识别结果进入，我会自动为你讲解识别出的字。
            </div>
          )}
          <div className="mt-5 grid gap-2">
            {scholarLinksFor(glyph).map((l) => (
              <Link
                key={l.to + l.label}
                to={l.to}
                className="inline-flex items-center justify-between rounded-lg border border-line bg-paper px-3.5 py-2.5 text-xs text-ink transition hover:border-bronze hover:bg-paperSoft/40"
              >
                {l.label} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ))}
          </div>
        </Panel>

        {/* 中：数字人主讲台 */}
        <Panel className="p-5 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className={`h-2 w-2 rounded-full ${statusDot}`} />
              {statusText}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPlaying((v) => !v)}
                disabled={!typingId}
                aria-label={playing ? '暂停文字讲解' : '继续文字讲解'}
                className="rounded-md border border-line px-2.5 py-1.5 text-[11px] text-inkSoft transition hover:border-bronze disabled:opacity-40"
              >
                {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={replay}
                aria-label="重新讲解"
                className="rounded-md border border-line px-2.5 py-1.5 text-[11px] text-inkSoft transition hover:border-bronze"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setRaw((v) => !v)}
                aria-label="查看文字"
                className="rounded-md border border-line px-2.5 py-1.5 text-[11px] text-inkSoft transition hover:border-bronze"
              >
                <FileText className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* 语音讲解条 */}
          {voiceSupported ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line/70 bg-paperLight/75 px-3 py-2">
              <button
                type="button"
                onClick={toggleAutoVoice}
                disabled={noZhVoice}
                aria-pressed={autoVoice}
                title={noZhVoice ? '当前浏览器无中文语音' : autoVoice ? '关闭语音讲解' : '开启语音讲解'}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  autoVoice ? 'bg-bronzeDark text-bone' : 'border border-line text-inkSoft hover:border-bronze'
                }`}
              >
                {autoVoice ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                {autoVoice ? '语音讲解开' : '开启语音讲解'}
              </button>
              {(voiceSpeaking || voicePaused) && readingMsgId ? (
                <>
                  <button
                    type="button"
                    onClick={voicePaused ? resumeVoice : pauseVoice}
                    aria-label={voicePaused ? '继续朗读' : '暂停朗读'}
                    className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-[11px] text-inkSoft transition hover:border-bronze"
                  >
                    {voicePaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                    {voicePaused ? '继续' : '暂停'}
                  </button>
                  <button
                    type="button"
                    onClick={stopCurrentVoice}
                    aria-label="停止朗读"
                    className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-[11px] text-inkSoft transition hover:border-bronze"
                  >
                    <Square className="h-3 w-3" /> 停止
                  </button>
                </>
              ) : null}
              {windAvailable && voices.length > 0 ? (
                <button
                  type="button"
                  onClick={toggleAmbient}
                  aria-pressed={ambientOn}
                  title={ambientOn ? '关闭环境底噪' : '开启环境底噪'}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] transition ${
                    ambientOn
                      ? 'border border-bronze/45 bg-bronze/10 text-bronzeDark'
                      : 'border border-line text-muted hover:border-bronze'
                  }`}
                >
                  <Wind className="h-3.5 w-3.5" />
                  环境底噪{ambientOn ? '开' : '关'}
                </button>
              ) : null}
              {voices.length > 0 ? (
                <label className="inline-flex items-center gap-1.5 text-[11px] text-muted">
                  音色
                  <select
                    value={voiceURI}
                    onChange={(e) => {
                      setVoiceURI(e.target.value)
                      if (readingMsgId) stopCurrentVoice()
                    }}
                    className="max-w-[170px] rounded-md border border-line bg-paperLight px-1.5 py-1 text-[11px] text-inkSoft outline-none focus:border-gold"
                    aria-label="选择中文音色"
                  >
                    <option value="">自动（纪录片男声 · 推荐）</option>
                    {voices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name}
                        {v.localService ? ' · 本机' : ''}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <span className="text-[10px] text-muted">当前浏览器暂无中文语音，可静音阅读</span>
              )}
              <span className="ml-auto hidden text-[10px] text-muted lg:inline">
                {DOCUMENTARY_PRESET.label} · {DOCUMENTARY_PRESET.rate.toFixed(2)}× · 自然男声优先
              </span>
              <div className="w-full text-[10px] leading-4 text-muted/85">
                自然男声离线不可用时会自动切换本机男声；讲解以 {DOCUMENTARY_PRESET.rate.toFixed(2)}× 语速并按长句自动断句停顿。
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-line/60 bg-paperLight/60 px-3 py-2 text-[10px] text-muted">
              当前浏览器不支持语音朗读，已为你保留文字讲解。
            </div>
          )}

          {/* 主讲台 */}
          <div className="relative mt-4 overflow-hidden rounded-xl border border-line/80 bg-gradient-to-b from-paperLight via-mist to-paperSoft shadow-card">
            <OracleEdgeField className="opacity-70" />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-[-46px] z-[1] h-[380px] w-[310px] -translate-x-1/2 rounded-b-[170px] border border-goldLight/30 bg-goldLight/[0.06]"
            />
            <div className="relative z-[2] mx-auto flex h-[280px] items-center justify-center sm:h-[360px] md:h-[430px]">
              <ScholarAvatar
                speaking={voiceSpeaking && readingMsgId !== '' && segmentSpeaking}
                thinking={busy}
                className="h-full w-auto max-w-full"
              />
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[3] flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-line/80 bg-paperLight/90 px-3 py-1 text-[10px] tracking-[0.16em] text-inkSoft shadow-card backdrop-blur">
                <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
                殷契灵境 · 贞人
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {messages.slice(-4).map((m) => {
              const isScholar = m.role === 'scholar'
              const isTyping = isScholar && m.id === typingId
              const shown = raw || !isTyping ? m.text : m.text.slice(0, chars)
              const isReading = isScholar && m.id === readingMsgId
              return (
                <div key={m.id} className={`flex ${isScholar ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[92%] rounded-xl border px-4 py-3 text-xs leading-6 ${
                      isScholar
                        ? `border-line bg-paper text-ink ${isReading ? 'ring-1 ring-gold/45' : ''}`
                        : 'bg-bronzeDark text-bone'
                    }`}
                  >
                    {isScholar ? (
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="text-[10px] uppercase tracking-[0.18em] text-muted">数字史官</span>
                        {!isTyping && voiceSupported ? (
                          <button
                            type="button"
                            onClick={() => readMessage(m)}
                            disabled={noZhVoice}
                            aria-label="朗读这条讲解"
                            title="朗读这条讲解"
                            className={`inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] transition disabled:cursor-not-allowed disabled:opacity-35 ${
                              isReading && voiceSpeaking
                                ? 'bg-bronze/10 text-seal'
                                : 'text-muted hover:bg-paperSoft/60 hover:text-ink'
                            }`}
                          >
                            <Volume2 className="h-3 w-3" />
                            {isReading && (voiceSpeaking || voicePaused) ? (voicePaused ? '已暂停' : '朗读中') : '朗读'}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    <p>{shown}{isTyping && !raw ? '▍' : ''}</p>
                    {isScholar && (!isTyping || raw) ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {m.links.map((l) => (
                          <Link key={l.label + l.to} to={l.to} className="inline-flex items-center gap-1 text-[11px] text-bronze hover:text-bronzeDark">
                            {l.label} <ChevronRight className="h-3 w-3" />
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 rounded-lg bg-bone/55 px-4 py-2.5 text-[10px] leading-5 text-muted">
            {mode === 'research' ? '研究模式：讲解附文献来源与数据许可，强调以专业考释为准。' : '学习模式：使用通俗语言解释字形与字义，适合课堂与初学者。'}
          </div>
        </Panel>

        {/* 右：问问数字史官 */}
        <Panel className="p-5 xl:sticky xl:top-24">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-bronze" />
            <h2 className="font-song text-xl text-ink">问问数字史官</h2>
          </div>
          <p className="mt-2 text-[11px] text-muted">每个回答约 80–150 字；超出本地资料范围会如实说明。</p>

          <div className="mt-4 space-y-2">
            {recommendedQuestions(glyph).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                disabled={busy}
                className="block w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-left text-xs text-inkSoft transition hover:border-bronze hover:bg-paperSoft/40"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="mt-5 border-t border-line pt-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted">知识依据</div>
            <div className="mt-2 space-y-1 text-[11px] leading-5 text-muted">
              {mode === 'research' ? (
                <>
                  <div>《甲骨文合集》 · 《说文解字》 · 本地 69 字矢量字库</div>
                  <div>HUST-OBC（CC BY-NC 4.0） · EVOBC（CC BY-NC-SA 4.0）</div>
                </>
              ) : (
                <div>《说文解字》 · 本地字库构形说明 · 甲骨知识词条</div>
              )}
            </div>
            <div className="mt-2 rounded-md bg-amber/10 px-3 py-2 text-[10px] leading-4 text-[#6B4A28]">
              AI 生成讲解，请以专业文献为准；本平台讲解不替代专家释读。
            </div>
          </div>

          <div className="mt-5 border-t border-line pt-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted">相关知识</div>
            <div className="mt-3 space-y-0">
              {relation.map((label, i) => (
                <div key={label + i}>
                  <Link to="/knowledge" className="font-song text-sm text-ink transition hover:text-bronze">
                    {label}
                  </Link>
                  {i < relation.length - 1 ? <div className="ml-2 py-0.5 text-bronze/70">↓</div> : null}
                </div>
              ))}
            </div>
          </div>

          <form
            className="mt-5 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="向数字史官提问…"
              className="input-base min-w-0 !py-2.5 text-xs"
              aria-label="向数字史官提问"
            />
            <button type="submit" disabled={busy || !input.trim()} className="btn-primary shrink-0 !px-4 !py-2 text-xs sm:w-auto">
              发送
            </button>
          </form>
        </Panel>
      </div>

    </PageShell>
  )
}
