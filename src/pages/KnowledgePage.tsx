import { scaleLinear } from 'd3'
import { BookOpen, CircleDot } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { GlyphShape } from '../components/GlyphShape'
import { PageShell, Panel, Tag } from '../components/ui'
import { KNOWLEDGE_TOPICS, SOURCES, topicGlyphs } from '../lib/kb'

export default function KnowledgePage() {
  const [active, setActive] = useState<string>('甲骨文')
  const topic = KNOWLEDGE_TOPICS.find((t) => t.label === active)
  const glyphs = topic ? topicGlyphs(topic) : []
  const ring = scaleLinear().domain([0, 1]).range([140, 210])
  const nodes = useMemo(
    () =>
      KNOWLEDGE_TOPICS.map((t, i) => {
        const angle = (i / KNOWLEDGE_TOPICS.length) * Math.PI * 2 - Math.PI / 2
        return { ...t, x: 300 + Math.cos(angle) * 205, y: 300 + Math.sin(angle) * 205 }
      }),
    []
  )
  return (
    <PageShell
      eyebrow="互动知识地图"
      title="甲骨知识"
      lead="从「甲骨文」出发，沿商代社会的话题网络探索每个字形背后的历史语境。所有词条只链接本地字库中的已释字形，并以可查证工具书为来源；无资料的节点如实标注待补充。"
      wide
    >
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_430px]">
        <Panel className="p-4 md:p-6">
          <svg viewBox="0 0 600 600" className="h-auto w-full" role="img" aria-label="甲骨知识互动地图">
            {nodes.map((n) => (
              <line
                key={n.key}
                x1={300}
                y1={300}
                x2={n.x}
                y2={n.y}
                stroke="#C28A3D"
                strokeWidth={1}
                opacity={active === n.label ? 0.9 : 0.45}
              />
            ))}
            <g
              transform="translate(300,300)"
              onClick={() => setActive('甲骨文')}
              style={{ cursor: 'pointer' }}
            >
              <circle r={ring(1)} fill={active === '甲骨文' ? 'rgba(43,33,26,0.07)' : 'none'} />
              <circle r={30} fill="#2E231B" stroke="#C28A3D" strokeWidth={1.5} />
              <text textAnchor="middle" dominantBaseline="central" fill="#FBF5EA" fontSize="17" fontFamily="Songti SC, SimSun, serif">
                甲骨文
              </text>
            </g>
            {nodes.map((n) => {
              const isActive = active === n.label
              return (
                <g key={n.key} transform={`translate(${n.x},${n.y})`} style={{ cursor: 'pointer' }} onClick={() => setActive(n.label)}>
                  <circle r={isActive ? 34 : 27} fill={isActive ? '#2E231B' : '#FBF6EC'} stroke={isActive ? '#C28A3D' : '#9E5B34'} strokeWidth={1.2} />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={isActive ? 15 : 13}
                    fill={isActive ? '#FBF5EA' : '#2B211A'}
                    fontFamily="Songti SC, SimSun, serif"
                  >
                    {n.label}
                  </text>
                </g>
              )
            })}
          </svg>
          <p className="mt-2 text-center text-[11px] text-muted">
            米白底 · 墨色节点 · 暗金连线——点击节点展开右侧内容
          </p>
        </Panel>

        <div className="space-y-5">
          <Panel className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-song text-3xl text-ink">{active}</h2>
              {topic ? <Tag tone={topic.glyphModern.length ? 'gold' : 'amber'}>{topic.glyphModern.length ? '有字库示例' : '资料待补充'}</Tag> : null}
            </div>
            <p className="mt-4 text-sm leading-7 text-ink/85">{topic?.summary || '甲骨文是刻写于龟甲兽骨上的商代晚期文字，是研究商代社会最重要的出土文献材料之一。'}</p>
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-bone/60 px-4 py-3 text-xs leading-5 text-muted">
              <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-bronze" />
              <div>
                {topic?.note || '通识介绍；详细考释请以专业工具书与出土材料为准。'}
                <div className="mt-2">
                  来源：{SOURCES.slice(0, 2).map((s) => s.title).join('、')}
                </div>
              </div>
            </div>
          </Panel>
          <Panel className="p-6">
            <h3 className="mb-4 text-sm text-ink">字库关联示例（本地 69 字）</h3>
            {glyphs.length ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {glyphs.map((g) => (
                  <Link key={g.id} to={`/character/${g.id}`} className="flex flex-col items-center rounded-xl border border-line/80 bg-bone/40 p-3 text-ink transition hover:-translate-y-0.5 hover:border-bronze">
                    <GlyphShape glyph={g} className="h-16 w-16" />
                    <span className="mt-1 text-base">{g.modern}</span>
                    <span className="text-[10px] text-muted">{g.pinyin}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-bronze/35 px-4 py-8 text-center text-xs text-muted">
                <CircleDot className="h-5 w-5 text-bronze/60" />
                本地字库中暂缺与“{active}”直接对应的已释字形，相关内容待补充。
              </div>
            )}
          </Panel>
        </div>
      </div>
    </PageShell>
  )
}
