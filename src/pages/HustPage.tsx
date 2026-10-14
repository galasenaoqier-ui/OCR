import { ArrowLeft, Database, Image, Info, ScanSearch } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CorpusThumb, CorpusThumbCard } from '../components/CorpusVisual'
import EvolutionStageView from '../components/EvolutionStageView'
import { EmptyNote, PageShell, Panel, Tag } from '../components/ui'
import {
  corpusAssetUrl,
  corpusSourceNote,
  displayLabel,
  entryForCorpusId,
  HUST_INDEX,
  localGlyphForEntry,
  sourceFullName,
  sourceMixText
} from '../lib/corpus'
import { byId } from '../lib/kb'
import { evoHasLabel, evolutionForHustLabel, evoSource } from '../lib/evolution'

function decodeParam(s: string | undefined): string {
  if (!s) return ''
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

export default function HustPage() {
  const params = useParams()
  const raw = decodeParam(params.entryId)
  const entry =
    entryForCorpusId(raw) ||
    entryForCorpusId(`hust-dec:${raw}`) ||
    entryForCorpusId(`hust-undec:${raw}`) ||
    entryForCorpusId(`hust-gxd:${raw}`)
  const [imgIdx, setImgIdx] = useState(0)
  const [evoIdx, setEvoIdx] = useState(0)

  useEffect(() => {
    setImgIdx(0)
    setEvoIdx(0)
  }, [entry?.id])

  if (!entry) {
    return (
      <PageShell title="未找到学术字形记录">
        <Link to="/library" className="btn-ghost text-xs">
          <ArrowLeft className="h-4 w-4" /> 返回字库
        </Link>
      </PageShell>
    )
  }
  const local = localGlyphForEntry(entry)
  const labelPool = [...(entry.labels && entry.labels.length ? entry.labels : [entry.label])].filter(Boolean)
  const evoLabel =
    (local && evoHasLabel(local.modern)
      ? local.modern
      : labelPool.find((l) => evoHasLabel(l))) || undefined
  const linked = entry.corpus === 'hust-dec' && Boolean(evoLabel)
  const timeline = linked
    ? evolutionForHustLabel(evoLabel as string, {
        oracleFile: entry.samples[0]?.file,
        oracleSourceLabel: entry.labels.join(' / ') || entry.label
      })
    : null
  const evoActive = timeline?.[Math.min(evoIdx, timeline.length - 1)] || timeline?.[0]
  const activeImg = entry.samples[imgIdx] || entry.samples[0]
  const tone =
    entry.corpus === 'hust-dec'
      ? 'green'
      : entry.corpus === 'hust-undec'
        ? 'amber'
        : 'neutral'
  const title =
    entry.corpus === 'hust-dec'
      ? entry.label || entry.categoryId
      : entry.corpus === 'hust-gxd'
        ? `待复核 · ${entry.label || entry.categoryId}`
        : `未释 · ${entry.categoryId}`

  return (
    <PageShell
      eyebrow={`HUST-OBC 学术字形 · ${entry.corpus}`}
      title={title}
      lead={corpusSourceNote(entry)}
    >
      <div className="grid items-start gap-6 lg:grid-cols-[420px_1fr]">
        <Panel className="p-6 lg:sticky lg:top-24">
          <div className="flex items-center justify-between">
            <Tag tone={tone}>
              {entry.corpus === 'hust-dec'
                ? '已释 · HUST-OBC'
                : entry.corpus === 'hust-undec'
                  ? '未释 · 待考证'
                  : '待复核来源'}
            </Tag>
            <span className="text-[11px] text-muted">类别号 {entry.categoryId}</span>
          </div>
          <div className="paper-grain mt-5 flex aspect-square items-center justify-center rounded-xl border border-line bg-parchment">
            {activeImg ? (
              <img src={corpusAssetUrl(activeImg.file)} alt={displayLabel(entry)} className="max-h-[78%] max-w-[78%] object-contain" />
            ) : local ? (
              <CorpusThumbCard entry={entry} className="h-[76%] w-[76%]" />
            ) : (
              <EmptyNote title="未内置示例图" marker={entry.corpus === 'hust-undec' ? '未释目录' : '图库精简'} />
            )}
          </div>
          {entry.samples.length > 1 ? (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {entry.samples.map((s, i) => (
                <button
                  key={s.file + i}
                  type="button"
                  onClick={() => setImgIdx(i)}
                  aria-label={`查看示例 ${i + 1}`}
                  className={`overflow-hidden rounded-lg border p-1 transition ${
                    i === imgIdx ? 'border-bronze ring-1 ring-bronze/40' : 'border-line bg-paper hover:border-bronze/50'
                  }`}
                >
                  <img src={corpusAssetUrl(s.file)} alt={`示例 ${i + 1}`} loading="lazy" className="aspect-square w-full object-contain" />
                </button>
              ))}
            </div>
          ) : null}
          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="font-song text-5xl text-ink">{title.split('（')[0]}</div>
              {entry.labels.length ? (
                <div className="mt-2 text-xs text-muted">来源释读标注：{entry.labels.join(' / ')}</div>
              ) : (
                <div className="mt-2 text-xs text-muted">当前无释读结论</div>
              )}
            </div>
            <div className="text-right text-[11px] text-muted">
              <div>源图像 {entry.imageCount} 张</div>
              <div>内置示例 {entry.sampleCount} 张</div>
            </div>
          </div>
        </Panel>

        <div className="min-w-0 space-y-6">
          <Panel className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Database className="h-4 w-4 text-bronze" />
              <h2 className="text-lg text-ink">数据来源</h2>
            </div>
            <div className="rounded-xl border border-line/70 bg-bone/50 px-4 py-3 text-xs leading-6 text-ink/85">
              {sourceMixText(entry)}
            </div>
            <p className="mt-3 text-xs leading-6 text-muted">
              本记录来自公开数据集 HUST-OBC（{HUST_INDEX.attribution.venue}，DOI {HUST_INDEX.attribution.doi}），
              采用 {HUST_INDEX.license} 许可。图像为研究用字形样本，不是出土文物原件照片。
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['类别号', entry.categoryId],
                ['源图像', `${entry.imageCount} 张`],
                ['来源构成', Object.keys(entry.sourceMix).map(sourceFullName).join('、') || '—'],
                ...(entry.corpus === 'hust-dec'
                  ? ([
                      ['模板质量', entry.templateQuality === 'selected' ? '启发式优选' : '兜底估计'],
                      ['笔画密度', entry.template?.density != null ? `${Math.round(entry.template.density * 100)}%` : '—'],
                      ['长宽比', entry.template?.aspect != null ? entry.template.aspect.toFixed(2) : '—']
                    ] as const)
                  : [])
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-line/70 bg-paper px-4 py-3">
                  <div className="text-[11px] text-muted">{k}</div>
                  <div className="mt-1 text-sm text-ink">{v}</div>
                </div>
              ))}
            </div>
            {entry.corpus === 'hust-dec' && entry.templateQuality === 'estimated' ? (
              <p className="mt-4 rounded-lg bg-amber/10 px-4 py-3 text-xs leading-5 text-[#6B4A28]">
                说明：本类主模板由确定性启发式兜底选取，图像质量未经专家复核，识别结果可能偏低置信。
              </p>
            ) : null}
          </Panel>

          {local ? (
            <Panel className="p-6">
              <div className="mb-3 flex items-center gap-2">
                <ScanSearch className="h-4 w-4 text-bronze" />
                <h2 className="text-lg text-ink">本地精品字库对应</h2>
              </div>
              <div className="flex items-center gap-4 rounded-xl border border-line/80 bg-bone/50 p-4">
                <CorpusThumb entry={entry} className="h-16 w-16" />
                <div className="min-w-0 flex-1">
                  <div className="text-base text-ink">
                    “{entry.label}”与本地矢量字库 {byId(entry.localGlyphId)?.modern} 对应
                  </div>
                  <div className="mt-1 text-xs leading-5 text-muted">
                    本地矢量字形有释义、拼音与构形说明；下方时间轴按同一释读链路展示 HUST-OBC 与 EVOBC 图版。
                  </div>
                </div>
                <Link to={`/character/${local.id}`} className="btn-ghost shrink-0 text-xs">
                  查看精品详情 <ArrowLeft className="ml-1 h-3.5 w-3.5 rotate-180" />
                </Link>
              </div>
            </Panel>
          ) : null}

          <Panel className="p-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Info className="h-4 w-4 text-bronze" />
              <h2 className="text-lg text-ink">字形演变</h2>
              {linked ? (
                <Tag tone={local ? 'gold' : 'neutral'}>
                  {local ? '本地字库映射' : '释读标签匹配'}
                </Tag>
              ) : null}
            </div>
            {timeline && evoActive ? (
              <>
                <div className="grid items-stretch gap-3 md:grid-cols-[minmax(220px,320px)_1fr]">
                  <div className="paper-grain flex aspect-square items-center justify-center rounded-xl border border-line bg-parchment text-ink md:aspect-auto md:min-h-[280px]">
                    <EvolutionStageView
                      stage={evoActive.stage}
                      modern={evoActive.modern}
                      className={
                        evoActive.stage.status === 'font'
                          ? 'h-full w-full !text-[7rem] p-5'
                          : 'h-full w-full p-5'
                      }
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="relative h-px bg-line/70" />
                    <div className="relative flex justify-between gap-1 overflow-x-auto pt-2">
                      {timeline.map(({ stage: st }, i) => (
                        <button
                          key={st.key}
                          type="button"
                          onClick={() => st.status !== 'missing' && setEvoIdx(i)}
                          className={`z-10 min-w-0 flex-1 px-1 text-center transition ${
                            st.status === 'missing'
                              ? 'cursor-not-allowed opacity-45'
                              : 'cursor-pointer'
                          }`}
                        >
                          <span
                            className={`mx-auto mb-2 block h-3 w-3 rounded-full border transition ${
                              i === evoIdx
                                ? 'border-gold bg-bronze shadow'
                                : st.status === 'missing'
                                  ? 'border-line bg-bone'
                                  : 'border-bronze bg-paper'
                            }`}
                          />
                          <span className={`block text-xs ${i === evoIdx ? 'text-ink' : 'text-muted'}`}>
                            {st.label}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 rounded-xl border border-line/70 bg-bone/50 px-4 py-3 text-xs leading-6 text-muted">
                      <span className="font-medium text-ink">{evoActive.stage.label}：</span>
                      {evoActive.stage.hint}
                    </div>
                    {evoActive.stage.status === 'image' && evoActive.stage.sourceKey === 'EVOBC' ? (
                      <p className="mt-2 text-[11px] leading-5 text-muted">
                        图版来源：{evoSource()?.title || 'EVOBC'} · {evoSource()?.license || 'CC BY-NC-SA 4.0'}；按释读标签 {evoLabel} 与 EVOBC 字形样本匹配，非专家逐字复核。
                      </p>
                    ) : null}
                  </div>
                </div>
                <p className="mt-3 text-[11px] leading-5 text-amber">
                  联动说明：HUST 类别仅证明该拓片与释读标注对应；同字在不同时代的图版风格差异较大，属于字形演变的正常现象，不代表逐字考释结论。
                </p>
              </>
            ) : (
              <EmptyNote
                title={entry.corpus === 'hust-undec' ? '未释字形 · 演变待补充' : '甲骨图像资料 · 演变阶段待补充'}
                desc={
                  entry.corpus === 'hust-undec'
                    ? '该类别尚未释读，暂不提供金文/篆书等后续演变推演，避免用现代字形冒充考释。'
                    : 'HUST-OBC 提供甲骨图像与释读标注；该释读标签暂未在 EVOBC 中匹配到金文/篆书/隶书图版，或本地精品字库尚无可映射字形。'
                }
                marker="资料待补充"
              />
            )}
          </Panel>

          <Panel className="flex flex-wrap items-center justify-between gap-3 p-5">
            <Link to="/library" className="text-xs text-bronze hover:text-bronzeDark">
              ← 返回字库
            </Link>
            <Link to="/recognize" className="btn-ghost text-xs">
              用它试一次 AI 识别
            </Link>
          </Panel>
        </div>
      </div>
    </PageShell>
  )
}
