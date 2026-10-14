import { Check, ChevronRight, RotateCcw, Trophy } from 'lucide-react'
import { useState } from 'react'
import { GlyphShape } from '../components/GlyphShape'
import { PageShell, Panel, Tag } from '../components/ui'
import { byId } from '../lib/kb'
import { saveLearningResult } from '../lib/stores'

type Round = 1 | 2 | 3

const R1 = [
  { glyph: 'ma', answer: '马', options: ['马', '牛', '鸟'] },
  { glyph: 'niu', answer: '牛', options: ['牛', '羊', '鹿'] },
  { glyph: 'yu', answer: '鱼', options: ['鱼', '象', '犬'] }
]

const R2 = [
  {
    glyph: 'ma',
    question: '看字猜意：这个字形像有头、鬃、身、足、尾的侧面动物，它表示什么？',
    answer: '一种可骑乘、驾车的牲畜',
    options: ['一种可骑乘、驾车的牲畜', '有角的反刍家畜', '生活在水中的生物']
  },
  {
    glyph: 'niu',
    question: '看字猜意：这个字形突出兽头与双角，古人用它表示什么？',
    answer: '有角的反刍家畜',
    options: ['有角的反刍家畜', '凶猛的大型野兽', '供祭祀的器具']
  },
  {
    glyph: 'yu',
    question: '看字猜意：这个字形像在水中摆尾游动的生物，它表示什么？',
    answer: '生活在水中的生物',
    options: ['生活在水中的生物', '天空中飞行的鸟', '土地里生长的作物']
  }
]

const R3_STAGES = ['甲骨文', '楷书', '今天'] as const

