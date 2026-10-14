import { useEffect, useState } from 'react'
import type { EvolutionStage, Glyph } from '../lib/types'
import { GlyphShape } from './GlyphShape'
import { EmptyNote } from './ui'

export default function EvolutionStageView({
  glyph,
  stage,
  modern,
  className = ''
}: {
  glyph?: Glyph
  stage: EvolutionStage
  modern?: string
  className?: string
}) {
  const images = stage.images && stage.images.length ? stage.images : undefined
  const [idx, setIdx] = useState(0)
  useEffect(() => setIdx(0), [stage.key, stage.sourceKey, images?.[0]?.src])

  if (stage.status === 'vector' && glyph) {
    return (
      <div className={className}>
        <GlyphShape glyph={glyph} className="h-full w-full" strokeWidth={4.8} />
      </div>
    )
  }

  if (stage.status === 'font') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <span className="font-song select-none leading-none text-ink">{modern || ''}</span>
      </div>
    )
  }

  if (stage.status === 'image' && images) {
    const img = images[Math.min(idx, images.length - 1)]
    return (
      <div className={`flex h-full w-full flex-col ${className}`}>
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-white/55 p-3 ring-1 ring-line/40">
          <img
            key={img.src}
            src={img.src}
            alt={img.alt}
            loading="lazy"
            draggable={false}
            className="sepia-rubbing max-h-full max-w-full object-contain mix-blend-multiply"
          />
          {images.length > 1 ? (
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-bone/85 px-2 py-1 shadow-sm">
              {images.map((it, i) => (
                <button
                  key={it.src}
                  type="button"
                  aria-label={`查看第 ${i + 1} 张图版`}
                  onClick={() => setIdx(i)}
                  className={`h-1.5 w-1.5 rounded-full transition ${
                    i === idx ? 'bg-bronze' : 'bg-line'
                  }`}
                />
              ))}
            </div>
          ) : null}
        </div>
        <p className="mt-2 text-center text-[10px] leading-4 text-muted">
          {img.note || `${stage.sourceKey || 'EVOBC'} 图版 · ${img.sourceLabel}`}
        </p>
      </div>
    )
  }

  return (
    <div className={`flex h-full w-full flex-col ${className}`}>
      <EmptyNote
        title="资料待补充"
        marker="资料待补充"
        desc={stage.hint || '该阶段暂无可查证图版，平台不凭空补形。'}
      />
    </div>
  )
}
