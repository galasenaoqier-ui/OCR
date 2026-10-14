import { useEffect, useMemo, useState } from 'react'
import DrawPad from '../components/DrawPad'
import { GlyphShape } from '../components/GlyphShape'
import { EmptyNote, PageShell, Panel, Tag } from '../components/ui'
import { strokesToMask } from '../lib/engine/binary'
import { distanceTransform, pairDetails } from '../lib/engine/matcher'
import { byId, GLYPHS } from '../lib/kb'
import type { Glyph } from '../lib/types'

type CompareMode = 'contour' | 'structure' | 'diff'

export default function ComparePage() {
  const [source, setSource] = useState<'draw' | 'sample'>('sample')
  const [sampleId, setSampleId] = useState('ma')
  const [refId, setRefId] = useState('ma')
  const [drawn, setDrawn] = useState<{ x: number; y: number }[][]>([])
  const [mode, setMode] = useState<CompareMode>('contour')
  const queryGlyph = source === 'sample' ? byId(sampleId) : undefined
  const refGlyph = byId(refId)!
  const queryStrokes: number[][][] = useMemo(() => {
    if (source === 'sample' && queryGlyph) return queryGlyph.strokes
    return drawn.map((s) => s.map((p) => [p.x, p.y] as [number, number]))
  }, [source, queryGlyph, drawn])

  const score = useMemo(() => {
    if (!queryStrokes.length || queryStrokes.every((s) => s.length < 2)) return null
    const q = strokesToMask(queryStrokes)
    const r = strokesToMask(refGlyph.strokes)
    const d = distanceTransform(r)
    const det = pairDetails(q, r, d)
    return det
  }, [queryStrokes, refGlyph])

  const refs = [byId('ma'), byId('xiang'), byId('yu')].filter(Boolean) as Glyph[]
  return (
    <PageShell
      eyebrow="字形对比实验室"
      title="字形对比"
      lead="把你的输入与字库参考字形做像素级 Overlay 叠加，观察轮廓、结构与差异。该实验室是现场技术展示的重点模块。"
    >
      <div className="grid items-start gap-6 lg:grid-cols-[340px_1fr_340px]">
        <Panel className="p-5">
          <h2 className="mb-4 text-lg text-ink">我的输入</h2>
          <div className="mb-4 flex gap-2">
            {(
              [
                ['draw', '手写'],
                ['sample', '示例字形']
              ] as const
            ).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setSource(k)} className={`chip ${source === k ? 'chip-active' : ''}`}>
                {label}
              </button>
            ))}
          </div>
          {source === 'sample' ? (
            <div className="grid grid-cols-3 gap-2">
              {refs.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSampleId(g.id)}
                  className={`flex flex-col items-center rounded-lg border p-2 ${
                    sampleId === g.id ? 'border-bronze bg-bronze/5' : 'border-line bg-paper'
                  }`}
                >
                  <GlyphShape glyph={g} className="h-14 w-14 text-ink" />
                  <span className="mt-1 text-sm">{g.modern}</span>
                </button>
              ))}
            </div>
          ) : (
            <DrawPad onStrokesChange={setDrawn} />
          )}
        </Panel>

        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line/70 px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-bronze/70" /> 我的输入
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-ink/50" /> 参考字形
            </div>
            <Tag tone="gold">相似度 {(score?.score ?? 0).toFixed(1)}%</Tag>
          </div>
          <div className="relative flex aspect-square max-h-[520px] items-center justify-center bg-paper p-4 sm:p-8">
            {queryStrokes.length ? (
              <OverlayCanvas
                queryStrokes={queryStrokes}
                refGlyph={refGlyph}
                mode={mode}
                key={mode + refId + queryStrokes.length + (source === 'sample' ? sampleId : drawn.length)}
              />
            ) : (
              <EmptyNote title="请先手写输入" />
            )}
          </div>
          <div className="flex justify-center gap-2 border-t border-line/70 px-4 py-3">
            {(
              [
                ['contour', '轮廓'],
                ['structure', '结构'],
                ['diff', '差异']
              ] as const
            ).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setMode(k)} className={`chip ${mode === k ? 'chip-active' : ''}`}>
                {label}
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="mb-4 text-lg text-ink">数据库参考字形</h2>
          <label className="mb-3 block text-xs text-muted">选择参考字</label>
          <select className="input-base !py-2 text-xs" value={refId} onChange={(e) => setRefId(e.target.value)}>
            {GLYPHS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.modern} · {g.pinyin} · {g.displayGroup}
              </option>
            ))}
          </select>
          <div className="paper-grain mt-4 flex aspect-square items-center justify-center rounded-xl border border-line bg-parchment text-ink">
            <GlyphShape glyph={refGlyph} className="h-[80%] w-[80%]" strokeWidth={4.2} />
          </div>
          <div className="mt-4 space-y-2 text-xs leading-5 text-muted">
            <p>综合相似度 <span className="font-medium text-ink">{(score?.score ?? 0).toFixed(1)}%</span></p>
            <p>笔画覆盖率 <span className="font-medium text-ink">{(score?.coverage ?? 0).toFixed(1)}%</span></p>
            <p>Chamfer 距离 <span className="font-medium text-ink">{score?.chamfer ?? '--'}</span></p>
          </div>
        </Panel>
      </div>
    </PageShell>
  )
}

