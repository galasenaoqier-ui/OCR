import { ChevronLeft, ChevronRight, Search, ShieldAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CorpusThumbCard } from '../components/CorpusVisual'
import { GlyphShape } from '../components/GlyphShape'
import { PageShell, Panel, Tag } from '../components/ui'
import {
  corpusIdOf,
  corpusSourceNote,
  displayLabel,
  HUST_DEC,
  HUST_GXD,
  HUST_UNDEC,
  searchHust,
  type CorpusEntry
} from '../lib/corpus'
import { GLYPHS, GROUPS, searchGlyphs } from '../lib/kb'
import { evoHasLabel } from '../lib/evolution'

type CorpusTab = 'local' | 'dec' | 'undec' | 'gxd'
const PAGE_SIZE = 150

function CorpusCard({ entry }: { entry: CorpusEntry }) {
  const src = entry.samples[0]?.file
  const evoLabel =
    entry.corpus === 'hust-dec'
      ? [...(entry.labels && entry.labels.length ? entry.labels : [entry.label]), entry.label].find(
          (l) => l && evoHasLabel(l)
        )
      : undefined
  return (
    <Link
      to={`/hust/${encodeURIComponent(corpusIdOf(entry))}`}
      className="group relative flex flex-col rounded-xl border border-line/90 bg-paper px-3 pb-4 pt-5 text-center transition duration-300 hover:-translate-y-1 hover:border-bronze/45 hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
    >
      {evoLabel ? (
        <span className="absolute right-2 top-2 rounded-full border border-bronze/25 bg-bone px-2 py-0.5 text-[9px] leading-4 text-bronzeDark">
          演变可看
        </span>
      ) : null}
      <span className="mb-2 flex h-20 w-full items-center justify-center overflow-hidden text-ink">
        {src ? (
          <img
            src={src}
            alt={displayLabel(entry)}
            loading="lazy"
            className="max-h-20 max-w-20 object-contain transition duration-300 group-hover:scale-[1.04]"
            draggable={false}
          />
        ) : (
          <CorpusThumbCard entry={entry} className="h-20 w-20" />
        )}
      </span>
      <span className="text-lg leading-none text-ink">{displayLabel(entry).split('（')[0]}</span>
      <span className="mt-1 text-[11px] text-muted">
        {entry.corpus === 'hust-dec' ? '已释 · HUST-OBC' : entry.corpus === 'hust-undec' ? '未释·待考证' : '待复核'}
      </span>
      <span className="mt-3 text-[10px] text-bronze/80">类别 {entry.categoryId}</span>
    </Link>
  )
}

