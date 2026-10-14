import { Check, ChevronLeft, ChevronRight, Loader2, MonitorPlay, Play, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GlyphShape } from '../components/GlyphShape'
import { Panel, Ring, Tag } from '../components/ui'
import { byId, evolutionFor } from '../lib/kb'
import { browserEngine } from '../lib/engine/engine'
import type { RecognitionResult } from '../lib/types'

const SCENES = [
  { key: 'input', label: 'Step 1', title: '上传甲骨文拓片' },
  { key: 'scan', label: 'Step 2', title: 'AI 识别' },
  { key: 'topk', label: 'Step 3', title: 'Top-K 候选' },
  { key: 'evidence', label: 'Step 4', title: '识别证据链' },
  { key: 'evolution', label: 'Step 5', title: '字形演变' },
  { key: 'graph', label: 'Step 6', title: '知识图谱' },
  { key: 'feedback', label: 'Step 7', title: '用户反馈' }
]

export default function DemoPage() {
  const [phase, setPhase] = useState(-1)
  const [auto, setAuto] = useState(false)
  const [result, setResult] = useState<RecognitionResult | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!auto) return
    if (phase < 0 || phase >= SCENES.length) return
    const timer = window.setTimeout(() => {
      setPhase((p) => {
        if (p + 1 >= SCENES.length) {
          setAuto(false)
          return SCENES.length
        }
        return p + 1
      })
    }, phase === 1 ? 11000 : 8500)
    return () => window.clearTimeout(timer)
  }, [auto, phase])

  useEffect(() => {
    if (phase >= 1 && !result && !loading) {
      setLoading(true)
      void browserEngine
        .sampleRecognition('ma')
        .then((r) => setResult(r))
        .finally(() => setLoading(false))
    }
  }, [phase, result, loading])

  function start() {
    setPhase(0)
  }

  if (phase < 0) {
    return (
      <div className="flex min-h-[88vh] items-center justify-center px-5">
        <Panel className="w-full max-w-2xl p-10 text-center md:p-14">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-ink text-bone">
            <MonitorPlay className="h-8 w-8" />
          </div>
              <div className="eyebrow">殷契拾文 · 答辩演示</div>
          <h1 className="font-song mt-3 text-4xl md:text-5xl">让三千年前的文字，再次被看见</h1>
          <p className="mt-5 text-sm leading-7 text-muted">
            7 步演示（上传 → AI识别 → Top-K → 证据链 → 演变 → 知识图谱 → 反馈），建议全程 60–90 秒。
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button className="btn-primary" type="button" onClick={start}>
              <Play className="h-4 w-4" /> 开始答辩演示
            </button>
            <button
              className="btn-ghost"
              type="button"
              onClick={() => {
                setAuto(true)
                start()
              }}
            >
              自动播放（约 65 秒）
            </button>
          </div>
          <Link to="/" className="mt-6 block text-xs text-muted hover:text-bronze">返回首页</Link>
        </Panel>
      </div>
    )
  }

  if (phase >= SCENES.length) {
    return (
      <div className="flex min-h-[88vh] items-center justify-center px-5">
        <Panel className="w-full max-w-2xl p-12 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-green/40 bg-green/5">
            <Check className="h-8 w-8 text-green" />
          </div>
          <h2 className="font-song text-4xl">演示完成</h2>
          <p className="mt-4 text-sm leading-7 text-muted">
            整个流程体现：看见甲骨文 → AI 识别 → 理解为什么 → 查看字形演变 → 了解历史文化 → 形成学习与研究闭环。
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <button
              className="btn-ghost"
              type="button"
              onClick={() => {
                setPhase(-1)
                setResult(null)
                setAuto(false)
              }}
            >
              <RotateCcw className="h-4 w-4" /> 重新演示
            </button>
            <Link to="/recognize" className="btn-primary">进入 AI 识甲</Link>
          </div>
        </Panel>
      </div>
    )
  }

  const scene = SCENES[phase]
  return (
    <div className="mx-auto max-w-5xl px-5 py-10 md:py-16">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="eyebrow">{scene.label}</div>
          <h1 className="font-song mt-1 text-4xl">{scene.title}</h1>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          {auto ? <Tag tone="gold">自动播放中</Tag> : <Tag tone="neutral">手动演示</Tag>}
          <button className="chip" type="button" onClick={() => setAuto((v) => !v)}>
            {auto ? '暂停自动' : '开启自动'}
          </button>
        </div>
      </div>

      <div className="mb-8 flex gap-1.5">
        {SCENES.map((s, i) => (
          <button
            key={s.key}
            type="button"
            title={`${s.label} ${s.title}`}
            onClick={() => setPhase(i)}
            className={`h-1.5 flex-1 rounded-full transition ${i <= phase ? 'bg-bronze' : 'bg-line'}`}
          />
        ))}
      </div>

      <SceneContent phase={scene.key} result={result} loading={loading} />

      <div className="mt-8 flex items-center justify-between">
        <button className="btn-ghost !px-5 !py-2 text-xs" type="button" onClick={() => setPhase((p) => Math.max(0, p - 1))} disabled={phase === 0}>
          <ChevronLeft className="h-4 w-4" /> 上一步
        </button>
        <span className="text-xs text-muted">演示用时约 {phase + 1} / {SCENES.length} 步</span>
        <button className="btn-primary !px-5 !py-2 text-xs" type="button" onClick={() => setPhase((p) => Math.min(SCENES.length, p + 1))}>
          {phase === SCENES.length - 1 ? '完成演示' : '下一步'} <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function SceneContent({
  phase,
  result,
  loading
}: {
  phase: string
  result: RecognitionResult | null
  loading: boolean
}) {
  const ma = byId('ma')
  if (phase === 'input') {
    return (
      <Panel className="mobile-tight-panel p-10">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-2xl">把一块“甲骨”交给 AI</h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              网页支持示例字形、手写与上传拓片三种输入；本演示载入字库中的真实矢量字形「马」。
            </p>
          </div>
          <div className="paper-grain mx-auto flex aspect-square w-56 items-center justify-center rounded-2xl border border-line bg-parchment text-ink">
            {ma ? <GlyphShape glyph={ma} className="h-[78%] w-[78%]" strokeWidth={5} /> : null}
          </div>
        </div>
      </Panel>
    )
  }
  if (phase === 'scan') {
    return (
      <Panel className="p-10">
        {loading || !result ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-bronze" />
            <div className="text-sm text-muted">本地引擎正在读取字形笔画并计算候选…</div>
          </div>
        ) : (
          <div>
            <div className="mb-6 flex items-center gap-3">
              <Tag tone="green">🟢 高置信度</Tag>
              <span className="text-xs text-muted">引擎：{result.engineName}</span>
            </div>
            <div className="space-y-2">
              {result.steps.slice(0, 6).map((s, i) => (
                <div key={s.title} className="flex items-center gap-4 rounded-lg border border-line/70 bg-bone/40 px-4 py-3">
                  <span className="font-song text-lg text-bronze">{String(i + 1).padStart(2, '0')}</span>
                  <div className="flex-1">
                    <div className="text-sm">{s.title}</div>
                    <div className="text-[11px] text-muted">{s.detail}</div>
                  </div>
                  <Check className="h-4 w-4 text-green" />
                </div>
              ))}
            </div>
          </div>
        )}
      </Panel>
    )
  }
  if (phase === 'topk') {
    return (
      <Panel className="p-10">
        {!result ? (
          <div className="text-center text-sm text-muted">等待识别结果…</div>
        ) : (
          <div>
            <h2 className="mb-6 text-2xl">AI 不会只给一个答案</h2>
            <div className="overflow-hidden rounded-xl border border-line/70">
              {result.candidates.map((c, i) => (
              <div key={c.glyphId + i} className={`grid grid-cols-[2rem_3.25rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-line/60 px-3 py-4 last:border-0 sm:grid-cols-[3rem_4rem_1fr_auto] sm:gap-4 sm:px-5 ${i === 0 ? 'bg-bronze/10' : ''}`}>
                  <span className="text-sm text-muted">{String(c.rank).padStart(2, '0')}</span>
                  <span className="text-ink">{byId(c.glyphId) ? <GlyphShape glyph={byId(c.glyphId)!} className="h-12 w-12" /> : null}</span>
                  <div>
                    <div className="font-song text-2xl">{c.modern}</div>
                    <div className="text-[11px] text-muted">{c.pinyin}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-song text-2xl text-bronzeDark">{c.score.toFixed(1)}%</div>
                    {i === 0 ? <div className="text-[10px] tracking-widest text-muted">HIGH CONFIDENCE</div> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Panel>
    )
  }
  if (phase === 'evidence') {
    const top = result?.top1
    return (
      <Panel className="p-10">
        {!result || !top ? (
          <div className="text-center text-sm text-muted">等待识别结果…</div>
        ) : (
          <div>
            <h2 className="mb-8 text-2xl">为什么是“马”？—— 识别证据链</h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="flex flex-col items-center rounded-xl border border-line/70 bg-bone/40 p-6">
                <div className="eyebrow mb-4">01 · 字形相似</div>
                <Ring value={top.score} size={120} label="综合相似度" />
              </div>
              <div className="flex flex-col items-center rounded-xl border border-line/70 bg-bone/40 p-6">
                <div className="eyebrow mb-4">02 · 视觉结构</div>
                <Ring value={top.coverage ?? 0} size={120} label="笔画覆盖率" />
              </div>
              <div className="flex flex-col rounded-xl border border-line/70 bg-bone/40 p-6 text-xs leading-6 text-muted">
                <div className="eyebrow mb-3">03 · 字库匹配</div>
                <p>与本地 69 字库中「马」的标准字形存在较高视觉相似度。</p>
                <p className="mt-2">04 · AI 判断：将「马」列为第一候选供研究参考。</p>
              </div>
            </div>
          </div>
        )}
      </Panel>
    )
  }
  if (phase === 'evolution') {
    const maTimeline = ma ? evolutionFor(ma) : []
    return (
      <Panel className="p-10">
        <h2 className="mb-8 text-2xl">一个字，走过三千年</h2>
        <div className="flex items-center gap-2">
          {['甲骨文', '金文', '小篆', '隶书', '楷书', '今天'].map((s, i) => {
            const st = maTimeline[i]?.stage
            const img = st?.status === 'image' && st.images?.[0] ? st.images[0].src : null
            const missing = st?.status === 'missing'
            return (
              <div key={s} className="flex flex-1 flex-col items-center gap-2 text-center">
                <div
                  className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border text-ink ${
                    i === 0
                      ? 'border-bronze bg-bone'
                      : i >= 4
                        ? 'border-line bg-paper'
                        : missing
                          ? 'border-dashed border-line bg-bone/40 opacity-55'
                          : 'border-bronze/35 bg-white/55'
                  }`}
                >
                  {i === 0 && ma ? (
                    <GlyphShape glyph={ma} className="h-12 w-12" />
                  ) : img ? (
                    <img src={img} alt={`${s} · EVOBC 图版`} className="max-h-14 max-w-14 object-contain mix-blend-multiply" />
                  ) : i === 0 ? null : (
                    <span className="font-song text-2xl">马</span>
                  )}
                </div>
                <span className={`text-xs ${i === 0 ? 'text-ink' : 'text-muted'}`}>{s}</span>
                <span
                  className={`text-[9px] ${
                    missing ? 'text-amber' : img ? 'text-bronzeDark' : 'text-green'
                  }`}
                >
                  {missing ? '资料待补充' : img ? 'EVOBC 图版' : i === 0 ? '矢量字形' : '字体呈现'}
                </span>
              </div>
            )
          })}
        </div>
      </Panel>
    )
  }
  if (phase === 'graph') {
    return (
      <Panel className="p-10">
        <h2 className="mb-8 text-2xl">从文字进入商代社会</h2>
        <div className="mx-auto max-w-xl">
          <svg viewBox="0 0 560 300" className="w-full">
            <line x1={280} y1={130} x2={80} y2={52} stroke="#9E5B34" opacity={0.38} />
            <line x1={280} y1={130} x2={80} y2={210} stroke="#9E5B34" opacity={0.38} />
            <line x1={280} y1={130} x2={480} y2={52} stroke="#9E5B34" opacity={0.38} />
            <line x1={280} y1={130} x2={480} y2={210} stroke="#9E5B34" opacity={0.38} />
            <circle cx={280} cy={130} r={34} fill="#2E231B" />
            <text x={280} y={135} textAnchor="middle" fill="#FBF5EA" fontFamily="Songti SC, SimSun, serif">甲骨文</text>
            {[['商代', 80, 52], ['祭祀', 80, 210], ['动物', 480, 52], ['天象', 480, 210]].map(([label, x, y]) => (
              <g key={label as string}>
                <circle cx={x as number} cy={y as number} r={26} fill="#FBF6EC" stroke="#C28A3D" />
                <text x={x as number} y={(y as number) + 5} textAnchor="middle" fontFamily="Songti SC, SimSun, serif" fill="#2B211A">{label}</text>
              </g>
            ))}
          </svg>
        </div>
        <p className="mt-6 text-center text-xs text-muted">知识地图把字形与其背后的商代祭祀、战争、农业、动物、天象等话题相连。</p>
      </Panel>
    )
  }
  return (
    <Panel className="p-10">
      <h2 className="mb-6 text-2xl">人机协同，而不是 AI 破解</h2>
      <div className="grid gap-5 md:grid-cols-3">
        {['AI 发现', '人工判断', '专家验证'].map((s, i) => (
          <div key={s} className="rounded-xl border border-line/70 bg-bone/40 p-6 text-center">
            <div className="eyebrow mb-3">Phase {i + 1}</div>
            <div className="font-song text-2xl">{s}</div>
          </div>
        ))}
      </div>
      <p className="mt-8 text-center text-sm text-muted">
        识别结果仅供研究学习参考 · 欢迎给出纠错反馈，帮助平台沉淀真实测试数据
      </p>
    </Panel>
  )
}
