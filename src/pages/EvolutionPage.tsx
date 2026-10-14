import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import EvolutionStageView from '../components/EvolutionStageView'
import { PageShell, Panel } from '../components/ui'
import { byId, evolutionFor, GLYPHS } from '../lib/kb'
import { corpusStats } from '../lib/corpus'
import { evoSource, evoStats } from '../lib/evolution'

const CORPUS_DEC = corpusStats().deciphered.rootCategories
const evo = evoStats()
const source = evoSource()
export default function EvolutionPage() {
  const [sp] = useSearchParams()
  const initial = byId(sp.get('glyph') || 'ma') ? (sp.get('glyph') as string) : 'ma'
  const [sel, setSel] = useState(initial)
  const glyph = byId(sel) || GLYPHS[0]
  const stages = evolutionFor(glyph)
  const [active, setActive] = useState(0)
  const stage = stages[active]
  return (
    <PageShell
      eyebrow="字形演变"
      title="字形演变"
      lead={`观察同一汉字从甲骨文到今天的形态变化。时间轴分三层：甲骨文为本地精品矢量字形；金文、篆书（小篆系）、隶书图版来自 EVOBC 公开学术字形数据集（CC BY-NC-SA 4.0，当前图版标签条目 ${evo.entryCount}）；楷书与今天仅作现代字体呈现，不冒充出土字形。`}
    >
      <Panel className="p-5 md:p-6">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">选择字形：</span>
          <select
            className="input-base !w-auto !py-2 text-xs"
            value={sel}
            onChange={(e) => {
              setSel(e.target.value)
              setActive(0)
            }}
          >
            {GLYPHS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.modern} · {g.pinyin}
              </option>
            ))}
          </select>
        </div>
        <p className="mb-5 rounded-xl border border-line/70 bg-bone/50 px-4 py-3 text-xs leading-6 text-muted">
          提示：本页仅展示本地精品字库 69 字。HUST-OBC 学术库 {CORPUS_DEC} 个已释类别可在「甲骨字库 → HUST 已释」中浏览；凡能按释读标签精确匹配 EVOBC 的类别，其详情页会显示同源演变时间轴。
        </p>
        <div className="grid items-stretch gap-3 md:grid-cols-[260px_1fr]">
          <div className="flex aspect-square items-center justify-center rounded-xl border border-line bg-parchment p-6 text-ink md:aspect-auto md:min-h-[340px]">
            <EvolutionStageView
              glyph={glyph}
              stage={stage.stage}
              modern={glyph.modern}
              className={stage.stage.status === 'font' ? 'h-full w-full !text-[8rem]' : 'h-full w-full'}
            />
          </div>
          <div className="min-w-0">
            <div className="relative h-px bg-line/70" />
            <div className="relative flex justify-between gap-1 overflow-x-auto pt-2 pb-1">
              {stages.map(({ stage: st }, i) => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => st.status !== 'missing' && setActive(i)}
                  className={`z-10 min-w-[72px] flex-1 text-center transition sm:min-w-0 ${
                    st.status === 'missing' ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'
                  }`}
                >
                  <span
                    className={`mx-auto mb-2 block h-3.5 w-3.5 rounded-full border transition ${
                      i === active
                        ? 'border-gold bg-bronze shadow'
                        : st.status === 'missing'
                          ? 'border-line bg-bone'
                          : 'border-bronze bg-paper'
                    }`}
                  />
                  <span className={`text-xs md:text-sm ${i === active ? 'text-ink' : 'text-muted'}`}>{st.label}</span>
                  <span className="mt-0.5 block text-[9px] leading-4 text-muted/70">
                    {st.status === 'vector'
                      ? '矢量字形'
                      : st.status === 'image'
                        ? '图版样本'
                        : st.status === 'font'
                          ? '字体呈现'
                          : '资料待补充'}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-line/70 bg-bone/50 px-5 py-4">
              <div className="eyebrow mb-1">{stage.stage.label}</div>
              <p className="text-sm leading-7 text-ink/85">{stage.stage.hint}</p>
              {stage.stage.status === 'image' ? (
                <p className="mt-2 text-[11px] leading-5 text-muted">
                  图版来源：{source?.title || 'EVOBC'} · {source?.license || 'CC BY-NC-SA 4.0'}（{source?.arxiv ? `arXiv:${source.arxiv}` : ''}）。图版按来源原样整理，非专家逐字复核。
                </p>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-line/70 bg-paper px-4 py-3 text-xs text-muted">
                现代汉字：<span className="text-base text-ink">{glyph.modern}</span>
              </div>
              <div className="rounded-lg border border-line/70 bg-paper px-4 py-3 text-xs text-muted">
                拼音：<span className="text-base text-ink">{glyph.pinyin}</span>
              </div>
            </div>
          </div>
        </div>
      </Panel>
    </PageShell>
  )
}