export default function LibraryPage() {
  const [tab, setTab] = useState<CorpusTab>('local')
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('全部')
  const [page, setPage] = useState(1)
  useEffect(() => setPage(1), [tab, query, group])

  const localList = useMemo(() => {
    const base = searchGlyphs(query)
    return group === '全部' ? base : base.filter((g) => g.displayGroup === group)
  }, [query, group])

  const corpusList = useMemo(() => {
    const decOnly = tab === 'dec' || tab === 'undec' || tab === 'gxd' ? tab !== 'undec' && tab !== 'gxd' : false
    const includeGxd = tab === 'gxd'
    if (tab === 'undec') {
      const q = (query || '').trim().toLowerCase()
      const base = HUST_UNDEC
      return q ? base.filter((e) => `${e.id} ${e.categoryId} ${e.sourceGroup}`.toLowerCase().includes(q)) : base
    }
    if (tab === 'gxd') {
      const q = (query || '').trim().toLowerCase()
      const base = HUST_GXD
      return q ? base.filter((e) => `${e.id} ${e.label} ${e.categoryId}`.toLowerCase().includes(q)) : base
    }
    return searchHust(query, decOnly, includeGxd)
  }, [tab, query])

  const activeList = tab === 'local' ? localList : corpusList
  const total = activeList.length
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const localPage = tab === 'local' ? localList.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE) : []
  const corpusPage =
    tab === 'local' ? [] : (corpusList as CorpusEntry[]).slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const hasRows = Boolean(localPage.length || corpusPage.length)

  const counts = {
    dec: HUST_DEC.length,
    undec: HUST_UNDEC.length,
    gxd: HUST_GXD.length
  }

  const lead =
    tab === 'local'
      ? `当前收录 ${GLYPHS.length} 个常见甲骨文字形（本地矢量数据，展示分组为平台分类；卡片保留数据库原始类别）。搜索支持现代汉字、拼音与甲骨文编号。`
      : tab === 'dec'
        ? `HUST-OBC 已释学术字形（${counts.dec} 类 / 77,064 张源图）。图像为公开研究样本，释义仅来源标注；本地 69 字矢量库保留精品释义。`
        : tab === 'undec'
          ? `HUST-OBC 未释目录（${counts.undec} 类 / 62,989 张源图）。仅有类别号与研究状态，不含释读结论，不参与识别候选。`
          : `HUST-OBC 中可信度待确认的 GuoXueDaShi 来源（${counts.gxd} 类 / 5,019 张源图），仅供研究参考，不参与识别候选。`

  return (
    <PageShell eyebrow="甲骨文字库" title="甲骨字库" lead={lead}>
      <Panel className="p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-bronze" />
            <input
              className="input-base !pl-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                tab === 'local'
                  ? '搜索现代汉字 / 拼音 / 甲骨文，如：马、ma'
                  : tab === 'undec'
                    ? '搜索未释类别号 / 来源，如：L、Y+H、6000A'
                    : '搜索现代汉字 / 类别号 / 拼音，如：日、0773、ri'
              }
              aria-label="搜索字库"
            />
          </div>
          <Tag tone="neutral">{total.toLocaleString()} 条</Tag>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              ['local', `精品字库 · ${GLYPHS.length}`],
              ['dec', `HUST 已释 · ${counts.dec}`],
              ['undec', `HUST 未释 · ${counts.undec}`],
              ['gxd', `待复核 · ${counts.gxd}`]
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`chip justify-center ${tab === key ? 'chip-active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === 'local' ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {['全部', ...GROUPS].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroup(g)}
                className={`chip ${group === g ? 'chip-active' : ''}`}
              >
                {g}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-bone/70 px-3 py-2 text-[11px] leading-5 text-muted">
            <ShieldAlert className="h-3.5 w-3.5 text-bronze/70" />
            {corpusSourceNote(
              tab === 'dec'
                ? HUST_DEC[0]
                : tab === 'undec'
                  ? HUST_UNDEC[0]
                  : HUST_GXD[0]
            )}
            <span className="ml-auto text-[10px]">点击卡片查看来源构成与多张示例</span>
          </div>
        )}
      </Panel>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {tab === 'local'
          ? localPage.map((g) => (
              <Link
                key={g.id}
                to={`/character/${g.id}`}
                className="group flex flex-col rounded-xl border border-line/90 bg-paper px-3 pb-4 pt-5 text-center transition duration-300 hover:-translate-y-1 hover:border-bronze/45 hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <span className="mb-2 flex h-20 w-full items-center justify-center text-ink">
                  <GlyphShape glyph={g} className="h-20 w-20 transition duration-300 group-hover:scale-[1.04]" />
                </span>
                <span className="text-lg leading-none text-ink">{g.modern}</span>
                <span className="mt-1 text-[11px] text-muted">{g.pinyin}</span>
                <span className="mt-3 text-[10px] text-bronze/80">{g.displayGroup}</span>
              </Link>
            ))
          : corpusPage.map((e) => <CorpusCard key={e.id} entry={e} />)}
      </div>

      {!hasRows ? (
        <Panel className="mt-6 p-10 text-center text-sm text-muted">没有匹配的字形，换个关键词试试。</Panel>
      ) : null}

      {pageCount > 1 ? (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="chip disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> 上一页
          </button>
          <span className="px-3 text-muted">
            第 {safePage} / {pageCount} 页
          </span>
          <button
            type="button"
            disabled={safePage >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            className="chip disabled:opacity-40"
          >
            下一页 <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
    </PageShell>
  )
}
