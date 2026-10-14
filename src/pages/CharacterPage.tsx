import { ArrowLeft, Grid3X3, Route } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import EvolutionStageView from '../components/EvolutionStageView'
import { GlyphShape } from '../components/GlyphShape'
import { PageShell, Panel, Reveal, Tag } from '../components/ui'
import { glyphStructure } from '../lib/engine/engine'
import { byId, evolutionFor, relatedOf } from '../lib/kb'
import type { EvolutionStage } from '../lib/types'
import { evoSource } from '../lib/evolution'

export default function CharacterPage() {
  const { id } = useParams()
  const glyph = byId(id || '')
  const [stageKey, setStageKey] = useState<EvolutionStage['key']>('oracle')
  if (!glyph) {
    return (
      <PageShell title="未找到字形">
        <Link to="/library" className="btn-ghost text-xs">
          <ArrowLeft className="h-4 w-4" /> 返回字库
        </Link>
      </PageShell>
    )
  }
  const stages = evolutionFor(glyph)
  const stage = stages.find((s) => s.stage.key === stageKey) || stages[0]
  const source = evoSource()
  const structure = glyphStructure(glyph)
  const related = relatedOf(glyph.id)
  return (
    <PageShell eyebrow={`字库编号 · ${glyph.id}`} title={`${glyph.modern}`}>
      <div className="grid items-start gap-6 lg:grid-cols-[400px_1fr]">
        <Panel className="turtle-corner-fragment overflow-hidden p-6 lg:sticky lg:top-24">
          <div className="flex items-center justify-between">
            <Tag tone="neutral">{glyph.displayGroup} · {glyph.category}</Tag>
            {glyph.sample ? <Tag tone="gold">演示示例</Tag> : null}
          </div>
            <div className="paper-grain mt-5 flex aspect-square items-center justify-center rounded-xl border border-line bg-parchment text-ink">
            <EvolutionStageView
              glyph={glyph}
              stage={stage.stage}
              modern={glyph.modern}
              className={
                stage.stage.status === 'font'
                  ? 'h-full w-full !text-[9rem] p-6'
                  : 'h-full w-full p-6'
              }
            />
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="font-song text-5xl text-ink">{glyph.modern}</div>
              <div className="mt-1 text-sm text-bronze">{glyph.pinyin}</div>
            </div>
            <div className="text-right text-[11px] text-muted">
              <div>现代汉字 · {glyph.modern}</div>
              <div>分类 · {glyph.displayGroup}</div>
            </div>
          </div>
        </Panel>

        <div className="min-w-0 space-y-6">
          <Panel className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Route className="h-4 w-4 text-bronze" />
              <h2 className="text-lg text-ink">字形演变</h2>
              <span className="ml-auto text-[11px] text-muted">点击节点切换展示</span>
            </div>
            <div className="relative overflow-x-auto pb-2">
              <div className="flex min-w-[640px] items-center gap-0">
                <div className="absolute inset-x-8 top-5 border-t border-bronze/35" />
                {stages.map(({ stage: st }, i) => {
                  const active = st.key === stageKey
                  return (
                    <button
                      key={st.key}
                      type="button"
                      onClick={() => st.status !== 'missing' && setStageKey(st.key)}
                      disabled={st.status === 'missing'}
                      className={`relative z-10 flex w-[calc(100%/6)] flex-col items-center gap-2 px-1 text-center`}
                    >
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-full border text-[11px] transition ${
                          active
                            ? 'border-gold bg-ink text-bone'
                            : st.status === 'missing'
                              ? 'border-dashed border-line bg-bone text-muted/50'
                              : 'border-bronze bg-paper text-bronzeDark hover:border-gold'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className={`text-xs ${active ? 'text-ink' : 'text-muted'}`}>{st.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-line/70 bg-bone/50 px-4 py-3 text-xs leading-6 text-muted">
              <span className="font-medium text-ink">{stage.stage.label}：</span>
              {stage.stage.hint}
            </div>
            {stage.stage.status === 'image' ? (
              <p className="mt-2 text-[11px] leading-5 text-muted">
                图版来源：{source?.title || 'EVOBC'} · {source?.license || 'CC BY-NC-SA 4.0'}（{source?.arxiv ? `arXiv:${source.arxiv}` : ''}）。图版按来源原样整理，非专家逐字复核。
              </p>
            ) : null}
            {stage.stage.status === 'missing' ? (
              <p className="mt-2 text-[11px] text-amber">
                诚实数据原则：该字在此阶段暂未匹配到可查证图版，平台不拿现代字体冒充出土字形。
              </p>
            ) : null}
          </Panel>

          <Panel className="p-6">
            <div className="mb-5 flex items-center gap-2">
              <Grid3X3 className="h-4 w-4 text-bronze" />
              <h2 className="text-lg text-ink">字形解析</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ['整体轮廓', `${structure.strokeCount} 笔构成 · 长宽比 ${structure.aspect}`],
                ['部件结构', structure.closedStrokes ? `含 ${structure.closedStrokes} 个近闭合轮廓` : '未见明显闭合轮廓（依据矢量数据）'],
                ['笔画', `${glyph.strokes.map((s) => s.length - 1).reduce((a, b) => a + b, 0)} 段折线`],
                    ['结构类型', glyph.note.split(/[。；]/)[0] || glyph.category]
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-line/70 bg-bone/40 px-4 py-3">
                  <div className="text-[11px] text-muted">{k}</div>
                  <div className="mt-1 text-sm leading-6 text-ink/90">{v}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border-l-2 border-gold bg-paper px-5 py-4">
              <div className="eyebrow mb-2">象形 / 构形说明</div>
              <p className="text-sm leading-7 text-ink/85">{glyph.note}</p>
              <p className="mt-2 text-xs text-muted">释义：{glyph.meaning}</p>
            </div>
          </Panel>

          {related.length ? (
            <Panel className="p-6">
              <h2 className="mb-4 text-lg text-ink">相关字导航</h2>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {related.map((r) => (
                  <Link
                    key={r.id}
                    to={`/character/${r.id}`}
                    className="flex flex-col items-center rounded-xl border border-line/80 bg-bone/50 p-3 text-ink transition hover:-translate-y-0.5 hover:border-bronze"
                  >
                    <GlyphShape glyph={r} className="h-14 w-14" />
                    <span className="mt-1 text-sm">{r.modern}</span>
                  </Link>
                ))}
              </div>
            </Panel>
          ) : null}
          <Reveal>
            <Link to="/library" className="text-xs text-bronze hover:text-bronzeDark">
              ← 返回字库
            </Link>
          </Reveal>
        </div>
      </div>
    </PageShell>
  )
}