export default function LearningPage() {
  const [round, setRound] = useState<Round>(1)
  const [qi, setQi] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [correctTotal, setCorrectTotal] = useState(0)
  const [roundCorrect, setRoundCorrect] = useState<Record<Round, number>>({ 1: 0, 2: 0, 3: 0 })
  const [finished, setFinished] = useState(false)
  const [ordered, setOrdered] = useState<string[]>([])
  const [wrongFlash, setWrongFlash] = useState(false)

  const list = round === 1 ? R1 : R2
  const item = list[qi] as {
    glyph?: string
    question?: string
    answer: string
    options: string[]
  }
  const glyph = item.glyph ? byId(item.glyph) : byId('ma')

  function pickAnswer(choice: string) {
    if (picked) return
    setPicked(choice)
    const ok = choice === item.answer
    if (ok) {
      setCorrectTotal((n) => n + 1)
      setRoundCorrect((r) => ({ ...r, [round]: r[round] + 1 }))
    }
  }

  function next() {
    if (round < 3) {
      if (qi < list.length - 1) {
        setQi((q) => q + 1)
        setPicked(null)
      } else {
        setQi(0)
        setPicked(null)
        setRound((r) => (r + 1) as Round)
      }
    } else {
      setFinished(true)
      const report = {
        round: 'AI学甲骨',
        scores: { 1: roundCorrect[1], 2: roundCorrect[2], 3: ordered.length },
        demo: true
      }
      saveLearningResult(report)
    }
  }

  function orderClick(stage: string) {
    if (ordered.includes(stage)) return
    const target = R3_STAGES[ordered.length]
    if (stage === target) {
      setOrdered((o) => [...o, stage])
      if (target === '今天') setCorrectTotal((n) => n + 1)
    } else {
      setWrongFlash(true)
      window.setTimeout(() => setWrongFlash(false), 1800)
    }
  }

  if (finished) {
    const recognition = Math.round((roundCorrect[1] / R1.length) * 100)
    const observation = Math.round((roundCorrect[2] / R2.length) * 100)
    const history = Math.round((roundCorrect[3] / 3) * 100)
    const metrics = [
      ['识别能力', recognition],
      ['字形观察', observation],
      ['历史理解', history],
      ['文化兴趣', Math.max(60, Math.round((recognition + observation + history) / 3) + 12)]
    ]
    return (
      <PageShell eyebrow="AI 学甲骨 · 学习报告" title="我的甲骨文学习报告">
        <div className="mx-auto max-w-2xl">
          <Panel className="p-8">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-gold" />
              <h2 className="text-xl text-ink">完成 3 关挑战</h2>
              <Tag tone="amber">演示数据</Tag>
            </div>
            <div className="mt-7 grid grid-cols-2 gap-4">
              {metrics.map(([label, v]) => (
                <div key={label} className="rounded-xl border border-line/70 bg-bone/40 p-5">
                  <div className="text-xs text-muted">{label}</div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-song text-4xl text-ink">{v}</span>
                    <span className="text-xs text-muted">/ 100</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line/60">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs leading-6 text-muted">
              报告用于演示互动学习闭环；正式调研将使用真实前后测问卷，不以本报告替代。
            </p>
            <button
              className="btn-ghost mt-6 w-full text-xs"
              type="button"
              onClick={() => {
                setFinished(false)
                setRound(1)
                setQi(0)
                setPicked(null)
                setOrdered([])
                setWrongFlash(false)
                setCorrectTotal(0)
                setRoundCorrect({ 1: 0, 2: 0, 3: 0 })
              }}
            >
              <RotateCcw className="h-4 w-4" /> 再玩一次
            </button>
          </Panel>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell
      eyebrow="轻量互动学习"
      title="AI 学甲骨"
      lead={`第 ${round} 关 · 共 3 关`}
    >
      <div className="mx-auto max-w-3xl">
        <Panel className="p-6 md:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex gap-1.5">
              {[1, 2, 3].map((r) => (
                <span key={r} className={`h-1.5 w-10 rounded-full ${r <= round ? 'bg-bronze' : 'bg-line'}`} />
              ))}
            </div>
            <Tag tone="neutral">{round === 1 ? '猜猜这个字' : round === 2 ? '看字猜意' : '找出正确字形演变'}</Tag>
          </div>

          {round === 3 ? (
            <div>
              <h2 className="mb-2 text-center text-2xl text-ink">请按历史顺序点击：甲骨文 → 楷书 → 今天</h2>
              <p className="mb-8 text-center text-xs text-muted">点击顺序正确即进入下一项；三项演变示例为马</p>
              <div className="flex justify-center gap-3">
                {R3_STAGES.map((stage) => {
                  const idx = R3_STAGES.indexOf(stage)
                  const isDone = ordered.includes(stage)
                  return (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => orderClick(stage)}
                      disabled={ordered.includes(stage)}
                      className={`flex w-32 flex-col items-center rounded-xl border p-5 transition ${
                        isDone
                          ? 'border-green bg-green/5'
                          : wrongFlash
                            ? 'border-amber/40 opacity-50'
                            : 'border-line bg-bone/60 hover:border-bronze'
                      }`}
                    >
                      <span className="mb-3 flex h-16 w-16 items-center justify-center rounded-lg border border-line bg-paper text-ink">
                        {idx === 0 ? (
                          glyph ? <GlyphShape glyph={glyph} className="h-12 w-12" /> : null
                        ) : (
                          <span className="font-song text-3xl">马</span>
                        )}
                      </span>
                      <span className="text-sm">{stage}</span>
                      {isDone ? <Check className="mt-2 h-4 w-4 text-green" /> : null}
                    </button>
                  )
                })}
              </div>
              {wrongFlash ? <p className="mt-5 text-center text-xs text-amber">顺序有误：请按 甲骨文 → 楷书 → 今天 的顺序重试。</p> : null}
              {ordered.length === R3_STAGES.length ? (
                <div className="mt-6 text-center">
                  <p className="mb-4 rounded-xl bg-green/5 px-4 py-3 text-xs text-green">
                    答对了！甲骨文用矢量字形记录，楷书与今天以字体呈现（非出土字形资料）；金文、小篆、隶书待补充。
                  </p>
                  <button className="btn-primary" type="button" onClick={next}>
                    完成报告 <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div>
              <h2 className="mb-8 text-center text-2xl text-ink">{round === 1 ? '猜猜这个字是什么？' : item.question || ''}</h2>
            <div className="paper-grain mx-auto mb-8 flex h-48 w-48 items-center justify-center rounded-2xl border border-line bg-parchment text-ink">
                {glyph ? (
                  <GlyphShape glyph={glyph} className="h-[78%] w-[78%]" strokeWidth={5} />
                ) : null}
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {item.options.map((opt) => {
                  const isAnswer = picked === opt && opt === item.answer
                  const isWrongPick = picked === opt && opt !== item.answer
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => pickAnswer(opt)}
                      disabled={!!picked}
                      className={`flex items-center justify-center gap-3 rounded-xl border px-4 py-4 text-base transition md:text-lg ${
                        isAnswer
                          ? 'border-green bg-green/5 text-green'
                          : isWrongPick
                            ? 'border-amber/50 bg-amber/5 text-amber'
                            : 'border-line bg-paper hover:border-bronze disabled:opacity-70'
                      }`}
                    >
                      <span className="text-sm text-muted">{String.fromCharCode(65 + item.options.indexOf(opt))}</span>
                      <span className={round === 1 ? 'text-lg' : 'text-sm leading-6 md:text-base'}>{opt}</span>
                    </button>
                  )
                })}
              </div>
              {picked ? (
                <div className="mt-6">
                  <div className={`rounded-xl px-5 py-4 text-sm leading-7 ${picked === item.answer ? 'bg-green/5 text-green' : 'bg-amber/5 text-amber'}`}>
                    {picked === item.answer
                      ? '回答正确！'
                      : `正确选项是“${item.answer}”。`}
                    {'  '}
                    <span className="text-muted">{glyph?.note || '甲骨文通过描摹事物特征造字，字形与字义之间有迹可循。'}</span>
                  </div>
                  <button className="btn-primary mt-5" type="button" onClick={next}>
                    {round === 2 && qi === list.length - 1 ? '进入字形演变关' : qi < list.length - 1 ? '下一题' : '进入第 2 关'}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </Panel>
      </div>
    </PageShell>
  )
}