function OverlayCanvas({
  queryStrokes,
  refGlyph,
  mode
}: {
  queryStrokes: number[][][]
  refGlyph: Glyph
  mode: CompareMode
}) {
  if (mode === 'diff') {
    return <DiffCanvas queryStrokes={queryStrokes} refGlyph={refGlyph} />
  }
  const grid = mode === 'structure'
  return (
    <svg viewBox="-2 -2 104 104" className="h-full w-full" fill="none">
      {grid ? (
        <g stroke="#D0BE9D" strokeWidth={0.4} opacity={0.42}>
          {Array.from({ length: 10 }, (_, i) => (
            <line key={'h' + i} x1={0} y1={(i + 1) * 10} x2={100} y2={(i + 1) * 10} />
          ))}
          {Array.from({ length: 10 }, (_, i) => (
            <line key={'v' + i} x1={(i + 1) * 10} y1={0} x2={(i + 1) * 10} y2={100} />
          ))}
        </g>
      ) : null}
      {refGlyph.strokes.map((poly, i) => (
        <path
          key={'r' + i}
          d={`M${poly.map(([x, y]) => `${(x * 100).toFixed(1)},${(y * 100).toFixed(1)}`).join('L')}`}
          stroke="rgba(43,33,26,.3)"
          strokeWidth={4.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.55}
        />
      ))}
      {queryStrokes.map((poly, i) => (
        <path
          key={'q' + i}
          d={`M${poly.map(([x, y]) => `${(x * 100).toFixed(1)},${(y * 100).toFixed(1)}`).join('L')}`}
          stroke="#C28A3D"
          strokeWidth={3.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}

function DiffCanvas({ queryStrokes, refGlyph }: { queryStrokes: number[][][]; refGlyph: Glyph }) {
  const canvasId = 'diff-canvas'
  useEffect(() => {
    const q = strokesToMask(queryStrokes)
    const r = strokesToMask(refGlyph.strokes)
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const S = canvas.width
    ctx.fillStyle = '#FBF6EC'
    ctx.fillRect(0, 0, S, S)
    ctx.fillStyle = 'rgba(43,33,26,.42)'
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        if (r.data[y * 128 + x]) ctx.fillRect((x * S) / 128, (y * S) / 128, S / 128 + 0.4, S / 128 + 0.4)
      }
    }
    ctx.fillStyle = '#C28A3D'
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        if (q.data[y * 128 + x]) ctx.fillRect((x * S) / 128, (y * S) / 128, S / 128 + 0.4, S / 128 + 0.4)
      }
    }
    ctx.fillStyle = '#A95638'
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const p = y * 128 + x
        if (Boolean(q.data[p]) !== Boolean(r.data[p])) ctx.fillRect((x * S) / 128, (y * S) / 128, S / 128 + 0.4, S / 128 + 0.4)
      }
    }
  }, [queryStrokes, refGlyph])
  return (
    <div className="relative h-full w-full">
      <canvas id={canvasId} width={520} height={520} className="h-full w-full" />
      <span className="absolute bottom-2 right-3 rounded-full bg-bone/80 px-2.5 py-1 text-[10px] text-muted">红色 = 差异像素</span>
    </div>
  )
}
